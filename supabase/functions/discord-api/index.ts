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

const DISCORD_API = "https://discord.com/api/v10";

// IP-based rate limiter (resets on cold start)
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

    const BOT_TOKEN = Deno.env.get("DISCORD_BOT_TOKEN");
    if (!BOT_TOKEN) {
      throw new Error("DISCORD_BOT_TOKEN is not configured");
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const guildId = url.searchParams.get("guild_id");

    // "guilds" action removed for security — no need to enumerate all bot servers
    const allowedActions = ["guild", "channels", "roles", "scan"];
    if (!action || !allowedActions.includes(action)) {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate guild_id format (Discord snowflake: numeric string, 17-20 digits)
    if (guildId && !/^\d{17,20}$/.test(guildId)) {
      return new Response(JSON.stringify({ error: "Invalid server ID format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const discordFetch = async (path: string) => {
      const res = await fetch(`${DISCORD_API}${path}`, {
        headers: { Authorization: `Bot ${BOT_TOKEN}` },
      });
      if (!res.ok) {
        const body = await res.text();
        console.error(`Discord API error [${res.status}]`);
        throw new Error(`Discord API request failed`);
      }
      return res.json();
    };

    let data: any;

    switch (action) {
      case "guild": {
        if (!guildId) throw new Error("guild_id is required");
        const guildRaw = await discordFetch(`/guilds/${guildId}?with_counts=true`);
        data = {
          id: guildRaw.id,
          name: guildRaw.name,
          icon: guildRaw.icon,
          banner: guildRaw.banner || null,
          splash: guildRaw.splash || null,
          member_count: guildRaw.approximate_member_count,
        };
        break;
      }
      case "channels": {
        if (!guildId) throw new Error("guild_id is required");
        data = await discordFetch(`/guilds/${guildId}/channels`);
        break;
      }
      case "roles": {
        if (!guildId) throw new Error("guild_id is required");
        data = await discordFetch(`/guilds/${guildId}/roles`);
        break;
      }
      case "scan": {
        if (!guildId) throw new Error("guild_id is required");
        const [guild, channels, roles] = await Promise.all([
          discordFetch(`/guilds/${guildId}?with_counts=true`),
          discordFetch(`/guilds/${guildId}/channels`),
          discordFetch(`/guilds/${guildId}/roles`),
        ]);

        let emojis: any[] = [];
        let stickers: any[] = [];
        try {
          emojis = await discordFetch(`/guilds/${guildId}/emojis`);
        } catch { /* ignore */ }
        try {
          stickers = await discordFetch(`/guilds/${guildId}/stickers`);
        } catch { /* ignore */ }

        const categories = channels
          .filter((c: any) => c.type === 4)
          .sort((a: any, b: any) => a.position - b.position);

        const uncategorized = channels
          .filter((c: any) => c.type !== 4 && !c.parent_id)
          .sort((a: any, b: any) => a.position - b.position);

        const organized = categories.map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          position: cat.position,
          channels: channels
            .filter((c: any) => c.parent_id === cat.id && c.type !== 4)
            .sort((a: any, b: any) => a.position - b.position)
            .map((c: any) => ({
              id: c.id,
              name: c.name,
              type: c.type,
              typeName: channelTypeName(c.type),
              position: c.position,
              topic: c.topic || null,
              nsfw: c.nsfw || false,
              permission_overwrites: c.permission_overwrites || [],
            })),
        }));

        if (uncategorized.length > 0) {
          organized.unshift({
            id: null,
            name: "Uncategorized",
            position: -1,
            channels: uncategorized.map((c: any) => ({
              id: c.id,
              name: c.name,
              type: c.type,
              typeName: channelTypeName(c.type),
              position: c.position,
              topic: c.topic || null,
              nsfw: c.nsfw || false,
              permission_overwrites: c.permission_overwrites || [],
            })),
          });
        }

        const sortedRoles = roles
          .sort((a: any, b: any) => b.position - a.position)
          .map((r: any) => ({
            id: r.id,
            name: r.name,
            color: r.color,
            position: r.position,
            permissions: r.permissions,
            managed: r.managed,
            hoist: r.hoist,
            mentionable: r.mentionable,
            icon: r.icon || null,
            isDefault: r.name === "@everyone",
          }));

        const mappedEmojis = emojis.map((e: any) => ({
          id: e.id,
          name: e.name,
          animated: e.animated || false,
          url: `https://cdn.discordapp.com/emojis/${e.id}.${e.animated ? "gif" : "png"}?size=128`,
        }));

        const mappedStickers = stickers.map((s: any) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          format_type: s.format_type,
          url: s.format_type !== 3
            ? `https://media.discordapp.net/stickers/${s.id}.${s.format_type === 4 ? "gif" : "png"}?size=320`
            : null,
        }));

        data = {
          guild: {
            id: guild.id,
            name: guild.name,
            icon: guild.icon,
            banner: guild.banner || null,
            splash: guild.splash || null,
            member_count: guild.approximate_member_count,
          },
          categories: organized,
          roles: sortedRoles,
          emojis: mappedEmojis,
          stickers: mappedStickers,
          summary: {
            totalChannels: channels.filter((c: any) => c.type !== 4).length,
            totalCategories: categories.length,
            totalRoles: sortedRoles.length,
            totalEmojis: mappedEmojis.length,
            totalStickers: mappedStickers.length,
          },
        };
        break;
      }
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Discord API error:", message);
    const safeMessage = message.includes("guild_id is required")
      ? "Server ID is required"
      : message.includes("Unknown action")
      ? "Invalid request"
      : "An error occurred while communicating with Discord";
    return new Response(JSON.stringify({ error: safeMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function channelTypeName(type: number): string {
  switch (type) {
    case 0: return "text";
    case 2: return "voice";
    case 5: return "announcement";
    case 13: return "stage";
    case 15: return "forum";
    default: return "text";
  }
}
