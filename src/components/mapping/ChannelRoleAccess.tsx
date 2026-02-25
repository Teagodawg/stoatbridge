import { useState } from "react";
import { ChevronDown, ChevronUp, Lock, Plus, X, ShieldCheck, ShieldMinus, Minus, Check, HelpCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface ChannelPermissionOverride {
  roleDiscordId: string;
  roleName: string;
  canView: boolean | null;   // true=allow, false=deny, null=neutral/inherit
  canSend: boolean | null;
}

interface ChannelRoleAccessProps {
  overrides: ChannelPermissionOverride[];
  availableRoles: { discordId: string; name: string; color: number }[];
  onChange: (overrides: ChannelPermissionOverride[]) => void;
  isPrivate?: boolean;
}

const RoleColorDot = ({ color }: { color: number }) => (
  <div
    className="w-2.5 h-2.5 rounded-full shrink-0"
    style={{
      backgroundColor: color
        ? `#${color.toString(16).padStart(6, "0")}`
        : "hsl(var(--muted-foreground))",
    }}
  />
);

/** Cycles null -> true -> false -> null */
function cycleTriState(current: boolean | null): boolean | null {
  if (current === null) return true;
  if (current === true) return false;
  return null;
}

const TriStateButton = ({
  value,
  label,
  onChange,
}: {
  value: boolean | null;
  label: string;
  onChange: (next: boolean | null) => void;
}) => {
  const handleClick = () => onChange(cycleTriState(value));

  let icon: React.ReactNode;
  let colorClasses: string;
  if (value === true) {
    icon = <Check className="w-2.5 h-2.5" />;
    colorClasses = "bg-success/20 text-success border-success/40";
  } else if (value === false) {
    icon = <X className="w-2.5 h-2.5" />;
    colorClasses = "bg-destructive/20 text-destructive border-destructive/40";
  } else {
    icon = <Minus className="w-2.5 h-2.5" />;
    colorClasses = "bg-muted text-muted-foreground border-border";
  }

  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] transition-colors shrink-0 ${colorClasses}`}
      title={`${label}: ${value === true ? "Allow" : value === false ? "Deny" : "Inherit"} - click to cycle`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
};

const ChannelRoleAccess = ({ overrides, availableRoles, onChange, isPrivate }: ChannelRoleAccessProps) => {
  const [expanded, setExpanded] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  // For private channels, show roles that can view. For public, show all overrides.
  const displayedOverrides = isPrivate
    ? overrides.filter((o) => o.canView === true)
    : overrides;

  const displayedIds = new Set(displayedOverrides.map((o) => o.roleDiscordId));
  const addableRoles = availableRoles.filter((r) => !displayedIds.has(r.discordId));

  const handleCycleView = (roleId: string, next: boolean | null) => {
    onChange(overrides.map((o) => {
      if (o.roleDiscordId !== roleId) return o;
      // If view is set to deny or neutral, also set send to same (can't send if can't view)
      if (next === false) return { ...o, canView: next, canSend: false };
      if (next === null) return { ...o, canView: next, canSend: null };
      return { ...o, canView: next };
    }));
  };

  const handleCycleSend = (roleId: string, next: boolean | null) => {
    onChange(overrides.map((o) => (o.roleDiscordId === roleId ? { ...o, canSend: next } : o)));
  };

  const handleRemoveRole = (roleId: string) => {
    onChange(overrides.filter((o) => o.roleDiscordId !== roleId));
  };

  const handleAddRole = (roleId: string) => {
    const role = availableRoles.find((r) => r.discordId === roleId);
    const existing = overrides.find((o) => o.roleDiscordId === roleId);
    if (existing) {
      onChange(overrides.map((o) => (o.roleDiscordId === roleId ? { ...o, canView: null, canSend: null } : o)));
    } else {
      onChange([...overrides, { roleDiscordId: roleId, roleName: role?.name || "Unknown", canView: null, canSend: null }]);
    }
    setAddOpen(false);
  };

  const summaryText = isPrivate
    ? displayedOverrides.length > 0
      ? `${displayedOverrides.length} role${displayedOverrides.length > 1 ? "s" : ""} can access`
      : "Role access"
    : displayedOverrides.length > 0
      ? `${displayedOverrides.length} override${displayedOverrides.length > 1 ? "s" : ""}`
      : "Role overrides";

  return (
    <div className="mt-0.5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <Lock className="w-3 h-3" />
        <span>{summaryText}</span>
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {expanded && (
        <div className="mt-2 p-3 bg-secondary/30 rounded-lg border border-border">
          <div className="flex items-center justify-between mb-2">
            {displayedOverrides.length === 0 && (
              <p className="text-[10px] text-muted-foreground">
                {isPrivate ? "No roles have access yet." : "No permission overrides."}
              </p>
            )}
            {!isPrivate && (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors ml-auto">
                      <HelpCircle className="w-3 h-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[220px] text-[11px] space-y-1 p-2.5">
                    <p><span className="text-success font-medium">✓ Allow</span> - explicitly grants this permission</p>
                    <p><span className="text-destructive font-medium">✗ Deny</span> - explicitly blocks this permission</p>
                    <p><span className="text-muted-foreground font-medium">- Neutral</span> - inherits from server-level role</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {displayedOverrides.map((override) => {
              const role = availableRoles.find((r) => r.discordId === override.roleDiscordId);
              // Determine indicator: grant if any explicit allow, restriction if any explicit deny
              const hasAllow = override.canView === true || override.canSend === true;
              const hasDeny = override.canView === false || override.canSend === false;
              return (
                <div key={override.roleDiscordId} className="flex items-center gap-2 py-1">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    {!isPrivate && (
                      hasDeny
                        ? <ShieldMinus className="w-3 h-3 text-destructive shrink-0" />
                        : hasAllow
                          ? <ShieldCheck className="w-3 h-3 text-success shrink-0" />
                          : <Minus className="w-3 h-3 text-muted-foreground shrink-0" />
                    )}
                    <RoleColorDot color={role?.color || 0} />
                    <span className="text-[11px] text-foreground truncate">{override.roleName}</span>
                  </div>
                  {!isPrivate && (
                    <TriStateButton
                      value={override.canView}
                      label="View"
                      onChange={(next) => handleCycleView(override.roleDiscordId, next)}
                    />
                  )}
                  <TriStateButton
                    value={override.canSend}
                    label="Send"
                    onChange={(next) => handleCycleSend(override.roleDiscordId, next)}
                  />
                  <button
                    onClick={() => handleRemoveRole(override.roleDiscordId)}
                    className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>

          {addableRoles.length > 0 && (
            <Popover open={addOpen} onOpenChange={setAddOpen}>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                  <Plus className="w-3 h-3" />
                  <span>Add role</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-1 bg-popover border border-border z-50" align="start" sideOffset={4}>
                <div className="max-h-40 overflow-y-auto space-y-0.5">
                  {addableRoles.map((role) => (
                    <button
                      key={role.discordId}
                      onClick={() => handleAddRole(role.discordId)}
                      className="flex items-center gap-1.5 w-full px-2 py-1.5 text-[11px] text-foreground rounded hover:bg-accent transition-colors"
                    >
                      <RoleColorDot color={role.color} />
                      <span className="truncate">{role.name}</span>
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      )}
    </div>
  );
};

export default ChannelRoleAccess;
