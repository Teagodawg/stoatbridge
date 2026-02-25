import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

function isAllowedOrigin(origin: string): boolean {
  if (!origin) return false;
  if (origin === "https://stoatbridge.com") return true;
  if (origin === "https://www.stoatbridge.com") return true;
  if (origin.endsWith(".lovable.app")) return true;
  if (origin.endsWith(".lovableproject.com")) return true;
  return false;
}

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = isAllowedOrigin(origin) ? origin : "https://stoatbridge.com";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Vary": "Origin",
  };
}

const STOAT_API = "https://api.revolt.chat";
const ALLOWED_ACTIONS = ["list_channels", "send"];
const MAX_FETCH_SIZE = 10 * 1024 * 1024; // 10MB

// IP-based rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

let AUTUMN_URL: string | null = null;

async function getAutumnUrl(): Promise<string> {
  if (AUTUMN_URL) return AUTUMN_URL;
  try {
    const res = await fetch(`${STOAT_API}/`);
    if (res.ok) {
      const data = await res.json();
      if (data?.features?.autumn?.url) {
        AUTUMN_URL = data.features.autumn.url;
        return AUTUMN_URL!;
      }
    }
  } catch {}
  AUTUMN_URL = "https://cdn.revoltusercontent.com";
  return AUTUMN_URL;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limit by IP
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
                     req.headers.get("cf-connecting-ip") || "unknown";
    if (isRateLimited(clientIp)) {
      return new Response(JSON.stringify({ error: "Too many requests. Please wait a moment." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, stoat_token } = body;

    if (!stoat_token) {
      return new Response(
        JSON.stringify({ error: "Not connected to Stoat. Please log in first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!ALLOWED_ACTIONS.includes(action)) {
      return new Response(
        JSON.stringify({ error: "Unknown action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokenHeader =
      stoat_token.length > 60
        ? { "X-Session-Token": stoat_token }
        : { "X-Bot-Token": stoat_token };

    const stoatFetch = async (
      path: string,
      options: RequestInit = {},
      retries = 3
    ): Promise<any> => {
      const res = await fetch(`${STOAT_API}${path}`, {
        ...options,
        headers: {
          ...tokenHeader,
          "Content-Type": "application/json",
          ...(options.headers || {}),
        },
      });

      if ((res.status === 429 || res.status === 502) && retries > 0) {
        const waitMs =
          res.status === 502
            ? 3000
            : Math.min(
                ((await res.json().catch(() => ({}))).retry_after || 3000) + 1000,
                15000
              );
        if (res.status === 502) await res.text().catch(() => {});
        await new Promise((r) => setTimeout(r, waitMs));
        return stoatFetch(path, options, retries - 1);
      }

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`Stoat API error [${res.status}]: ${errBody}`);
      }
      return res.json();
    };

    // Convert a data URI to a Blob
    const dataUriToBlob = (dataUri: string): Blob => {
      const [meta, b64] = dataUri.split(",");
      const mime = meta.match(/:(.*?);/)?.[1] || "application/octet-stream";
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      return new Blob([bytes], { type: mime });
    };

    // SSRF protection: allow any public HTTPS URL, block private/internal ranges
    const BLOCKED_HOSTNAME_SUFFIXES = [".local", ".internal", ".localhost"];
    const PRIVATE_IP_RE = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.0\.0\.0|::1|\[::1\]|localhost)/i;

    const isAllowedUrl = (url: string): boolean => {
      try {
        const parsed = new URL(url);
        if (parsed.protocol !== "https:") return false;
        const host = parsed.hostname.toLowerCase();
        if (PRIVATE_IP_RE.test(host)) return false;
        if (BLOCKED_HOSTNAME_SUFFIXES.some((s) => host.endsWith(s))) return false;
        return true;
      } catch {
        return false;
      }
    };

    // Upload a URL or data URI to Autumn and return the file ID
    const uploadToAutumn = async (fileUrl: string, tag: string): Promise<string> => {
      const autumnBase = await getAutumnUrl();
      let blob: Blob;

      if (fileUrl.startsWith("data:")) {
        blob = dataUriToBlob(fileUrl);
      } else {
        // Enforce SSRF allowlist for HTTP URLs
        if (!isAllowedUrl(fileUrl)) {
          throw new Error("URL not allowed: only HTTPS URLs from known CDN domains are accepted");
        }
        const fileRes = await fetch(fileUrl, { redirect: "manual" });
        if (!fileRes.ok) throw new Error("Failed to download file from URL");
        // Size cap
        const contentLength = fileRes.headers.get("content-length");
        if (contentLength && parseInt(contentLength) > MAX_FETCH_SIZE) {
          throw new Error("File too large (max 10MB)");
        }
        blob = await fileRes.blob();
        if (blob.size > MAX_FETCH_SIZE) {
          throw new Error("File too large (max 10MB)");
        }
      }

      const formData = new FormData();
      formData.append("file", blob, "upload");

      const uploadRes = await fetch(`${autumnBase}/${tag}`, {
        method: "POST",
        headers: { ...tokenHeader },
        body: formData,
      });

      if (!uploadRes.ok) {
        const errBody = await uploadRes.text();
        throw new Error(`File upload failed [${uploadRes.status}]: ${errBody}`);
      }

      const uploadData = await uploadRes.json();
      return uploadData.id;
    };

    // ── list_channels: get text channels for a server ──
    if (action === "list_channels") {
      const { server_id } = body;
      if (!server_id) throw new Error("server_id is required");

      const serverInfo = await stoatFetch(`/servers/${server_id}`);
      const channelIds: string[] = serverInfo.channels || [];

      const channels: any[] = [];
      for (const chId of channelIds) {
        try {
          const ch = await stoatFetch(`/channels/${chId}`);
          if (ch.channel_type === "TextChannel") {
            channels.push({
              _id: ch._id,
              name: ch.name,
              channel_type: ch.channel_type,
            });
          }
        } catch {
          // skip inaccessible channels
        }
      }

      return new Response(
        JSON.stringify({ channels }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── send: create/reuse webhook + send embed ──
    if (action === "send") {
      const { channel_id, content, embed, webhook_name, webhook_avatar } = body;
      if (!channel_id) throw new Error("channel_id is required");
      if (!embed || typeof embed !== "object") throw new Error("embed is required");

      const desiredName = (typeof webhook_name === "string" && webhook_name.trim()) ? webhook_name.trim() : "StoatBridge";

      // Upload media to Autumn if they are external URLs
      const processedEmbed = { ...embed };

      if (processedEmbed.media && typeof processedEmbed.media === "string") {
        if (processedEmbed.media.startsWith("data:") || processedEmbed.media.startsWith("http")) {
          try {
            console.log("[embed-send] Uploading media image to Autumn...");
            const autumnId = await uploadToAutumn(processedEmbed.media, "attachments");
            processedEmbed.media = autumnId;
          } catch (err: any) {
            console.error("[embed-send] Media upload failed:", err.message);
            delete processedEmbed.media;
          }
        }
      }

      // 1) List webhooks in channel
      let webhookId: string | null = null;
      let webhookToken: string | null = null;

      try {
        const webhooks = await stoatFetch(`/channels/${channel_id}/webhooks`);
        const existing = (webhooks || []).find(
          (w: any) => w.name === desiredName || w.name === "StoatBridge"
        );
        if (existing) {
          webhookId = existing.id;
          webhookToken = existing.token;

          const needsUpdate = existing.name !== desiredName || webhook_avatar;
          if (needsUpdate) {
            const patchBody: any = {};
            if (existing.name !== desiredName) patchBody.name = desiredName;

            if (webhook_avatar && typeof webhook_avatar === "string" && (webhook_avatar.startsWith("http") || webhook_avatar.startsWith("data:"))) {
              try {
                console.log("[embed-send] Uploading webhook avatar to Autumn...");
                const avatarId = await uploadToAutumn(webhook_avatar, "avatars");
                patchBody.avatar = avatarId;
              } catch (err: any) {
                console.error("[embed-send] Avatar upload failed:", err.message);
              }
            }

            if (Object.keys(patchBody).length > 0) {
              try {
                await stoatFetch(`/webhooks/${webhookId}/${webhookToken}`, {
                  method: "PATCH",
                  body: JSON.stringify(patchBody),
                });
              } catch (err: any) {
                console.error("[embed-send] Webhook PATCH failed:", err.message);
              }
            }
          }
        }
      } catch (err: any) {
        const msg = err.message || "";
        if (msg.includes("403") || msg.includes("Forbidden")) {
          return new Response(
            JSON.stringify({
              error: "We can't create a webhook here. Ask an admin to grant webhook permissions or choose another channel.",
            }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw err;
      }

      // 2) Create webhook if none found
      if (!webhookId) {
        try {
          const createBody: any = { name: desiredName };
          const created = await stoatFetch(`/channels/${channel_id}/webhooks`, {
            method: "POST",
            body: JSON.stringify(createBody),
          });
          webhookId = created.id;
          webhookToken = created.token;

          if (webhook_avatar && typeof webhook_avatar === "string" && (webhook_avatar.startsWith("http") || webhook_avatar.startsWith("data:"))) {
            try {
              console.log("[embed-send] Uploading avatar for new webhook...");
              const avatarId = await uploadToAutumn(webhook_avatar, "avatars");
              await stoatFetch(`/webhooks/${webhookId}/${webhookToken}`, {
                method: "PATCH",
                body: JSON.stringify({ avatar: avatarId }),
              });
            } catch (err: any) {
              console.error("[embed-send] New webhook avatar upload failed:", err.message);
            }
          }
        } catch (err: any) {
          const msg = err.message || "";
          if (msg.includes("403") || msg.includes("Forbidden")) {
            return new Response(
              JSON.stringify({
                error: "We can't create a webhook here. Ask an admin to grant webhook permissions or choose another channel.",
              }),
              { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          throw err;
        }
      }

      if (!webhookId || !webhookToken) {
        throw new Error("Failed to obtain webhook credentials");
      }

      // 3) Send message via webhook
      const payload: any = { embeds: [processedEmbed] };
      if (content) payload.content = content;

      const sendRes = await fetch(
        `${STOAT_API}/webhooks/${webhookId}/${webhookToken}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!sendRes.ok) {
        const errBody = await sendRes.text();
        console.error(`[embed-send] Webhook send failed [${sendRes.status}]`);
        throw new Error(`Webhook send failed [${sendRes.status}]: ${errBody}`);
      }

      const sendData = await sendRes.json().catch(() => ({}));

      return new Response(
        JSON.stringify({
          success: true,
          messageId: sendData._id || null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[embed-send] Error:", err.message);

    const msg: string = err.message || "";
    let safeMessage = "An error occurred while sending the embed.";
    if (msg.includes("not connected")) safeMessage = "Not connected to Stoat. Please log in first.";
    else if (msg.includes("channel_id")) safeMessage = "Please select a channel.";
    else if (msg.includes("embed is required")) safeMessage = "Please add a title or description to your embed.";
    else if (msg.includes("403") || msg.includes("Forbidden")) safeMessage = "We can't access this channel with your current permissions.";

    return new Response(
      JSON.stringify({ error: safeMessage }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
