import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EmbedData } from "./EmbedEditor";

interface Props {
  embed: EmbedData;
}

function buildEmbedJson(embed: EmbedData) {
  const obj: Record<string, any> = {};
  if (embed.title) obj.title = embed.title;
  if (embed.description) obj.description = embed.description;
  if (embed.color) obj.colour = embed.color;
  if (embed.url) obj.url = embed.url;
  if (embed.imageUrl) obj.media = embed.imageUrl;
  
  return obj;
}

function buildPayloadJson(embed: EmbedData) {
  return {
    embeds: [buildEmbedJson(embed)],
  };
}

const CopyBlock = ({ label, json }: { label: string; json: string }) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <Button variant="ghost" size="sm" onClick={copy} className="gap-1.5 h-8">
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="bg-secondary rounded-lg p-3 text-xs text-muted-foreground overflow-x-auto max-h-48 whitespace-pre-wrap break-all">
        {json}
      </pre>
    </div>
  );
};

const EmbedOutput = ({ embed }: Props) => {
  const embedJson = JSON.stringify(buildEmbedJson(embed), null, 2);
  const payloadJson = JSON.stringify(buildPayloadJson(embed), null, 2);

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-foreground">Output</h2>
      <CopyBlock label="Embed JSON" json={embedJson} />
      <CopyBlock label="Message Payload JSON" json={payloadJson} />
    </div>
  );
};

export default EmbedOutput;
export { buildEmbedJson };
