import { useState } from "react";
import { AlertTriangle, Lightbulb, Info, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { hasPerm, STOAT_PERMISSIONS, normalizeStoatPerms } from "@/components/mapping/PermissionEditor";
import type { MappingConfig } from "@/pages/MappingPage";
import { Badge } from "@/components/ui/badge";

type Severity = "warning" | "tip" | "info";

interface CopilotItem {
  severity: Severity;
  message: string;
}

const ADMIN_BITS = [0, 1, 2, 3]; // Manage Channel, Manage Server, Manage Permissions, Manage Role
const MOD_BITS = [6, 7, 8]; // Kick, Ban, Timeout

function computeInsights(mapping: MappingConfig): CopilotItem[] {
  const items: CopilotItem[] = [];

  // Role checks
  for (const role of mapping.roles.filter((r) => r.included && !r.managed)) {
    const perms = normalizeStoatPerms(role.stoatPermissions);

    // Full admin
    if (perms.allow === 0xFFFFFFFF) {
      items.push({
        severity: "warning",
        message: `**${role.name}** has ALL permissions (mapped from Discord Administrator). Consider scoping down.`,
      });
      continue;
    }

    // Admin-level perms
    const hasAdmin = ADMIN_BITS.some((b) => hasPerm(perms, b));
    if (hasAdmin) {
      items.push({
        severity: "warning",
        message: `**${role.name}** has admin-level permissions. Double-check this is intentional.`,
      });
    }

    // Mod without manage
    const hasMod = MOD_BITS.some((b) => hasPerm(perms, b));
    if (hasMod && !hasAdmin) {
      items.push({
        severity: "tip",
        message: `**${role.name}** can moderate but can't manage channels. This may be intentional.`,
      });
    }
  }

  // Custom roles with admin perms
  for (const cr of mapping.customRoles) {
    const perms = normalizeStoatPerms(cr.stoatPermissions);
    if (perms.allow === 0xFFFFFFFF) {
      items.push({
        severity: "warning",
        message: `**${cr.name}** (custom) has ALL permissions. Consider scoping down.`,
      });
    } else if (ADMIN_BITS.some((b) => hasPerm(perms, b))) {
      items.push({
        severity: "warning",
        message: `**${cr.name}** (custom) has admin-level permissions. Double-check this is intentional.`,
      });
    }
  }

  // No server description
  if (!mapping.serverDescription?.trim()) {
    items.push({
      severity: "tip",
      message: "Add a server description to help new members understand your community.",
    });
  }


  // Large emoji transfer
  const emojiCount = mapping.emojis.filter((e) => e.included).length;
  if (emojiCount > 50) {
    items.push({
      severity: "info",
      message: `Transferring ${emojiCount} emojis. This may take a few extra minutes.`,
    });
  }

  // NSFW channels
  const nsfwCount = mapping.categories.reduce(
    (sum, cat) =>
      sum + cat.channels.filter((ch) => ch.included && ch.nsfw).length,
    0
  );
  if (nsfwCount > 0) {
    items.push({
      severity: "info",
      message: `${nsfwCount} NSFW channel(s) will be transferred. Stoat supports NSFW flags.`,
    });
  }

  // No branding
  if (!mapping.includeIcon && !mapping.includeBanner && !mapping.customIconUrl && !mapping.customBannerUrl) {
    items.push({
      severity: "tip",
      message: "No icon or banner selected. Your server will use Stoat defaults.",
    });
  }

  // No roles included
  const includedRoles = mapping.roles.filter((r) => r.included && !r.managed);
  if (includedRoles.length === 0) {
    items.push({
      severity: "warning",
      message: "No roles are selected. Your Stoat server will have no role hierarchy.",
    });
  }

  // Role with zero permissions - condensed into one tip
  const zeroPermRoles = includedRoles.filter((r) => normalizeStoatPerms(r.stoatPermissions).allow === 0 && normalizeStoatPerms(r.stoatPermissions).deny === 0);
  if (zeroPermRoles.length === 1) {
    items.push({
      severity: "tip",
      message: `**${zeroPermRoles[0].name}** has zero permissions. Members with only this role won't be able to do anything.`,
    });
  } else if (zeroPermRoles.length >= 2 && zeroPermRoles.length <= 3) {
    const names = zeroPermRoles.map((r) => `**${r.name}**`);
    const list = names.slice(0, -1).join(", ") + ", and " + names[names.length - 1];
    items.push({
      severity: "tip",
      message: `${list} have zero permissions. This is normal for ping-only roles.`,
    });
  } else if (zeroPermRoles.length >= 4) {
    const first = zeroPermRoles.slice(0, 2).map((r) => `**${r.name}**`).join(", ");
    items.push({
      severity: "tip",
      message: `${first}, and ${zeroPermRoles.length - 2} other roles have zero permissions. This is normal for ping-only roles.`,
    });
  }

  // No channels selected at all
  const allIncludedChannels = mapping.categories.flatMap((cat) =>
    cat.channels.filter((ch) => ch.included)
  );
  if (allIncludedChannels.length === 0) {
    items.push({
      severity: "warning",
      message: "No channels are selected. Your server will have nothing for members to use.",
    });
  }

  // Only voice channels selected
  if (allIncludedChannels.length > 0) {
    const hasText = allIncludedChannels.some((ch) => ch.typeName.toLowerCase() === "text");
    if (!hasText) {
      items.push({
        severity: "tip",
        message: "You only have voice channels selected. Consider adding a text channel for general chat.",
      });
    }
  }

  // Duplicate channel names across categories
  const channelNames = allIncludedChannels.map((ch) => ch.name.toLowerCase());
  const nameCounts = channelNames.reduce<Record<string, number>>((acc, n) => {
    acc[n] = (acc[n] || 0) + 1;
    return acc;
  }, {});
  const dupes = Object.entries(nameCounts).filter(([, c]) => c > 1);
  if (dupes.length > 0) {
    const total = dupes.reduce((s, [, c]) => s + c, 0);
    items.push({
      severity: "tip",
      message: `${total} channels share the same name (e.g. **${dupes[0][0]}**). This can confuse members.`,
    });
  }

  // Empty categories (all channels deselected)
  for (const cat of mapping.categories) {
    if (cat.included && cat.channels.every((ch) => !ch.included)) {
      items.push({
        severity: "tip",
        message: `**${cat.name}** has no channels selected. It will be created empty on Stoat.`,
      });
    }
  }

  // Very long server name
  if (mapping.serverName.length > 32) {
    items.push({
      severity: "info",
      message: `Your server name is ${mapping.serverName.length} characters. Some platforms truncate long names.`,
    });
  }

  // Short server description
  if (mapping.serverDescription?.trim() && mapping.serverDescription.trim().length < 10) {
    items.push({
      severity: "tip",
      message: "Your server description is very short. A longer description helps new members.",
    });
  }

  // Large number of roles
  if (includedRoles.length > 15) {
    items.push({
      severity: "info",
      message: `Transferring ${includedRoles.length} roles. Consider whether all of them are still needed.`,
    });
  }

  // Custom channels but no custom categories
  if (mapping.customChannels.length > 0 && mapping.customCategories.length === 0) {
    items.push({
      severity: "info",
      message: `${mapping.customChannels.length} custom channel(s) will be placed into existing categories.`,
    });
  }

  // All emojis deselected
  if (mapping.emojis.length > 0 && mapping.emojis.every((e) => !e.included)) {
    items.push({
      severity: "info",
      message: "No emojis selected. Your server will start without custom emojis.",
    });
  }

  // Always-show baseline tip
  items.push({
    severity: "info",
    message: "Stoat creates an implicit 'everyone' base role. Permissions you set here layer on top.",
  });

  return items;
}

const severityConfig = {
  warning: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-500/10", label: "Warning" },
  tip: { icon: Lightbulb, color: "text-blue-400", bg: "bg-blue-400/10", label: "Tip" },
  info: { icon: Info, color: "text-muted-foreground", bg: "bg-muted/50", label: "Info" },
};

interface MigrationCopilotProps {
  mapping: MappingConfig;
}

const MigrationCopilot = ({ mapping }: MigrationCopilotProps) => {
  const [expanded, setExpanded] = useState(true);
  const items = computeInsights(mapping);

  if (items.length === 0) return null;

  const warningCount = items.filter((i) => i.severity === "warning").length;
  const tipCount = items.filter((i) => i.severity === "tip").length;
  const infoCount = items.filter((i) => i.severity === "info").length;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-3 bg-secondary/50 border-b border-border hover:bg-secondary/70 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Migration Copilot</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {items.length} {items.length === 1 ? "tip" : "tips"}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {warningCount > 0 && (
            <span className="text-[10px] text-amber-500 font-medium">{warningCount} warning{warningCount > 1 ? "s" : ""}</span>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="p-4 space-y-2.5">
          {items.map((item, idx) => {
            const config = severityConfig[item.severity];
            const Icon = config.icon;
            return (
              <div
                key={idx}
                className={`flex items-start gap-2.5 p-2.5 rounded-lg ${config.bg}`}
              >
                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${config.color}`} />
                <p className="text-xs text-foreground leading-relaxed">
                  {item.message.split(/\*\*(.*?)\*\*/).map((part, i) =>
                    i % 2 === 0 ? part : <strong key={i} className="font-semibold">{part}</strong>
                  )}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MigrationCopilot;
