import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "@/contexts/SessionContext";
import Layout from "@/components/Layout";
import { CheckCircle2, AlertTriangle, ArrowRight, Hash, Volume2, MessageSquare, Loader2, Megaphone, Mic } from "lucide-react";
import { discordApi, type ScanResult } from "@/lib/api";
import { toast } from "sonner";
import StepIndicator from "@/components/StepIndicator";

const channelIcon = (typeName: string) => {
  switch (typeName) {
    case "voice": return Volume2;
    case "forum": return MessageSquare;
    case "announcement": return Megaphone;
    case "stage": return Mic;
    default: return Hash;
  }
};

const transferableTypes = ["text", "voice", "announcement"];

const ScanPage = () => {
  const session = useSession();
  const navigate = useNavigate();
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session.guildId) {
      navigate("/connect");
      return;
    }
    // If we already have scan data, go straight to mapping
    if (session.scanData) {
      navigate("/mapping", { replace: true });
      return;
    }
    runScan();
  }, []);

  const runScan = async () => {
    try {
      const result = await discordApi("scan", session.guildId);
      setScanResult(result);
      session.setScanData(result);
      // Go straight to mapping
      navigate("/mapping", { replace: true });
    } catch (err: any) {
      setError(err.message);
      toast.error("Scan failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="pt-28 pb-20 px-6">
        <div className="container mx-auto max-w-5xl">
          <StepIndicator currentStep={2} />
          {loading ? (
            <div className="text-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">Scanning your server…</h2>
              <p className="text-muted-foreground text-sm">This can take a minute. We're reading your channels, roles, and permissions.</p>
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">Scan failed</h2>
              <p className="text-muted-foreground text-sm mb-4">{error}</p>
              <button onClick={() => { setError(null); setLoading(true); runScan(); }} className="bg-primary text-primary-foreground px-6 py-3 rounded-lg text-sm font-medium">
                Retry scan
              </button>
            </div>
          ) : scanResult ? (
            <>
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 bg-success/10 rounded-full px-4 py-1.5 mb-6">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  <span className="text-sm text-success font-medium">Scan complete</span>
                </div>
                <h1 className="text-4xl font-bold text-foreground mb-4">
                  {scanResult.guild.name}
                </h1>
                <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                  Review your server structure below. Items marked with a warning won't transfer in v1. No surprises.
                </p>
              </div>

              {/* Server Branding */}
              {(scanResult.guild.icon || scanResult.guild.banner) && (
                <div className="mb-8 bg-card border border-border rounded-xl overflow-hidden">
                  {scanResult.guild.banner && (
                    <img
                      src={`https://cdn.discordapp.com/banners/${scanResult.guild.id}/${scanResult.guild.banner}.png?size=1024`}
                      alt={`${scanResult.guild.name} banner`}
                      className="w-full h-36 object-cover"
                    />
                  )}
                  {scanResult.guild.icon && (
                    <div className={`flex items-center gap-4 px-5 py-4 ${scanResult.guild.banner ? "border-t border-border" : ""}`}>
                      <img
                        src={`https://cdn.discordapp.com/icons/${scanResult.guild.id}/${scanResult.guild.icon}.png?size=128`}
                        alt={`${scanResult.guild.name} icon`}
                        className="w-14 h-14 rounded-full border-2 border-border"
                      />
                      <div>
                        <p className="text-sm font-medium text-foreground">{scanResult.guild.name}</p>
                        <p className="text-xs text-muted-foreground">Server icon & banner will transfer</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="grid lg:grid-cols-3 gap-8">
                {/* Channels */}
                <div className="lg:col-span-2">
                  <h2 className="text-xl font-semibold text-foreground mb-4">Channels & Categories</h2>
                  <div className="space-y-6">
                    {scanResult.categories.map((cat) => (
                      <div key={cat.id || "uncategorized"} className="bg-card border border-border rounded-xl overflow-hidden">
                        <div className="px-5 py-3 bg-secondary/50 border-b border-border">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{cat.name}</span>
                        </div>
                        <div className="divide-y divide-border">
                          {cat.channels.map((ch) => {
                            const Icon = channelIcon(ch.typeName);
                            const willTransfer = transferableTypes.includes(ch.typeName);
                            return (
                              <div key={ch.id} className="flex items-center gap-3 px-3 sm:px-5 py-2.5 hover:bg-secondary/30 transition-colors">
                                <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <span className="text-sm text-foreground">{ch.name}</span>
                                  {ch.topic && <p className="text-xs text-muted-foreground truncate">{ch.topic}</p>}
                                </div>
                                {willTransfer ? (
                                  <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                                ) : (
                                  <div className="flex items-center gap-1.5">
                                    <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                                    <span className="text-xs text-muted-foreground hidden sm:inline">Not in v1</span>
                                  </div>
                                )}
                                <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0 hidden sm:block" />
                                <span className="text-sm text-primary font-medium hidden sm:inline">{ch.name}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Roles + Emojis + Summary */}
                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-4">Roles</h2>
                  <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="divide-y divide-border">
                      {scanResult.roles.map((role) => (
                        <div key={role.id} className="flex items-center gap-3 px-5 py-3">
                          <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{
                              backgroundColor: role.color
                                ? `#${role.color.toString(16).padStart(6, "0")}`
                                : "hsl(var(--muted-foreground))",
                            }}
                          />
                          <div className="flex-1">
                            <span className="text-sm text-foreground font-medium">{role.name}</span>
                          </div>
                          {role.managed ? (
                            <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {scanResult.emojis && scanResult.emojis.length > 0 && (
                    <div className="mt-8">
                      <h2 className="text-xl font-semibold text-foreground mb-4">Custom Emojis</h2>
                      <div className="bg-card border border-border rounded-xl p-4">
                        <div className="grid grid-cols-6 gap-2">
                          {scanResult.emojis.slice(0, 30).map((emoji) => (
                            <div key={emoji.id} className="flex flex-col items-center gap-1" title={`:${emoji.name}:`}>
                              <img src={emoji.url} alt={emoji.name} className="w-8 h-8" loading="lazy" />
                              <span className="text-[10px] text-muted-foreground truncate w-full text-center">{emoji.name}</span>
                            </div>
                          ))}
                        </div>
                        {scanResult.emojis.length > 30 && (
                          <p className="text-xs text-muted-foreground text-center mt-3">
                            +{scanResult.emojis.length - 30} more emojis
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {scanResult.stickers && scanResult.stickers.length > 0 && (
                    <div className="mt-4 bg-secondary/50 border border-border rounded-xl p-4">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{scanResult.stickers.length} stickers</span> found. Stickers can't be transferred (not supported by Stoat).
                      </p>
                    </div>
                  )}

                  <div className="mt-8 bg-card border border-border rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-3">Summary</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Channels</span>
                        <span className="text-foreground font-medium">{scanResult.summary.totalChannels}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Roles</span>
                        <span className="text-foreground font-medium">{scanResult.summary.totalRoles}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Categories</span>
                        <span className="text-foreground font-medium">{scanResult.summary.totalCategories}</span>
                      </div>
                      {(scanResult.summary.totalEmojis || 0) > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Emojis</span>
                          <span className="text-foreground font-medium">{scanResult.summary.totalEmojis}</span>
                        </div>
                      )}
                      {(scanResult.summary.totalStickers || 0) > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Stickers</span>
                          <span className="text-muted-foreground/50 font-medium">{scanResult.summary.totalStickers} (won't transfer)</span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => navigate("/mapping")}
                      className="mt-6 w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                      Continue to Mapping Studio
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-20">
              <p className="text-muted-foreground">No server selected. Go to <a href="/connect" className="text-primary underline">Connect</a> to start.</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ScanPage;
