const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;

// DiscordGuild interface removed — guilds action no longer exposed

export interface ScanResult {
  guild: {
    id: string;
    name: string;
    icon: string | null;
    banner: string | null;
    splash: string | null;
    member_count: number;
  };
  categories: {
    id: string | null;
    name: string;
    position: number;
    channels: {
      id: string;
      name: string;
      type: number;
      typeName: string;
      position: number;
      topic?: string | null;
      nsfw?: boolean;
      permission_overwrites: any[];
    }[];
  }[];
  roles: {
    id: string;
    name: string;
    color: number;
    position: number;
    permissions: string;
    managed: boolean;
    hoist: boolean;
    mentionable: boolean;
    icon?: string | null;
    isDefault?: boolean;
  }[];
  emojis: {
    id: string;
    name: string;
    animated: boolean;
    url: string;
  }[];
  stickers: {
    id: string;
    name: string;
    description: string;
    format_type: number;
    url: string | null;
  }[];
  summary: {
    totalChannels: number;
    totalCategories: number;
    totalRoles: number;
    totalEmojis: number;
    totalStickers: number;
  };
}

export async function discordApi(action: string, guildId?: string): Promise<any> {
  const params = new URLSearchParams({ action });
  if (guildId) params.set("guild_id", guildId);

  const res = await fetch(
    `https://${PROJECT_ID}.supabase.co/functions/v1/discord-api?${params}`,
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Discord API call failed");
  return data;
}

export async function stoatApi(action: string, body: Record<string, any> = {}, stoatToken?: string): Promise<any> {
  const res = await fetch(
    `https://${PROJECT_ID}.supabase.co/functions/v1/stoat-api`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action, ...body, ...(stoatToken ? { stoat_token: stoatToken } : {}) }),
    }
  );

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Stoat API call failed");
  return data;
}

export async function embedSendApi(action: string, body: Record<string, any> = {}): Promise<any> {
  const res = await fetch(
    `https://${PROJECT_ID}.supabase.co/functions/v1/embed-send`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...body }),
    }
  );

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Embed send failed");
  return data;
}
