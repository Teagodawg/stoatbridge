import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useSession } from "@/contexts/SessionContext";
import Layout from "@/components/Layout";
import { toast } from "sonner";
import TransitionKit from "@/components/TransitionKit";
import BotAdvisor from "@/components/mapping/BotAdvisor";
import StepIndicator from "@/components/StepIndicator";
import type { BotSuggestion } from "@/components/mapping/BotAdvisor";
import {
  Loader2,
  ArrowLeft,
  ExternalLink,
  Bot,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface DefaultBot {
  name: string;
  description: string;
  inviteUrl: string;
  category: string;
}

const DEFAULT_BOTS: DefaultBot[] = [
  {
    name: "AutoMod",
    description: "Automated moderation: spam filtering, word filters, anti-raid, and more.",
    inviteUrl: "https://stoat.chat/bot/01FHGJ3NPP7XANQQH8C2BE44ZY",
    category: "Moderation",
  },
  {
    name: "Remix",
    description: "Music playback bot: play songs from YouTube, Spotify, and SoundCloud in voice channels.",
    inviteUrl: "https://stoat.chat/bot/01FVB28WQ9JHMWK8K7RD0F0VCW",
    category: "Music",
  },
  {
    name: "Logger",
    description: "Audit logging: track message edits, deletions, member joins/leaves, and more.",
    inviteUrl: "https://stoat.chat/bot/01H302WEK18E6F06NXW3ZF1JQ4",
    category: "Logging",
  },
  {
    name: "Roles",
    description: "Reaction roles: let members self-assign roles by reacting to messages.",
    inviteUrl: "https://stoat.chat/bot/01G9XW2NR0QBH5SD3RMDX7VWDB",
    category: "Utility",
  },
];

const PostTransferPage = () => {
  const session = useSession();
  const navigate = useNavigate();
  const [selectedBots, setSelectedBots] = useState<BotSuggestion[]>([]);
  const [checkedDefaults, setCheckedDefaults] = useState<Set<string>>(new Set());

  const stoatServerId = session.stoatServerId;
  const scanData = session.scanData;
  const mappingData = session.mappingData;

  useEffect(() => {
    if (!stoatServerId) {
      navigate("/connect");
      return;
    }
  }, []);

  const serverName = mappingData?.serverName || scanData?.guild?.name || "Your Server";

  const channelCount = mappingData
    ? mappingData.categories.reduce((s: number, c: any) => s + (c.channels?.filter((ch: any) => ch.included).length || 0), 0) + (mappingData.customChannels?.length || 0)
    : scanData?.summary?.totalChannels || 0;

  const roleCount = mappingData
    ? (mappingData.roles?.filter((r: any) => r.included).length || 0) + (mappingData.customRoles?.length || 0)
    : scanData?.summary?.totalRoles || 0;

  const managedRoles = scanData?.roles
    ? scanData.roles
        .filter((r: any) => r.managed)
        .map((r: any) => ({ name: r.name, id: r.id }))
    : [];

  const toggleDefault = (botName: string) => {
    setCheckedDefaults((prev) => {
      const next = new Set(prev);
      next.has(botName) ? next.delete(botName) : next.add(botName);
      return next;
    });
  };

  const serverUrl = `https://stoat.chat/server/${stoatServerId}`;

  if (!stoatServerId) return null;

  return (
    <Layout>
      <div className="pt-28 pb-20 px-6">
        <div className="container mx-auto max-w-2xl">
          <StepIndicator currentStep={5} />
          <Link
            to="/transfer"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Transfer
          </Link>

          {/* Hero */}
          <div className="text-center mb-10">
            <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-success" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {serverName} is Live!
            </h1>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Your server has been created on Stoat. Now set up bots and let your community know.
            </p>
            <a
              href={serverUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-4 bg-primary text-primary-foreground px-6 py-3 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Open in Stoat
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          {/* Section 1: Default Bot Suggestions */}
          <div className="mb-8">
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold text-foreground">
                    Recommended Bots
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Popular bots to get your Stoat server ready. Click invite to add them.
                </p>
              </div>

              <div className="divide-y divide-border">
                {DEFAULT_BOTS.map((bot) => (
                  <div key={bot.name} className="flex items-center gap-3 px-6 py-3.5">
                    <Checkbox
                      checked={checkedDefaults.has(bot.name)}
                      onCheckedChange={() => toggleDefault(bot.name)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {bot.name}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                          {bot.category}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {bot.description}
                      </p>
                    </div>
                    <a
                      href={bot.inviteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline shrink-0"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Invite
                    </a>
                  </div>
                ))}
              </div>

              <div className="px-6 py-3 bg-secondary/30 border-t border-border">
                <p className="text-xs text-muted-foreground text-center">
                  {checkedDefaults.size}/{DEFAULT_BOTS.length} added. Check off bots as you invite them
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: AI Bot Advisor */}
          {managedRoles.length > 0 && (
            <div className="mb-8">
              <BotAdvisor
                managedRoles={managedRoles}
                selectedBots={selectedBots}
                onSelectionChange={setSelectedBots}
              />
            </div>
          )}

          {/* Section 3: Member Transition Kit */}
          <TransitionKit
            serverName={serverName}
            stoatServerId={stoatServerId}
            channelCount={channelCount}
            roleCount={roleCount}
          />

          {/* Bottom Actions */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={serverUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Open in Stoat
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              onClick={() => {
                session.reset();
                navigate("/connect");
              }}
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground px-8 py-3 text-sm font-medium transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Start new transfer
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PostTransferPage;
