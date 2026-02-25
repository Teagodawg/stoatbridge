import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "@/contexts/SessionContext";
import Layout from "@/components/Layout";
import { Shield, CheckCircle2, Loader2, ArrowRight, AlertTriangle, HelpCircle } from "lucide-react";
import { discordApi, stoatApi } from "@/lib/api";
import { toast } from "sonner";
import StepIndicator from "@/components/StepIndicator";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const ConnectPage = () => {
  const navigate = useNavigate();
  const session = useSession();

  // Discord
  const [guildId, setGuildId] = useState(session.guildId || "");
  const [guildInfo, setGuildInfo] = useState(session.guildInfo);
  const [lookingUp, setLookingUp] = useState(false);
  const [guildError, setGuildError] = useState<string | null>(null);

  // Stoat
  const [stoatEmail, setStoatEmail] = useState("");
  const [stoatPassword, setStoatPassword] = useState("");
  const [stoatConnected, setStoatConnected] = useState(!!session.stoatToken);
  const [stoatUsername, setStoatUsername] = useState(session.stoatUsername || "");
  const [connectingStoat, setConnectingStoat] = useState(false);

  const lookupGuild = async () => {
    const trimmed = guildId.trim();
    if (!trimmed) return;

    if (!/^\d{17,20}$/.test(trimmed)) {
      setGuildError("That doesn't look like a Discord server ID. It should be a 17-20 digit number.");
      setGuildInfo(null);
      return;
    }

    setLookingUp(true);
    setGuildError(null);
    setGuildInfo(null);
    try {
      const data = await discordApi("guild", trimmed);
      const info = {
        name: data.name,
        icon: data.icon,
        member_count: data.approximate_member_count,
      };
      setGuildInfo(info);
    } catch (err: any) {
      setGuildError(
        err.message.includes("50001") || err.message.includes("Missing Access")
          ? "The bot isn't in this server. Add the bot first, then try again."
          : err.message
      );
    } finally {
      setLookingUp(false);
    }
  };

  const connectStoat = async () => {
    if (!stoatEmail.trim() || !stoatPassword) return;
    setConnectingStoat(true);
    try {
      const result = await stoatApi("login", {
        email: stoatEmail.trim(),
        password: stoatPassword,
      });

      if (result.mfa_required) {
        toast.error("MFA is enabled on this account. MFA support is coming soon. Please disable it temporarily or use a different account.");
        return;
      }

      setStoatConnected(true);
      setStoatUsername(result.username);
      session.setStoatToken(result.token);
      session.setStoatUsername(result.username);
      setStoatPassword("");
      toast.success(`Connected as ${result.username}`);
    } catch (err: any) {
      toast.error("Login failed: " + err.message);
    } finally {
      setConnectingStoat(false);
    }
  };

  const startScan = () => {
    const trimmed = guildId.trim();
    if (!guildInfo || !trimmed) {
      toast.error("Please look up a valid Discord server first");
      return;
    }
    session.setGuildId(trimmed);
    session.setGuildInfo(guildInfo);
    toast.success("Scanning your server...");
    navigate("/scan");
  };

  return (
    <Layout>
      <div className="pt-24 sm:pt-28 pb-16 sm:pb-20 px-4 sm:px-6">
        <div className="container mx-auto max-w-2xl">
          <StepIndicator currentStep={1} />
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Connect your accounts
            </h1>
            <p className="text-muted-foreground text-lg">
              Enter your Discord server ID and log in to your Stoat account to get started.
            </p>
          </div>

          <div className="space-y-6">
            {/* Discord - Server ID Entry */}
            <div className="bg-card border border-border rounded-2xl p-5 sm:p-8">
              <div className="flex items-start gap-3 sm:gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shrink-0">
                  <span className="text-primary-foreground font-bold text-lg">D</span>
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-foreground mb-1">Discord Server</h2>
                  <p className="text-muted-foreground text-sm">
                    First,{" "}
                    <a
                      href="https://discord.com/oauth2/authorize?client_id=1474290913940602910&permissions=0&scope=bot"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline hover:text-primary/80 transition-colors"
                    >
                      add the bot to your server
                    </a>
                    , then enter your server ID below. Right-click your server name → Copy Server ID (enable Developer Mode in Discord settings).
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={guildId}
                  onChange={(e) => {
                    setGuildId(e.target.value);
                    setGuildError(null);
                    setGuildInfo(null);
                  }}
                  placeholder="e.g. 1234567890123456789"
                  maxLength={20}
                  className="flex-1 px-4 py-3 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={lookupGuild}
                  disabled={lookingUp || !guildId.trim()}
                  className="px-5 py-3 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors disabled:opacity-50 shrink-0"
                >
                  {lookingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : "Look up"}
                </button>
              </div>

              {guildError && (
                <div className="flex items-start gap-2 mt-3 text-destructive">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <p className="text-sm">{guildError}</p>
                </div>
              )}

              {lookingUp && !guildInfo && (
                <div className="flex items-center gap-3 mt-4 p-3 bg-muted/50 rounded-lg border border-border">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              )}

              {guildInfo && (
                <div className="flex items-center gap-3 mt-4 p-3 bg-success/10 rounded-lg border border-success/20">
                  {guildInfo.icon ? (
                    <img
                      src={`https://cdn.discordapp.com/icons/${guildId.trim()}/${guildInfo.icon}.png?size=40`}
                      alt=""
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-xs font-medium text-muted-foreground">
                        {guildInfo.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div className="flex-1">
                    <span className="text-sm font-medium text-foreground">{guildInfo.name}</span>
                    {guildInfo.member_count && (
                      <span className="text-xs text-muted-foreground ml-2">
                        ~{guildInfo.member_count.toLocaleString()} members
                      </span>
                    )}
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                </div>
              )}

              <Collapsible className="mt-4">
                <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors">
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>How do I find my Server ID?</span>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 p-3 bg-secondary/30 rounded-lg border border-border">
                  <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                    <li>Open Discord Settings → App Settings → Advanced → toggle <strong className="text-foreground">Developer Mode</strong> on</li>
                    <li>Right-click your server name in the sidebar</li>
                    <li>Click <strong className="text-foreground">Copy Server ID</strong> and paste it above</li>
                  </ol>
                </CollapsibleContent>
              </Collapsible>

              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-success mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Our bot must be in the server to read its structure. It never sends messages or modifies anything.
                  </p>
                </div>
              </div>
            </div>

            {/* Stoat - Account Login */}
            <div className="bg-card border border-border rounded-2xl p-5 sm:p-8">
              <div className="flex items-start gap-3 sm:gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center shrink-0">
                  <span className="text-success font-bold text-lg">S</span>
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-foreground mb-1">Stoat Account</h2>
                  <p className="text-muted-foreground text-sm">
                    {stoatConnected
                      ? `Logged in as ${stoatUsername}`
                      : "Log in with your Stoat account. Servers will be created under your account."}
                  </p>
                </div>
                {stoatConnected && (
                  <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                )}
              </div>

              {!stoatConnected && (
                <div className="space-y-3">
                  <input
                    type="email"
                    value={stoatEmail}
                    onChange={(e) => setStoatEmail(e.target.value)}
                    placeholder="Email address"
                    maxLength={255}
                    className="w-full px-4 py-3 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <input
                    type="password"
                    value={stoatPassword}
                    onChange={(e) => setStoatPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full px-4 py-3 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    onClick={connectStoat}
                    disabled={connectingStoat || !stoatEmail.trim() || !stoatPassword}
                    className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-6 py-3 rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors disabled:opacity-50"
                  >
                    {connectingStoat ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Logging in…
                      </>
                    ) : (
                      "Log in to Stoat"
                    )}
                  </button>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-success mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Your credentials are sent securely to Stoat's API to create a session. We only store the session token in your browser, never your password.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Start Button */}
          <div className="mt-8 text-center">
            <button
              onClick={startScan}
              disabled={!guildInfo || !stoatConnected}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-xl text-base font-semibold hover:opacity-90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:shadow-none"
            >
              Scan & preview
              <ArrowRight className="w-5 h-5" />
            </button>
            {(!guildInfo || !stoatConnected) && (
              <p className="text-xs text-muted-foreground mt-3">
                {!guildInfo && !stoatConnected
                  ? "Look up a Discord server and log in to Stoat to continue."
                  : !guildInfo
                  ? "Look up a Discord server to continue."
                  : "Log in to Stoat to continue."}
              </p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ConnectPage;
