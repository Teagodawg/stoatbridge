import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import EmbedEditor, { type EmbedData } from "@/components/embed-studio/EmbedEditor";
import EmbedPreview from "@/components/embed-studio/EmbedPreview";
import EmbedOutput from "@/components/embed-studio/EmbedOutput";
import EmbedTemplates from "@/components/embed-studio/EmbedTemplates";
import EmbedSender from "@/components/embed-studio/EmbedSender";

const defaultEmbed: EmbedData = {
  templateName: "",
  title: "",
  description: "",
  color: "#5865F2",
  url: "",
  
  imageUrl: "",
};

const LS_SENDER = "stoatbridge-embed-sender";

const EmbedStudioPage = () => {
  const [embed, setEmbed] = useState<EmbedData>(defaultEmbed);
  const [senderName, setSenderName] = useState("StoatBridge");
  const [senderAvatar, setSenderAvatar] = useState("");
  const [content, setContent] = useState("");

  // Restore sender profile from localStorage
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_SENDER) || "{}");
      if (saved.name) setSenderName(saved.name);
      if (saved.avatar) setSenderAvatar(saved.avatar);
    } catch {}
  }, []);

  // Persist sender profile
  useEffect(() => {
    localStorage.setItem(LS_SENDER, JSON.stringify({ name: senderName, avatar: senderAvatar }));
  }, [senderName, senderAvatar]);

  return (
    <Layout>
      <section className="pt-24 sm:pt-28 pb-16 px-4 sm:px-6">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              Stoat Embed Studio
            </h1>
            <p className="text-muted-foreground text-sm">
              Design embeds visually, preview live, and send directly to any Stoat channel.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Panel A: Editor */}
            <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 overflow-y-auto max-h-[80vh]">
              <EmbedEditor embed={embed} onChange={setEmbed} />
            </div>

            {/* Panel B: Preview */}
            <div className="bg-card border border-border rounded-2xl p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Live Preview</h2>
              <EmbedPreview
                embed={embed}
                senderName={senderName}
                senderAvatar={senderAvatar}
                content={content}
              />
            </div>

            {/* Panel C: Send + Output + Templates */}
            <div className="space-y-6">
              <div className="bg-card border border-border rounded-2xl p-5 sm:p-6">
                <EmbedSender
                  embed={embed}
                  senderName={senderName}
                  setSenderName={setSenderName}
                  senderAvatar={senderAvatar}
                  setSenderAvatar={setSenderAvatar}
                  content={content}
                  setContent={setContent}
                />
              </div>
              <div className="bg-card border border-border rounded-2xl p-5 sm:p-6">
                <EmbedOutput embed={embed} />
              </div>
              <div className="bg-card border border-border rounded-2xl p-5 sm:p-6">
                <EmbedTemplates embed={embed} onApply={setEmbed} />
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default EmbedStudioPage;
