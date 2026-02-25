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

interface BotDirectoryEntry {
  url: string;
  bannerUrl: string | null;
  bannerColor: string | null;
  avatarUrl: string | null;
}

function parseBotDirectory(html: string): Map<string, BotDirectoryEntry> {
  const lookup = new Map<string, BotDirectoryEntry>();
  const tileRegex = /<a[^>]+href=\\"(https:\\\/\\\/stoat\\\.chat\\\/bot\\\/[^\\"]+)\\"[^>]*>([\\s\\S]*?)<\\\/a>/g;
  let match;
  while ((match = tileRegex.exec(html)) !== null) {
    const url = match[1].trim();
    const block = match[2];

    const nameMatch = block.match(/Tile__Title[^>]*>\\s*(?:<!--\\s*-->)?\\s*([^<]+)/);
    if (!nameMatch) continue;
    const name = nameMatch[1].trim();
    if (!name) continue;

    let bannerUrl: string | null = null;
    const bannerMatch = block.match(/src=\\"(https:\\\/\\\/cdn\\\.stoatusercontent\\\.com\\\/backgrounds\\\/[^\\"]+)\\"/);
    if (bannerMatch) {
      const bUrl = bannerMatch[1];
      if (!bUrl.includes("width=1") && !bUrl.includes("height=1")) {
        bannerUrl = bUrl;
      }
    }

    let bannerColor: string | null = null;
    const colorMatch = block.match(/Tile__Banner[^>]*style=\\"[^\\"]*background-color:\\s*([^\\";]+)/);
    if (colorMatch) {
      bannerColor = colorMatch[1].trim();
    }

    let avatarUrl: string | null = null;
    const avatarMatch = block.match(/src=\\"(https:\\\/\\\/cdn\\\.stoatusercontent\\\.com\\\/avatars\\\/[^\\"]+)\\"/);
    if (avatarMatch) {
      avatarUrl = avatarMatch[1];
    }

    lookup.set(name.toLowerCase(), { url, bannerUrl, bannerColor, avatarUrl });
  }
  return lookup;
}

function findBotEntry(name: string, lookup: Map<string, BotDirectoryEntry>): BotDirectoryEntry | null {
  const normalized = name.trim().toLowerCase();
  if (lookup.has(normalized)) return lookup.get(normalized)!;
  for (const [key, entry] of lookup) {
    if (key.includes(normalized) || normalized.includes(key)) return entry;
  }
  return null;
}

async function fetchRawHtml(url: string): Promise<string> {
  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": "StoatMigrationBot/1.0" },
    });
    if (!resp.ok) return "";
    return await resp.text();
  } catch {
    return "";
  }
}

async function fetchPage(url: string): Promise<string> {
  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": "StoatMigrationBot/1.0" },
    });
    if (!resp.ok) return "";
    const text = await resp.text();
    return text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
               .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
               .replace(/<[^>]+>/g, " ")
               .replace(/\s+/g, " ")
               .trim()
               .slice(0, 8000);
  } catch {
    return "";
  }
}

// Simple in-memory rate limiter (per-IP, resets on cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;

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
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("cf-connecting-ip") || "unknown";
    if (isRateLimited(clientIp)) {
      return new Response(JSON.stringify({ error: "Too many requests. Please wait a moment and try again." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { botNames } = await req.json();
    if (!Array.isArray(botNames) || botNames.length === 0 || botNames.length > 20) {
      return new Response(JSON.stringify({ error: "Provide between 1 and 20 bot names" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    for (const name of botNames) {
      if (typeof name !== "string" || name.trim().length === 0 || name.length > 100) {
        return new Response(JSON.stringify({ error: "Each bot name must be a non-empty string under 100 characters" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const fetchPromises: Promise<{ name: string; discordInfo: string; revoltInfo: string }>[] =
      botNames.map(async (name: string) => {
        const query = encodeURIComponent(name);
        const [discordInfo, revoltInfo] = await Promise.all([
          fetchPage(`https://discordbotlist.com/bots?q=${query}`),
          fetchPage(`https://rvlt.gg/discover/search?query=${query}&type=bots`),
        ]);
        return { name, discordInfo, revoltInfo };
      });

    const [botData, revoltBotsRawHtml, revoltBotsText] = await Promise.all([
      Promise.all(fetchPromises),
      fetchRawHtml("https://rvlt.gg/discover/bots"),
      fetchPage("https://rvlt.gg/discover/bots"),
    ]);

    const botLookup = parseBotDirectory(revoltBotsRawHtml);
    console.log(`Parsed ${botLookup.size} bots from directory`);

    for (const name of botNames) {
      const query = encodeURIComponent(name);
      try {
        const searchHtml = await fetchRawHtml(`https://rvlt.gg/discover/search?query=${query}&type=bots`);
        const searchLookup = parseBotDirectory(searchHtml);
        for (const [key, entry] of searchLookup) {
          if (!botLookup.has(key)) botLookup.set(key, entry);
        }
      } catch { /* ignore */ }
    }

    const botContext = botData.map((b) => {
      let ctx = `\n--- ${b.name} ---\n`;
      ctx += `Discord Bot List search results:\n${b.discordInfo || "No results found."}\n`;
      ctx += `Revolt/Stoat bot search results:\n${b.revoltInfo || "No results found."}\n`;
      return ctx;
    }).join("\n");

    const systemPrompt = `You are a bot migration advisor. The user has already migrated their Discord server to Stoat (powered by Revolt) and now needs to find equivalent bots.\n
You have been given REAL search results from discordbotlist.com (Discord bots) and rvlt.gg (Stoat/Revolt bots). Use ONLY this data to make your suggestions. Do NOT make up bot names that aren't in the provided data.\n
For each Discord bot, call the suggest_bots function with your recommendations. Base your analysis on the actual search results provided.\n
Rules:\n
- Only suggest Stoat/Revolt bots that actually appear in the rvlt.gg search results\n
- If no equivalent exists in the data, set stoatBotName to "No equivalent"\n
- Be honest about feature gaps between Discord and Stoat bots\n
- Do NOT generate any URLs — we handle linking separately\n
Here is the full Stoat bot directory for additional context:\n
${revoltBotsText.slice(0, 6000)}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Here are the Discord bots to find Revolt equivalents for. I've included real search results from both discordbotlist.com and rvlt.gg for each:\n${botContext}\n\nFor each bot, suggest a Revolt/Stoat equivalent based ONLY on the search data above.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_bots",
              description: "Return bot migration suggestions for each Discord bot.",
              parameters: {
                type: "object",
                properties: {
                  suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        discordBotName: { type: "string", description: "Original Discord bot name" },
                        stoatBotName: { type: "string", description: "Suggested Revolt/Stoat bot name, or 'No equivalent' if none exists" },
                        description: { type: "string", description: "What the suggested bot does" },
                        similarities: {
                          type: "array",
                          items: { type: "string" },
                          description: "Features that are similar between the Discord and Revolt bot",
                        },
                        missingFeatures: {
                          type: "array",
                          items: { type: "string" },
                          description: "Features the Discord bot has that the Revolt bot lacks",
                        },
                        commands: {
                          type: "array",
                          items: { type: "string" },
                          description: "Notable commands available in the Revolt bot",
                        },
                      },
                      required: ["discordBotName", "stoatBotName", "description", "similarities", "missingFeatures", "commands"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["suggestions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_bots" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI gateway error:", response.status);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "No suggestions returned from AI" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(toolCall.function.arguments);

    if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
      for (const suggestion of parsed.suggestions) {
        if (suggestion.stoatBotName && suggestion.stoatBotName !== "No equivalent") {
          const entry = findBotEntry(suggestion.stoatBotName, botLookup);
          suggestion.inviteUrl = entry?.url || null;
          suggestion.bannerUrl = entry?.bannerUrl || null;
          suggestion.bannerColor = entry?.bannerColor || null;
          suggestion.avatarUrl = entry?.avatarUrl || null;
        } else {
          suggestion.inviteUrl = null;
          suggestion.bannerUrl = null;
          suggestion.bannerColor = null;
          suggestion.avatarUrl = null;
        }
      }
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("bot-advisor error:", e);
    return new Response(
      JSON.stringify({ error: "An error occurred while generating bot suggestions" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
