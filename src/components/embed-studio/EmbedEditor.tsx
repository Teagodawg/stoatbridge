import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface EmbedData {
  templateName: string;
  title: string;
  description: string;
  color: string;
  url: string;
  
  imageUrl: string;
}

interface Props {
  embed: EmbedData;
  onChange: (embed: EmbedData) => void;
}

const LIMITS = {
  title: 256,
  description: 4096,
  
};

const CharCount = ({ value, max }: { value: string; max: number }) => {
  const len = value.length;
  const pct = len / max;
  return (
    <span
      className={cn(
        "text-xs tabular-nums",
        pct >= 1 ? "text-destructive" : pct >= 0.8 ? "text-warning" : "text-muted-foreground"
      )}
    >
      {len}/{max}
    </span>
  );
};

const EmbedEditor = ({ embed, onChange }: Props) => {
  const set = (key: keyof EmbedData, value: string) =>
    onChange({ ...embed, [key]: value });

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-foreground">Embed Editor</h2>

      <div className="space-y-1.5">
        <Label htmlFor="templateName">Template Name (optional)</Label>
        <Input
          id="templateName"
          placeholder="e.g. Welcome Embed"
          value={embed.templateName}
          onChange={(e) => set("templateName", e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="title">Title</Label>
          <CharCount value={embed.title} max={LIMITS.title} />
        </div>
        <Input
          id="title"
          placeholder="Embed title"
          value={embed.title}
          onChange={(e) => set("title", e.target.value)}
          maxLength={LIMITS.title}
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="description">Description</Label>
          <CharCount value={embed.description} max={LIMITS.description} />
        </div>
        <Textarea
          id="description"
          placeholder="Embed description (supports markdown)"
          value={embed.description}
          onChange={(e) => set("description", e.target.value)}
          maxLength={LIMITS.description}
          rows={4}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="color">Color</Label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={embed.color || "#5865F2"}
            onChange={(e) => set("color", e.target.value)}
            className="w-10 h-10 rounded-lg border border-input cursor-pointer bg-transparent p-0.5"
          />
          <Input
            id="color"
            placeholder="#5865F2"
            value={embed.color}
            onChange={(e) => set("color", e.target.value)}
            className="flex-1"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="url">URL (optional)</Label>
        <Input
          id="url"
          placeholder="https://example.com"
          value={embed.url}
          onChange={(e) => set("url", e.target.value)}
        />
      </div>


      <div className="space-y-1.5">
        <Label htmlFor="imageUrl">Image URL (optional)</Label>
        <Input
          id="imageUrl"
          placeholder="https://example.com/image.png"
          value={embed.imageUrl}
          onChange={(e) => set("imageUrl", e.target.value)}
        />
      </div>


    </div>
  );
};

export default EmbedEditor;
