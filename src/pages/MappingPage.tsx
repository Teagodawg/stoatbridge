import { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useSession } from "@/contexts/SessionContext";
import Layout from "@/components/Layout";
import { toast } from "sonner";
import type { ScanResult } from "@/lib/api";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PermissionEditor, { discordToStoatPermissions, DEFAULT_CHATTER_PERMISSIONS, normalizeStoatPerms, type StoatPermissions } from "@/components/mapping/PermissionEditor";
import ChannelRoleAccess from "@/components/mapping/ChannelRoleAccess";
import type { ChannelPermissionOverride } from "@/components/mapping/ChannelRoleAccess";
import BrandingUpload from "@/components/mapping/BrandingUpload";
import MigrationCopilot from "@/components/mapping/MigrationCopilot";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import StepIndicator from "@/components/StepIndicator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Loader2,
  Hash,
  Volume2,
  MessageSquare,
  Megaphone,
  Mic,
  Image,
  Smile,
  Users,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Pencil,
  RotateCcw,
  GripVertical,
  Lock,
  HelpCircle,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ─── Types ───────────────────────────────────────────────────────
export interface MappingConfig {
  serverName: string;
  serverDescription: string;
  includeIcon: boolean;
  includeBanner: boolean;
  customIconUrl?: string;
  customBannerUrl?: string;
  categories: MappedCategory[];
  roles: MappedRole[];
  emojis: MappedEmoji[];
  customChannels: CustomChannel[];
  customRoles: CustomRole[];
  customCategories: CustomCategory[];
}

interface CustomCategory {
  name: string;
}

interface MappedCategory {
  discordId: string | null;
  name: string;
  included: boolean;
  channels: MappedChannel[];
}

interface MappedChannel {
  discordId: string;
  name: string;
  included: boolean;
  typeName: string;
  topic?: string | null;
  nsfw?: boolean;
  isPrivate?: boolean;
  permissionOverrides?: ChannelPermissionOverride[];
  showOverrides?: boolean;
}

interface MappedRole {
  discordId: string;
  name: string;
  included: boolean;
  color: number;
  managed: boolean;
  position: number;
  hoist: boolean;
  permissions: string;
  stoatPermissions?: StoatPermissions;
  isDefault?: boolean;
}

interface MappedEmoji {
  discordId: string;
  name: string;
  included: boolean;
  url: string;
  animated: boolean;
}

interface CustomChannel {
  name: string;
  type: "Text" | "Voice";
  categoryIndex: number;
  isPrivate?: boolean;
  permissionOverrides?: ChannelPermissionOverride[];
}

interface CustomRole {
  name: string;
  color: string;
  stoatPermissions?: StoatPermissions;
}

// ─── Helpers ─────────────────────────────────────────────────────
const channelIcon = (typeName: string) => {
  switch (typeName) {
    case "voice": return Volume2;
    case "forum": return MessageSquare;
    case "announcement": return Megaphone;
    case "stage": return Mic;
    default: return Hash;
  }
};

const transferableTypes = ["text", "voice", "announcement"];

const VIEW_CHANNEL = BigInt(1024);
const SEND_MESSAGES = BigInt(2048);
const ADMINISTRATOR = BigInt(0x8);

function convertDiscordOverwrites(
  overwrites: any[] | undefined,
  roles: ScanResult["roles"]
): ChannelPermissionOverride[] {
  if (!overwrites || overwrites.length === 0) return [];

  const roleMap = new Map(roles.map((r) => [r.id, r.name]));

  // Find @everyone overwrite: type===0 and id matches a role with isDefault flag
  const defaultRole = roles.find((r) => (r as any).isDefault);
  const everyoneOw = overwrites.find(
    (ow) => ow.type === 0 && (defaultRole ? ow.id === defaultRole.id : !roleMap.has(ow.id))
  );

  // Determine base permissions from @everyone deny
  const everyoneDeny = BigInt(everyoneOw?.deny || "0");
  const baseDenyView = !!(everyoneDeny & VIEW_CHANNEL);
  const baseDenySend = !!(everyoneDeny & SEND_MESSAGES);

  // Build map of role-specific overwrites
  const roleOverwrites = new Map<string, { allow: bigint; deny: bigint }>();
  for (const ow of overwrites) {
    if (ow.type !== 0) continue;
    if (defaultRole && ow.id === defaultRole.id) continue; // skip @everyone
    if (!roleMap.has(ow.id)) continue;
    roleOverwrites.set(ow.id, {
      allow: BigInt(ow.allow || "0"),
      deny: BigInt(ow.deny || "0"),
    });
  }

  // For each role in the scan, compute effective permissions (tri-state)
  const result: ChannelPermissionOverride[] = [];
  for (const role of roles) {
    const isDefault = !!(role as any).isDefault;
    const rolePerms = BigInt(role.permissions || "0");
    if ((rolePerms & ADMINISTRATOR) && !baseDenyView && !isDefault) continue;

    // Compute tri-state: true=allow, false=deny, null=neutral/inherit
    let canView: boolean | null;
    let canSend: boolean | null;

    if (isDefault) {
      // @everyone overwrite: compute directly from its own allow/deny bits
      const everyoneAllow = BigInt(everyoneOw?.allow || "0");
      const everyoneDenyBits = BigInt(everyoneOw?.deny || "0");
      canView = (everyoneDenyBits & VIEW_CHANNEL) ? false : (everyoneAllow & VIEW_CHANNEL) ? true : null;
      canSend = (everyoneDenyBits & SEND_MESSAGES) ? false : (everyoneAllow & SEND_MESSAGES) ? true : null;
    } else {
      const specific = roleOverwrites.get(role.id);
      if (specific) {
        canView = (specific.deny & VIEW_CHANNEL) ? false : (specific.allow & VIEW_CHANNEL) ? true : null;
        canSend = (specific.deny & SEND_MESSAGES) ? false : (specific.allow & SEND_MESSAGES) ? true : null;
      } else {
        canView = null;
        canSend = null;
      }
    }

    // For @everyone, include if it has any overwrite entry at all
    if (isDefault) {
      if (everyoneOw) {
        result.push({ roleDiscordId: role.id, roleName: role.name, canView, canSend });
      }
      continue;
    }
    // For other roles: include if they have a specific overwrite
    const specific = roleOverwrites.get(role.id);
    if (specific || baseDenyView) {
      // Include roles that have explicit overwrites, or all roles if channel is private
      if (specific) {
        result.push({ roleDiscordId: role.id, roleName: role.name, canView, canSend });
      } else if (baseDenyView) {
        // Private channel but this role has no specific overwrite - skip (no override needed)
      }
    }
  }

  return result;
}

function buildDefaultMapping(scan: ScanResult): MappingConfig {
  return {
    serverName: scan.guild.name,
    serverDescription: "",
    includeIcon: !!scan.guild.icon,
    includeBanner: !!scan.guild.banner,
    categories: scan.categories.map((cat) => ({
      discordId: cat.id,
      name: cat.name,
      included: true,
      channels: cat.channels.map((ch) => {
        const overwrites = ch.permission_overwrites || [];
        // Auto-detect private: @everyone denied VIEW_CHANNEL
        const isPrivate = overwrites.some((ow: any) => {
          if (ow.type !== 0) return false;
          // @everyone overwrite: type 0 and id not in our role list
          const defaultR = scan.roles.find((r) => r.isDefault);
          const isEveryoneOw = defaultR ? ow.id === defaultR.id : !scan.roles.some((r) => r.id === ow.id);
          if (!isEveryoneOw) return false;
          const denyBits = BigInt(ow.deny || "0");
          return (denyBits & VIEW_CHANNEL) !== 0n;
        });
        return {
          discordId: ch.id,
          name: ch.name,
          included: transferableTypes.includes(ch.typeName),
          typeName: ch.typeName,
          topic: ch.topic,
          nsfw: ch.nsfw,
          isPrivate,
          permissionOverrides: convertDiscordOverwrites(overwrites, scan.roles),
        };
      }),
    })),
    roles: scan.roles.map((r) => ({
      discordId: r.id,
      name: r.name,
      included: r.isDefault ? true : !r.managed,
      color: r.color,
      managed: r.managed,
      position: r.position,
      hoist: r.hoist,
      permissions: r.permissions,
      stoatPermissions: discordToStoatPermissions(r.permissions),
      isDefault: r.isDefault || false,
    })),
    emojis: (scan.emojis || []).map((e) => ({
      discordId: e.id,
      name: e.name,
      included: true,
      url: e.url,
      animated: e.animated,
    })),
    customChannels: [],
    customRoles: [],
    customCategories: [],
  };
}

// ─── Section component ──────────────────────────────────────────
const SectionHeader = ({
  title,
  icon: Icon,
  count,
  selectedCount,
  onToggleAll,
  allSelected,
}: {
  title: string;
  icon: React.ElementType;
  count: number;
  selectedCount: number;
  onToggleAll: () => void;
  allSelected: boolean;
}) => (
  <div className="flex items-center justify-between px-5 py-3 bg-secondary/50 border-b border-border">
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-muted-foreground" />
      <span className="text-sm font-semibold text-foreground">{title}</span>
      <span className="text-xs text-muted-foreground">
        ({selectedCount}/{count})
      </span>
    </div>
    <button
      onClick={onToggleAll}
      className="text-xs text-primary hover:underline"
    >
      {allSelected ? "Deselect all" : "Select all"}
    </button>
  </div>
);

// ─── Inline Edit (extracted to avoid remounting) ────────────────
const InlineEdit = ({
  fieldKey,
  value,
  onSave,
  compact,
  placeholder,
  editingField,
  setEditingField,
}: {
  fieldKey: string;
  value: string;
  onSave: (v: string) => void;
  compact?: boolean;
  placeholder?: string;
  editingField: string | null;
  setEditingField: (f: string | null) => void;
}) => {
  const [val, setVal] = useState(value);
  const isEditing = editingField === fieldKey;

  if (!isEditing) {
    if (!value && placeholder) {
      return (
        <button
          onClick={() => setEditingField(fieldKey)}
          className="flex items-center gap-1 group"
        >
          <span className="text-xs text-muted-foreground italic">{placeholder}</span>
          <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      );
    }
    if (!value && !placeholder) return null;
    return (
      <button
        onClick={() => setEditingField(fieldKey)}
        className="flex items-center gap-1 group min-w-0 max-w-full"
      >
        <span className={`text-foreground ${compact ? "text-[11px] break-all text-center w-full" : "text-sm truncate"}`}>{value}</span>
        <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </button>
    );
  }

  return (
    <div className={`flex ${compact ? "flex-col" : "flex-row"} items-center gap-1 max-w-full`}>
      <Input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        className={`h-6 text-xs ${compact ? "w-full min-w-0" : "w-40"}`}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") onSave(val);
          if (e.key === "Escape") setEditingField(null);
        }}
      />
      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs shrink-0" onClick={() => onSave(val)}>
        ✓
      </Button>
    </div>
  );
};

const SortableChannelRow = ({
  id,
  ch,
  catIdx,
  chIdx,
  toggleChannel,
  updateChannelTopic,
  toggleChannelNsfw,
  toggleChannelPrivate,
  updateChannelOverrides,
  enableChannelOverrides,
  availableRolesForChannels,
  editingField,
  setEditingField,
  renameItem,
  InlineEdit,
}: any) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  const Icon = channelIcon(ch.typeName);
  const supported = transferableTypes.includes(ch.typeName);

  return (
    <div ref={setNodeRef} style={style} className={`px-3 sm:px-5 py-2.5 ${!supported ? "opacity-40" : ""}`}>
      <div className="flex items-center gap-2">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground shrink-0">
          <GripVertical className="w-3.5 h-3.5" />
        </button>
        <Checkbox
          checked={ch.included}
          onCheckedChange={() => toggleChannel(catIdx, chIdx)}
          disabled={!supported}
        />
        <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <InlineEdit
            fieldKey={`ch-${catIdx}-${chIdx}`}
            value={ch.name}
            onSave={(v: string) => renameItem("channel", catIdx, v, chIdx)}
            editingField={editingField}
            setEditingField={setEditingField}
          />
          {(ch.topic || editingField === `ch-topic-${catIdx}-${chIdx}`) && (
            <InlineEdit
              fieldKey={`ch-topic-${catIdx}-${chIdx}`}
              value={ch.topic || ""}
              onSave={(v: string) => updateChannelTopic(catIdx, chIdx, v)}
              placeholder="No topic"
              editingField={editingField}
              setEditingField={setEditingField}
            />
          )}
        </div>
        {!supported && (
          <span className="text-xs text-muted-foreground">Not in v1</span>
        )}
        {supported && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Private</span>
              <Switch
                checked={!!ch.isPrivate}
                onCheckedChange={() => toggleChannelPrivate(catIdx, chIdx)}
                className="scale-75"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground">NSFW</span>
              <Switch
                checked={!!ch.nsfw}
                onCheckedChange={() => toggleChannelNsfw(catIdx, chIdx)}
                className="scale-75"
              />
            </div>
          </div>
        )}
      </div>
      {supported && ch.included && availableRolesForChannels.length > 0 && (ch.isPrivate || ch.showOverrides || (ch.permissionOverrides && ch.permissionOverrides.length > 0)) && (
        <div className="ml-11 mt-1">
          <ChannelRoleAccess
            overrides={ch.permissionOverrides || []}
            availableRoles={availableRolesForChannels}
            onChange={(overrides: ChannelPermissionOverride[]) => updateChannelOverrides(catIdx, chIdx, overrides)}
            isPrivate={!!ch.isPrivate}
          />
        </div>
      )}
      {supported && ch.included && availableRolesForChannels.length > 0 && !ch.isPrivate && !ch.showOverrides && (!ch.permissionOverrides || ch.permissionOverrides.length === 0) && (
        <div className="ml-11 mt-1">
          <button
            onClick={() => enableChannelOverrides(catIdx, chIdx)}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <Plus className="w-3 h-3" />
            <span>Add role overrides</span>
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Sortable Category Card ─────────────────────────────────────
const SortableCategoryCard = ({
  id,
  cat,
  catIdx,
  isExpanded,
  includedCh,
  customInCat,
  toggleCategory,
  toggleCatExpand,
  renameItem,
  toggleChannel,
  updateChannelTopic,
  toggleChannelNsfw,
  toggleChannelPrivate,
  updateChannelOverrides,
  enableChannelOverrides,
  availableRolesForChannels,
  editingField,
  setEditingField,
  mapping,
  setMapping,
  removeCustomChannel,
  InlineEdit,
}: any) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-3 sm:px-5 py-3 bg-secondary/50 border-b border-border">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground shrink-0">
          <GripVertical className="w-4 h-4" />
        </button>
        <Checkbox
          checked={cat.included}
          onCheckedChange={() => toggleCategory(catIdx)}
        />
        <button
          onClick={() => toggleCatExpand(catIdx)}
          className="flex-1 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <InlineEdit
              fieldKey={`cat-${catIdx}`}
              value={cat.name}
              onSave={(v: string) => renameItem("category", catIdx, v)}
              editingField={editingField}
              setEditingField={setEditingField}
            />
            <span className="text-xs text-muted-foreground">
              {includedCh + customInCat.length} ch
            </span>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </div>

      {isExpanded && (
        <div className="divide-y divide-border">
          <SortableContext
            items={cat.channels.map((_: any, i: number) => `ch-${catIdx}-${i}`)}
            strategy={verticalListSortingStrategy}
          >
            {cat.channels.map((ch: any, chIdx: number) => (
              <SortableChannelRow
                key={`ch-${catIdx}-${chIdx}`}
                id={`ch-${catIdx}-${chIdx}`}
                ch={ch}
                catIdx={catIdx}
                chIdx={chIdx}
                toggleChannel={toggleChannel}
                updateChannelTopic={updateChannelTopic}
                toggleChannelNsfw={toggleChannelNsfw}
                toggleChannelPrivate={toggleChannelPrivate}
                updateChannelOverrides={updateChannelOverrides}
                enableChannelOverrides={enableChannelOverrides}
                availableRolesForChannels={availableRolesForChannels}
                editingField={editingField}
                setEditingField={setEditingField}
                renameItem={renameItem}
                InlineEdit={InlineEdit}
              />
            ))}
          </SortableContext>

          {/* Custom channels in this category */}
          {customInCat.map((cc: any, i: number) => {
            const globalIdx = mapping.customChannels.indexOf(cc);
            return (
              <div key={`custom-${i}`}>
                <div className="flex items-center gap-3 px-5 py-2.5 bg-primary/5">
                  <Checkbox checked disabled />
                  {cc.type === "Voice" ? (
                    <Volume2 className="w-4 h-4 text-primary shrink-0" />
                  ) : (
                    <Hash className="w-4 h-4 text-primary shrink-0" />
                  )}
                  <span className="text-sm text-primary font-medium flex-1">
                    {cc.name}
                  </span>
                  <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                    New
                  </span>
                  <button
                    onClick={() => removeCustomChannel(globalIdx)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="px-5 pb-1">
                  <ChannelRoleAccess
                    overrides={cc.permissionOverrides || []}
                    availableRoles={availableRolesForChannels}
                    onChange={(overrides: ChannelPermissionOverride[]) => {
                      setMapping((prev: any) => {
                        if (!prev) return prev;
                        const customChannels = [...prev.customChannels];
                        customChannels[globalIdx] = { ...customChannels[globalIdx], permissionOverrides: overrides };
                        return { ...prev, customChannels };
                      });
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────
const MappingPage = () => {
  const session = useSession();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scanData, setScanData] = useState<ScanResult | null>(null);
  const [mapping, setMapping] = useState<MappingConfig | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Navigation guard - browser close/reload
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);

  // Add-new forms
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelType, setNewChannelType] = useState<"Text" | "Voice">("Text");
  const [newChannelCatIdx, setNewChannelCatIdx] = useState(0);
  const [showAddChannel, setShowAddChannel] = useState(false);

  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleColor, setNewRoleColor] = useState("#808080");
  const [showAddRole, setShowAddRole] = useState(false);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);

  // Collapsed sections
  const [expandedCats, setExpandedCats] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!session.scanData) {
      navigate("/connect");
      return;
    }
    loadFromSession();
  }, []);

  const loadFromSession = () => {
    try {
      const scan = session.scanData!;
      setScanData(scan);

      if (session.mappingData) {
        const existing = { ...session.mappingData };
        existing.roles = existing.roles.map((r) => ({
          ...r,
          stoatPermissions: normalizeStoatPerms(r.stoatPermissions) ?? discordToStoatPermissions(r.permissions),
        }));
        existing.categories = existing.categories.map((cat) => ({
          ...cat,
          channels: cat.channels.map((ch) => ({
            ...ch,
            permissionOverrides: ch.permissionOverrides ?? [],
          })),
        }));
        if (!existing.serverDescription) existing.serverDescription = "";
        if (!existing.customCategories) existing.customCategories = [];
        setMapping(existing);
      } else {
        setMapping(buildDefaultMapping(scan));
      }
      setExpandedCats(new Set(scan.categories.map((_, i) => i)));
    } catch (err: any) {
      toast.error(err.message);
      navigate("/connect");
    } finally {
      setLoading(false);
    }
  };

  // Track unsaved changes after initial load
  const [initialMapping, setInitialMapping] = useState<string>("");
  useEffect(() => {
    if (mapping && !initialMapping) {
      setInitialMapping(JSON.stringify(mapping));
    } else if (mapping && initialMapping) {
      setHasUnsavedChanges(JSON.stringify(mapping) !== initialMapping);
    }
  }, [mapping, initialMapping]);

  const saveAndContinue = () => {
    if (!mapping) return;
    setSaving(true);
    setHasUnsavedChanges(false);
    session.setMappingData(mapping);
    navigate("/transfer");
  };

  const saveMapping = () => {
    if (!mapping) return;
    session.setMappingData(mapping);
    setHasUnsavedChanges(false);
    setInitialMapping(JSON.stringify(mapping));
    toast.success("Mapping saved");
  };

  // ── Mutation helpers ──
  const toggleCategory = (catIdx: number) => {
    setMapping((prev) => {
      if (!prev) return prev;
      const cats = [...prev.categories];
      const newVal = !cats[catIdx].included;
      cats[catIdx] = {
        ...cats[catIdx],
        included: newVal,
        channels: cats[catIdx].channels.map((ch) => ({
          ...ch,
          included: transferableTypes.includes(ch.typeName) ? newVal : false,
        })),
      };
      return { ...prev, categories: cats };
    });
  };

  const toggleChannel = (catIdx: number, chIdx: number) => {
    setMapping((prev) => {
      if (!prev) return prev;
      const cats = [...prev.categories];
      const channels = [...cats[catIdx].channels];
      channels[chIdx] = { ...channels[chIdx], included: !channels[chIdx].included };
      cats[catIdx] = { ...cats[catIdx], channels };
      return { ...prev, categories: cats };
    });
  };

  const updateChannelOverrides = (catIdx: number, chIdx: number, overrides: ChannelPermissionOverride[]) => {
    setMapping((prev) => {
      if (!prev) return prev;
      const cats = [...prev.categories];
      const channels = [...cats[catIdx].channels];
      channels[chIdx] = { ...channels[chIdx], permissionOverrides: overrides };
      cats[catIdx] = { ...cats[catIdx], channels };
      return { ...prev, categories: cats };
    });
  };

  const renameItem = (section: string, idx: number, name: string, subIdx?: number) => {
    setMapping((prev) => {
      if (!prev) return prev;
      if (section === "category") {
        const cats = [...prev.categories];
        cats[idx] = { ...cats[idx], name };
        return { ...prev, categories: cats };
      }
      if (section === "channel" && subIdx !== undefined) {
        const cats = [...prev.categories];
        const channels = [...cats[idx].channels];
        channels[subIdx] = { ...channels[subIdx], name };
        cats[idx] = { ...cats[idx], channels };
        return { ...prev, categories: cats };
      }
      if (section === "role") {
        const roles = [...prev.roles];
        roles[idx] = { ...roles[idx], name };
        return { ...prev, roles };
      }
      if (section === "emoji") {
        const emojis = [...prev.emojis];
        emojis[idx] = { ...emojis[idx], name };
        return { ...prev, emojis };
      }
      return prev;
    });
    setEditingField(null);
  };

  const updateRolePermissions = (idx: number, perms: StoatPermissions) => {
    setMapping((prev) => {
      if (!prev) return prev;
      const roles = [...prev.roles];
      roles[idx] = { ...roles[idx], stoatPermissions: perms };
      return { ...prev, roles };
    });
  };

  const toggleAllRoles = () => {
    setMapping((prev) => {
      if (!prev) return prev;
      const nonManaged = prev.roles.filter((r) => !r.managed);
      const allOn = nonManaged.every((r) => r.included);
      return {
        ...prev,
        roles: prev.roles.map((r) =>
          r.managed ? r : { ...r, included: !allOn }
        ),
      };
    });
  };

  const toggleRole = (idx: number) => {
    setMapping((prev) => {
      if (!prev) return prev;
      const roles = [...prev.roles];
      roles[idx] = { ...roles[idx], included: !roles[idx].included };
      return { ...prev, roles };
    });
  };

  const toggleAllEmojis = () => {
    setMapping((prev) => {
      if (!prev) return prev;
      const allOn = prev.emojis.every((e) => e.included);
      return {
        ...prev,
        emojis: prev.emojis.map((e) => ({ ...e, included: !allOn })),
      };
    });
  };

  const toggleEmoji = (idx: number) => {
    setMapping((prev) => {
      if (!prev) return prev;
      const emojis = [...prev.emojis];
      emojis[idx] = { ...emojis[idx], included: !emojis[idx].included };
      return { ...prev, emojis };
    });
  };

  const addCustomChannel = () => {
    if (!newChannelName.trim() || !mapping) return;
    setMapping({
      ...mapping,
      customChannels: [
        ...mapping.customChannels,
        { name: newChannelName.trim(), type: newChannelType, categoryIndex: newChannelCatIdx },
      ],
    });
    setNewChannelName("");
    setShowAddChannel(false);
  };

  const removeCustomChannel = (idx: number) => {
    setMapping((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        customChannels: prev.customChannels.filter((_, i) => i !== idx),
      };
    });
  };

  const addCustomRole = () => {
    if (!newRoleName.trim() || !mapping) return;
    setMapping({
      ...mapping,
      customRoles: [
        ...mapping.customRoles,
        { name: newRoleName.trim(), color: newRoleColor, stoatPermissions: DEFAULT_CHATTER_PERMISSIONS },
      ],
    });
    setNewRoleName("");
    setShowAddRole(false);
  };

  const removeCustomRole = (idx: number) => {
    setMapping((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        customRoles: prev.customRoles.filter((_, i) => i !== idx),
      };
    });
  };

  const toggleCatExpand = (idx: number) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const addCustomCategory = () => {
    if (!newCategoryName.trim() || !mapping) return;
    setMapping({
      ...mapping,
      customCategories: [...mapping.customCategories, { name: newCategoryName.trim() }],
    });
    setNewCategoryName("");
    setShowAddCategory(false);
  };

  const toggleChannelPrivate = (catIdx: number, chIdx: number) => {
    setMapping((prev) => {
      if (!prev) return prev;
      const cats = [...prev.categories];
      const channels = [...cats[catIdx].channels];
      const wasPrivate = channels[chIdx].isPrivate;
      channels[chIdx] = {
        ...channels[chIdx],
        isPrivate: !wasPrivate,
        // Clear overrides when toggling private off
        permissionOverrides: wasPrivate ? [] : channels[chIdx].permissionOverrides,
      };
      cats[catIdx] = { ...cats[catIdx], channels };
      return { ...prev, categories: cats };
    });
  };

  const removeCustomCategory = (idx: number) => {
    setMapping((prev) => {
      if (!prev) return prev;
      return { ...prev, customCategories: prev.customCategories.filter((_, i) => i !== idx) };
    });
  };

  const updateChannelTopic = (catIdx: number, chIdx: number, topic: string) => {
    setMapping((prev) => {
      if (!prev) return prev;
      const cats = [...prev.categories];
      const channels = [...cats[catIdx].channels];
      channels[chIdx] = { ...channels[chIdx], topic };
      cats[catIdx] = { ...cats[catIdx], channels };
      return { ...prev, categories: cats };
    });
  };

  const toggleChannelNsfw = (catIdx: number, chIdx: number) => {
    setMapping((prev) => {
      if (!prev) return prev;
      const cats = [...prev.categories];
      const channels = [...cats[catIdx].channels];
      channels[chIdx] = { ...channels[chIdx], nsfw: !channels[chIdx].nsfw };
      cats[catIdx] = { ...cats[catIdx], channels };
      return { ...prev, categories: cats };
    });
  };

  const updateRoleColor = (idx: number, color: number) => {
    setMapping((prev) => {
      if (!prev) return prev;
      const roles = [...prev.roles];
      roles[idx] = { ...roles[idx], color };
      return { ...prev, roles };
    });
  };

  const resetToDefaults = () => {
    if (!scanData) return;
    setMapping(buildDefaultMapping(scanData));
    toast.success("Mapping reset to defaults");
  };

  // ── Drag-and-drop helpers ──
  const reorderCategories = (fromIndex: number, toIndex: number) => {
    setMapping((prev) => {
      if (!prev) return prev;
      return { ...prev, categories: arrayMove(prev.categories, fromIndex, toIndex) };
    });
    // Update expandedCats to follow their categories
    setExpandedCats((prev) => {
      const arr = Array.from(prev);
      const newSet = new Set<number>();
      arr.forEach((idx) => {
        if (idx === fromIndex) newSet.add(toIndex);
        else if (fromIndex < toIndex && idx > fromIndex && idx <= toIndex) newSet.add(idx - 1);
        else if (fromIndex > toIndex && idx >= toIndex && idx < fromIndex) newSet.add(idx + 1);
        else newSet.add(idx);
      });
      return newSet;
    });
  };

  const reorderChannels = (catIdx: number, fromIdx: number, toIdx: number) => {
    setMapping((prev) => {
      if (!prev) return prev;
      const cats = [...prev.categories];
      cats[catIdx] = { ...cats[catIdx], channels: arrayMove(cats[catIdx].channels, fromIdx, toIdx) };
      return { ...prev, categories: cats };
    });
  };

  const moveChannel = (fromCatIdx: number, fromChIdx: number, toCatIdx: number, toChIdx: number) => {
    setMapping((prev) => {
      if (!prev) return prev;
      const cats = prev.categories.map((c) => ({ ...c, channels: [...c.channels] }));
      const [ch] = cats[fromCatIdx].channels.splice(fromChIdx, 1);
      cats[toCatIdx].channels.splice(toChIdx, 0, ch);
      return { ...prev, categories: cats };
    });
  };

  // ── DnD state ──
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id || !mapping) return;

    const activeStr = String(active.id);
    const overStr = String(over.id);

    // Category reorder
    if (activeStr.startsWith("cat-") && overStr.startsWith("cat-")) {
      const fromIdx = parseInt(activeStr.replace("cat-", ""));
      const toIdx = parseInt(overStr.replace("cat-", ""));
      reorderCategories(fromIdx, toIdx);
      return;
    }

    // Channel reorder / cross-category move
    if (activeStr.startsWith("ch-")) {
      const [, fromCatStr, fromChStr] = activeStr.split("-");
      const fromCat = parseInt(fromCatStr);
      const fromCh = parseInt(fromChStr);

      if (overStr.startsWith("ch-")) {
        const [, toCatStr, toChStr] = overStr.split("-");
        const toCat = parseInt(toCatStr);
        const toCh = parseInt(toChStr);

        if (fromCat === toCat) {
          reorderChannels(fromCat, fromCh, toCh);
        } else {
          moveChannel(fromCat, fromCh, toCat, toCh);
        }
      }
    }
  };

  // Get active drag item info for overlay
  const getActiveDragItem = () => {
    if (!activeId || !mapping) return null;
    if (activeId.startsWith("cat-")) {
      const idx = parseInt(activeId.replace("cat-", ""));
      return { type: "category" as const, data: mapping.categories[idx] };
    }
    if (activeId.startsWith("ch-")) {
      const [, catStr, chStr] = activeId.split("-");
      const cat = parseInt(catStr);
      const ch = parseInt(chStr);
      return { type: "channel" as const, data: mapping.categories[cat]?.channels[ch] };
    }
    return null;
  };


  // ── Available roles for channel restrictions (included non-managed roles) ──
  const availableRolesForChannels = mapping
    ? [
        ...mapping.roles
          .filter((r) => r.included && !r.managed && !r.isDefault)
          .map((r) => ({ discordId: r.discordId, name: r.name, color: r.color })),
        ...mapping.customRoles.map((cr, i) => ({
          discordId: `custom-role-${i}`,
          name: cr.name,
          color: parseInt(cr.color.replace("#", ""), 16),
        })),
      ]
    : [];

  // ── Summary counts ──
  const includedChannels = mapping
    ? mapping.categories.reduce(
        (sum, cat) => sum + cat.channels.filter((ch) => ch.included).length,
        0
      ) + mapping.customChannels.length
    : 0;
  const includedRoles = mapping
    ? mapping.roles.filter((r) => r.included).length + mapping.customRoles.length
    : 0;
  const includedEmojis = mapping
    ? mapping.emojis.filter((e) => e.included).length
    : 0;
  const includedCats = mapping
    ? mapping.categories.filter((c) => c.included).length + (mapping.customCategories?.length || 0)
    : 0;

  return (
    <Layout>
      <div className="pt-28 pb-20 px-6">
        <div className="container mx-auto max-w-5xl">
          <StepIndicator currentStep={3} />
          {loading ? (
            <div className="text-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground text-sm">Loading…</p>
            </div>
          ) : mapping && scanData ? (
            <>
              <Link
                to="/scan"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to scan
              </Link>

              <div className="text-center mb-10">
                <h1 className="text-3xl font-bold text-foreground mb-2">Mapping Studio</h1>
                <p className="text-muted-foreground text-sm max-w-xl mx-auto">
                  Choose what gets transferred, rename items, configure permissions, or add new channels and roles.
                  Unchecked items will be skipped during migration.
                </p>
              </div>

              {/* Migration Copilot - full width, top */}
              <MigrationCopilot mapping={mapping} />

              {/* First time? Quick guide */}
              <Collapsible className="mb-6">
                <CollapsibleTrigger className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors">
                  <HelpCircle className="w-4 h-4" />
                  <span>First time? Quick guide</span>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 bg-card border border-border rounded-xl p-4 sm:p-5">
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li>☑ <strong className="text-foreground">Checkboxes</strong> control what gets transferred. Unchecked items are skipped</li>
                    <li>✏️ <strong className="text-foreground">Click any name</strong> to rename it for your new server</li>
                    <li>🔒 <strong className="text-foreground">Channel overrides</strong> let you control who can view/send in specific channels</li>
                    <li>✨ <strong className="text-foreground">Everything has smart defaults</strong>. If you're happy with a 1:1 copy, just click Continue</li>
                  </ul>
                </CollapsibleContent>
              </Collapsible>

              {/* Bot info banner */}
              <div className="flex items-start gap-3 bg-secondary/50 border border-border rounded-xl px-5 py-4">
                <Bot className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Bot setup comes after transfer</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Once your server has been created, you'll be able to choose bots to add and find replacements for your Discord bots.
                  </p>
                </div>
              </div>

              {/* ── Server Name & Branding ── */}
              <div className="bg-card border border-border rounded-xl overflow-hidden mb-6">
                <SectionHeader
                  title="Server & Branding"
                  icon={Image}
                  count={2}
                  selectedCount={
                    (mapping.includeIcon ? 1 : 0) + (mapping.includeBanner ? 1 : 0)
                  }
                  onToggleAll={() => {
                    const allOn = mapping.includeIcon && mapping.includeBanner;
                    setMapping({ ...mapping, includeIcon: !allOn, includeBanner: !allOn });
                  }}
                  allSelected={mapping.includeIcon && mapping.includeBanner}
                />
                <div className="p-4 sm:p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                    <span className="text-sm text-muted-foreground shrink-0">Server name:</span>
                    <InlineEdit
                      fieldKey="serverName"
                      value={mapping.serverName}
                      onSave={(v) => setMapping({ ...mapping, serverName: v })}
                      editingField={editingField}
                      setEditingField={setEditingField}
                    />
                  </div>

                  {/* Server description */}
                  <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3">
                    <span className="text-sm text-muted-foreground shrink-0 sm:pt-2">Description:</span>
                    <Textarea
                      value={mapping.serverDescription}
                      onChange={(e) => setMapping({ ...mapping, serverDescription: e.target.value })}
                      placeholder="Optional server description…"
                      className="flex-1 min-h-[60px] text-sm"
                      rows={2}
                    />
                  </div>

                  {/* Icon */}
                  <div className="flex items-start gap-2 sm:gap-3">
                    <Checkbox
                      checked={mapping.includeIcon}
                      onCheckedChange={() =>
                        setMapping({ ...mapping, includeIcon: !mapping.includeIcon })
                      }
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <BrandingUpload
                        label="Server Icon"
                        existingUrl={
                          scanData.guild.icon
                            ? `https://cdn.discordapp.com/icons/${scanData.guild.id}/${scanData.guild.icon}.png?size=128`
                            : null
                        }
                        customUrl={mapping.customIconUrl}
                        type="icon"
                        onUpload={(url) => setMapping({ ...mapping, customIconUrl: url, includeIcon: true })}
                        onRemove={() => setMapping({ ...mapping, customIconUrl: undefined })}
                      />
                    </div>
                  </div>

                  {/* Banner */}
                  <div className="flex items-start gap-2 sm:gap-3">
                    <Checkbox
                      checked={mapping.includeBanner}
                      onCheckedChange={() =>
                        setMapping({ ...mapping, includeBanner: !mapping.includeBanner })
                      }
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <BrandingUpload
                        label="Server Banner"
                        existingUrl={
                          scanData.guild.banner
                            ? `https://cdn.discordapp.com/banners/${scanData.guild.id}/${scanData.guild.banner}.png?size=512`
                            : null
                        }
                        customUrl={mapping.customBannerUrl}
                        type="banner"
                        onUpload={(url) => setMapping({ ...mapping, customBannerUrl: url, includeBanner: true })}
                        onRemove={() => setMapping({ ...mapping, customBannerUrl: undefined })}
                      />
                    </div>
                  </div>
                </div>
              </div>


              <div className="grid lg:grid-cols-3 gap-6">
                {/* ── Categories & Channels ── */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <h2 className="text-lg font-semibold text-foreground">
                      Categories & Channels
                    </h2>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowAddCategory(!showAddCategory)}
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        <span className="hidden sm:inline">Add </span>Category
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowAddChannel(!showAddChannel)}
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        <span className="hidden sm:inline">Add </span>Channel
                      </Button>
                    </div>
                  </div>

                  {/* Add custom category form */}
                  {showAddCategory && (
                    <div className="bg-card border border-border rounded-xl p-4 flex items-end gap-3">
                      <div className="flex-1">
                        <label className="text-xs text-muted-foreground mb-1 block">Category Name</label>
                        <Input
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="New Category"
                          className="h-8"
                        />
                      </div>
                      <Button size="sm" onClick={addCustomCategory} disabled={!newCategoryName.trim()}>
                        Add
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowAddCategory(false)}>
                        ✕
                      </Button>
                    </div>
                  )}

                  {showAddChannel && (
                    <div className="bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-end gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Name</label>
                        <Input
                          value={newChannelName}
                          onChange={(e) => setNewChannelName(e.target.value)}
                          placeholder="general-2"
                          className="h-8 w-40"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Type</label>
                        <select
                          value={newChannelType}
                          onChange={(e) => setNewChannelType(e.target.value as "Text" | "Voice")}
                          className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                        >
                          <option value="Text">Text</option>
                          <option value="Voice">Voice</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Category</label>
                        <select
                          value={newChannelCatIdx}
                          onChange={(e) => setNewChannelCatIdx(Number(e.target.value))}
                          className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                        >
                          {mapping.categories.map((cat, i) => (
                            <option key={i} value={i}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <Button size="sm" onClick={addCustomChannel} disabled={!newChannelName.trim()}>
                        Add
                      </Button>
                    </div>
                  )}

                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={mapping.categories.map((_, i) => `cat-${i}`)}
                      strategy={verticalListSortingStrategy}
                    >
                      {mapping.categories.map((cat, catIdx) => {
                        const isExpanded = expandedCats.has(catIdx);
                        const includedCh = cat.channels.filter((ch) => ch.included).length;
                        const customInCat = mapping.customChannels.filter(
                          (cc) => cc.categoryIndex === catIdx
                        );

                        return (
                          <SortableCategoryCard
                            key={`cat-${catIdx}`}
                            id={`cat-${catIdx}`}
                            cat={cat}
                            catIdx={catIdx}
                            isExpanded={isExpanded}
                            includedCh={includedCh}
                            customInCat={customInCat}
                            toggleCategory={toggleCategory}
                            toggleCatExpand={toggleCatExpand}
                            renameItem={renameItem}
                            toggleChannel={toggleChannel}
                            updateChannelTopic={updateChannelTopic}
                            toggleChannelNsfw={toggleChannelNsfw}
                            toggleChannelPrivate={toggleChannelPrivate}
                            updateChannelOverrides={updateChannelOverrides}
                            enableChannelOverrides={(ci: number, chi: number) => {
                              setMapping((prev) => {
                                if (!prev) return prev;
                                const cats = [...prev.categories];
                                const channels = [...cats[ci].channels];
                                channels[chi] = { ...channels[chi], showOverrides: true, permissionOverrides: [] };
                                cats[ci] = { ...cats[ci], channels };
                                return { ...prev, categories: cats };
                              });
                            }}
                            availableRolesForChannels={availableRolesForChannels}
                            editingField={editingField}
                            setEditingField={setEditingField}
                            mapping={mapping}
                            setMapping={setMapping}
                            removeCustomChannel={removeCustomChannel}
                            InlineEdit={InlineEdit}
                          />
                        );
                      })}
                    </SortableContext>

                    <DragOverlay>
                      {(() => {
                        const item = getActiveDragItem();
                        if (!item) return null;
                        if (item.type === "category") {
                          return (
                            <div className="bg-card border-2 border-primary/50 rounded-xl px-5 py-3 shadow-lg opacity-90">
                              <span className="text-sm font-semibold">{item.data.name}</span>
                            </div>
                          );
                        }
                        if (item.type === "channel") {
                          const Icon = channelIcon(item.data.typeName);
                          return (
                            <div className="bg-card border-2 border-primary/50 rounded-lg px-4 py-2 shadow-lg opacity-90 flex items-center gap-2">
                              <Icon className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">{item.data.name}</span>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </DragOverlay>
                  </DndContext>

                  {/* Custom categories */}
                  {mapping.customCategories.map((cc, idx) => (
                    <div key={`custom-cat-${idx}`} className="bg-card border border-primary/30 rounded-xl overflow-hidden">
                      <div className="flex items-center gap-3 px-5 py-3 bg-primary/5 border-b border-border">
                        <Checkbox checked disabled />
                        <span className="text-sm text-primary font-medium flex-1">{cc.name}</span>
                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">New</span>
                        <button
                          onClick={() => removeCustomCategory(idx)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="px-5 py-3 text-xs text-muted-foreground">
                        Empty category. Add channels after transfer
                      </div>
                    </div>
                  ))}
                </div>

                {/* ── Right sidebar: Roles, Emojis, Summary ── */}
                <div className="space-y-6">
                  {/* Roles */}
                  <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <SectionHeader
                      title="Roles"
                      icon={Users}
                      count={mapping.roles.filter((r) => !r.managed).length}
                      selectedCount={mapping.roles.filter((r) => r.included).length}
                      onToggleAll={toggleAllRoles}
                      allSelected={mapping.roles.filter((r) => !r.managed).every((r) => r.included)}
                    />
                    <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
                      {mapping.roles.map((role, idx) => (
                        <div
                          key={idx}
                          className={`px-5 py-2.5 ${role.managed ? "opacity-40" : ""}`}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={role.included}
                              onCheckedChange={() => !role.isDefault && toggleRole(idx)}
                              disabled={role.managed || role.isDefault}
                            />
                            {role.isDefault ? (
                              <div className="w-3 h-3 rounded-full shrink-0 bg-muted-foreground" />
                            ) : !role.managed ? (
                              <input
                                type="color"
                                value={role.color ? `#${role.color.toString(16).padStart(6, "0")}` : "#808080"}
                                onChange={(e) => updateRoleColor(idx, parseInt(e.target.value.replace("#", ""), 16))}
                                className="w-5 h-5 rounded cursor-pointer border-0 shrink-0"
                              />
                            ) : (
                              <div
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{
                                  backgroundColor: role.color
                                    ? `#${role.color.toString(16).padStart(6, "0")}`
                                    : "hsl(var(--muted-foreground))",
                                }}
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              {role.isDefault ? (
                                <span className="text-sm text-foreground">Default (@everyone)</span>
                              ) : (
                                <InlineEdit
                                  fieldKey={`role-${idx}`}
                                  value={role.name}
                                  onSave={(v) => renameItem("role", idx, v)}
                                  editingField={editingField}
                                  setEditingField={setEditingField}
                                />
                              )}
                            </div>
                            {role.isDefault && (
                              <span className="text-[10px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded">Default</span>
                            )}
                            {role.managed && !role.isDefault && (
                              <span className="text-[10px] text-muted-foreground">Bot role</span>
                            )}
                          </div>
                          {/* Permission editor for included non-managed roles and default role */}
                          {role.included && (!role.managed || role.isDefault) && (
                            <div className="ml-10 mt-1">
                              <PermissionEditor
                                roleName={role.name}
                                stoatPermissions={normalizeStoatPerms(role.stoatPermissions)}
                                onChange={(perms) => updateRolePermissions(idx, perms)}
                              />
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Custom roles */}
                      {mapping.customRoles.map((cr, idx) => (
                        <div
                          key={`custom-role-${idx}`}
                          className="px-5 py-2.5 bg-primary/5"
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox checked disabled />
                            <div
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: cr.color }}
                            />
                            <span className="text-sm text-primary font-medium flex-1">
                              {cr.name}
                            </span>
                            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                              New
                            </span>
                            <button
                              onClick={() => removeCustomRole(idx)}
                              className="text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {/* Permission editor for custom roles */}
                          <div className="ml-10 mt-1">
                            <PermissionEditor
                              roleName={cr.name}
                              stoatPermissions={normalizeStoatPerms(cr.stoatPermissions)}
                              onChange={(perms: StoatPermissions) => {
                                setMapping((prev) => {
                                  if (!prev) return prev;
                                  const customRoles = [...prev.customRoles];
                                  customRoles[idx] = { ...customRoles[idx], stoatPermissions: perms };
                                  return { ...prev, customRoles };
                                });
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add role form */}
                    <div className="p-3 border-t border-border">
                      {showAddRole ? (
                        <div className="flex items-end gap-2">
                          <div className="flex-1">
                            <Input
                              value={newRoleName}
                              onChange={(e) => setNewRoleName(e.target.value)}
                              placeholder="Role name"
                              className="h-8"
                            />
                          </div>
                          <input
                            type="color"
                            value={newRoleColor}
                            onChange={(e) => setNewRoleColor(e.target.value)}
                            className="w-8 h-8 rounded cursor-pointer border-0"
                          />
                          <Button size="sm" onClick={addCustomRole} disabled={!newRoleName.trim()}>
                            Add
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setShowAddRole(false)}>
                            ✕
                          </Button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowAddRole(true)}
                          className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add new role
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Emojis */}
                  {mapping.emojis.length > 0 && (
                    <div className="bg-card border border-border rounded-xl overflow-hidden">
                      <SectionHeader
                        title="Emojis"
                        icon={Smile}
                        count={mapping.emojis.length}
                        selectedCount={includedEmojis}
                        onToggleAll={toggleAllEmojis}
                        allSelected={mapping.emojis.every((e) => e.included)}
                      />
                      <div className="p-4 grid grid-cols-4 gap-2 max-h-60 overflow-y-auto">
                        {mapping.emojis.map((emoji, idx) => (
                          <div
                            key={idx}
                            className={`flex flex-col items-center gap-1 p-1.5 rounded-lg border transition-all relative group overflow-hidden ${
                              emoji.included
                                ? "border-primary/30 bg-primary/5"
                                : "border-transparent opacity-40"
                            }`}
                            title={`:${emoji.name}:`}
                          >
                            <button onClick={() => toggleEmoji(idx)} className="w-full flex flex-col items-center gap-1">
                              <img
                                src={emoji.url}
                                alt={emoji.name}
                                className="w-7 h-7"
                                loading="lazy"
                              />
                            </button>
                            <div className="w-full min-w-0">
                              <InlineEdit
                                fieldKey={`emoji-${idx}`}
                                value={emoji.name}
                                onSave={(v) => renameItem("emoji", idx, v)}
                                compact
                                editingField={editingField}
                                setEditingField={setEditingField}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}


                  {/* Summary */}
                  <div className="bg-card border border-border rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-3">
                      Transfer Summary
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Categories</span>
                        <span className="text-foreground font-medium">{includedCats}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Channels</span>
                        <span className="text-foreground font-medium">{includedChannels}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Roles</span>
                        <span className="text-foreground font-medium">{includedRoles}</span>
                      </div>
                      {mapping.emojis.length > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Emojis</span>
                          <span className="text-foreground font-medium">{includedEmojis}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Branding</span>
                        <span className="text-foreground font-medium">
                          {[mapping.includeIcon && "icon", mapping.includeBanner && "banner"]
                            .filter(Boolean)
                            .join(", ") || "none"}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 mt-6">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={saveMapping}
                        >
                          Save
                        </Button>
                        <Button
                          className="flex-1"
                          onClick={saveAndContinue}
                          disabled={saving}
                        >
                          {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              Transfer
                              <ArrowRight className="w-4 h-4 ml-1" />
                            </>
                          )}
                        </Button>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full text-muted-foreground">
                            <RotateCcw className="w-3.5 h-3.5 mr-1" />
                            Reset to defaults
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Reset to defaults?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will discard all your customizations and rebuild the mapping from the original scan data.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={resetToDefaults}>Reset</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </Layout>
  );
};

export default MappingPage;
