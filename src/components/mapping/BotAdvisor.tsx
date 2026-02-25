import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import {
  Bot,
  Loader2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Sparkles,
  Terminal,
} from "lucide-react";

export interface BotSuggestion {
  discordBotName: string;
  stoatBotName: string;
  description: string;
  similarities: string[];
  missingFeatures: string[];
  commands: string[];
  inviteUrl?: string | null;
  bannerUrl?: string | null;
  bannerColor?: string | null;
  avatarUrl?: string | null;
}

interface BotAdvisorProps {
  managedRoles: { name: string; id: string }[];
  selectedBots: BotSuggestion[];
  onSelectionChange: (bots: BotSuggestion[]) => void;
}

const BOT_COLORS = [
  "bg-primary",
  "bg-chart-1",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
  "bg-chart-5",
];

const BotAdvisor = ({ managedRoles }: BotAdvisorProps) => {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<BotSuggestion[]>([]);
  const [scanned, setScanned] = useState(false);
  const [expandedBot, setExpandedBot] = useState<string | null>(null);

  if (managedRoles.length === 0) return null;

  const botNames = managedRoles.map((r) => r.name);

  const scanBots = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("bot-advisor", {
        body: { botNames },
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      const results: BotSuggestion[] = data?.suggestions || [];
      setSuggestions(results);
      setScanned(true);

      if (results.length === 0) {
        toast.info("No bot suggestions found");
      }
    } catch (err: any) {
      toast.error("Failed to scan bots: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const botDirectoryUrl = "https://stoat.chat/discover/bots";

  const getBotLink = (bot: BotSuggestion) => bot.inviteUrl || botDirectoryUrl;
  const getBotLabel = (bot: BotSuggestion) => bot.inviteUrl ? "Add to Server" : "Browse Stoat Bots";

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-lg font-semibold text-foreground">Replace Your Discord Bots</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={scanBots}
            disabled={loading}
            className="gap-1.5"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Scanning…
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                {scanned ? "Re-scan" : "Find Alternatives"}
              </>
            )}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          We detected <strong>{botNames.length} bot{botNames.length !== 1 ? "s" : ""}</strong> from your Discord server.
          Scan to find Stoat equivalents.
        </p>
      </div>

      {/* Empty state */}
      {!scanned && !loading && (
        <div className="px-6 py-8 text-center">
          <Bot className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Click <strong>Find Alternatives</strong> to search for Stoat bots that match your Discord bots.
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1.5">
            {botNames.join(", ")}
          </p>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="px-5 py-10 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
          <p className="text-sm text-muted-foreground">Analyzing bots and finding Stoat equivalents…</p>
        </div>
      )}

      {/* Results grid */}
      {scanned && !loading && suggestions.length > 0 && (
        <div className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {suggestions.map((bot, index) => {
              const expanded = expandedBot === bot.discordBotName;
              const hasEquivalent = bot.stoatBotName !== "No equivalent";
              const colorClass = BOT_COLORS[index % BOT_COLORS.length];

              return (
                <BotCard
                  key={bot.discordBotName}
                  bot={bot}
                  expanded={expanded}
                  hasEquivalent={hasEquivalent}
                  colorClass={colorClass}
                  onToggleExpand={() => setExpandedBot(expanded ? null : bot.discordBotName)}
                  getBotLink={getBotLink}
                  getBotLabel={getBotLabel}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* No results */}
      {scanned && !loading && suggestions.length === 0 && (
        <div className="px-6 py-5 text-center">
          <p className="text-sm text-muted-foreground">
            No equivalent bots found. Browse the{" "}
            <a href="https://stoat.chat/discover/bots" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              Stoat bot directory
            </a>{" "}
            manually.
          </p>
        </div>
      )}

      {/* Disclaimer */}
      {scanned && !loading && suggestions.length > 0 && (
        <div className="px-6 py-3 border-t border-border">
          <p className="text-[11px] text-muted-foreground text-center">
            Direct links go to the bot's invite page on{" "}
            <a href="https://stoat.chat/discover/bots" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
              stoat.chat
            </a>
            . Verify the bot before adding it to your server.
          </p>
        </div>
      )}
    </div>
  );
};

/* ── Individual bot card ── */

interface BotCardProps {
  bot: BotSuggestion;
  expanded: boolean;
  hasEquivalent: boolean;
  colorClass: string;
  onToggleExpand: () => void;
  getBotLink: (bot: BotSuggestion) => string;
  getBotLabel: (bot: BotSuggestion) => string;
}

const BotCard = ({ bot, expanded, hasEquivalent, colorClass, onToggleExpand, getBotLink, getBotLabel }: BotCardProps) => {
  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card flex flex-col">
      {/* Banner */}
      <div
        className={`h-24 relative ${!bot.bannerUrl ? colorClass : ""}`}
        style={
          !bot.bannerUrl && bot.bannerColor
            ? { backgroundColor: bot.bannerColor }
            : undefined
        }
      >
        {bot.bannerUrl ? (
          <img
            src={bot.bannerUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          !bot.bannerColor && (
            <div className="w-full h-full flex items-center justify-center">
              <Bot className="w-8 h-8 text-primary-foreground/50" />
            </div>
          )
        )}

        {/* Avatar overlapping banner */}
        <div className="absolute -bottom-5 left-4">
          <div className="w-10 h-10 rounded-full border-2 border-card bg-muted flex items-center justify-center overflow-hidden">
            {bot.avatarUrl ? (
              <img src={bot.avatarUrl} alt={bot.stoatBotName} className="w-full h-full object-cover" />
            ) : (
              <Bot className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </div>

      {/* Card body */}
      <div className="p-4 pt-8 flex flex-col flex-1">
        <h3 className={`text-sm font-semibold ${hasEquivalent ? "text-foreground" : "text-muted-foreground italic"}`}>
          {hasEquivalent ? bot.stoatBotName : "No equivalent found"}
        </h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Replaces: {bot.discordBotName}
        </p>
        <p className="text-xs text-muted-foreground mt-2 flex-1">
          {bot.description}
        </p>

        {/* Tags */}
        {bot.commands.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {bot.commands.slice(0, 3).map((c, i) => (
              <span
                key={i}
                className="text-[10px] bg-secondary px-1.5 py-0.5 rounded font-mono text-foreground"
              >
                {c}
              </span>
            ))}
            {bot.commands.length > 3 && (
              <span className="text-[10px] text-muted-foreground">
                +{bot.commands.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-3 flex flex-col gap-1.5">
          {hasEquivalent && (
            <a
              href={getBotLink(bot)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg px-3 py-2 hover:opacity-90 transition-opacity w-full"
            >
              <ExternalLink className="w-3 h-3" />
              {getBotLabel(bot)}
            </a>
          )}

          <Collapsible open={expanded} onOpenChange={onToggleExpand}>
            <CollapsibleTrigger asChild>
              <button className="w-full inline-flex items-center justify-center gap-1 text-[11px] text-muted-foreground hover:text-foreground py-1 transition-colors">
                {expanded ? (
                  <>
                    Hide details
                    <ChevronUp className="w-3 h-3" />
                  </>
                ) : (
                  <>
                    Compare features
                    <ChevronDown className="w-3 h-3" />
                  </>
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="pt-2 space-y-2 border-t border-border mt-2">
                {bot.similarities.length > 0 && (
                  <div>
                    <h4 className="text-[11px] font-semibold text-foreground mb-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-success" />
                      Similar
                    </h4>
                    <ul className="space-y-0.5">
                      {bot.similarities.map((s, i) => (
                        <li key={i} className="text-[11px] text-muted-foreground pl-4">• {s}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {bot.missingFeatures.length > 0 && (
                  <div>
                    <h4 className="text-[11px] font-semibold text-foreground mb-1 flex items-center gap-1">
                      <XCircle className="w-3 h-3 text-destructive" />
                      Missing
                    </h4>
                    <ul className="space-y-0.5">
                      {bot.missingFeatures.map((f, i) => (
                        <li key={i} className="text-[11px] text-muted-foreground pl-4">• {f}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {bot.commands.length > 0 && (
                  <div>
                    <h4 className="text-[11px] font-semibold text-foreground mb-1 flex items-center gap-1">
                      <Terminal className="w-3 h-3 text-muted-foreground" />
                      Commands
                    </h4>
                    <div className="flex flex-wrap gap-1 pl-4">
                      {bot.commands.map((c, i) => (
                        <span key={i} className="text-[10px] bg-secondary px-1.5 py-0.5 rounded font-mono text-foreground">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </div>
  );
};

export default BotAdvisor;
