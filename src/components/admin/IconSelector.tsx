import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Search, X, Shapes, icons, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Get all icon names from lucide-react (filter out internal exports)
const ALL_ICON_NAMES = Object.keys(icons).filter(
  (key) => key !== 'createLucideIcon' && key !== 'default' && typeof icons[key as keyof typeof icons] === 'function'
) as Array<keyof typeof icons>;

// Categorize icons by prefix/pattern for better organization
const categorizeIcon = (name: string): string => {
  const lowerName = name.toLowerCase();
  
  // Navigation
  if (/^(arrow|chevron|corner|move|navigation|menu|panel|sidebar|layout|external|internal|log-in|log-out|door|exit|entry|import|export)/.test(lowerName)) return "navigation";
  
  // Actions
  if (/^(plus|minus|x|check|edit|pencil|pen|trash|delete|save|copy|clipboard|download|upload|send|refresh|rotate|undo|redo|play|pause|stop|skip|fast|rewind|volume|mic|camera|scan|search|filter|sort|zoom|maximize|minimize|expand|shrink|grip|grab|hand|pointer|mouse|cursor|target|crosshair|aim|wand|magic|sparkle)/.test(lowerName)) return "action";
  
  // Status & Alerts
  if (/^(alert|warning|error|info|help|question|circle-check|circle-x|circle-alert|badge|bell|notification|loader|loading|spinner|clock|timer|hourglass|calendar|schedule|check|x-circle|shield-check|shield-x)/.test(lowerName)) return "status";
  
  // Communication
  if (/^(message|chat|comment|mail|email|inbox|send|share|forward|reply|at-sign|phone|call|video|broadcast|radio|rss|podcast|megaphone|speech|bubble|conversation)/.test(lowerName)) return "communication";
  
  // Media
  if (/^(image|photo|picture|gallery|camera|video|film|movie|tv|monitor|screen|play|music|audio|headphone|speaker|mic|youtube|spotify|instagram|facebook|twitter|linkedin|github|aperture|focus|frame)/.test(lowerName)) return "media";
  
  // Files & Data
  if (/^(file|document|folder|archive|zip|package|box|database|server|cloud|storage|hard-drive|disc|table|spreadsheet|chart|graph|bar|pie|line|trending|analytics|statistics|code|terminal|git|branch|merge|commit|json|csv|text|binary)/.test(lowerName)) return "data";
  
  // Users & People
  if (/^(user|users|person|people|account|profile|avatar|contact|team|group|community|baby|child|accessibility|body|hand|footprint)/.test(lowerName)) return "users";
  
  // Business & Commerce
  if (/^(building|office|store|shop|cart|shopping|bag|credit|card|wallet|money|dollar|euro|pound|bitcoin|coin|receipt|invoice|calculator|percent|tag|label|barcode|qr|briefcase|landmark|bank|factory)/.test(lowerName)) return "business";
  
  // Nature & Weather
  if (/^(sun|moon|star|cloud|rain|snow|wind|storm|thunder|lightning|rainbow|umbrella|thermometer|droplet|wave|mountain|tree|leaf|flower|plant|seed|sprout|bug|bird|cat|dog|fish|rabbit|turtle|paw|feather|egg)/.test(lowerName)) return "nature";
  
  // Objects & Tools
  if (/^(home|house|door|window|key|lock|unlock|shield|security|settings|gear|cog|wrench|hammer|screwdriver|tool|brush|paint|palette|ruler|compass|magnet|flashlight|lamp|light|bulb|plug|battery|power|zap|bolt|flame|fire|rocket|airplane|plane|car|truck|bus|train|bike|ship|anchor|crown|gift|glasses|watch|ring|gem|diamond)/.test(lowerName)) return "objects";
  
  // Health & Science
  if (/^(heart|pulse|activity|stethoscope|syringe|pill|capsule|bandage|thermometer|hospital|ambulance|wheelchair|brain|eye|ear|bone|dna|atom|flask|beaker|microscope|telescope|test-tube|petri|radiation|biohazard)/.test(lowerName)) return "health";
  
  // Shapes & Symbols
  if (/^(circle|square|triangle|rectangle|hexagon|octagon|pentagon|diamond|heart|star|asterisk|hash|at|ampersand|percent|slash|backslash|pipe|parenthes|bracket|brace|quote|apostrophe|shape|form|geometry)/.test(lowerName)) return "shapes";
  
  // Tech & Devices
  if (/^(laptop|computer|desktop|keyboard|mouse|printer|scanner|monitor|tv|tablet|smartphone|watch|headset|gamepad|joystick|wifi|bluetooth|signal|antenna|satellite|cpu|chip|memory|ram|ssd|usb|hdmi|ethernet|qr-code|nfc|fingerprint|scan)/.test(lowerName)) return "tech";
  
  // Text & Typography
  if (/^(type|text|font|bold|italic|underline|strikethrough|align|indent|list|heading|paragraph|quote|link|anchor|footnote|subscript|superscript|case|letter|word|spell|language|translate|globe|a-large|a-small|baseline|wrap|pilcrow|remove-formatting)/.test(lowerName)) return "typography";
  
  // Default
  return "other";
};

// Category labels in Portuguese
const CATEGORY_LABELS: Record<string, string> = {
  all: "Todos",
  navigation: "Navegação",
  action: "Ações",
  status: "Status",
  communication: "Comunicação",
  media: "Mídia",
  data: "Dados & Arquivos",
  users: "Usuários",
  business: "Negócios",
  nature: "Natureza",
  objects: "Objetos",
  health: "Saúde",
  shapes: "Formas",
  tech: "Tecnologia",
  typography: "Tipografia",
  other: "Outros",
};

// Pre-categorize all icons for performance
const CATEGORIZED_ICONS = ALL_ICON_NAMES.reduce((acc, name) => {
  const category = categorizeIcon(name);
  if (!acc[category]) acc[category] = [];
  acc[category].push(name);
  return acc;
}, {} as Record<string, Array<keyof typeof icons>>);

// Count icons per category
const CATEGORY_COUNTS = Object.entries(CATEGORIZED_ICONS).reduce((acc, [cat, iconList]) => {
  acc[cat] = iconList.length;
  return acc;
}, {} as Record<string, number>);

// Backward compatibility exports
export const APPLICATION_ICONS = Object.entries(CATEGORIZED_ICONS).reduce((acc, [category, iconList]) => {
  acc[category] = iconList.map(name => ({ name, description: name }));
  return acc;
}, {} as Record<string, Array<{ name: string; description: string }>>);

export const ALL_APPLICATION_ICONS = ALL_ICON_NAMES.map(name => ({
  name,
  description: name,
  category: categorizeIcon(name),
}));

interface IconSelectorProps {
  value?: string;
  onSelect: (iconName: string) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}

export const IconSelector: React.FC<IconSelectorProps> = ({
  value,
  onSelect,
  className,
  disabled = false,
  placeholder = "Selecionar ícone",
}) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Filter icons based on search and category
  const filteredIcons = useMemo(() => {
    let result: Array<keyof typeof icons> = [...ALL_ICON_NAMES];

    // Filter by category
    if (categoryFilter !== "all") {
      result = CATEGORIZED_ICONS[categoryFilter] || [];
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((name) => String(name).toLowerCase().includes(query));
    }

    // Sort alphabetically
    return result.sort((a, b) => String(a).localeCompare(String(b)));
  }, [searchQuery, categoryFilter]);

  // Get the selected icon component
  const SelectedIconComponent = value ? (icons[value as keyof typeof icons] as LucideIcon) : null;

  const handleSelect = (iconName: string) => {
    onSelect(iconName);
    setOpen(false);
    setSearchQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className={cn("w-full justify-start gap-2", className)}
          disabled={disabled}
        >
          {SelectedIconComponent ? (
            <>
              <SelectedIconComponent className="h-4 w-4" />
              <span className="font-mono text-xs">{value}</span>
            </>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Shapes className="h-5 w-5" />
            <DialogTitle>Biblioteca de Ícones Lucide</DialogTitle>
            <Badge variant="secondary" className="ml-2">
              {ALL_ICON_NAMES.length} ícones
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search and Filter */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar ícone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                autoFocus
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  Todos ({ALL_ICON_NAMES.length})
                </SelectItem>
                {Object.entries(CATEGORY_LABELS)
                  .filter(([key]) => key !== "all" && CATEGORY_COUNTS[key])
                  .sort((a, b) => (CATEGORY_COUNTS[b[0]] || 0) - (CATEGORY_COUNTS[a[0]] || 0))
                  .map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label} ({CATEGORY_COUNTS[key] || 0})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Results count */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {filteredIcons.length} ícone{filteredIcons.length !== 1 ? "s" : ""} encontrado{filteredIcons.length !== 1 ? "s" : ""}
            </span>
            {value && (
              <Badge variant="secondary" className="gap-1">
                Selecionado: {value}
              </Badge>
            )}
          </div>

          {/* Icon Grid */}
          <ScrollArea className="h-[400px] pr-4">
            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-1.5">
              {filteredIcons.map((iconName) => {
                const IconComponent = icons[iconName] as LucideIcon;
                if (!IconComponent) return null;

                const isSelected = value === iconName;

                return (
                  <button
                    key={String(iconName)}
                    onClick={() => handleSelect(String(iconName))}
                    className={cn(
                      "flex flex-col items-center justify-center p-2 rounded-md border transition-all group hover:border-primary hover:bg-primary/5",
                      isSelected
                        ? "border-primary bg-primary/10 ring-1 ring-primary"
                        : "border-transparent bg-muted/30"
                    )}
                    title={String(iconName)}
                  >
                    <IconComponent
                      className={cn(
                        "h-5 w-5 transition-colors",
                        isSelected ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                      )}
                    />
                  </button>
                );
              })}
            </div>

            {filteredIcons.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Search className="h-8 w-8 mb-2 opacity-50" />
                <p>Nenhum ícone encontrado</p>
                <p className="text-xs">Tente outro termo de busca</p>
              </div>
            )}
          </ScrollArea>

          {/* Selected Icon Preview */}
          {value && SelectedIconComponent && (
            <div className="pt-4 border-t flex items-start gap-4">
              <div className="flex items-center justify-center h-16 w-16 rounded-lg bg-muted">
                <SelectedIconComponent className="h-8 w-8" />
              </div>
              <div className="flex-1 min-w-0">
                <Label className="text-xs text-muted-foreground">
                  Código:
                </Label>
                <pre className="mt-1 bg-muted p-2 rounded text-xs overflow-x-auto">
                  {`import { ${value} } from 'lucide-react';\n<${value} className="h-5 w-5" />`}
                </pre>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IconSelector;
