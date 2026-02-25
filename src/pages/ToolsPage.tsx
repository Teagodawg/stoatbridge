import { Link } from "react-router-dom";
import { ArrowRight, Shield, Wrench } from "lucide-react";
import Layout from "@/components/Layout";

const tools = [
  {
    title: "Discord → Stoat Transfer",
    description: "Move channels, roles, and permissions from your Discord server to Stoat in a calm, guided flow.",
    icon: Shield,
    to: "/connect",
    cta: "Start Transfer",
  },
  {
    title: "Stoat Embed Studio",
    description: "Design embeds visually, preview them live, and send them directly to any Stoat channel. No webhook URLs needed.",
    icon: Wrench,
    to: "/tools/embed-studio",
    cta: "Open Embed Studio",
  },
];

const ToolsPage = () => {
  return (
    <Layout>
      <section className="pt-24 sm:pt-32 pb-16 sm:pb-20 px-4 sm:px-6">
        <div className="container mx-auto max-w-3xl">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground text-center mb-4">
            StoatBridge Tools
          </h1>
          <p className="text-muted-foreground text-center mb-10 sm:mb-14 max-w-xl mx-auto">
            Everything you need to set up and manage your Stoat community.
          </p>

          <div className="grid gap-4">
            {tools.map((tool) => (
              <Link
                key={tool.title}
                to={tool.to}
                className="bg-card border border-border rounded-2xl p-6 flex items-start gap-5 hover:shadow-lg hover:shadow-primary/5 transition-shadow group"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <tool.icon className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-foreground mb-1">{tool.title}</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">{tool.description}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors mt-1 shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default ToolsPage;
