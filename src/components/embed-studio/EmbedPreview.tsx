import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { EmbedData } from "./EmbedEditor";
import stoatLogo from "@/assets/stoatbridge.png";

interface Props {
  embed: EmbedData;
  senderName?: string;
  senderAvatar?: string;
  content?: string;
}

const EmbedPreview = ({ embed, senderName = "StoatBridge", senderAvatar, content }: Props) => {
  const hasEmbed = embed.title || embed.description;
  const color = embed.color || "#5865F2";
  const avatarSrc = senderAvatar || stoatLogo;
  const initials = senderName.slice(0, 2).toUpperCase();

  return (
    <div className="space-y-0">
      {/* Message header: avatar + name + badge + timestamp */}
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10 shrink-0 mt-0.5">
          <AvatarImage src={avatarSrc} alt={senderName} />
          <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0 space-y-1">
          {/* Name row */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground text-sm">{senderName}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-primary/20 text-primary px-1.5 py-0.5 rounded">
              BOT
            </span>
            <span className="text-xs text-muted-foreground">Just now</span>
          </div>

          {/* Message content */}
          {content && (
            <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words">{content}</p>
          )}

          {/* Embed card */}
          {hasEmbed && (
            <div className="rounded-lg overflow-hidden border border-border/60 bg-secondary/40 max-w-sm mt-1">
              <div className="flex">
                {/* Color bar */}
                <div className="w-1 shrink-0 rounded-l" style={{ backgroundColor: color }} />

                <div className="p-3 flex-1 min-w-0 space-y-1.5">
                  {/* Title */}
                  <div className="flex items-center gap-2">
                    {embed.title && (
                      <h3 className="font-semibold text-sm leading-snug">
                        {embed.url ? (
                          <a
                            href={embed.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            {embed.title}
                          </a>
                        ) : (
                          <span className="text-primary">{embed.title}</span>
                        )}
                      </h3>
                    )}
                  </div>

                  {/* Description */}
                  {embed.description && (
                    <p className="text-muted-foreground text-xs whitespace-pre-wrap break-words leading-relaxed">
                      {embed.description}
                    </p>
                  )}

                  {/* Image */}
                  {embed.imageUrl && (
                    <img
                      src={embed.imageUrl}
                      alt="Embed image"
                      className="rounded-md w-full max-h-56 object-cover mt-1"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  )}

                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmbedPreview;
