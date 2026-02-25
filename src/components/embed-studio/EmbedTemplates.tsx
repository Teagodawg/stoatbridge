import { useState, useRef } from "react";
import { Download, Upload, Trash2, Save, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { EmbedData } from "./EmbedEditor";

const SCHEMA_VERSION = 1;
const LS_KEY = "stoatbridge-embed-templates";

interface TemplateFile {
  schemaVersion: number;
  templateName: string;
  createdAt: string;
  embed: EmbedData;
}

interface StoredTemplate {
  name: string;
  savedAt: string;
  embed: EmbedData;
}

interface Props {
  embed: EmbedData;
  onApply: (embed: EmbedData) => void;
}

function getLocalTemplates(): StoredTemplate[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveLocalTemplates(templates: StoredTemplate[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(templates.slice(0, 5)));
}

const EmbedTemplates = ({ embed, onApply }: Props) => {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [localTemplates, setLocalTemplates] = useState<StoredTemplate[]>(getLocalTemplates);
  const [pendingUpload, setPendingUpload] = useState<EmbedData | null>(null);
  const [undoEmbed, setUndoEmbed] = useState<EmbedData | null>(null);

  // Download
  const handleDownload = () => {
    const file: TemplateFile = {
      schemaVersion: SCHEMA_VERSION,
      templateName: embed.templateName || "Untitled",
      createdAt: new Date().toISOString(),
      embed,
    };
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stoat-embed-template.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Template downloaded" });
  };

  // Upload
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (!data.embed || typeof data.embed !== "object") {
          toast({ title: "Invalid template", description: "Missing embed data in file.", variant: "destructive" });
          return;
        }
        // Auto-upgrade older schemas if needed
        const embedData: EmbedData = {
          templateName: data.templateName || data.embed.templateName || "",
          title: data.embed.title || "",
          description: data.embed.description || "",
          color: data.embed.color || "",
          url: data.embed.url || "",
          
          imageUrl: data.embed.imageUrl || "",
        };
        setPendingUpload(embedData);
      } catch {
        toast({ title: "Invalid file", description: "Could not parse JSON. Make sure it's a valid template file.", variant: "destructive" });
      }
    };
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  const applyUpload = () => {
    if (!pendingUpload) return;
    setUndoEmbed(embed);
    onApply(pendingUpload);
    setPendingUpload(null);
    toast({
      title: "Template applied",
      description: "Your previous embed is saved for undo.",
      action: (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (undoEmbed) onApply(undoEmbed);
            setUndoEmbed(null);
          }}
          className="gap-1"
        >
          <Undo2 className="w-3.5 h-3.5" /> Undo
        </Button>
      ),
    });
  };

  // Save to device
  const handleSaveLocal = () => {
    const templates = getLocalTemplates();
    templates.unshift({
      name: embed.templateName || `Template ${templates.length + 1}`,
      savedAt: new Date().toISOString(),
      embed,
    });
    const updated = templates.slice(0, 5);
    saveLocalTemplates(updated);
    setLocalTemplates(updated);
    toast({ title: "Saved to device" });
  };

  const clearLocal = () => {
    localStorage.removeItem(LS_KEY);
    setLocalTemplates([]);
    toast({ title: "Local templates cleared" });
  };

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-foreground">Templates</h2>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1.5">
          <Download className="w-3.5 h-3.5" /> Download Template
        </Button>
        <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="gap-1.5">
          <Upload className="w-3.5 h-3.5" /> Upload Template
        </Button>
        <Button variant="outline" size="sm" onClick={handleSaveLocal} className="gap-1.5">
          <Save className="w-3.5 h-3.5" /> Save on Device
        </Button>
        <input ref={fileRef} type="file" accept=".json" onChange={handleUpload} className="hidden" />
      </div>

      {/* Pending upload preview */}
      {pendingUpload && (
        <div className="bg-secondary rounded-lg p-4 space-y-3">
          <p className="text-sm text-foreground font-medium">Preview uploaded template</p>
          <p className="text-xs text-muted-foreground">
            Title: {pendingUpload.title || "(none)"} | Description: {pendingUpload.description?.slice(0, 80) || "(none)"}
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={applyUpload}>Apply</Button>
            <Button variant="ghost" size="sm" onClick={() => setPendingUpload(null)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Local templates */}
      {localTemplates.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Saved on device</span>
            <Button variant="ghost" size="sm" onClick={clearLocal} className="gap-1 text-destructive h-7">
              <Trash2 className="w-3 h-3" /> Clear
            </Button>
          </div>
          {localTemplates.map((t, i) => (
            <button
              key={i}
              onClick={() => {
                setUndoEmbed(embed);
                onApply(t.embed);
                toast({ title: `Loaded: ${t.name}` });
              }}
              className="w-full text-left bg-card border border-border rounded-lg px-3 py-2 hover:bg-secondary/50 transition-colors"
            >
              <span className="text-sm font-medium text-foreground">{t.name}</span>
              <span className="text-xs text-muted-foreground block">
                {new Date(t.savedAt).toLocaleDateString()}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default EmbedTemplates;
