import { Link } from "react-router-dom";
import {
  ArrowRight, Shield, Hash, Users, Paintbrush, Wrench, Clock,
  Map, Lock, Bot, FileText, Smile, MessageSquare, Layers, Settings,
} from "lucide-react";
import Layout from "@/components/Layout";
import stoatbridgeLogo from "@/assets/stoatbridge.png";


const features = [
  {
    icon: Map,
    title: "Mapping Studio",
    description: "Rename channels, reorder categories, toggle what transfers — all before anything moves.",
  },
  {
    icon: Lock,
    title: "Permission Translator",
    description: "Discord permission bits are automatically converted to Stoat's permission model.",
  },
  {
    icon: Shield,
    title: "Channel Access Controls",
    description: "Private channels and role-based overrides carry over with role-based access controls.",
  },
  {
    icon: Paintbrush,
    title: "Branding Transfer",
    description: "Server icon, banner, and custom emojis are uploaded to Stoat's CDN automatically.",
  },
  {
    icon: Bot,
    title: "Bot Advisor",
    description: "Searches real bot directories to find Stoat equivalents for your Discord bots.",
  },
  {
    icon: Settings,
    title: "Migration Copilot",
    description: "Rule-based diagnostic engine that checks your mapping for common mistakes before transfer.",
  },
  {
    icon: FileText,
    title: "Transfer Reports",
    description: "On-screen summary with per-step success/failure counts and expandable error logs.",
  },
  {
    icon: Layers,
    title: "Transition Kit",
    description: "Editable announcement templates and FAQ components to help your community through the move.",
  },
  {
    icon: Smile,
    title: "Emoji Migration",
    description: "Custom emojis are re-uploaded with sanitised names that meet Stoat's naming rules.",
  },
];

const tools = [
  {
    title: "Discord → Stoat Transfer",
    description: "Move channels, roles, and permissions in a calm, guided flow.",
    icon: Shield,
    to: "/connect",
    cta: "Start Transfer",
  },
  {
    title: "Stoat Embed Studio",
    description: "Design embeds visually and send them to any Stoat channel.",
    icon: Wrench,
    to: "/tools/embed-studio",
    cta: "Open Studio",
  },
  {
    title: "More coming soon",
    description: "We're building more tools to help you manage your Stoat community.",
    icon: Clock,
    to: null,
    cta: null,
  },
];

const Index = () => {
  return (
    <Layout>
      {/* Hero */}
      <section aria-label="Hero" className="pt-24 sm:pt-32 pb-16 sm:pb-24 px-4 sm:px-6">
        <div className="container mx-auto max-w-5xl">
          <div className="max-w-2xl mx-auto">
            <div className="opacity-0 animate-fade-up">
              <div className="inline-flex items-center gap-2 bg-secondary rounded-full px-4 py-1.5 mb-6 sm:mb-8">
                <span className="w-2 h-2 rounded-full bg-success" />
                <span className="text-sm text-muted-foreground font-medium">Structure-only · No messages copied</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-bold text-foreground leading-tight mb-6 text-balance">
                Move your Discord server{" "}
                <span className="text-primary">to Stoat, safely.</span>
              </h1>

              <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                Channels, categories, roles, permissions, emojis, and branding — mapped, previewed, and transferred in one guided flow. Nothing changes until you confirm.
              </p>

              <div className="flex flex-col sm:flex-row items-start gap-4">
                <Link
                  to="/connect"
                  className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-xl text-base font-semibold hover:opacity-90 transition-all shadow-lg shadow-primary/20"
                >
                  Start Transfer
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  to="/tools"
                  className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground px-4 py-4 text-base font-medium transition-colors"
                >
                  Explore Tools
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-card border-y border-border">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
              Everything your migration needs
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Nine integrated features that work together so you can move with confidence.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="group bg-background/50 border border-border rounded-xl p-5 hover:border-primary/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1.5">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground text-center mb-12 sm:mb-16">
            How it works
          </h2>

          <div className="grid sm:grid-cols-4 gap-8">
            {[
              { step: "1", title: "Connect", desc: "Add our bot to Discord and log in to Stoat." },
              { step: "2", title: "Scan", desc: "We read your server structure. Nothing is modified." },
              { step: "3", title: "Map", desc: "Rename, reorder, and choose what transfers." },
              { step: "4", title: "Transfer", desc: "One click. Watch every step complete in real-time." },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <span className="text-lg font-bold text-primary">{s.step}</span>
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tools Grid */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-card border-y border-border">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground text-center mb-4">
            StoatBridge Toolkit
          </h2>
          <p className="text-muted-foreground text-center mb-10 sm:mb-14 max-w-xl mx-auto">
            Tools to help you build and manage your Stoat community.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tools.map((tool) => (
              <div
                key={tool.title}
                className="bg-background/50 border border-border rounded-2xl p-6 flex flex-col gap-4"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <tool.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">{tool.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{tool.description}</p>
                </div>
                {tool.to && tool.cta ? (
                  <Link
                    to={tool.to}
                    className="inline-flex items-center gap-2 text-primary text-sm font-medium hover:opacity-80 transition-opacity mt-auto"
                  >
                    {tool.cta}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <span className="text-muted-foreground/50 text-sm mt-auto">Coming soon</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10 px-4 sm:px-6">
        <div className="container mx-auto max-w-5xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src={stoatbridgeLogo} alt="StoatBridge logo" className="h-10" />
            <span className="text-base font-bold text-foreground tracking-tight">StoatBridge</span>
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            <Link to="/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Terms of Service
            </Link>
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} StoatBridge
            </p>
          </div>
        </div>
      </footer>
    </Layout>
  );
};

export default Index;