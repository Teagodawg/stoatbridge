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

// Input validation helpers
function validateStringField(value: any, fieldName: string, maxLen = 100): string {
  if (typeof value !== "string") throw new Error(`${fieldName} must be a string`);
  const trimmed = value.trim();
  if (trimmed.length === 0) throw new Error(`${fieldName} is required`);
  if (trimmed.length > maxLen) throw new Error(`${fieldName} must be under ${maxLen} characters`);
  return trimmed;
}

// Dynamically resolved Autumn URL (fetched from API root)
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
  } catch {
    // fallback
  }
  AUTUMN_URL = "https://cdn.revoltusercontent.com";
  return AUTUMN_URL;
}

// Discord → Stoat permission bit mapping using BigInt to avoid 32-bit overflow
function mapDiscordPermissionsToStoat(discordPerms: bigint): { allow: number; deny: number } {
  let allow = 0n;

  const DISCORD_ADMINISTRATOR = 1n << 3n;
  if (discordPerms & DISCORD_ADMINISTRATOR) {
    const knownBits = [0n,1n,2n,3n,6n,7n,8n,10n,11n,20n,21n,22n,23n,24n,25n,26n,27n,29n,30n,31n];
    for (const b of knownBits) allow |= (1n << b);
    return { allow: Number(allow & 0xFFFFFFFFn), deny: 0 };
  }

  const map: [bigint, bigint][] = [
    [1n << 0n, 1n << 25n],
    [1n << 1n, 1n << 6n],
    [1n << 2n, 1n << 7n],
    [1n << 4n, 1n << 0n],
    [1n << 5n, 1n << 1n],
    [1n << 6n, 1n << 29n],
    [1n << 10n, 1n << 20n],
    [1n << 11n, 1n << 22n],
    [1n << 13n, 1n << 23n],
    [1n << 14n, 1n << 26n],
    [1n << 15n, 1n << 27n],
    [1n << 16n, 1n << 21n],
    [1n << 20n, 1n << 30n],
    [1n << 21n, 1n << 31n],
    [1n << 26n, 1n << 10n],
    [1n << 27n, 1n << 11n],
    [1n << 28n, 1n << 2n],
    [1n << 28n, 1n << 3n],
    [1n << 29n, 1n << 24n],
    [1n << 40n, 1n << 8n],
  ];

  for (const [discordBit, stoatBit] of map) {
    if (discordPerms & discordBit) {
      allow |= stoatBit;
    }
  }

  return { allow: Number(allow & 0xFFFFFFFFn), deny: 0 };
}

function mapChannelOverwrite(overwrite: { allow: string; deny: string }): { allow: number; deny: number } {
  const discordAllow = BigInt(overwrite.allow || "0");
  const discordDeny = BigInt(overwrite.deny || "0");

  const mapped = mapDiscordPermissionsToStoat(discordAllow);
  const mappedDeny = mapDiscordPermissionsToStoat(discordDeny);

  return { allow: mapped.allow, deny: mappedDeny.allow };
}

function generateId(): string {
  const chars = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  const time = Date.now();
  let id = "";
  let t = time;
  for (let i = 0; i < 10; i++) {
    id = chars[t % 32] + id;
    t = Math.floor(t / 32);
  }
  for (let i = 0; i < 16; i++) {
    id += chars[Math.floor(Math.random() * 32)];
  }
  return id;
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

    // Validate action is one of the allowed values
    const allowedActions = [
      "login", "login_mfa", "check_connection", "list_servers",
      "create_server", "set_server_icon", "set_server_banner",
      "create_emoji", "create_role", "edit_role", "set_role_permissions",
      "create_category", "create_channel", "set_permissions",
      "move_channel_to_category", "clear_server", "upload_branding",
      "set_default_permissions",
    ];
    if (!action || !allowedActions.includes(action)) {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Login with Revolt email/password → get session token
    if (action === "login") {
      const { email, password } = body;
      if (!email || !password) throw new Error("Email and password are required");
      // Validate input lengths
      validateStringField(email, "email", 255);
      validateStringField(password, "password", 255);

      const loginRes = await fetch(`${STOAT_API}/auth/session/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, friendly_name: "Stoat Migration Tool" }),
      });

      if (!loginRes.ok) {
        const errBody = await loginRes.text();
        throw new Error(`Revolt login failed [${loginRes.status}]: ${errBody}`);
      }

      const session = await loginRes.json();

      if (session.result === "MFA") {
        return new Response(
          JSON.stringify({ mfa_required: true, ticket: session.ticket, allowed_methods: session.allowed_methods }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const sessionToken = session.token || session._id;
      if (!sessionToken) throw new Error("No session token returned from Revolt");

      const verifyRes = await fetch(`${STOAT_API}/users/@me`, {
        headers: { "X-Session-Token": sessionToken },
      });

      if (!verifyRes.ok) {
        const errBody = await verifyRes.text();
        throw new Error(`Token verification failed [${verifyRes.status}]: ${errBody}`);
      }

      const stoatUser = await verifyRes.json();

      return new Response(
        JSON.stringify({ success: true, token: sessionToken, username: stoatUser.username || stoatUser.display_name || "Connected" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // All other actions require a stoat_token in the body
    if (!stoat_token) {
      return new Response(
        JSON.stringify({ error: "Stoat not connected. Please log in to your Stoat account first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine auth header type
    const tokenHeader = stoat_token.length > 60
      ? { "X-Session-Token": stoat_token }
      : { "X-Bot-Token": stoat_token };

    const stoatFetch = async (path: string, options: RequestInit = {}, retries = 3): Promise<any> => {
      console.log(`[stoat-api] ${options.method || "GET"} ${path}`);
      const res = await fetch(`${STOAT_API}${path}`, {
        ...options,
        headers: {
          ...tokenHeader,
          "Content-Type": "application/json",
          ...(options.headers || {}),
        },
      });

      if ((res.status === 429 || res.status === 502) && retries > 0) {
        const waitMs = res.status === 502 ? 3000 : Math.min(
          ((await res.json().catch(() => ({}))).retry_after || 3000) + 1000,
          15000
        );
        if (res.status === 502) await res.text().catch(() => {});
        console.log(`[stoat-api] ${res.status} on ${path}, waiting ${waitMs}ms (${retries} retries left)...`);
        await new Promise(r => setTimeout(r, waitMs));
        return stoatFetch(path, options, retries - 1);
      }

      if (!res.ok) {
        const errBody = await res.text();
        console.error(`[stoat-api] FAILED ${options.method || "GET"} ${path} → ${res.status}`);
        throw new Error(`Stoat API error [${res.status}]: ${errBody}`);
      }
      return res.json();
    };

    // SSRF protection: only allow fetching from known CDN domains
    const ALLOWED_FETCH_DOMAINS = [
      "cdn.discordapp.com",
      "media.discordapp.net",
      "cdn.revoltusercontent.com",
      "autumn.revolt.chat",
      "stoat.chat",
      "cdn.stoatusercontent.com",
    ];

    const isAllowedUrl = (url: string): boolean => {
      try {
        const parsed = new URL(url);
        return parsed.protocol === "https:" && ALLOWED_FETCH_DOMAINS.includes(parsed.hostname);
      } catch {
        return false;
      }
    };

    const uploadToAutumn = async (fileUrl: string, tag: string): Promise<string> => {
      if (!isAllowedUrl(fileUrl)) {
        throw new Error(`URL not allowed: only HTTPS URLs from known CDN domains are accepted`);
      }

      const autumnBase = await getAutumnUrl();

      const fileRes = await fetch(fileUrl, { redirect: "manual" });
      if (!fileRes.ok) throw new Error(`Failed to download file from URL`);
      // Size cap
      const contentLength = fileRes.headers.get("content-length");
      if (contentLength && parseInt(contentLength) > MAX_FETCH_SIZE) {
        throw new Error("File too large (max 10MB)");
      }
      const blob = await fileRes.blob();
      if (blob.size > MAX_FETCH_SIZE) {
        throw new Error("File too large (max 10MB)");
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
        throw new Error(`Autumn upload failed [${uploadRes.status}]: ${errBody}`);
      }

      const uploadData = await uploadRes.json();
      return uploadData.id;
    };

    let data: any;

    switch (action) {
      case "check_connection": {
        data = await stoatFetch("/users/@me");
        break;
      }
      case "list_servers": {
        const meRes = await stoatFetch("/users/@me");
        const myUserId = meRes._id;
        console.log(`[stoat-api] Authenticated user ID: ${myUserId}`);

        const wsToken = stoat_token;
        const wsUrl = `wss://ws.revolt.chat?version=1&format=json&token=${encodeURIComponent(wsToken)}`;
        console.log("[stoat-api] Opening WebSocket to fetch server list...");

        data = await new Promise((resolve, reject) => {
          const ws = new WebSocket(wsUrl);
          const timeout = setTimeout(() => {
            ws.close();
            reject(new Error("WebSocket timed out waiting for Ready event"));
          }, 15000);

          ws.onmessage = (event) => {
            try {
              const msg = JSON.parse(event.data);
              if (msg.type === "Ready") {
                clearTimeout(timeout);
                const servers = (msg.servers || [])
                  .filter((s: any) => s.owner === myUserId)
                  .map((s: any) => ({
                    id: s._id,
                    name: s.name || "Unknown",
                    icon: s.icon?._id || null,
                  }));
                console.log(`[stoat-api] Got ${servers.length} servers from Ready event`);
                ws.close();
                resolve(servers);
              }
            } catch (e) {
              // ignore parse errors on non-Ready messages
            }
          };

          ws.onerror = (err) => {
            clearTimeout(timeout);
            reject(new Error(`WebSocket error: ${err}`));
          };

          ws.onclose = (event) => {
            clearTimeout(timeout);
            if (!event.wasClean) {
              reject(new Error(`WebSocket closed unexpectedly: code=${event.code}`));
            }
          };
        });
        break;
      }
      case "create_server": {
        const name = validateStringField(body.name, "name", 100);
        const description = body.description ? validateStringField(body.description, "description", 1024) : undefined;
        data = await stoatFetch("/servers/create", {
          method: "POST",
          body: JSON.stringify({ name, description }),
        });
        break;
      }
      case "set_server_icon": {
        const { server_id, icon_url } = body;
        if (!server_id) throw new Error("server_id is required");
        const autumnId = await uploadToAutumn(icon_url, "icons");
        data = await stoatFetch(`/servers/${server_id}`, {
          method: "PATCH",
          body: JSON.stringify({ icon: autumnId }),
        });
        break;
      }
      case "set_server_banner": {
        const { server_id, banner_url } = body;
        if (!server_id) throw new Error("server_id is required");
        const autumnId = await uploadToAutumn(banner_url, "banners");
        data = await stoatFetch(`/servers/${server_id}`, {
          method: "PATCH",
          body: JSON.stringify({ banner: autumnId }),
        });
        break;
      }
      case "create_emoji": {
        const { server_id, name: rawEmojiName, emoji_url } = body;
        if (!server_id) throw new Error("server_id is required");
        const name = validateStringField(rawEmojiName, "emoji name", 32)
          .toLowerCase()
          .replace(/[-\s]+/g, "_")
          .replace(/[^a-z0-9_]/g, "")
          .slice(0, 32) || "emoji";
        const autumnId = await uploadToAutumn(emoji_url, "emojis");
        const emojiRes = await fetch(`${STOAT_API}/custom/emoji/${autumnId}`, {
          method: "PUT",
          headers: {
            ...tokenHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            parent: { type: "Server", id: server_id },
          }),
        });
        if (!emojiRes.ok) {
          const errBody = await emojiRes.text();
          throw new Error(`Create emoji failed [${emojiRes.status}]: ${errBody}`);
        }
        data = await emojiRes.json();

        if (!data.name || data.name !== name) {
          console.log(`[stoat-api] Emoji name mismatch, patching...`);
          const patchRes = await fetch(`${STOAT_API}/custom/emoji/${autumnId}`, {
            method: "PATCH",
            headers: {
              ...tokenHeader,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ name }),
          });
          if (patchRes.ok) {
            data = await patchRes.json();
          } else {
            console.error(`[stoat-api] Emoji name patch failed`);
          }
        }
        break;
      }
      case "create_role": {
        const { server_id, rank } = body;
        if (!server_id) throw new Error("server_id is required");
        const roleName = validateStringField(body.name, "role name", 100);
        data = await stoatFetch(`/servers/${server_id}/roles`, {
          method: "POST",
          body: JSON.stringify({ name: roleName, rank }),
        });
        break;
      }
      case "edit_role": {
        const { server_id: sid, role_id, name: rn, colour, hoist, rank: rk } = body;
        if (!sid || !role_id) throw new Error("server_id and role_id are required");
        const patchBody: Record<string, any> = {};
        if (rn) patchBody.name = validateStringField(rn, "role name", 100);
        if (colour !== undefined) patchBody.colour = colour;
        if (hoist !== undefined) patchBody.hoist = hoist;
        if (rk !== undefined) patchBody.rank = rk;

        data = await stoatFetch(`/servers/${sid}/roles/${role_id}`, {
          method: "PATCH",
          body: JSON.stringify(patchBody),
        });
        break;
      }
      case "set_role_permissions": {
        const { server_id, role_id, discord_permissions, stoat_allow, stoat_deny } = body;
        if (!server_id || !role_id) throw new Error("server_id and role_id are required");
        let allow: number, deny: number;
        if (stoat_allow !== undefined || stoat_deny !== undefined) {
          allow = stoat_allow || 0;
          deny = stoat_deny || 0;
        } else {
          const mapped = mapDiscordPermissionsToStoat(BigInt(discord_permissions));
          allow = mapped.allow;
          deny = mapped.deny;
        }
        data = await stoatFetch(`/servers/${server_id}/permissions/${role_id}`, {
          method: "PUT",
          body: JSON.stringify({
            permissions: { allow: allow, deny: deny },
          }),
        });
        break;
      }
      case "create_category": {
        const { server_id } = body;
        if (!server_id) throw new Error("server_id is required");
        const catName = validateStringField(body.name, "category name", 100);
        const catId = generateId();

        const serverData = await stoatFetch(`/servers/${server_id}`);
        const existingCategories = serverData.categories || [];

        existingCategories.push({ id: catId, title: catName, channels: [] });

        data = await stoatFetch(`/servers/${server_id}`, {
          method: "PATCH",
          body: JSON.stringify({ categories: existingCategories }),
        });
        data = { _id: catId, id: catId, title: catName };
        break;
      }
      case "create_channel": {
        const { server_id: csid, channel_type, description: cdesc, nsfw } = body;
        if (!csid) throw new Error("server_id is required");
        const cname = validateStringField(body.name, "channel name", 100);
        data = await stoatFetch(`/servers/${csid}/channels`, {
          method: "POST",
          body: JSON.stringify({
            name: cname,
            type: channel_type || "Text",
            ...(cdesc && { description: validateStringField(cdesc, "description", 1024) }),
            ...(nsfw !== undefined && { nsfw }),
          }),
        });
        break;
      }
      case "set_permissions": {
        const { channel_id, role_id: prid, discord_allow, discord_deny } = body;
        if (!channel_id || !prid) throw new Error("channel_id and role_id are required");
        let allow: number, deny: number;
        if (discord_allow !== undefined || discord_deny !== undefined) {
          const mapped = mapChannelOverwrite({
            allow: String(discord_allow || "0"),
            deny: String(discord_deny || "0"),
          });
          allow = mapped.allow;
          deny = mapped.deny;
        } else {
          allow = body.allow || 0;
          deny = body.deny || 0;
        }
        data = await stoatFetch(`/channels/${channel_id}/permissions/${prid}`, {
          method: "PUT",
          body: JSON.stringify({
            permissions: { allow, deny },
          }),
        });
        break;
      }
      case "move_channel_to_category": {
        const { server_id, category_id, channel_id } = body;
        if (!server_id || !category_id || !channel_id) throw new Error("server_id, category_id, and channel_id are required");

        const serverData = await stoatFetch(`/servers/${server_id}`);
        const existingCategories = serverData.categories || [];

        const catIndex = existingCategories.findIndex((c: any) => c.id === category_id);
        if (catIndex >= 0) {
          if (!existingCategories[catIndex].channels.includes(channel_id)) {
            existingCategories[catIndex].channels.push(channel_id);
          }
        } else {
          existingCategories.push({ id: category_id, title: "Category", channels: [channel_id] });
        }

        data = await stoatFetch(`/servers/${server_id}`, {
          method: "PATCH",
          body: JSON.stringify({ categories: existingCategories }),
        });
        break;
      }
      case "clear_server": {
        const { server_id } = body;
        if (!server_id) throw new Error("server_id is required");
        console.log(`[stoat-api] Clearing server...`);

        const serverInfo = await stoatFetch(`/servers/${server_id}`);
        const channelIds: string[] = serverInfo.channels || [];
        const roleIds: string[] = Object.keys(serverInfo.roles || {});
        const summary = { channels_deleted: 0, roles_deleted: 0, categories_cleared: false };

        for (const chId of channelIds) {
          try {
            await fetch(`${STOAT_API}/channels/${chId}`, {
              method: "DELETE",
              headers: { ...tokenHeader },
            });
            summary.channels_deleted++;
          } catch (err: any) {
            console.error(`[stoat-api] Failed to delete channel`);
          }
          await new Promise(r => setTimeout(r, 500));
        }

        for (const rId of roleIds) {
          if (rId === "default") continue;
          try {
            await fetch(`${STOAT_API}/servers/${server_id}/roles/${rId}`, {
              method: "DELETE",
              headers: { ...tokenHeader },
            });
            summary.roles_deleted++;
          } catch (err: any) {
            console.error(`[stoat-api] Failed to delete role`);
          }
          await new Promise(r => setTimeout(r, 500));
        }

        try {
          await stoatFetch(`/servers/${server_id}`, {
            method: "PATCH",
            body: JSON.stringify({ categories: [] }),
          });
          summary.categories_cleared = true;
        } catch (err: any) {
          console.error(`[stoat-api] Failed to clear categories`);
        }

        console.log(`[stoat-api] Server cleared: ${summary.channels_deleted} channels, ${summary.roles_deleted} roles`);
        data = summary;
        break;
      }
      case "set_default_permissions": {
        const { server_id, permissions } = body;
        if (!server_id || !permissions) throw new Error("server_id and permissions are required");
        data = await stoatFetch(`/servers/${server_id}/permissions/default`, {
          method: "PUT",
          body: JSON.stringify({ permissions: permissions.a || 0 }),
        });
        break;
      }
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[stoat-api] Error:", err.message);
    const msg: string = err.message || "";
    const safeMessage = msg.includes("Email and password are required")
      ? "Email and password are required"
      : msg.includes("not connected")
      ? "Stoat not connected. Please log in first."
      : msg.includes("Unknown action")
      ? "Invalid request"
      : msg.includes("login failed")
      ? "Login failed. Please check your credentials."
      : "An error occurred while communicating with Stoat";
    return new Response(
      JSON.stringify({ error: safeMessage }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
