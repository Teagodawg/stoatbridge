import { useState } from "react";
import { ChevronDown, ChevronUp, Shield } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

// Stoat permission bits (from the edge function mapping)
export const STOAT_PERMISSIONS = [
  { bit: 20, name: "View Channel", category: "General" },
  { bit: 22, name: "Send Message", category: "Text" },
  { bit: 21, name: "Read History", category: "Text" },
  { bit: 23, name: "Manage Messages", category: "Text" },
  { bit: 29, name: "React", category: "Text" },
  { bit: 26, name: "Send Embeds", category: "Text" },
  { bit: 27, name: "Upload Files", category: "Text" },
  { bit: 25, name: "Invite Others", category: "General" },
  { bit: 0, name: "Manage Channel", category: "Admin" },
  { bit: 1, name: "Manage Server", category: "Admin" },
  { bit: 2, name: "Manage Permissions", category: "Admin" },
  { bit: 3, name: "Manage Role", category: "Admin" },
  { bit: 6, name: "Kick Members", category: "Moderation" },
  { bit: 7, name: "Ban Members", category: "Moderation" },
  { bit: 8, name: "Timeout Members", category: "Moderation" },
  { bit: 10, name: "Change Nickname", category: "General" },
  { bit: 11, name: "Manage Nicknames", category: "Moderation" },
  { bit: 24, name: "Manage Webhooks", category: "Admin" },
  { bit: 30, name: "Connect (Voice)", category: "Voice" },
  { bit: 31, name: "Speak (Voice)", category: "Voice" },
];

export interface StoatPermissions {
  allow: number;
  deny: number;
}

const ALL_KNOWN_BITS = STOAT_PERMISSIONS.reduce((mask, p) => (mask | (1 << p.bit)) >>> 0, 0);

export const DEFAULT_CHATTER_PERMISSIONS: StoatPermissions = {
  allow: ((1 << 20) | (1 << 22) | (1 << 21) | (1 << 29) | (1 << 26) | (1 << 27) | (1 << 10) | (1 << 30) | (1 << 31)) >>> 0,
  deny: 0,
};

const CATEGORIES = ["General", "Text", "Voice", "Moderation", "Admin"];

export function discordToStoatPermissions(discordPerms: string): StoatPermissions {
  const dp = BigInt(discordPerms || "0");
  if (dp & (1n << 3n)) return { allow: ALL_KNOWN_BITS, deny: 0 };

  let allow = 0n;
  const map: [bigint, bigint][] = [
    [1n << 0n, 1n << 25n], [1n << 1n, 1n << 6n], [1n << 2n, 1n << 7n],
    [1n << 4n, 1n << 0n], [1n << 5n, 1n << 1n], [1n << 6n, 1n << 29n],
    [1n << 10n, 1n << 20n], [1n << 11n, 1n << 22n], [1n << 13n, 1n << 23n],
    [1n << 14n, 1n << 26n], [1n << 15n, 1n << 27n], [1n << 16n, 1n << 21n],
    [1n << 20n, 1n << 30n], [1n << 21n, 1n << 31n], [1n << 26n, 1n << 10n],
    [1n << 27n, 1n << 11n], [1n << 28n, 1n << 2n], [1n << 28n, 1n << 3n],
    [1n << 29n, 1n << 24n], [1n << 40n, 1n << 8n],
  ];
  for (const [discordBit, stoatBit] of map) {
    if (dp & discordBit) allow |= stoatBit;
  }
  return { allow: Number(allow & 0xFFFFFFFFn), deny: 0 };
}

function hasBit(value: number, bit: number): boolean {
  return (((value >>> 0) & ((1 << bit) >>> 0)) !== 0);
}

function toggleBit(perms: StoatPermissions, bit: number): StoatPermissions {
  const mask = (1 << bit) >>> 0;
  if (hasBit(perms.allow, bit)) {
    return { allow: (perms.allow & ~mask) >>> 0, deny: perms.deny };
  } else {
    return { allow: (perms.allow | mask) >>> 0, deny: perms.deny };
  }
}

// Legacy helpers for MigrationCopilot compatibility
export function hasPerm(perms: StoatPermissions | number, bit: number): boolean {
  const mask = (1 << bit) >>> 0;
  if (typeof perms === "number") return ((perms >>> 0) & mask) !== 0;
  return ((perms.allow >>> 0) & mask) !== 0;
}

export function normalizeStoatPerms(perms: StoatPermissions | number | undefined): StoatPermissions {
  if (perms === undefined || perms === null) return { allow: 0, deny: 0 };
  if (typeof perms === "number") return { allow: perms, deny: 0 };
  return perms;
}

interface PermissionEditorProps {
  roleName: string;
  stoatPermissions: StoatPermissions;
  onChange: (newPerms: StoatPermissions) => void;
}

const PermissionEditor = ({ roleName, stoatPermissions, onChange }: PermissionEditorProps) => {
  const [expanded, setExpanded] = useState(false);
  const allowedCount = STOAT_PERMISSIONS.filter((p) => hasBit(stoatPermissions.allow, p.bit)).length;

  return (
    <div className="mt-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <Shield className="w-3 h-3" />
        <span>{allowedCount}/{STOAT_PERMISSIONS.length} permissions</span>
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {expanded && (
        <div className="mt-2 p-3 bg-secondary/30 rounded-lg border border-border space-y-3">
          {CATEGORIES.map((cat) => {
            const perms = STOAT_PERMISSIONS.filter((p) => p.category === cat);
            return (
              <div key={cat}>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  {cat}
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {perms.map((perm) => {
                    const checked = hasBit(stoatPermissions.allow, perm.bit);
                    return (
                      <label
                        key={perm.bit}
                        className="flex items-center gap-1.5 py-0.5 cursor-pointer hover:bg-secondary/50 rounded transition-colors"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => onChange(toggleBit(stoatPermissions, perm.bit))}
                          className="h-3.5 w-3.5"
                        />
                        <span className="text-[11px] text-foreground">{perm.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className="flex gap-2 pt-1 border-t border-border">
            <button
              onClick={() => {
                let allow = 0;
                STOAT_PERMISSIONS.forEach((p) => (allow = (allow | (1 << p.bit)) >>> 0));
                onChange({ allow, deny: 0 });
              }}
              className="text-[10px] text-primary hover:underline"
            >
              Grant all
            </button>
            <button
              onClick={() => onChange({ allow: 0, deny: 0 })}
              className="text-[10px] text-muted-foreground hover:underline"
            >
              Clear all
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PermissionEditor;
