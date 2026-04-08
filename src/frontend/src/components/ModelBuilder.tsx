import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  FileText,
  GripVertical,
  Info,
  Menu,
  MousePointer2,
  Plus,
  Save,
  Settings,
  Wrench,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useCreateModel,
  useGetAllCustomTools,
  useGetCurrentTime,
  useUpdateModel,
} from "../hooks/useQueries";
import type {
  CustomToolDefinition,
  ExampleImage,
  Model,
  ToolConfig,
} from "../types";
import CustomToolManagerDialog from "./CustomToolManagerDialog";
import ModelCardSummary from "./ModelCardSummary";
import ToolConfigDialog from "./ToolConfigDialog";
import ExampleSetupsField from "./model/ExampleSetupsField";

interface ModelBuilderProps {
  model?: Model | null;
  onClose: () => void;
}

interface ICTTool {
  id: string;
  name: string;
  category: string;
  defaultProperties: Record<string, unknown>;
}

// ─── A. Market Context ────────────────────────────────────────────────────────
const MARKET_CONTEXT_TOOLS: ICTTool[] = [
  {
    id: "trend-bias",
    name: "Trend / Bias",
    category: "A. Market Context",
    defaultProperties: {
      direction: "up",
      timeframe: "1h",
      notes: "",
    },
  },
  {
    id: "market-structure-general",
    name: "Market Structure",
    category: "A. Market Context",
    defaultProperties: {
      state: "trending",
      bias: "bullish",
      timeframe: "1h",
      notes: "",
    },
  },
  {
    id: "volatility",
    name: "Volatility",
    category: "A. Market Context",
    defaultProperties: {
      level: "normal",
      indicator: "ATR",
      notes: "",
    },
  },
  {
    id: "session-time-of-day",
    name: "Session / Time of Day",
    category: "A. Market Context",
    defaultProperties: {
      session: "London",
      timeOfDay: "",
      notes: "",
    },
  },
];

// ─── B. Price Levels / Areas ──────────────────────────────────────────────────
const PRICE_LEVEL_TOOLS: ICTTool[] = [
  {
    id: "key-level-general",
    name: "Key Level",
    category: "B. Price Levels / Areas",
    defaultProperties: {
      price: 0,
      type: "support",
      timeframe: "1h",
      notes: "",
    },
  },
  {
    id: "support-resistance",
    name: "Support / Resistance",
    category: "B. Price Levels / Areas",
    defaultProperties: {
      price: 0,
      type: "support",
      strength: "moderate",
      timeframe: "1h",
      notes: "",
    },
  },
  {
    id: "trendline",
    name: "Trendline",
    category: "B. Price Levels / Areas",
    defaultProperties: {
      direction: "ascending",
      timeframe: "1h",
      notes: "",
    },
  },
  {
    id: "fibonacci",
    name: "Fibonacci",
    category: "B. Price Levels / Areas",
    defaultProperties: {
      level: "0.618",
      type: "retracement",
      timeframe: "1h",
      notes: "",
    },
  },
  {
    id: "range-channel",
    name: "Range / Channel",
    category: "B. Price Levels / Areas",
    defaultProperties: {
      upperBound: 0,
      lowerBound: 0,
      type: "range",
      notes: "",
    },
  },
];

// ─── C. Indicators ────────────────────────────────────────────────────────────
const INDICATOR_TOOLS: ICTTool[] = [
  {
    id: "sma",
    name: "SMA",
    category: "C. Indicators",
    defaultProperties: {
      period: 20,
      timeframe: "1h",
      source: "close",
      notes: "",
    },
  },
  {
    id: "ema",
    name: "EMA",
    category: "C. Indicators",
    defaultProperties: {
      period: 20,
      timeframe: "1h",
      source: "close",
      notes: "",
    },
  },
  {
    id: "rsi",
    name: "RSI",
    category: "C. Indicators",
    defaultProperties: {
      period: 14,
      overbought: 70,
      oversold: 30,
      timeframe: "1h",
      notes: "",
    },
  },
  {
    id: "macd",
    name: "MACD",
    category: "C. Indicators",
    defaultProperties: {
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      timeframe: "1h",
      notes: "",
    },
  },
  {
    id: "custom-indicator",
    name: "Custom Indicator",
    category: "C. Indicators",
    defaultProperties: {
      name: "",
      value: "",
      condition: "",
      notes: "",
    },
  },
];

// ─── D. Volume & Order Flow ───────────────────────────────────────────────────
const VOLUME_TOOLS: ICTTool[] = [
  {
    id: "volume-profile",
    name: "Volume Profile",
    category: "D. Volume & Order Flow",
    defaultProperties: {
      type: "session",
      valueArea: 70,
      notes: "",
    },
  },
  {
    id: "volume-spike",
    name: "Volume Spike",
    category: "D. Volume & Order Flow",
    defaultProperties: {
      threshold: "2x average",
      timeframe: "1h",
      direction: "neutral",
      notes: "",
    },
  },
  {
    id: "vwap",
    name: "VWAP",
    category: "D. Volume & Order Flow",
    defaultProperties: {
      type: "daily",
      deviation: "",
      notes: "",
    },
  },
];

// ─── E. Pattern / Structure ───────────────────────────────────────────────────
const PATTERN_TOOLS: ICTTool[] = [
  {
    id: "breakout",
    name: "Breakout",
    category: "E. Pattern / Structure",
    defaultProperties: {
      direction: "bullish",
      level: "",
      timeframe: "1h",
      confirmation: "",
      notes: "",
    },
  },
  {
    id: "reversal-pattern",
    name: "Reversal Pattern",
    category: "E. Pattern / Structure",
    defaultProperties: {
      pattern: "pin-bar",
      direction: "bullish",
      timeframe: "1h",
      notes: "",
    },
  },
  {
    id: "consolidation",
    name: "Consolidation",
    category: "E. Pattern / Structure",
    defaultProperties: {
      type: "rectangle",
      timeframe: "1h",
      duration: "",
      notes: "",
    },
  },
];

// ─── F. Time-Based ────────────────────────────────────────────────────────────
const TIME_TOOLS: ICTTool[] = [
  {
    id: "session-time",
    name: "Session",
    category: "F. Time-Based",
    defaultProperties: {
      session: "London",
      type: "open",
      notes: "",
    },
  },
  {
    id: "day-of-week",
    name: "Day of Week",
    category: "F. Time-Based",
    defaultProperties: {
      day: "Monday",
      notes: "",
    },
  },
  {
    id: "killzone-custom",
    name: "Killzone / Custom Time Window",
    category: "F. Time-Based",
    defaultProperties: {
      startTime: "",
      endTime: "",
      timezone: "UTC",
      label: "",
      notes: "",
    },
  },
];

// ─── G. ICT (existing tools — preserved exactly) ─────────────────────────────
const ICT_TOOLS_LIST: ICTTool[] = [
  {
    id: "htf-bias",
    name: "HTF Bias",
    category: "G. ICT",
    defaultProperties: {
      biasDirection: "Bullish",
      biasTimeframeUnit: "Daily",
      biasTimeframeValue: 1,
    },
  },
  {
    id: "market-phase",
    name: "Market Phase",
    category: "G. ICT",
    defaultProperties: { phase: "Accumulation", confirmed: false },
  },
  {
    id: "liquidity-draw",
    name: "Liquidity Draw",
    category: "G. ICT",
    defaultProperties: { liquidityType: "Buy Side", priority: "High" },
  },
  {
    id: "market-structure",
    name: "Market Structure (ICT)",
    category: "G. ICT",
    defaultProperties: {
      structureType: "Higher Highs/Higher Lows",
      structureTimeframeUnit: "Hourly",
      structureTimeframeValue: 4,
      confirmed: false,
    },
  },
  {
    id: "dealing-range",
    name: "Dealing Range",
    category: "G. ICT",
    defaultProperties: {
      rangeTimeframeUnit: "Daily",
      rangeTimeframeValue: 1,
      rangeLabel: "",
    },
  },
  {
    id: "equilibrium-ce",
    name: "Equilibrium / CE Level",
    category: "G. ICT",
    defaultProperties: {
      source: "Single Candle",
      levelType: "CE",
      context: "Fair Value",
      structuralState: "Regular",
    },
  },
  {
    id: "gap",
    name: "Gap",
    category: "G. ICT",
    defaultProperties: {
      gapType: "New Week Opening Gap",
      orientation: "Bullish",
      internalLevels: false,
      behaviorTag: "Trending Signature",
      structuralState: "Regular",
    },
  },
  {
    id: "key-level",
    name: "Key Level (ICT)",
    category: "G. ICT",
    defaultProperties: { levelType: "Support", tested: false },
  },
  {
    id: "pdh-pdl",
    name: "Previous Day High/Low",
    category: "G. ICT",
    defaultProperties: { pdType: "PDH", respected: false },
  },
  {
    id: "weekly-hl",
    name: "Weekly High/Low",
    category: "G. ICT",
    defaultProperties: { weeklyType: "Weekly High", currentWeek: true },
  },
  {
    id: "inefficiency",
    name: "Inefficiency",
    category: "G. ICT",
    defaultProperties: {
      inefficiencyType: "FVG",
      direction: "Bullish",
      timeframeUnit: "Minute",
      timeframeValue: 15,
      fillState: "Unfilled",
      structuralState: "Regular",
      locationVsDealingRange: "Inside Discount (0-50%)",
    },
  },
  {
    id: "block",
    name: "Block",
    category: "G. ICT",
    defaultProperties: {
      blockType: "Order Block",
      direction: "Bullish",
      timeframeUnit: "Minute",
      timeframeValue: 5,
      referencePoint: "CE",
      structuralState: "Regular",
      locationVsDealingRange: "Inside Discount (0-50%)",
    },
  },
  {
    id: "liquidity-pool",
    name: "Liquidity Pool",
    category: "G. ICT",
    defaultProperties: {
      poolType: "Equal Highs",
      timeframeUnit: "Hourly",
      timeframeValue: 1,
      role: "Target",
      structuralState: "Regular",
      locationVsDealingRange: "Inside Premium (50-100%)",
    },
  },
  {
    id: "premium-discount",
    name: "Premium/Discount Zone",
    category: "G. ICT",
    defaultProperties: {
      zoneType: "Premium",
      timeframeUnit: "Daily",
      timeframeValue: 1,
      role: "Entry Filter",
      structuralState: "Regular",
    },
  },
  {
    id: "session",
    name: "Trading Session",
    category: "G. ICT",
    defaultProperties: {
      sessionType: "London",
      sessionTime: "03:00-12:00",
      active: false,
    },
  },
  {
    id: "killzone",
    name: "Killzone",
    category: "G. ICT",
    defaultProperties: {
      killzoneType: "London Killzone",
      killzoneTime: "02:00-05:00",
      priority: "High",
    },
  },
  {
    id: "silver-bullet",
    name: "Silver Bullet",
    category: "G. ICT",
    defaultProperties: {
      silverBulletType: "AM (10:00-11:00)",
      timeWindow: "10:00-11:00",
      active: false,
    },
  },
  {
    id: "time-rule",
    name: "Time-Based Rule",
    category: "G. ICT",
    defaultProperties: {
      ruleDescription: "No trades after 12:00",
      enforced: true,
    },
  },
];

// ─── All tools merged (A-G order) ────────────────────────────────────────────
const ALL_TOOLS: ICTTool[] = [
  ...MARKET_CONTEXT_TOOLS,
  ...PRICE_LEVEL_TOOLS,
  ...INDICATOR_TOOLS,
  ...VOLUME_TOOLS,
  ...PATTERN_TOOLS,
  ...TIME_TOOLS,
  ...ICT_TOOLS_LIST,
];

// Category display order A → G
const TOOL_CATEGORIES = [
  "A. Market Context",
  "B. Price Levels / Areas",
  "C. Indicators",
  "D. Volume & Order Flow",
  "E. Pattern / Structure",
  "F. Time-Based",
  "G. ICT",
];

export default function ModelBuilder({ model, onClose }: ModelBuilderProps) {
  const [step, setStep] = useState<"build" | "summary">("build");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [narrativeTools, setNarrativeTools] = useState<ToolConfig[]>([]);
  const [frameworkTools, setFrameworkTools] = useState<ToolConfig[]>([]);
  const [executionTools, setExecutionTools] = useState<ToolConfig[]>([]);
  const [exampleImages, setExampleImages] = useState<ExampleImage[]>([]);
  const [editingTool, setEditingTool] = useState<{
    tool: ToolConfig;
    zone: string;
  } | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
    new Set(["G. ICT"]), // ICT collapsed by default since it's not first
  );
  const [isToolPaletteOpen, setIsToolPaletteOpen] = useState(false);
  const [isCustomToolManagerOpen, setIsCustomToolManagerOpen] = useState(false);

  // Collapsible state for zones and example setups
  const [zonesExpanded, setZonesExpanded] = useState(true);
  const [examplesExpanded, setExamplesExpanded] = useState(true);

  // Unified tool selection state for click/tap-to-add flow (all screen sizes)
  const [selectedToolToPlace, setSelectedToolToPlace] =
    useState<ICTTool | null>(null);

  const createModel = useCreateModel();
  const updateModel = useUpdateModel();
  const { data: currentTime } = useGetCurrentTime();
  const { identity } = useInternetIdentity();
  const { data: customTools = [] } = useGetAllCustomTools();

  useEffect(() => {
    if (model) {
      setName(model.name);
      setDescription(model.description);
      setNarrativeTools(model.narrative);
      setFrameworkTools(model.framework);
      setExecutionTools(model.execution);
      setExampleImages(model.example_images || []);
    }
  }, [model]);

  // Haptic feedback helper
  const triggerHapticFeedback = () => {
    if ("vibrate" in navigator) {
      navigator.vibrate(50);
    }
  };

  // Unified tool selection handler (all screen sizes)
  const handleToolSelect = (tool: ICTTool) => {
    setSelectedToolToPlace(tool);
    setIsToolPaletteOpen(false);
    triggerHapticFeedback();
  };

  // Unified zone selection handler (all screen sizes)
  const handleZoneSelect = (zone: string) => {
    if (!selectedToolToPlace) return;
    addToolToZone(selectedToolToPlace, zone);
    setSelectedToolToPlace(null);
    triggerHapticFeedback();
  };

  // Cancel placement mode
  const handleCancelPlacement = () => {
    setSelectedToolToPlace(null);
  };

  // Unified function to add tool to zone (always appends to end)
  const addToolToZone = (tool: ICTTool, zone: string) => {
    const newTool: ToolConfig = {
      id: crypto.randomUUID(),
      type: tool.id,
      properties: JSON.stringify(tool.defaultProperties),
      interactions: [],
      actions: [],
      zone,
      position: BigInt(Date.now()),
    };

    if (zone === "narrative") {
      setNarrativeTools((prev) => [...prev, newTool]);
    } else if (zone === "framework") {
      setFrameworkTools((prev) => [...prev, newTool]);
    } else if (zone === "execution") {
      setExecutionTools((prev) => [...prev, newTool]);
    }
  };

  const handleRemoveTool = (toolId: string, zone: string) => {
    if (zone === "narrative") {
      setNarrativeTools((prev) => prev.filter((t) => t.id !== toolId));
    } else if (zone === "framework") {
      setFrameworkTools((prev) => prev.filter((t) => t.id !== toolId));
    } else if (zone === "execution") {
      setExecutionTools((prev) => prev.filter((t) => t.id !== toolId));
    }
  };

  const handleUpdateTool = (updatedTool: ToolConfig, zone: string) => {
    if (zone === "narrative") {
      setNarrativeTools((prev) =>
        prev.map((t) => (t.id === updatedTool.id ? updatedTool : t)),
      );
    } else if (zone === "framework") {
      setFrameworkTools((prev) =>
        prev.map((t) => (t.id === updatedTool.id ? updatedTool : t)),
      );
    } else if (zone === "execution") {
      setExecutionTools((prev) =>
        prev.map((t) => (t.id === updatedTool.id ? updatedTool : t)),
      );
    }
  };

  const toggleCategory = (category: string) => {
    const newCollapsed = new Set(collapsedCategories);
    if (newCollapsed.has(category)) {
      newCollapsed.delete(category);
    } else {
      newCollapsed.add(category);
    }
    setCollapsedCategories(newCollapsed);
  };

  const getToolName = (typeId: string): string => {
    const builtInTool = ALL_TOOLS.find((t) => t.id === typeId);
    if (builtInTool) return builtInTool.name;

    const customTool = customTools.find((t) => t.id === typeId);
    if (customTool) return customTool.name;

    return typeId;
  };

  const customToolsLookup = new Map(customTools.map((t) => [t.id, t]));

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Please enter a model name");
      return;
    }

    if (!identity) {
      toast.error("Please log in to save the model");
      return;
    }

    const modelData: Model = {
      id: model?.id || crypto.randomUUID(),
      owner: model?.owner || identity.getPrincipal(),
      name: name.trim(),
      description: description.trim(),
      narrative: narrativeTools,
      framework: frameworkTools,
      execution: executionTools,
      example_images: exampleImages,
      created_at:
        model?.created_at || currentTime || BigInt(Date.now() * 1000000),
    };

    try {
      if (model) {
        await updateModel.mutateAsync(modelData);
        toast.success("Model updated successfully!");
      } else {
        await createModel.mutateAsync(modelData);
        toast.success("Model created successfully!");
      }
      onClose();
    } catch (error) {
      toast.error(model ? "Failed to update model" : "Failed to create model");
      console.error(error);
    }
  };

  const renderToolCard = (tool: ToolConfig, zone: string) => {
    const properties = JSON.parse(tool.properties || "{}");
    return (
      <div
        key={tool.id}
        className="group relative bg-card border rounded-lg p-3 hover:shadow-md transition-all"
      >
        <div className="flex items-start gap-2">
          <GripVertical className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm">{getToolName(tool.type)}</h4>
            <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
              {Object.entries(properties)
                .slice(0, 3)
                .map(([key, value]) => (
                  <div key={key} className="truncate">
                    <span className="font-medium">{key}:</span> {String(value)}
                  </div>
                ))}
            </div>
            {tool.interactions.length > 0 && (
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                {tool.interactions.length} interaction(s)
              </div>
            )}
            {tool.actions.length > 0 && (
              <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                {tool.actions.length} action(s)
              </div>
            )}
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setEditingTool({ tool, zone })}
            >
              <Settings className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => handleRemoveTool(tool.id, zone)}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // Tool Palette Content Component (reusable for both desktop sidebar and mobile sheet)
  const ToolPaletteContent = () => (
    <>
      {/* Fixed Header Area */}
      <div className="flex-shrink-0 p-4 border-b bg-background/95 backdrop-blur">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Menu className="w-4 h-4" />
            Tool Palette
          </h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsCustomToolManagerOpen(true)}
            title="Manage Custom Tools"
          >
            <Wrench className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Select a tool, then tap a zone to add it
        </p>
      </div>

      {/* Scrollable Tool List Area */}
      <ScrollArea className="flex-1 overflow-y-auto">
        <div className="p-3 space-y-1">
          {/* Custom Tools — shown first if any exist */}
          {customTools.length > 0 && (
            <Collapsible open={!collapsedCategories.has("Custom Tools")}>
              <CollapsibleTrigger
                className="flex items-center justify-between w-full px-3 py-2.5 hover:bg-accent rounded-lg text-sm font-semibold transition-colors"
                onClick={() => toggleCategory("Custom Tools")}
              >
                <span className="text-primary">User Tools</span>
                {collapsedCategories.has("Custom Tools") ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 mt-1 mb-2">
                {customTools.map((customTool) => {
                  const defaultProps: Record<string, unknown> = {};
                  for (const prop of customTool.properties) {
                    defaultProps[prop.propertyLabel] = prop.default_value;
                  }

                  const tool: ICTTool = {
                    id: customTool.id,
                    name: customTool.name,
                    category: "User Tools",
                    defaultProperties: defaultProps,
                  };

                  return (
                    <button
                      type="button"
                      key={tool.id}
                      onClick={() => handleToolSelect(tool)}
                      className={`w-full px-3 py-2.5 bg-card border rounded-lg cursor-pointer active:scale-95 hover:shadow-md hover:border-primary/50 transition-all text-sm min-h-[44px] ${
                        selectedToolToPlace?.id === tool.id
                          ? "bg-primary/10 border-primary ring-2 ring-primary/20"
                          : ""
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Plus className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium text-left">
                          {tool.name}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Built-in tool categories A → G */}
          {TOOL_CATEGORIES.map((category) => {
            const categoryTools = ALL_TOOLS.filter(
              (t) => t.category === category,
            );
            const isCollapsed = collapsedCategories.has(category);
            const isICT = category === "G. ICT";

            return (
              <Collapsible key={category} open={!isCollapsed}>
                <CollapsibleTrigger
                  className={`flex items-center justify-between w-full px-3 py-2.5 hover:bg-accent rounded-lg text-sm font-semibold transition-colors ${
                    isICT ? "text-muted-foreground" : ""
                  }`}
                  onClick={() => toggleCategory(category)}
                >
                  <span>{category}</span>
                  {isCollapsed ? (
                    <ChevronRight className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1 mt-1 mb-2">
                  {categoryTools.map((tool) => (
                    <button
                      type="button"
                      key={tool.id}
                      onClick={() => handleToolSelect(tool)}
                      className={`w-full px-3 py-2.5 bg-card border rounded-lg cursor-pointer active:scale-95 hover:shadow-md hover:border-primary/50 transition-all text-sm min-h-[44px] ${
                        selectedToolToPlace?.id === tool.id
                          ? "bg-primary/10 border-primary ring-2 ring-primary/20"
                          : ""
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Plus className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium text-left">
                          {tool.name}
                        </span>
                      </div>
                    </button>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>
    </>
  );

  if (step === "summary") {
    return (
      <ModelCardSummary
        name={name}
        description={description}
        narrativeTools={narrativeTools}
        frameworkTools={frameworkTools}
        executionTools={executionTools}
        getToolName={getToolName}
        onBack={() => setStep("build")}
        onSave={handleSave}
        isSaving={createModel.isPending || updateModel.isPending}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-card/50 backdrop-blur">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-9 w-9"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h2 className="font-display text-lg font-semibold">
                {model ? "Edit Model" : "New Model"}
              </h2>
              <p className="text-xs text-muted-foreground">
                Build your trading model
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep("summary")}
              className="gap-2"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Preview</span>
            </Button>
            <Button
              onClick={handleSave}
              disabled={createModel.isPending || updateModel.isPending}
              size="sm"
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              <span className="hidden sm:inline">
                {createModel.isPending || updateModel.isPending
                  ? "Saving..."
                  : "Save"}
              </span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Tool Palette Sidebar (hidden on mobile) */}
        <div className="hidden md:flex md:w-72 border-r bg-card/30 flex-col">
          <ToolPaletteContent />
        </div>

        {/* Center Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
            {/* Model Info */}
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="model-name"
                  className="text-sm font-medium mb-1.5 block"
                >
                  Model Name
                </label>
                <Input
                  id="model-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., London Killzone Scalp"
                  className="text-base"
                />
              </div>
              <div>
                <label
                  htmlFor="model-description"
                  className="text-sm font-medium mb-1.5 block"
                >
                  Description
                </label>
                <Input
                  id="model-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of your model"
                  className="text-base"
                />
              </div>
            </div>

            {/* Collapsible Zones Container */}
            <Collapsible open={zonesExpanded} onOpenChange={setZonesExpanded}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-card/50 rounded-lg hover:bg-card transition-colors">
                <h3 className="font-display text-base font-semibold">
                  Model Zones
                </h3>
                {zonesExpanded ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4 space-y-6">
                {/* Zone 1: Context */}
                <div
                  className={`border-2 rounded-lg p-4 transition-all ${
                    selectedToolToPlace
                      ? "border-primary bg-primary/5 cursor-pointer hover:bg-primary/10"
                      : "border-border bg-card/30"
                  }`}
                  onClick={() =>
                    selectedToolToPlace && handleZoneSelect("narrative")
                  }
                  onKeyDown={(e) =>
                    e.key === "Enter" &&
                    selectedToolToPlace &&
                    handleZoneSelect("narrative")
                  }
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-display text-base font-semibold">
                            Zone 1: Context
                          </h3>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help flex-shrink-0" />
                              </TooltipTrigger>
                              <TooltipContent
                                side="top"
                                className="max-w-[220px] text-xs"
                              >
                                Defines overall market conditions. Should
                                answer: should I be looking for trades?
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Market bias, structure, conditions
                        </p>
                      </div>
                    </div>
                    {selectedToolToPlace && (
                      <MousePointer2 className="w-5 h-5 text-primary animate-pulse" />
                    )}
                  </div>
                  <div className="space-y-2">
                    {narrativeTools.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        {selectedToolToPlace
                          ? "Click here to add tool"
                          : "No tools added yet"}
                      </p>
                    ) : (
                      narrativeTools.map((tool) =>
                        renderToolCard(tool, "narrative"),
                      )
                    )}
                  </div>
                </div>

                {/* Zone 2: Setup */}
                <div
                  className={`border-2 rounded-lg p-4 transition-all ${
                    selectedToolToPlace
                      ? "border-primary bg-primary/5 cursor-pointer hover:bg-primary/10"
                      : "border-border bg-card/30"
                  }`}
                  onClick={() =>
                    selectedToolToPlace && handleZoneSelect("framework")
                  }
                  onKeyDown={(e) =>
                    e.key === "Enter" &&
                    selectedToolToPlace &&
                    handleZoneSelect("framework")
                  }
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-display text-base font-semibold">
                            Zone 2: Setup
                          </h3>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help flex-shrink-0" />
                              </TooltipTrigger>
                              <TooltipContent
                                side="top"
                                className="max-w-[220px] text-xs"
                              >
                                Defines the opportunity forming. Should answer:
                                is there a valid setup?
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Levels, patterns, signals
                        </p>
                      </div>
                    </div>
                    {selectedToolToPlace && (
                      <MousePointer2 className="w-5 h-5 text-primary animate-pulse" />
                    )}
                  </div>
                  <div className="space-y-2">
                    {frameworkTools.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        {selectedToolToPlace
                          ? "Click here to add tool"
                          : "No tools added yet"}
                      </p>
                    ) : (
                      frameworkTools.map((tool) =>
                        renderToolCard(tool, "framework"),
                      )
                    )}
                  </div>
                </div>

                {/* Zone 3: Execution */}
                <div
                  className={`border-2 rounded-lg p-4 transition-all ${
                    selectedToolToPlace
                      ? "border-primary bg-primary/5 cursor-pointer hover:bg-primary/10"
                      : "border-border bg-card/30"
                  }`}
                  onClick={() =>
                    selectedToolToPlace && handleZoneSelect("execution")
                  }
                  onKeyDown={(e) =>
                    e.key === "Enter" &&
                    selectedToolToPlace &&
                    handleZoneSelect("execution")
                  }
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-display text-base font-semibold">
                            Zone 3: Execution
                          </h3>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help flex-shrink-0" />
                              </TooltipTrigger>
                              <TooltipContent
                                side="top"
                                className="max-w-[220px] text-xs"
                              >
                                Defines the trigger. Should answer: do I take
                                the trade now?
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Entry triggers, time rules, confirmation
                        </p>
                      </div>
                    </div>
                    {selectedToolToPlace && (
                      <MousePointer2 className="w-5 h-5 text-primary animate-pulse" />
                    )}
                  </div>
                  <div className="space-y-2">
                    {executionTools.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        {selectedToolToPlace
                          ? "Click here to add tool"
                          : "No tools added yet"}
                      </p>
                    ) : (
                      executionTools.map((tool) =>
                        renderToolCard(tool, "execution"),
                      )
                    )}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Collapsible Example Setups */}
            <Collapsible
              open={examplesExpanded}
              onOpenChange={setExamplesExpanded}
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-card/50 rounded-lg hover:bg-card transition-colors">
                <h3 className="font-display text-base font-semibold">
                  Example Setups
                </h3>
                {examplesExpanded ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                <ExampleSetupsField
                  examples={exampleImages}
                  onChange={setExampleImages}
                />
              </CollapsibleContent>
            </Collapsible>

            {/* Bottom spacing for mobile FAB */}
            <div className="h-24 md:h-0" />
          </div>
        </div>
      </div>

      {/* Mobile-only Floating Tool Palette Trigger (sticky) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 safe-area-bottom z-50">
        <div className="p-4 bg-gradient-to-t from-background via-background to-transparent">
          {selectedToolToPlace ? (
            // Placement mode active - show indicator and cancel
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-primary/10 border-2 border-primary rounded-lg px-4 py-3 flex items-center gap-3">
                <MousePointer2 className="w-5 h-5 text-primary flex-shrink-0 animate-pulse" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-primary truncate">
                    Placing: {selectedToolToPlace.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Tap a zone to add
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCancelPlacement}
                className="h-14 w-14 flex-shrink-0 border-2"
              >
                <X className="w-6 h-6" />
              </Button>
            </div>
          ) : (
            // Normal mode - show tool palette trigger
            <Sheet open={isToolPaletteOpen} onOpenChange={setIsToolPaletteOpen}>
              <SheetTrigger asChild>
                <Button
                  size="lg"
                  className="w-full h-14 text-base font-semibold gap-3 shadow-lg"
                  data-ocid="model-builder-add-tool"
                >
                  <Plus className="w-5 h-5" />
                  Add Tool
                </Button>
              </SheetTrigger>
              <SheetContent
                side="bottom"
                className="h-[85vh] flex flex-col p-0"
              >
                <SheetHeader className="p-4 border-b">
                  <SheetTitle>Tool Palette</SheetTitle>
                </SheetHeader>
                <div className="flex-1 flex flex-col overflow-hidden">
                  <ToolPaletteContent />
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>

      {/* Tool Config Dialog */}
      {editingTool && (
        <ToolConfigDialog
          tool={editingTool.tool}
          zone={editingTool.zone}
          getToolName={getToolName}
          customToolsLookup={customToolsLookup}
          onSave={(updatedTool) => {
            handleUpdateTool(updatedTool, editingTool.zone);
            setEditingTool(null);
          }}
          onClose={() => setEditingTool(null)}
        />
      )}

      {/* Custom Tool Manager Dialog */}
      <CustomToolManagerDialog
        open={isCustomToolManagerOpen}
        onClose={() => setIsCustomToolManagerOpen(false)}
      />
    </div>
  );
}
