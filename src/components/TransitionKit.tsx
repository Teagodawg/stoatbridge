import { useState } from "react";
import { toast } from "sonner";
import { Copy, Check, Megaphone, HelpCircle, Link2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface TransitionKitProps {
  serverName: string;
  stoatServerId: string;
  channelCount: number;
  roleCount: number;
}

const CopyButton = ({ text, label }: { text: string; label?: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(label ? `${label} copied!` : "Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className="gap-1.5"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-success" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
};

const TransitionKit = ({
  serverName,
  stoatServerId,
  channelCount,
  roleCount,
}: TransitionKitProps) => {
  const serverUrl = `https://stoat.chat/server/${stoatServerId}`;

  const defaultAnnouncement = `📢 Hey everyone! We're moving our community to a new home.

Everything you know is already set up: ${channelCount} channels, ${roleCount} roles, permissions. It's all there. Same structure, fresh start.

Join us here: ${serverUrl}

See you on the other side! 🚀`;

  const [announcementText, setAnnouncementText] = useState(defaultAnnouncement);

  const [whyAnswer, setWhyAnswer] = useState(
    "We're looking for a platform that better fits our community's needs. Stoat is open-source, privacy-friendly, and gives us more control."
  );

  const faqItems = [
    {
      q: "Why are we moving?",
      a: whyAnswer,
      editable: true,
    },
    {
      q: "Will I lose my roles?",
      a: "All roles have been recreated on the new server. Ask a mod to assign yours once you join.",
    },
    {
      q: "Is my data safe?",
      a: "No messages were transferred — this is a fresh start with the same structure. Your Discord data stays on Discord.",
    },
    {
      q: "What is Stoat?",
      a: "Stoat is an open-source chat platform similar to Discord. It's free, privacy-respecting, and community-driven.",
    },
  ];

  const faqText = faqItems
    .map((item) => `**Q: ${item.q}**\n${item.a}`)
    .join("\n\n");

  return (
    <div className="mt-10">
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            Member Transition Kit
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Ready-to-paste templates to help move your community over.
          </p>
        </div>

        <div className="p-6">
          <Tabs defaultValue="announcement">
            <TabsList className="w-full">
              <TabsTrigger value="announcement" className="flex-1 gap-1 sm:gap-1.5 text-xs sm:text-sm">
                <Megaphone className="w-3.5 h-3.5 hidden sm:block" />
                Announce
              </TabsTrigger>
              <TabsTrigger value="faq" className="flex-1 gap-1 sm:gap-1.5 text-xs sm:text-sm">
                <HelpCircle className="w-3.5 h-3.5 hidden sm:block" />
                FAQ
              </TabsTrigger>
              <TabsTrigger value="invite" className="flex-1 gap-1 sm:gap-1.5 text-xs sm:text-sm">
                <Link2 className="w-3.5 h-3.5 hidden sm:block" />
                Invite
              </TabsTrigger>
            </TabsList>

            {/* Announcement Tab */}
            <TabsContent value="announcement">
              <div className="relative mt-3">
                <div className="flex justify-end mb-2">
                  <CopyButton text={announcementText} label="Announcement" />
                </div>
                <Textarea
                  value={announcementText}
                  onChange={(e) => setAnnouncementText(e.target.value)}
                  className="bg-secondary border-border text-sm text-foreground font-sans leading-relaxed min-h-[160px] resize-y"
                />
              </div>
            </TabsContent>

            {/* FAQ Tab */}
            <TabsContent value="faq">
              <div className="mt-3 space-y-3">
                <div className="flex justify-end">
                  <CopyButton text={faqText} label="FAQ" />
                </div>
                <Accordion type="multiple" className="bg-secondary border border-border rounded-xl overflow-hidden">
                  {faqItems.map((item, i) => (
                    <AccordionItem
                      key={i}
                      value={`faq-${i}`}
                      className="px-4 last:border-b-0"
                    >
                      <AccordionTrigger className="text-sm text-foreground hover:no-underline">
                        {item.q}
                      </AccordionTrigger>
                      <AccordionContent>
                        {item.editable ? (
                          <Textarea
                            value={whyAnswer}
                            onChange={(e) => setWhyAnswer(e.target.value)}
                            className="text-sm bg-background border-border min-h-[80px]"
                            placeholder="Tell your community why you're moving…"
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            {item.a}
                          </p>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </TabsContent>

            {/* Invite Link Tab */}
            <TabsContent value="invite">
              <div className="mt-3 flex flex-col items-center gap-4 bg-secondary border border-border rounded-xl p-8">
                <p className="text-sm text-muted-foreground">
                  Share this link with your community:
                </p>
                <a
                  href={serverUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-base font-medium break-all text-center"
                >
                  {serverUrl}
                </a>
                <CopyButton text={serverUrl} label="Invite link" />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default TransitionKit;
