import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useSession } from "@/contexts/SessionContext";
import Layout from "@/components/Layout";
import { stoatApi } from "@/lib/api";
import { toast } from "sonner";
import type { MappingConfig } from "@/pages/MappingPage";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowLeft,
  Play,
  Server,
  Users,
  Hash,
  Shield,
  Image,
  Smile,
  ExternalLink,
  Clock,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Trash2,
  RotateCcw,
  Info,
} from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ScanResult } from "@/lib/api";
import TransitionKit from "@/components/TransitionKit";
import StepIndicator from "@/components/StepIndicator";

interface TransferStep {
  id: string;
  label: string;
  icon: React.ElementType;
  status: "pending" | "running" | "done" | "error" | "skipped";
  detail?: string;
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
interface StepStats {
  success: number;
  failed: number;
  skipped: number;
  errors: string[];
}

const TransferSummary = ({
  stats,
  steps,
  duration,
  stoatServerId,
}: {
  stats: Record<string, StepStats>;
  steps: TransferStep[];
  duration: number;
  stoatServerId: string;
}) => {
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  const totalSuccess = Object.values(stats).reduce((a, s) => a + s.success, 0);
  const totalFailed = Object.values(stats).reduce((a, s) => a + s.failed, 0);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  return (
    <div className="mb-10 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-success/10 border border-success/20 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-success">{totalSuccess}</p>
          <p className="text-xs text-muted-foreground">Succeeded</p>
        </div>
        <div className={`border rounded-xl p-4 text-center ${totalFailed > 0 ? "bg-destructive/10 border-destructive/20" : "bg-secondary border-border"}`}>
          <p className={`text-2xl font-bold ${totalFailed > 0 ? "text-destructive" : "text-muted-foreground"}`}>{totalFailed}</p>
          <p className="text-xs text-muted-foreground">Failed</p>
        </div>
        <div className="bg-secondary border border-border rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-1.5">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <p className="text-2xl font-bold text-foreground">{formatDuration(duration)}</p>
          </div>
          <p className="text-xs text-muted-foreground">Duration</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 bg-secondary/50 border-b border-border">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Step Breakdown</span>
        </div>
        <div className="divide-y divide-border">
          {steps.map((step) => {
            const s = stats[step.id];
            const hasErrors = s && s.errors.length > 0;
            const isExpanded = expandedStep === step.id;

            return (
              <div key={step.id}>
                <button
                  onClick={() => hasErrors && setExpandedStep(isExpanded ? null : step.id)}
                  className={`w-full flex items-center gap-3 px-5 py-3 text-left ${hasErrors ? "cursor-pointer hover:bg-secondary/30" : "cursor-default"} transition-colors`}
                >
                  <step.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-foreground flex-1">{step.label}</span>
                  {s ? (
                    <div className="flex items-center gap-3 text-xs">
                      {s.success > 0 && <span className="text-success">{s.success} ✓</span>}
                      {s.failed > 0 && <span className="text-destructive">{s.failed} ✗</span>}
                      {s.skipped > 0 && <span className="text-muted-foreground">{s.skipped} skipped</span>}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                  {hasErrors && (
                    isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
                {hasErrors && isExpanded && (
                  <div className="px-5 pb-3">
                    <div className="bg-destructive/5 border border-destructive/10 rounded-lg p-3 space-y-1">
                      {s.errors.map((err, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <AlertTriangle className="w-3 h-3 text-destructive mt-0.5 shrink-0" />
                          <span className="text-muted-foreground">{err}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const TransferPage = () => {
  const session = useSession();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [transferring, setTransferring] = useState(false);
  const [completed, setCompleted] = useState(false);
  const abortRef = useRef(false);

  // Navigation guard - browser close/reload during transfer
  useEffect(() => {
    if (!transferring) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [transferring]);

  const [stoatServerId, setStoatServerId] = useState<string>("");
  const [transferStats, setTransferStats] = useState<Record<string, StepStats>>({});
  const [transferDuration, setTransferDuration] = useState<number>(0);
  const transferStartRef = useRef<number>(0);

  const scanData = session.scanData;
  const mappingData = session.mappingData;
  const stoatToken = session.stoatToken;

  // Transfer mode: new server vs existing
  const [transferMode, setTransferMode] = useState<"new" | "existing">("new");
  const [existingServerId, setExistingServerId] = useState<string>("");
  const [existingServers, setExistingServers] = useState<{ id: string; name: string; icon: string | null }[]>([]);
  const [loadingServers, setLoadingServers] = useState(false);
  const [existingMode, setExistingMode] = useState<"merge" | "replace">("merge");

  const fetchExistingServers = useCallback(async () => {
    if (!stoatToken) return;
    setLoadingServers(true);
    try {
      const servers = await stoatApi("list_servers", {}, stoatToken);
      setExistingServers(Array.isArray(servers) ? servers : []);
    } catch (err: any) {
      toast.error("Failed to fetch servers: " + err.message);
      setExistingServers([]);
    } finally {
      setLoadingServers(false);
    }
  }, [stoatToken]);

  const [steps, setSteps] = useState<TransferStep[]>([
    ...(transferMode === "existing" && existingMode === "replace" ? [{ id: "clear", label: "Clear existing server", icon: Trash2, status: "pending" as const }] : []),
    { id: "server", label: transferMode === "existing" ? "Use existing server" : "Create Stoat server", icon: Server, status: "pending" },
    { id: "branding", label: "Transfer icon & banner", icon: Image, status: "pending" },
    { id: "roles", label: "Create roles & permissions", icon: Users, status: "pending" },
    { id: "categories", label: "Create categories", icon: Hash, status: "pending" },
    { id: "channels", label: "Create channels", icon: Hash, status: "pending" },
    { id: "permissions", label: "Set channel permissions", icon: Shield, status: "pending" },
    { id: "emojis", label: "Transfer emojis", icon: Smile, status: "pending" },
  ]);

  // Update steps when mode changes
  useEffect(() => {
    if (transferring || completed) return;
    setSteps([
      ...(transferMode === "existing" && existingMode === "replace" ? [{ id: "clear", label: "Clear existing server", icon: Trash2, status: "pending" as const }] : []),
      { id: "server", label: transferMode === "existing" ? "Use existing server" : "Create Stoat server", icon: Server, status: "pending" as const },
      { id: "branding", label: "Transfer icon & banner", icon: Image, status: "pending" as const },
      { id: "roles", label: "Create roles & permissions", icon: Users, status: "pending" as const },
      { id: "categories", label: "Create categories", icon: Hash, status: "pending" as const },
      { id: "channels", label: "Create channels", icon: Hash, status: "pending" as const },
      { id: "permissions", label: "Set channel permissions", icon: Shield, status: "pending" as const },
      { id: "emojis", label: "Transfer emojis", icon: Smile, status: "pending" as const },
    ]);
  }, [transferMode, existingMode, transferring, completed]);

  const updateStep = useCallback(
    (id: string, update: Partial<TransferStep>) => {
      setSteps((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...update } : s))
      );
    },
    []
  );

  useEffect(() => {
    if (!scanData || !stoatToken) {
      navigate("/connect");
      return;
    }
    setLoading(false);
  }, []);

  const runTransfer = async () => {
    if (!scanData) return;
    setTransferring(true);
    abortRef.current = false;

    const roleMap: Record<string, string> = {};
    const channelMap: Record<string, string> = {};
    let serverId = "";
    transferStartRef.current = Date.now();
    const stats: Record<string, StepStats> = {};
    const trackSuccess = (step: string) => {
      if (!stats[step]) stats[step] = { success: 0, failed: 0, skipped: 0, errors: [] };
      stats[step].success++;
    };
    const trackFail = (step: string, msg: string) => {
      if (!stats[step]) stats[step] = { success: 0, failed: 0, skipped: 0, errors: [] };
      stats[step].failed++;
      stats[step].errors.push(msg);
    };
    const trackSkip = (step: string) => {
      if (!stats[step]) stats[step] = { success: 0, failed: 0, skipped: 0, errors: [] };
      stats[step].skipped++;
    };

    try {
      // Step 1: Create server or use existing
      const serverName = mappingData?.serverName || scanData.guild.name;
      const serverDescription = mappingData?.serverDescription || "Migrated from Discord";

      // Step 0 (conditional): Clear existing server
      if (transferMode === "existing" && existingMode === "replace" && existingServerId) {
        updateStep("clear", { status: "running", detail: "Clearing existing server content…" });
        try {
          const result = await stoatApi("clear_server", { server_id: existingServerId }, stoatToken);
          trackSuccess("clear");
          updateStep("clear", {
            status: "done",
            detail: `Cleared: ${result.channels_deleted} channels, ${result.roles_deleted} roles`,
          });
        } catch (err: any) {
          trackFail("clear", err.message);
          updateStep("clear", { status: "error", detail: err.message });
          throw err;
        }
        if (abortRef.current) return;
      }




      if (transferMode === "existing" && existingServerId) {
        const selectedServer = existingServers.find(s => s.id === existingServerId);
        serverId = existingServerId;
        setStoatServerId(serverId);
        trackSuccess("server");
        updateStep("server", { status: "done", detail: `Using existing server: ${selectedServer?.name || serverId}` });
      } else {
        updateStep("server", { status: "running", detail: `Creating "${serverName}"…` });
        const server = await stoatApi("create_server", {
          name: serverName,
          description: serverDescription,
        }, stoatToken);
        serverId = server.server?._id || server._id || server.id;
        setStoatServerId(serverId);
        trackSuccess("server");
        updateStep("server", { status: "done", detail: `Server created (${serverId})` });
      }

      if (abortRef.current) return;

      // Step 2: Transfer icon & banner
      updateStep("branding", { status: "running" });
      const shouldTransferIcon = mappingData ? mappingData.includeIcon : !!scanData.guild.icon;
      const shouldTransferBanner = mappingData ? mappingData.includeBanner : !!scanData.guild.banner;

      if (shouldTransferIcon) {
        const iconUrl = mappingData?.customIconUrl
          || (scanData.guild.icon ? `https://cdn.discordapp.com/icons/${scanData.guild.id}/${scanData.guild.icon}.png?size=512` : null);
        if (iconUrl) {
          updateStep("branding", { detail: "Uploading server icon…" });
          try {
            await stoatApi("set_server_icon", { server_id: serverId, icon_url: iconUrl }, stoatToken);
            trackSuccess("branding");
          } catch (err: any) {
            trackFail("branding", `Icon: ${err.message}`);
          }
          await delay(1000);
        } else {
          trackSkip("branding");
        }
      } else {
        trackSkip("branding");
      }

      if (shouldTransferBanner) {
        const bannerUrl = mappingData?.customBannerUrl
          || (scanData.guild.banner ? `https://cdn.discordapp.com/banners/${scanData.guild.id}/${scanData.guild.banner}.png?size=1024` : null);
        if (bannerUrl) {
          updateStep("branding", { detail: "Uploading server banner…" });
          try {
            await stoatApi("set_server_banner", { server_id: serverId, banner_url: bannerUrl }, stoatToken);
            trackSuccess("branding");
          } catch (err: any) {
            trackFail("branding", `Banner: ${err.message}`);
          }
        } else {
          trackSkip("branding");
        }
      } else {
        trackSkip("branding");
      }

      const bs = stats["branding"];
      if (!bs || (bs.success === 0 && bs.failed === 0)) {
        updateStep("branding", { status: "skipped", detail: "No icon or banner to transfer" });
      } else {
        updateStep("branding", { status: bs.failed > 0 ? "error" : "done", detail: `${bs.success} asset(s) transferred${bs.failed ? `, ${bs.failed} failed` : ""}` });
      }

      if (abortRef.current) return;

      // Step 3: Create roles with permissions
      updateStep("roles", { status: "running" });
      const rolesToCreate = mappingData
        ? mappingData.roles.filter((r) => r.included && !r.isDefault).map((mr) => {
            const orig = scanData.roles.find((r) => r.id === mr.discordId);
            return orig ? { ...orig, name: mr.name, _stoatPerms: mr.stoatPermissions } : null;
          }).filter(Boolean) as (typeof scanData.roles[0] & { _stoatPerms?: { allow: number; deny: number } })[]
        : scanData.roles.filter((r) => !r.managed && !(r as any).isDefault);
      for (let i = 0; i < rolesToCreate.length; i++) {
        const role = rolesToCreate[i];
        updateStep("roles", {
          detail: `Creating role "${role.name}" (${i + 1}/${rolesToCreate.length})`,
        });
        try {
          const created = await stoatApi("create_role", {
            server_id: serverId,
            name: role.name,
            rank: role.position,
          }, stoatToken);
          const createdId = created.id || created._id;
          roleMap[role.id] = createdId;

          await delay(500);

          if (createdId) {
            // Step A: PATCH colour/hoist (no permissions here)
            const patchBody: Record<string, any> = {};
            if (role.color) {
              patchBody.colour = `#${role.color.toString(16).padStart(6, "0")}`;
            }
            patchBody.hoist = role.hoist;

            if (Object.keys(patchBody).length > 0) {
              try {
                await stoatApi("edit_role", {
                  server_id: serverId,
                  role_id: createdId,
                  ...patchBody,
                }, stoatToken);
              } catch (err: any) {
                trackFail("roles", `${role.name} (edit): ${err.message}`);
              }
              await delay(500);
            }

            // Step B: PUT permissions via dedicated endpoint
            const stoatPerms = (role as any)._stoatPerms as { allow: number; deny: number } | undefined;
            if (stoatPerms !== undefined && stoatPerms !== null) {
              try {
                await stoatApi("set_role_permissions", {
                  server_id: serverId,
                  role_id: createdId,
                  stoat_allow: stoatPerms.allow,
                  stoat_deny: stoatPerms.deny,
                }, stoatToken);
              } catch (err: any) {
                trackFail("roles", `${role.name} (permissions): ${err.message}`);
              }
              await delay(500);
            } else if (role.permissions) {
              // Fallback: map from Discord permissions
              try {
                await stoatApi("set_role_permissions", {
                  server_id: serverId,
                  role_id: createdId,
                  discord_permissions: role.permissions,
                }, stoatToken);
              } catch (err: any) {
                trackFail("roles", `${role.name} (permissions): ${err.message}`);
              }
              await delay(500);
            }
          }

          trackSuccess("roles");
        } catch (err: any) {
          trackFail("roles", `${role.name}: ${err.message}`);
        }
        await delay(500);
        if (abortRef.current) return;
      }
      // Apply default role permissions
      const defaultRole = mappingData?.roles.find((r) => r.isDefault && r.included);
      if (defaultRole && defaultRole.stoatPermissions !== undefined) {
        updateStep("roles", { detail: "Setting default role permissions…" });
        try {
          await stoatApi("set_default_permissions", {
            server_id: serverId,
            permissions: { a: defaultRole.stoatPermissions.allow, d: defaultRole.stoatPermissions.deny },
          }, stoatToken);
          trackSuccess("roles");
        } catch (err: any) {
          trackFail("roles", `Default role: ${err.message}`);
        }
        await delay(500);
      }
      updateStep("roles", { status: "done", detail: `${rolesToCreate.length} roles created with permissions` });

      // Step 4: Create categories
      updateStep("categories", { status: "running" });
      const categoryMap: Record<string, string> = {};
      const realCategories = mappingData
        ? mappingData.categories.filter((c) => c.included && c.discordId !== null).map((mc) => {
            const orig = scanData.categories.find((c) => c.id === mc.discordId);
            return orig ? { ...orig, name: mc.name } : null;
          }).filter(Boolean) as typeof scanData.categories
        : scanData.categories.filter((cat) => cat.id !== null);

      if (realCategories.length === 0) {
        updateStep("categories", { status: "skipped", detail: "No categories to create" });
      } else {
        for (let i = 0; i < realCategories.length; i++) {
          const cat = realCategories[i];
          updateStep("categories", {
            detail: `Creating "${cat.name}" (${i + 1}/${realCategories.length})`,
          });
          try {
            const created = await stoatApi("create_category", {
              server_id: serverId,
              name: cat.name,
            }, stoatToken);
            const createdId = created._id || created.id;
            categoryMap[cat.id!] = createdId;
            trackSuccess("categories");
          } catch (err: any) {
            trackFail("categories", `${cat.name}: ${err.message}`);
          }
          await delay(800);
          if (abortRef.current) return;
        }
        updateStep("categories", { status: "done", detail: `${realCategories.length} categories created` });
      }

      if (abortRef.current) return;

      // Step 5: Create channels
      updateStep("channels", { status: "running" });

      let supportedChannels: { id: string; name: string; typeName: string; topic?: string | null; nsfw?: boolean; categoryId: string | null; permission_overwrites: any[] }[];

      if (mappingData) {
        supportedChannels = [];
        for (const mc of mappingData.categories) {
          const origCat = scanData.categories.find((c) => c.id === mc.discordId);
          for (const mch of mc.channels) {
            if (!mch.included) continue;
            const origCh = origCat?.channels.find((c) => c.id === mch.discordId);
            if (origCh) {
              supportedChannels.push({
                ...origCh,
                name: mch.name,
                topic: mch.topic !== undefined ? mch.topic : origCh.topic,
                nsfw: mch.nsfw !== undefined ? mch.nsfw : origCh.nsfw,
                categoryId: mc.discordId,
              });
            }
          }
        }
      } else {
        const allChannels = scanData.categories.flatMap((cat) =>
          cat.channels.map((ch) => ({ ...ch, categoryId: cat.id, categoryName: cat.name }))
        );
        supportedChannels = allChannels.filter((ch) =>
          ["text", "voice", "announcement"].includes(ch.typeName)
        );
      }

      for (let i = 0; i < supportedChannels.length; i++) {
        const ch = supportedChannels[i];
        updateStep("channels", {
          detail: `Creating #${ch.name} (${i + 1}/${supportedChannels.length})`,
        });
        try {
          const chType = ch.typeName === "voice" ? "Voice" : "Text";
          const description = ch.topic || undefined;
          const created = await stoatApi("create_channel", {
            server_id: serverId,
            name: ch.name,
            channel_type: chType,
            ...(description && { description }),
            nsfw: ch.nsfw || false,
          }, stoatToken);
          const createdId = created._id || created.id;
          channelMap[ch.id] = createdId;

          const stoatCatId = ch.categoryId ? categoryMap[ch.categoryId] : null;
          if (stoatCatId && createdId) {
            try {
              await delay(300);
              await stoatApi("move_channel_to_category", {
                server_id: serverId,
                category_id: stoatCatId,
                channel_id: createdId,
              }, stoatToken);
            } catch {
              // Best-effort
            }
          }

          trackSuccess("channels");
        } catch (err: any) {
          trackFail("channels", `#${ch.name}: ${err.message}`);
        }
        await delay(500);
        if (abortRef.current) return;
      }
      updateStep("channels", { status: "done", detail: `${supportedChannels.length} channels created` });

      // Step 6: Set channel permissions
      updateStep("permissions", { status: "running" });
      let permCount = 0;

      if (mappingData) {
        // ── Mapping data exists: use isPrivate flag + permissionOverrides ──

        // Pre-count total API calls for progress display
        let totalPermCalls = 0;
        for (const mc of mappingData.categories) {
          for (const mch of mc.channels) {
            if (!mch.included) continue;
            if (!channelMap[mch.discordId]) continue;
            const isPrivate = (mch as any).isPrivate || mch.permissionOverrides?.some((o: any) => o.canView === false);
            const hasPublicSendDeny = !isPrivate && mch.permissionOverrides?.some((o: any) => o.canView !== false && o.canSend === false);
            if (isPrivate || hasPublicSendDeny) totalPermCalls++; // default deny/send-deny
            for (const override of (mch.permissionOverrides || [])) {
              if (!roleMap[override.roleDiscordId]) continue;
              // Skip fully neutral overrides (both null = no override needed)
              if (override.canView === null && override.canSend === null) continue;
              // Skip redundant: private + denied = already blocked by default deny
              if (isPrivate && override.canView === false) continue;
              totalPermCalls++;
            }
          }
        }

        // Pass 1: deny "default" role on private channels OR public channels with send restrictions
        for (const mc of mappingData.categories) {
          for (const mch of mc.channels) {
            if (!mch.included) continue;
            const stoatChId = channelMap[mch.discordId];
            if (!stoatChId) continue;

            const isPrivate = (mch as any).isPrivate || mch.permissionOverrides?.some((o: any) => o.canView === false);
            // Check if this is a public channel where some roles are denied send (read-only channel)
            const hasPublicSendDeny = !isPrivate && mch.permissionOverrides?.some((o: any) => o.canView !== false && o.canSend === false);

            if (isPrivate) {
              updateStep("permissions", { detail: `Setting override ${permCount + 1} of ${totalPermCalls}…` });
              try {
                await stoatApi("set_permissions", {
                  channel_id: stoatChId,
                  role_id: "default",
                  allow: 0,
                  deny: (1 << 20) | (1 << 22),
                }, stoatToken);
                permCount++;
              } catch {
                trackFail("permissions", `Default deny on #${mch.name}`);
              }
              await delay(300);
            } else if (hasPublicSendDeny) {
              // Public read-only channel: deny send for default role, keep view allowed
              updateStep("permissions", { detail: `Setting override ${permCount + 1} of ${totalPermCalls}…` });
              try {
                await stoatApi("set_permissions", {
                  channel_id: stoatChId,
                  role_id: "default",
                  allow: (1 << 20),
                  deny: (1 << 22),
                }, stoatToken);
                permCount++;
              } catch {
                trackFail("permissions", `Default send-deny on #${mch.name}`);
              }
              await delay(300);
            }
          }
        }

        // Pass 2: apply role-specific overrides (filtered)
        for (const mc of mappingData.categories) {
          for (const mch of mc.channels) {
            if (!mch.included || !mch.permissionOverrides?.length) continue;
            const stoatChId = channelMap[mch.discordId];
            if (!stoatChId) continue;

            const isPrivate = (mch as any).isPrivate || mch.permissionOverrides?.some((o: any) => o.canView === false);

            for (const override of mch.permissionOverrides) {
              const stoatRoleId = roleMap[override.roleDiscordId];
              if (!stoatRoleId) continue;

              // Skip fully neutral overrides
              if (override.canView === null && override.canSend === null) continue;
              // Skip redundant: private + denied = already blocked by default deny
              if (isPrivate && override.canView === false) continue;

              let allow = 0;
              let deny = 0;
              // Tri-state: true=allow bit, false=deny bit, null=nothing (inherit)
              if (override.canView === true) allow |= (1 << 20);
              else if (override.canView === false) deny |= (1 << 20) | (1 << 22);

              if (override.canView !== false) {
                if (override.canSend === true) allow |= (1 << 22);
                else if (override.canSend === false) deny |= (1 << 22);
              }

              updateStep("permissions", { detail: `Setting override ${permCount + 1} of ${totalPermCalls}…` });
              try {
                await stoatApi("set_permissions", {
                  channel_id: stoatChId,
                  role_id: stoatRoleId,
                  allow,
                  deny,
                }, stoatToken);
                trackSuccess("permissions");
                permCount++;
              } catch {
                trackFail("permissions", `Custom override on #${mch.name}`);
              }
              await delay(300);
            }
          }
        }
      } else {
        // ── No mapping data: use raw Discord permission_overwrites ──

        // Pass 1: deny "default" role on private channels
        for (const ch of supportedChannels) {
          const stoatChId = channelMap[ch.id];
          if (!stoatChId || !ch.permission_overwrites?.length) continue;

          const hasDenyView = ch.permission_overwrites.some((ow: any) => {
            const denyBits = BigInt(ow.deny || "0");
            return (denyBits & (1n << 10n)) !== 0n;
          });
          if (hasDenyView) {
            try {
              await stoatApi("set_permissions", {
                channel_id: stoatChId,
                role_id: "default",
                allow: 0,
                deny: (1 << 20) | (1 << 22),
              }, stoatToken);
              permCount++;
            } catch {
              trackFail("permissions", `Default deny on #${ch.name}`);
            }
            await delay(300);
          }
        }

        // Pass 2: apply role-specific overrides
        for (const ch of supportedChannels) {
          const stoatChId = channelMap[ch.id];
          if (!stoatChId || !ch.permission_overwrites?.length) continue;

          for (const overwrite of ch.permission_overwrites) {
            const stoatRoleId = roleMap[overwrite.id];
            if (!stoatRoleId) continue;

            try {
              await stoatApi("set_permissions", {
                channel_id: stoatChId,
                role_id: stoatRoleId,
                discord_allow: overwrite.allow || "0",
                discord_deny: overwrite.deny || "0",
              }, stoatToken);
              trackSuccess("permissions");
              permCount++;
            } catch {
              trackFail("permissions", `Override on channel ${ch.name}`);
            }
            await delay(300);
          }
          if (abortRef.current) return;
        }
      }

      updateStep("permissions", {
        status: "done",
        detail: `${permCount} permission overrides mapped`,
      });

      // Step 7: Transfer emojis
      updateStep("emojis", { status: "running" });
      const emojis = mappingData
        ? mappingData.emojis.filter((e) => e.included).map((me) => {
            const orig = (scanData.emojis || []).find((e) => e.id === me.discordId);
            return orig ? { ...orig, name: me.name } : null;
          }).filter(Boolean) as typeof scanData.emojis
        : scanData.emojis || [];
      if (emojis.length === 0) {
        updateStep("emojis", { status: "skipped", detail: "No emojis to transfer" });
      } else {
        for (let i = 0; i < emojis.length; i++) {
          const emoji = emojis[i];
          updateStep("emojis", {
            detail: `Uploading :${emoji.name}: (${i + 1}/${emojis.length})`,
          });
          try {
            await stoatApi("create_emoji", {
              server_id: serverId,
              name: emoji.name,
              emoji_url: emoji.url,
            }, stoatToken);
            trackSuccess("emojis");
          } catch (err: any) {
            trackFail("emojis", `:${emoji.name}: ${err.message}`);
          }
          await delay(1000);
          if (abortRef.current) return;
        }
        const es = stats["emojis"];
        updateStep("emojis", { status: es?.failed ? "error" : "done", detail: `${es?.success || 0}/${emojis.length} emojis transferred` });
      }

      // Custom channels
      if (mappingData && mappingData.customChannels.length > 0) {
        for (const cc of mappingData.customChannels) {
          try {
            const created = await stoatApi("create_channel", {
              server_id: serverId,
              name: cc.name,
              channel_type: cc.type,
            }, stoatToken);
            const createdId = created._id || created.id;
            const catDiscordId = mappingData.categories[cc.categoryIndex]?.discordId;
            if (catDiscordId && categoryMap[catDiscordId] && createdId) {
              await delay(300);
              try {
                await stoatApi("move_channel_to_category", {
                  server_id: serverId,
                  category_id: categoryMap[catDiscordId],
                  channel_id: createdId,
                }, stoatToken);
              } catch { /* best effort */ }
            }
            // Deny default role if private
            if (createdId && (cc as any).isPrivate) {
              try {
                await stoatApi("set_permissions", {
                  channel_id: createdId,
                  role_id: "default",
                  allow: 0,
                  deny: (1 << 20) | (1 << 22),
                }, stoatToken);
                permCount++;
              } catch {
                trackFail("permissions", `Default deny on custom #${cc.name}`);
              }
              await delay(300);
            }
            if (createdId && cc.permissionOverrides?.length) {
              const ccIsPrivate = (cc as any).isPrivate;
              for (const override of cc.permissionOverrides) {
                const stoatRoleId = roleMap[override.roleDiscordId];
                if (!stoatRoleId) continue;

                // Skip redundant overrides
                if (ccIsPrivate && !override.canView) continue;
                if (!ccIsPrivate && override.canView && override.canSend) continue;

                let allow = 0;
                let deny = 0;
                if (!override.canView) {
                  deny |= (1 << 20) | (1 << 22);
                } else {
                  allow |= (1 << 20);
                  if (!override.canSend) deny |= (1 << 22);
                  else allow |= (1 << 22);
                }
                try {
                  await stoatApi("set_permissions", {
                    channel_id: createdId,
                    role_id: stoatRoleId,
                    allow,
                    deny,
                  }, stoatToken);
                  trackSuccess("permissions");
                } catch {
                  trackFail("permissions", `Custom override on #${cc.name}`);
                }
                await delay(300);
              }
            }
            trackSuccess("channels");
          } catch (err: any) {
            trackFail("channels", `Custom #${cc.name}: ${err.message}`);
          }
          await delay(500);
        }
      }

      // Custom roles
      if (mappingData && mappingData.customRoles.length > 0) {
        for (const cr of mappingData.customRoles) {
          try {
            const created = await stoatApi("create_role", {
              server_id: serverId,
              name: cr.name,
              rank: 0,
            }, stoatToken);
            const createdId = created.id || created._id;
            if (createdId) {
              await delay(300);
              if (cr.color) {
                await stoatApi("edit_role", {
                  server_id: serverId,
                  role_id: createdId,
                  colour: cr.color,
                }, stoatToken);
                await delay(300);
              }
              if (cr.stoatPermissions !== undefined && cr.stoatPermissions !== null) {
                try {
                  await stoatApi("edit_role", {
                    server_id: serverId,
                    role_id: createdId,
                    permissions: { a: cr.stoatPermissions, d: 0 },
                  }, stoatToken);
                } catch {
                  // non-critical
                }
                await delay(300);
              }
              roleMap[`custom-role-${mappingData.customRoles.indexOf(cr)}`] = createdId;
            }
            trackSuccess("roles");
          } catch (err: any) {
            trackFail("roles", `Custom ${cr.name}: ${err.message}`);
          }
          await delay(500);
        }
      }

      // Custom categories
      if (mappingData && mappingData.customCategories?.length > 0) {
        for (const cc of mappingData.customCategories) {
          try {
            await stoatApi("create_category", {
              server_id: serverId,
              name: cc.name,
            }, stoatToken);
            trackSuccess("categories");
          } catch (err: any) {
            trackFail("categories", `Custom ${cc.name}: ${err.message}`);
          }
          await delay(800);
        }
      }

      // Finalize
      setTransferStats(stats);
      setTransferDuration(Math.round((Date.now() - transferStartRef.current) / 1000));

      session.setStoatServerId(serverId);
      session.setTransferResult({ roleMap, channelMap, stoatServerId: serverId, stats: JSON.parse(JSON.stringify(stats)) });

      setCompleted(true);
      toast.success("Transfer complete! 🎉");
      navigate("/post-transfer");
    } catch (err: any) {
      const failedStep = steps.find((s) => s.status === "running");
      if (failedStep) {
        updateStep(failedStep.id, { status: "error", detail: err.message });
      }
      toast.error("Transfer failed: " + err.message);
    } finally {
      setTransferring(false);
    }
  };

  const statusIcon = (step: TransferStep) => {
    if (step.status === "running") return <Loader2 className="w-5 h-5 animate-spin" />;
    if (step.status === "done") return <CheckCircle2 className="w-5 h-5" />;
    if (step.status === "error") return <XCircle className="w-5 h-5" />;
    if (step.status === "skipped") return <CheckCircle2 className="w-5 h-5 opacity-50" />;
    const Icon = step.icon;
    return <Icon className="w-5 h-5" />;
  };

  const statusColor = (status: TransferStep["status"]) => {
    switch (status) {
      case "done": return "bg-success/20 text-success";
      case "running": return "bg-primary/20 text-primary";
      case "error": return "bg-destructive/20 text-destructive";
      case "skipped": return "bg-secondary text-muted-foreground/50";
      default: return "bg-secondary text-muted-foreground";
    }
  };

  const textColor = (status: TransferStep["status"]) => {
    switch (status) {
      case "done": return "text-foreground";
      case "running": return "text-primary";
      case "error": return "text-destructive";
      case "skipped": return "text-muted-foreground/50 line-through";
      default: return "text-muted-foreground";
    }
  };

  return (
    <Layout>
      <div className="pt-28 pb-20 px-6">
        <div className="container mx-auto max-w-2xl">
          <StepIndicator currentStep={4} />
          {loading ? (
            <div className="text-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground text-sm">Loading…</p>
            </div>
          ) : (
            <>
              <Link
                to="/mapping"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Mapping Studio
              </Link>

              <div className="text-center mb-10">
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  {completed ? "Transfer Complete" : "Transfer to Stoat"}
                </h1>
                <p className="text-muted-foreground text-sm">
                  {completed
                    ? "Your Discord server structure has been recreated on Stoat."
                    : (() => {
                        if (mappingData) {
                          const chCount = mappingData.categories.reduce((s, c) => s + c.channels.filter(ch => ch.included).length, 0) + (mappingData.customChannels?.length || 0);
                          const rCount = mappingData.roles.filter(r => r.included).length + (mappingData.customRoles?.length || 0);
                          const eCount = mappingData.emojis.filter(e => e.included).length;
                          return `This will recreate "${mappingData.serverName}" on Stoat with ${chCount} channels, ${rCount} roles${eCount > 0 ? `, and ${eCount} emojis` : ""}.`;
                        }
                        return `This will recreate "${scanData?.guild.name}" on Stoat with ${scanData?.summary.totalChannels} channels, ${scanData?.summary.totalRoles} roles${(scanData?.summary.totalEmojis || 0) > 0 ? `, and ${scanData?.summary.totalEmojis} emojis` : ""}.`;
                      })()}
                </p>
              </div>

              {/* Progress Timeline */}
              <div className="space-y-1 mb-10">
                {steps.map((step, i) => {
                  const isLast = i === steps.length - 1;
                  return (
                    <div key={step.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${statusColor(step.status)}`}
                        >
                          {statusIcon(step)}
                        </div>
                        {!isLast && (
                          <div
                            className={`w-0.5 flex-1 min-h-[24px] ${
                              step.status === "done" || step.status === "skipped"
                                ? "bg-success/30"
                                : "bg-border"
                            }`}
                          />
                        )}
                      </div>

                      <div className="pb-6">
                        <p className={`text-sm font-medium ${textColor(step.status)}`}>
                          {step.label}
                        </p>
                        {step.detail && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {step.detail}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Summary Report */}
              {completed && Object.keys(transferStats).length > 0 && (
                <TransferSummary
                  stats={transferStats}
                  steps={steps}
                  duration={transferDuration}
                  stoatServerId={stoatServerId}
                />
              )}

              {completed && stoatServerId && (() => {
                const chCount = mappingData
                  ? mappingData.categories.reduce((s, c) => s + c.channels.filter(ch => ch.included).length, 0) + (mappingData.customChannels?.length || 0)
                  : scanData?.summary.totalChannels || 0;
                const rCount = mappingData
                  ? mappingData.roles.filter(r => r.included).length + (mappingData.customRoles?.length || 0)
                  : scanData?.summary.totalRoles || 0;
                return (
                  <TransitionKit
                    serverName={mappingData?.serverName || scanData?.guild.name || ""}
                    stoatServerId={stoatServerId}
                    channelCount={chCount}
                    roleCount={rCount}
                  />
                );
              })()}

              {/* Action Button */}
              <div className="text-center">
                {completed ? (
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    {stoatServerId && (
                      <a
                        href={`https://stoat.chat/server/${stoatServerId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-xl text-base font-semibold hover:opacity-90 transition-opacity"
                      >
                        Open in Stoat
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      onClick={() => {
                        setCompleted(false);
                        setTransferStats({});
                        setTransferDuration(0);
                        setStoatServerId("");
                        setTransferMode("new");
                        setExistingServerId("");
                        setExistingMode("merge");
                        setSteps(prev => prev.map(s => ({ ...s, status: "pending" as const, detail: undefined })));
                      }}
                      className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground px-8 py-4 text-base font-medium transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Transfer Again
                    </button>
                    <button
                      onClick={() => {
                        session.reset();
                        navigate("/connect");
                      }}
                      className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground px-8 py-4 text-base font-medium transition-colors"
                    >
                      Start new transfer
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Transfer mode selector */}
                    {!transferring && (
                      <div className="bg-card border border-border rounded-xl p-5 text-left max-w-md mx-auto">
                        <p className="text-sm font-semibold text-foreground mb-3">Transfer destination</p>
                        <RadioGroup
                          value={transferMode}
                          onValueChange={(val) => {
                            setTransferMode(val as "new" | "existing");
                            if (val === "existing" && existingServers.length === 0) {
                              fetchExistingServers();
                            }
                          }}
                          className="space-y-3"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="new" id="mode-new" />
                              <Label htmlFor="mode-new" className="text-sm cursor-pointer">Create new server</Label>
                            </div>
                            <p className="text-[11px] text-muted-foreground ml-6 mt-0.5">Creates a brand new Stoat server with everything from your mapping.</p>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="existing" id="mode-existing" />
                              <Label htmlFor="mode-existing" className="text-sm cursor-pointer">Use existing Stoat server</Label>
                            </div>
                            <p className="text-[11px] text-muted-foreground ml-6 mt-0.5">Transfers your mapping into a server you already have.</p>
                          </div>
                        </RadioGroup>

                        {transferMode === "existing" && (
                          <div className="mt-4 space-y-3">
                            {loadingServers ? (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Loading your servers…
                              </div>
                            ) : existingServers.length === 0 ? (
                              <p className="text-sm text-muted-foreground">No servers found on your Stoat account.</p>
                            ) : (
                              <Select value={existingServerId} onValueChange={setExistingServerId}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a server…" />
                                </SelectTrigger>
                                <SelectContent>
                                  {existingServers.map((srv) => (
                                    <SelectItem key={srv.id} value={srv.id}>
                                      {srv.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}

                            {existingServerId && (
                              <div className="mt-3 space-y-2">
                                <p className="text-xs font-semibold text-foreground">Transfer mode</p>
                                <RadioGroup
                                  value={existingMode}
                                  onValueChange={(val) => setExistingMode(val as "merge" | "replace")}
                                  className="space-y-2"
                                >
                                  <div>
                                    <div className="flex items-start gap-2">
                                      <RadioGroupItem value="merge" id="mode-merge" className="mt-0.5" />
                                      <Label htmlFor="mode-merge" className="text-xs cursor-pointer leading-snug">
                                        <span className="font-medium">Merge</span>
                                      </Label>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground ml-5 mt-0.5">Adds channels, roles, and emojis alongside what's already there.</p>
                                  </div>
                                  <div>
                                    <div className="flex items-start gap-2">
                                      <RadioGroupItem value="replace" id="mode-replace" className="mt-0.5" />
                                      <Label htmlFor="mode-replace" className="text-xs cursor-pointer leading-snug">
                                        <span className="font-medium">Replace</span>
                                      </Label>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground ml-5 mt-0.5">Clears all existing content first, then recreates everything from scratch.</p>
                                  </div>
                                </RadioGroup>
                              </div>
                            )}

                            <div className={`flex items-start gap-2 rounded-lg p-3 ${existingMode === "replace" ? "bg-destructive/10 border border-destructive/20" : "bg-primary/5 border border-primary/10"}`}>
                              {existingMode === "replace" ? (
                                <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                              ) : (
                                <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                              )}
                              <p className="text-xs text-muted-foreground">
                                {existingMode === "replace"
                                  ? "All existing channels, roles, and categories will be permanently deleted before transferring. This cannot be undone."
                                  : "Roles, channels, and emojis from your Discord scan will be added to this server. Existing content won't be removed or modified."}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <button
                      onClick={runTransfer}
                      disabled={transferring || (transferMode === "existing" && !existingServerId)}
                      className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-xl text-base font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-primary/20 disabled:opacity-50"
                    >
                      {transferring ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Transferring…
                        </>
                      ) : (
                        <>
                          <Play className="w-5 h-5" />
                          Start Transfer
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default TransferPage;
