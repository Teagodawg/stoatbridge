import { useRef, useState } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BrandingUploadProps {
  label: string;
  existingUrl?: string | null;
  customUrl?: string;
  type: "icon" | "banner";
  onUpload: (url: string) => void;
  onRemove: () => void;
}

const BrandingUpload = ({
  label,
  existingUrl,
  customUrl,
  type,
  onUpload,
  onRemove,
}: BrandingUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) {
        toast.error("You must be logged in to upload");
        return;
      }

      const ext = file.name.split(".").pop() || "png";
      const uniqueId = crypto.randomUUID();
      const path = `${userId}/uploads/${uniqueId}-${type}.${ext}`;

      const { error } = await supabase.storage
        .from("migration-assets")
        .upload(path, file, { upsert: true });

      if (error) throw error;

      const { data: urlData } = await supabase.storage
        .from("migration-assets")
        .createSignedUrl(path, 3600);

      if (!urlData?.signedUrl) throw new Error("Failed to get signed URL");

      onUpload(urlData.signedUrl);
      toast.success(`${label} uploaded`);
    } catch (err: any) {
      toast.error(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const displayUrl = customUrl || existingUrl;

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      {displayUrl ? (
        <div className="relative group shrink-0">
          <img
            src={displayUrl}
            alt={label}
            className={`${type === "icon" ? "w-10 h-10 rounded-full" : "w-16 sm:w-24 h-10 rounded-lg object-cover"}`}
          />
          {customUrl && (
            <button
              onClick={onRemove}
              className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      ) : (
        <div
          className={`${type === "icon" ? "w-10 h-10 rounded-full" : "w-16 sm:w-24 h-10 rounded-lg"} bg-secondary border border-dashed border-border flex items-center justify-center shrink-0`}
        >
          <ImageIcon className="w-4 h-4 text-muted-foreground" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground truncate">{label}</p>
        {!existingUrl && !customUrl && (
          <p className="text-[10px] text-muted-foreground">No {type}, upload one</p>
        )}
        {customUrl && (
          <p className="text-[10px] text-primary">Custom upload</p>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
      />
      <Button
        size="sm"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="h-7 text-xs shrink-0"
      >
        <Upload className="w-3 h-3 mr-1" />
        {uploading ? "…" : customUrl ? "Replace" : "Upload"}
      </Button>
    </div>
  );
};

export default BrandingUpload;
