import { useState, useEffect } from "react";
import { Send, Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/contexts/SessionContext";
import { stoatApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { EmbedData } from "./EmbedEditor";
import { buildEmbedJson } from "./EmbedOutput";

const LS_LAST_DEST = "stoatbridge-embed-last-dest";
const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;

interface Server {
  id: string;
  name: string;
}

interface Channel {
  _id: string;
  name: string;
  channel_type: string;
}

interface Props {
  embed: EmbedData;
  senderName: string;
  setSenderName: (v: string) => void;
  senderAvatar: string;
  setSenderAvatar: (v: string) => void;
  content: string;
  setContent: (v: string) => void;
}

const EmbedSender = ({
  embed,
  senderName,
  setSenderName,
  senderAvatar,
  setSenderAvatar,
  content,
  setContent,
}: Props) => {
  const { stoatToken, stoatUsername, setStoatToken, setStoatUsername } = useSession();
  const { toast } = useToast();

  // Login form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  // Destination
  const [servers, setServers] = useState<Server[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [serverId, setServerId] = useState("");
  const [channelId, setChannelId] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingServers, setLoadingServers] = useState(false);
  const [loadingChannels, setLoadingChannels] = useState(false);

  // Restore last destination
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_LAST_DEST) || "{}");
      if (saved.serverId) setServerId(saved.serverId);
      if (saved.channelId) setChannelId(saved.channelId);
    } catch {}
  }, []);

  // Save destination
  useEffect(() => {
    if (serverId || channelId) {
      localStorage.setItem(LS_LAST_DEST, JSON.stringify({ serverId, channelId }));
    }
  }, [serverId, channelId]);

  // Fetch servers when connected
  useEffect(() => {
    if (!stoatToken) return;
    setLoadingServers(true);
    stoatApi("list_servers", {}, stoatToken)
      .then((data) => setServers(Array.isArray(data) ? data : []))
      .catch(() => toast({ title: "Failed to load servers", variant: "destructive" }))
      .finally(() => setLoadingServers(false));
  }, [stoatToken]);

  // Fetch channels when server selected
  useEffect(() => {
    if (!stoatToken || !serverId) {
      setChannels([]);
      return;
    }
    setLoadingChannels(true);
    setChannelId("");
    const fetchChannels = async () => {
      try {
        const res = await fetch(
          `https://${PROJECT_ID}.supabase.co/functions/v1/embed-send`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "list_channels", stoat_token: stoatToken, server_id: serverId }),
          }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setChannels(data.channels || []);
      } catch {
        toast({ title: "Failed to load channels", variant: "destructive" });
      } finally {
        setLoadingChannels(false);
      }
    };
    fetchChannels();
  }, [stoatToken, serverId]);

  const handleLogin = async () => {
    setLoggingIn(true);
    try {
      const data = await stoatApi("login", { email, password });
      if (data.mfa_required) {
        toast({ title: "MFA not supported yet", description: "Please use an account without MFA for now.", variant: "destructive" });
        return;
      }
      setStoatToken(data.token);
      setStoatUsername(data.username);
      toast({ title: `Connected as ${data.username}` });
    } catch (err: any) {
      toast({ title: "Login failed", description: err.message, variant: "destructive" });
    } finally {
      setLoggingIn(false);
    }
  };

  const handleSend = async () => {
    if (!channelId) {
      toast({ title: "Select a channel first" });
      return;
    }
    setSending(true);
    try {
      const res = await fetch(
        `https://${PROJECT_ID}.supabase.co/functions/v1/embed-send`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "send",
            stoat_token: stoatToken,
            server_id: serverId,
            channel_id: channelId,
            content: content || undefined,
            embed: buildEmbedJson(embed),
            webhook_name: senderName || "StoatBridge",
            webhook_avatar: senderAvatar || undefined,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Send failed");

      toast({
        title: "Sent ✅",
        description: data.messageId ? `Message ID: ${data.messageId}` : "Embed delivered.",
      });
    } catch (err: any) {
      toast({ title: "Send failed", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  // Not connected
  if (!stoatToken) {
    return (
      <div className="space-y-5">
        <h2 className="text-lg font-semibold text-foreground">Send to Stoat</h2>
        <p className="text-sm text-muted-foreground">
          Connect your Stoat account to send embeds directly.
        </p>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="stoat-email">Email</Label>
            <Input
              id="stoat-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="stoat-password">Password</Label>
            <Input
              id="stoat-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button onClick={handleLogin} disabled={loggingIn || !email || !password} className="w-full gap-2">
            {loggingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            Connect to Stoat
          </Button>
        </div>
      </div>
    );
  }

  // Connected
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Send to Stoat</h2>
        <span className="text-xs text-muted-foreground">Connected as {stoatUsername}</span>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>Server</Label>
          <select
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={serverId}
            onChange={(e) => setServerId(e.target.value)}
            disabled={loadingServers}
          >
            <option value="">{loadingServers ? "Loading…" : "Select a server"}</option>
            {servers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label>Channel</Label>
          <select
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={channelId}
            onChange={(e) => setChannelId(e.target.value)}
            disabled={!serverId || loadingChannels}
          >
            <option value="">{loadingChannels ? "Loading…" : "Select a channel"}</option>
            {channels.map((c) => (
              <option key={c._id} value={c._id}>#{c.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sender-name">Sender Name</Label>
          <Input
            id="sender-name"
            placeholder="StoatBridge"
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sender-avatar">Sender Avatar URL (optional)</Label>
          <Input
            id="sender-avatar"
            placeholder="https://example.com/avatar.png"
            value={senderAvatar}
            onChange={(e) => setSenderAvatar(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="msg-content">Message Content (optional)</Label>
          <Input
            id="msg-content"
            placeholder="Optional text above the embed"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>

        <Button
          onClick={handleSend}
          disabled={sending || !channelId || (!embed.title && !embed.description)}
          className="w-full gap-2"
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          Send Embed
        </Button>
      </div>
    </div>
  );
};

export default EmbedSender;
