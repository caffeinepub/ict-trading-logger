import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Save, X } from "lucide-react";
import { useEffect, useState } from "react";
import type {
  CustomProperty,
  CustomToolDefinition,
  ToolConfig,
} from "../types";

interface ToolConfigDialogProps {
  tool: ToolConfig;
  zone: string;
  getToolName: (typeId: string) => string;
  customToolsLookup: Map<string, CustomToolDefinition>;
  onSave: (tool: ToolConfig) => void;
  onClose: () => void;
}

// ─── ICT shared enumerations (unchanged) ─────────────────────────────────────
const TIMEFRAME_UNITS = ["Minute", "Hourly", "Daily", "Weekly", "Monthly"];
const DIRECTIONS = ["Bullish", "Bearish", "Neutral"];
const STRUCTURAL_STATES = ["Regular", "Inverted", "Reclaimed"];
const LOCATION_VS_DEALING_RANGE = [
  "Inside Discount (0-50%)",
  "Near Equilibrium (≈50%)",
  "Inside Premium (50-100%)",
];
const INEFFICIENCY_TYPES = [
  "FVG",
  "SIBI",
  "BISI",
  "Liquidity Void",
  "Volume Imbalance",
  "BPR",
];
const FILL_STATES = ["Unfilled", "Partially Filled", "Fully Filled"];
const GAP_TYPES = [
  "New Week Opening Gap",
  "New Day Opening Gap",
  "Opening Range Gap",
];
const BEHAVIOR_TAGS = ["Trending Signature", "Consolidation Signature"];
const BLOCK_TYPES = [
  "Order Block",
  "Breaker Block",
  "Mitigation Block",
  "Rejection Block",
  "Propulsion Block",
];
const REFERENCE_POINTS = ["Open", "High", "Low", "CE"];
const CE_SOURCES = ["Single Candle", "Dealing Range", "Gap"];
const CE_LEVEL_TYPES = ["CE", "Fraction"];
const CE_CONTEXTS = ["Fair Value", "Target", "Invalidation"];
const LIQUIDITY_POOL_TYPES = [
  "Equal Highs",
  "Equal Lows",
  "Swing Highs",
  "Swing Lows",
];
const PD_ROLES = ["Target", "Entry Filter", "Invalidation"];
const PREMIUM_DISCOUNT_TYPES = ["Premium", "Discount"];
const ICT_SESSIONS = ["Asian", "London", "New York", "Sydney"];
const MARKET_PHASES = [
  "Accumulation",
  "Manipulation",
  "Distribution",
  "Reaccumulation",
];
const MARKET_STRUCTURES = [
  "Higher Highs/Higher Lows",
  "Lower Highs/Lower Lows",
  "Ranging",
  "Consolidation",
];
const LIQUIDITY_TYPES = ["Buy Side", "Sell Side", "Equal Highs", "Equal Lows"];
const KEY_LEVEL_TYPES = [
  "Support",
  "Resistance",
  "Premium",
  "Discount",
  "Equilibrium",
];
const SILVER_BULLET_TYPES = ["AM (10:00-11:00)", "PM (14:00-15:00)"];
const KILLZONE_TYPES = [
  "London Killzone",
  "New York Killzone",
  "Asian Killzone",
  "London Open",
  "New York Open",
];
const STRENGTH_LEVELS = ["Strong", "Moderate", "Weak"];
const PRIORITY_LEVELS = ["High", "Medium", "Low"];
const PD_TYPES = ["PDH", "PDL", "Both"];
const WEEKLY_TYPES = ["Weekly High", "Weekly Low", "Both"];

// ─── Generalized tool enumerations (A-F) ─────────────────────────────────────
const GENERAL_DIRECTIONS = ["up", "down", "neutral"];
const GENERAL_TIMEFRAMES = [
  "1m",
  "5m",
  "15m",
  "30m",
  "1h",
  "4h",
  "D",
  "W",
  "M",
];
const GENERAL_SESSIONS = ["Asian", "London", "NY", "Sydney", "overlap"];
const VOLATILITY_LEVELS = ["low", "normal", "high", "extreme"];
const VOLATILITY_INDICATORS = ["ATR", "VIX", "range-based"];
const MARKET_STATE = ["trending", "ranging", "transitioning"];
const MARKET_BIAS = ["bullish", "bearish", "neutral"];
const LEVEL_TYPES = ["support", "resistance", "both"];
const STRENGTH_GENERAL = ["weak", "moderate", "strong"];
const TRENDLINE_DIRECTIONS = ["ascending", "descending", "horizontal"];
const FIB_LEVELS = [
  "0.236",
  "0.382",
  "0.5",
  "0.618",
  "0.786",
  "1.0",
  "1.272",
  "1.618",
  "2.0",
];
const FIB_TYPES = ["retracement", "extension"];
const RANGE_TYPES = ["range", "channel", "box"];
const MA_SOURCES = ["close", "open", "high", "low", "hl2", "hlc3"];
const VWAP_TYPES = ["daily", "weekly", "monthly", "anchored"];
const VOLUME_PROFILE_TYPES = ["fixed-range", "session", "visible-range"];
const VOLUME_DIRECTIONS = ["up", "down", "neutral"];
const BREAKOUT_DIRECTIONS = ["bullish", "bearish"];
const REVERSAL_PATTERNS = [
  "head-and-shoulders",
  "double-top",
  "double-bottom",
  "pin-bar",
  "engulfing",
  "hammer",
  "shooting-star",
  "doji",
  "other",
];
const CONSOLIDATION_TYPES = [
  "triangle",
  "flag",
  "pennant",
  "rectangle",
  "wedge",
  "other",
];
const SESSION_TYPES_GENERAL = ["open", "close", "mid", "full"];
const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const TIMEZONES = ["UTC", "local", "EST", "GMT", "CET"];

// ─── Unified Tool Property Configurations ────────────────────────────────────
const TOOL_PROPERTY_CONFIGS: Record<
  string,
  Record<
    string,
    {
      type: string;
      label: string;
      options?: string[];
      min?: number;
      max?: number;
    }
  >
> = {
  // ── A. Market Context ────────────────────────────────────────────────────
  "trend-bias": {
    direction: {
      type: "select",
      options: GENERAL_DIRECTIONS,
      label: "Trend Direction",
    },
    timeframe: {
      type: "select",
      options: GENERAL_TIMEFRAMES,
      label: "Timeframe",
    },
    notes: { type: "text", label: "Notes" },
  },
  "market-structure-general": {
    state: { type: "select", options: MARKET_STATE, label: "Market State" },
    bias: { type: "select", options: MARKET_BIAS, label: "Directional Bias" },
    timeframe: {
      type: "select",
      options: GENERAL_TIMEFRAMES,
      label: "Timeframe",
    },
    notes: { type: "text", label: "Notes" },
  },
  volatility: {
    level: {
      type: "select",
      options: VOLATILITY_LEVELS,
      label: "Volatility Level",
    },
    indicator: {
      type: "select",
      options: VOLATILITY_INDICATORS,
      label: "Measured By",
    },
    notes: { type: "text", label: "Notes" },
  },
  "session-time-of-day": {
    session: { type: "select", options: GENERAL_SESSIONS, label: "Session" },
    timeOfDay: { type: "text", label: "Time of Day (optional)" },
    notes: { type: "text", label: "Notes" },
  },

  // ── B. Price Levels / Areas ──────────────────────────────────────────────
  "key-level-general": {
    price: { type: "number", label: "Price Level", min: 0, max: 999999 },
    type: { type: "select", options: LEVEL_TYPES, label: "Level Type" },
    timeframe: {
      type: "select",
      options: GENERAL_TIMEFRAMES,
      label: "Timeframe",
    },
    notes: { type: "text", label: "Notes" },
  },
  "support-resistance": {
    price: { type: "number", label: "Price Level", min: 0, max: 999999 },
    type: { type: "select", options: ["support", "resistance"], label: "Type" },
    strength: { type: "select", options: STRENGTH_GENERAL, label: "Strength" },
    timeframe: {
      type: "select",
      options: GENERAL_TIMEFRAMES,
      label: "Timeframe",
    },
    notes: { type: "text", label: "Notes" },
  },
  trendline: {
    direction: {
      type: "select",
      options: TRENDLINE_DIRECTIONS,
      label: "Direction",
    },
    timeframe: {
      type: "select",
      options: GENERAL_TIMEFRAMES,
      label: "Timeframe",
    },
    notes: { type: "text", label: "Notes" },
  },
  fibonacci: {
    level: { type: "select", options: FIB_LEVELS, label: "Fibonacci Level" },
    type: { type: "select", options: FIB_TYPES, label: "Type" },
    timeframe: {
      type: "select",
      options: GENERAL_TIMEFRAMES,
      label: "Timeframe",
    },
    notes: { type: "text", label: "Notes" },
  },
  "range-channel": {
    upperBound: { type: "number", label: "Upper Bound", min: 0, max: 999999 },
    lowerBound: { type: "number", label: "Lower Bound", min: 0, max: 999999 },
    type: { type: "select", options: RANGE_TYPES, label: "Type" },
    notes: { type: "text", label: "Notes" },
  },

  // ── C. Indicators ────────────────────────────────────────────────────────
  sma: {
    period: { type: "number", label: "Period", min: 1, max: 500 },
    timeframe: {
      type: "select",
      options: GENERAL_TIMEFRAMES,
      label: "Timeframe",
    },
    source: { type: "select", options: MA_SOURCES, label: "Source" },
    notes: { type: "text", label: "Notes" },
  },
  ema: {
    period: { type: "number", label: "Period", min: 1, max: 500 },
    timeframe: {
      type: "select",
      options: GENERAL_TIMEFRAMES,
      label: "Timeframe",
    },
    source: { type: "select", options: MA_SOURCES, label: "Source" },
    notes: { type: "text", label: "Notes" },
  },
  rsi: {
    period: { type: "number", label: "Period", min: 2, max: 100 },
    overbought: {
      type: "number",
      label: "Overbought Level",
      min: 50,
      max: 100,
    },
    oversold: { type: "number", label: "Oversold Level", min: 0, max: 50 },
    timeframe: {
      type: "select",
      options: GENERAL_TIMEFRAMES,
      label: "Timeframe",
    },
    notes: { type: "text", label: "Notes" },
  },
  macd: {
    fastPeriod: { type: "number", label: "Fast Period", min: 1, max: 200 },
    slowPeriod: { type: "number", label: "Slow Period", min: 1, max: 500 },
    signalPeriod: { type: "number", label: "Signal Period", min: 1, max: 100 },
    timeframe: {
      type: "select",
      options: GENERAL_TIMEFRAMES,
      label: "Timeframe",
    },
    notes: { type: "text", label: "Notes" },
  },
  "custom-indicator": {
    name: { type: "text", label: "Indicator Name" },
    value: { type: "text", label: "Value / Setting" },
    condition: { type: "text", label: "Condition / Signal" },
    notes: { type: "text", label: "Notes" },
  },

  // ── D. Volume & Order Flow ───────────────────────────────────────────────
  "volume-profile": {
    type: {
      type: "select",
      options: VOLUME_PROFILE_TYPES,
      label: "Profile Type",
    },
    valueArea: { type: "number", label: "Value Area %", min: 1, max: 100 },
    notes: { type: "text", label: "Notes" },
  },
  "volume-spike": {
    threshold: { type: "text", label: "Spike Threshold (e.g. 2x avg)" },
    timeframe: {
      type: "select",
      options: GENERAL_TIMEFRAMES,
      label: "Timeframe",
    },
    direction: {
      type: "select",
      options: VOLUME_DIRECTIONS,
      label: "Direction",
    },
    notes: { type: "text", label: "Notes" },
  },
  vwap: {
    type: { type: "select", options: VWAP_TYPES, label: "VWAP Type" },
    deviation: { type: "text", label: "Deviation Bands (optional)" },
    notes: { type: "text", label: "Notes" },
  },

  // ── E. Pattern / Structure ───────────────────────────────────────────────
  breakout: {
    direction: {
      type: "select",
      options: BREAKOUT_DIRECTIONS,
      label: "Breakout Direction",
    },
    level: { type: "text", label: "Level / Area" },
    timeframe: {
      type: "select",
      options: GENERAL_TIMEFRAMES,
      label: "Timeframe",
    },
    confirmation: { type: "text", label: "Confirmation Condition" },
    notes: { type: "text", label: "Notes" },
  },
  "reversal-pattern": {
    pattern: {
      type: "select",
      options: REVERSAL_PATTERNS,
      label: "Pattern Type",
    },
    direction: {
      type: "select",
      options: BREAKOUT_DIRECTIONS,
      label: "Reversal Direction",
    },
    timeframe: {
      type: "select",
      options: GENERAL_TIMEFRAMES,
      label: "Timeframe",
    },
    notes: { type: "text", label: "Notes" },
  },
  consolidation: {
    type: {
      type: "select",
      options: CONSOLIDATION_TYPES,
      label: "Consolidation Type",
    },
    timeframe: {
      type: "select",
      options: GENERAL_TIMEFRAMES,
      label: "Timeframe",
    },
    duration: { type: "text", label: "Duration (optional)" },
    notes: { type: "text", label: "Notes" },
  },

  // ── F. Time-Based ────────────────────────────────────────────────────────
  "session-time": {
    session: { type: "select", options: GENERAL_SESSIONS, label: "Session" },
    type: {
      type: "select",
      options: SESSION_TYPES_GENERAL,
      label: "Session Part",
    },
    notes: { type: "text", label: "Notes" },
  },
  "day-of-week": {
    day: { type: "select", options: DAYS_OF_WEEK, label: "Day of Week" },
    notes: { type: "text", label: "Notes" },
  },
  "killzone-custom": {
    startTime: { type: "text", label: "Start Time (e.g. 09:30)" },
    endTime: { type: "text", label: "End Time (e.g. 11:00)" },
    timezone: { type: "select", options: TIMEZONES, label: "Timezone" },
    label: { type: "text", label: "Window Label" },
    notes: { type: "text", label: "Notes" },
  },

  // ── G. ICT Tools (preserved exactly) ────────────────────────────────────
  "htf-bias": {
    biasDirection: {
      type: "select",
      options: DIRECTIONS,
      label: "Bias Direction",
    },
    biasTimeframeUnit: {
      type: "select",
      options: TIMEFRAME_UNITS,
      label: "Bias Timeframe Unit",
    },
    biasTimeframeValue: {
      type: "number",
      label: "Bias Timeframe Value",
      min: 1,
      max: 999,
    },
    biasStrength: {
      type: "select",
      options: STRENGTH_LEVELS,
      label: "Bias Strength",
    },
  },
  "market-phase": {
    phase: { type: "select", options: MARKET_PHASES, label: "Current Phase" },
    confirmed: { type: "toggle", label: "Phase Confirmed" },
  },
  "liquidity-draw": {
    liquidityType: {
      type: "select",
      options: LIQUIDITY_TYPES,
      label: "Liquidity Type",
    },
    priority: { type: "select", options: PRIORITY_LEVELS, label: "Priority" },
    levelLabel: { type: "text", label: "Level Label (optional)" },
  },
  "market-structure": {
    structureType: {
      type: "select",
      options: MARKET_STRUCTURES,
      label: "Structure Type",
    },
    structureTimeframeUnit: {
      type: "select",
      options: TIMEFRAME_UNITS,
      label: "Structure Timeframe Unit",
    },
    structureTimeframeValue: {
      type: "number",
      label: "Structure Timeframe Value",
      min: 1,
      max: 999,
    },
    confirmed: { type: "toggle", label: "Structure Confirmed" },
  },
  "dealing-range": {
    rangeTimeframeUnit: {
      type: "select",
      options: TIMEFRAME_UNITS,
      label: "Range Timeframe Unit",
    },
    rangeTimeframeValue: {
      type: "number",
      label: "Range Timeframe Value",
      min: 1,
      max: 999,
    },
    rangeLabel: { type: "text", label: "Range Label" },
  },
  "equilibrium-ce": {
    source: { type: "select", options: CE_SOURCES, label: "Source" },
    levelType: { type: "select", options: CE_LEVEL_TYPES, label: "Level Type" },
    context: { type: "select", options: CE_CONTEXTS, label: "Context" },
    structuralState: {
      type: "select",
      options: STRUCTURAL_STATES,
      label: "Structural State",
    },
  },
  gap: {
    gapType: { type: "select", options: GAP_TYPES, label: "Gap Type" },
    orientation: { type: "select", options: DIRECTIONS, label: "Orientation" },
    internalLevels: {
      type: "toggle",
      label: "Internal Levels (CE + Quadrants)",
    },
    behaviorTag: {
      type: "select",
      options: BEHAVIOR_TAGS,
      label: "Behavior Tag",
    },
    structuralState: {
      type: "select",
      options: STRUCTURAL_STATES,
      label: "Structural State",
    },
  },
  "key-level": {
    levelType: {
      type: "select",
      options: KEY_LEVEL_TYPES,
      label: "Level Type",
    },
    tested: { type: "toggle", label: "Level Tested" },
    levelLabel: { type: "text", label: "Level Label" },
  },
  "pdh-pdl": {
    pdType: { type: "select", options: PD_TYPES, label: "Level Type" },
    respected: { type: "toggle", label: "Level Respected" },
  },
  "weekly-hl": {
    weeklyType: { type: "select", options: WEEKLY_TYPES, label: "Level Type" },
    currentWeek: { type: "toggle", label: "Current Week" },
  },
  inefficiency: {
    inefficiencyType: {
      type: "select",
      options: INEFFICIENCY_TYPES,
      label: "Inefficiency Type",
    },
    direction: { type: "select", options: DIRECTIONS, label: "Direction" },
    timeframeUnit: {
      type: "select",
      options: TIMEFRAME_UNITS,
      label: "Timeframe Unit",
    },
    timeframeValue: {
      type: "number",
      label: "Timeframe Value",
      min: 1,
      max: 999,
    },
    fillState: { type: "select", options: FILL_STATES, label: "Fill State" },
    structuralState: {
      type: "select",
      options: STRUCTURAL_STATES,
      label: "Structural State",
    },
    locationVsDealingRange: {
      type: "select",
      options: LOCATION_VS_DEALING_RANGE,
      label: "Location vs Dealing Range",
    },
  },
  block: {
    blockType: { type: "select", options: BLOCK_TYPES, label: "Block Type" },
    direction: { type: "select", options: DIRECTIONS, label: "Direction" },
    timeframeUnit: {
      type: "select",
      options: TIMEFRAME_UNITS,
      label: "Timeframe Unit",
    },
    timeframeValue: {
      type: "number",
      label: "Timeframe Value",
      min: 1,
      max: 999,
    },
    referencePoint: {
      type: "select",
      options: REFERENCE_POINTS,
      label: "Reference Point",
    },
    structuralState: {
      type: "select",
      options: STRUCTURAL_STATES,
      label: "Structural State",
    },
    locationVsDealingRange: {
      type: "select",
      options: LOCATION_VS_DEALING_RANGE,
      label: "Location vs Dealing Range",
    },
  },
  "liquidity-pool": {
    poolType: {
      type: "select",
      options: LIQUIDITY_POOL_TYPES,
      label: "Pool Type",
    },
    timeframeUnit: {
      type: "select",
      options: TIMEFRAME_UNITS,
      label: "Timeframe Unit",
    },
    timeframeValue: {
      type: "number",
      label: "Timeframe Value",
      min: 1,
      max: 999,
    },
    role: { type: "select", options: PD_ROLES, label: "Role" },
    structuralState: {
      type: "select",
      options: STRUCTURAL_STATES,
      label: "Structural State",
    },
    locationVsDealingRange: {
      type: "select",
      options: LOCATION_VS_DEALING_RANGE,
      label: "Location vs Dealing Range",
    },
  },
  "premium-discount": {
    zoneType: {
      type: "select",
      options: PREMIUM_DISCOUNT_TYPES,
      label: "Zone Type",
    },
    timeframeUnit: {
      type: "select",
      options: TIMEFRAME_UNITS,
      label: "Timeframe Unit",
    },
    timeframeValue: {
      type: "number",
      label: "Timeframe Value",
      min: 1,
      max: 999,
    },
    role: { type: "select", options: PD_ROLES, label: "Role" },
    structuralState: {
      type: "select",
      options: STRUCTURAL_STATES,
      label: "Structural State",
    },
  },
  session: {
    sessionType: {
      type: "select",
      options: ICT_SESSIONS,
      label: "Trading Session",
    },
    sessionTime: { type: "text", label: "Session Time Range" },
    active: { type: "toggle", label: "Session Active" },
  },
  killzone: {
    killzoneType: {
      type: "select",
      options: KILLZONE_TYPES,
      label: "Killzone Type",
    },
    killzoneTime: { type: "text", label: "Killzone Time Range" },
    priority: { type: "select", options: PRIORITY_LEVELS, label: "Priority" },
  },
  "silver-bullet": {
    silverBulletType: {
      type: "select",
      options: SILVER_BULLET_TYPES,
      label: "Silver Bullet Type",
    },
    timeWindow: { type: "text", label: "Time Window" },
    active: { type: "toggle", label: "Currently Active" },
  },
  "time-rule": {
    ruleDescription: { type: "text", label: "Time-Based Rule" },
    enforced: { type: "toggle", label: "Rule Enforced" },
  },
};

export default function ToolConfigDialog({
  tool,
  zone,
  getToolName,
  customToolsLookup,
  onSave,
  onClose,
}: ToolConfigDialogProps) {
  const [properties, setProperties] = useState<Record<string, unknown>>({});
  const [interactions, setInteractions] = useState<string[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [newInteraction, setNewInteraction] = useState("");
  const [newAction, setNewAction] = useState("");

  const customTool = customToolsLookup.get(tool.type);

  useEffect(() => {
    setProperties(JSON.parse(tool.properties || "{}"));
    setInteractions([...tool.interactions]);
    setActions([...tool.actions]);
  }, [tool]);

  const handlePropertyChange = (key: string, value: unknown) => {
    setProperties((prev) => ({ ...prev, [key]: value }));
  };

  const handleAddInteraction = () => {
    if (newInteraction.trim()) {
      setInteractions((prev) => [...prev, newInteraction.trim()]);
      setNewInteraction("");
    }
  };

  const handleRemoveInteraction = (index: number) => {
    setInteractions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddAction = () => {
    if (newAction.trim()) {
      setActions((prev) => [...prev, newAction.trim()]);
      setNewAction("");
    }
  };

  const handleRemoveAction = (index: number) => {
    setActions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const updatedTool: ToolConfig = {
      ...tool,
      properties: JSON.stringify(properties),
      interactions,
      actions,
    };
    onSave(updatedTool);
  };

  const propertyConfig = TOOL_PROPERTY_CONFIGS[tool.type] || {};

  const renderPropertyField = (
    key: string,
    config: {
      type: string;
      label: string;
      options?: string[];
      min?: number;
      max?: number;
    },
  ) => {
    const value = properties[key];

    if (config.type === "select") {
      return (
        <div key={key} className="space-y-2">
          <Label htmlFor={key} className="text-sm font-medium">
            {config.label}
          </Label>
          <Select
            value={(value as string) || ""}
            onValueChange={(val) => handlePropertyChange(key, val)}
          >
            <SelectTrigger id={key}>
              <SelectValue
                placeholder={`Select ${config.label.toLowerCase()}...`}
              />
            </SelectTrigger>
            <SelectContent>
              {(config.options ?? []).map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (config.type === "toggle") {
      return (
        <div
          key={key}
          className="flex items-center justify-between space-x-2 py-2"
        >
          <Label htmlFor={key} className="text-sm font-medium">
            {config.label}
          </Label>
          <Switch
            id={key}
            checked={value === true || value === "true"}
            onCheckedChange={(checked) => handlePropertyChange(key, checked)}
          />
        </div>
      );
    }

    if (config.type === "number") {
      return (
        <div key={key} className="space-y-2">
          <Label htmlFor={key} className="text-sm font-medium">
            {config.label}
          </Label>
          <Input
            id={key}
            type="number"
            min={config.min ?? 0}
            max={config.max ?? 999}
            value={(value as number) || ""}
            onChange={(e) =>
              handlePropertyChange(key, Number.parseInt(e.target.value) || 1)
            }
            placeholder={`Enter ${config.label.toLowerCase()}...`}
          />
        </div>
      );
    }

    if (config.type === "text") {
      return (
        <div key={key} className="space-y-2">
          <Label htmlFor={key} className="text-sm font-medium">
            {config.label}
          </Label>
          <Input
            id={key}
            value={(value as string) || ""}
            onChange={(e) => handlePropertyChange(key, e.target.value)}
            placeholder={`Enter ${config.label.toLowerCase()}...`}
          />
        </div>
      );
    }

    return null;
  };

  const renderCustomPropertyField = (prop: CustomProperty) => {
    const value = properties[prop.propertyLabel];

    if (prop.type === "select") {
      return (
        <div key={prop.id} className="space-y-2">
          <Label htmlFor={prop.id} className="text-sm font-medium">
            {prop.propertyLabel}
          </Label>
          <Select
            value={(value as string) || ""}
            onValueChange={(val) =>
              handlePropertyChange(prop.propertyLabel, val)
            }
          >
            <SelectTrigger id={prop.id}>
              <SelectValue
                placeholder={`Select ${prop.propertyLabel.toLowerCase()}...`}
              />
            </SelectTrigger>
            <SelectContent>
              {(prop.options ?? []).map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (prop.type === "toggle") {
      return (
        <div
          key={prop.id}
          className="flex items-center justify-between space-x-2 py-2"
        >
          <Label htmlFor={prop.id} className="text-sm font-medium">
            {prop.propertyLabel}
          </Label>
          <Switch
            id={prop.id}
            checked={value === true || value === "true"}
            onCheckedChange={(checked) =>
              handlePropertyChange(prop.propertyLabel, checked)
            }
          />
        </div>
      );
    }

    if (prop.type === "number") {
      return (
        <div key={prop.id} className="space-y-2">
          <Label htmlFor={prop.id} className="text-sm font-medium">
            {prop.propertyLabel}
          </Label>
          <Input
            id={prop.id}
            type="number"
            value={(value as number) || ""}
            onChange={(e) =>
              handlePropertyChange(
                prop.propertyLabel,
                Number.parseInt(e.target.value) || 0,
              )
            }
            placeholder={`Enter ${prop.propertyLabel.toLowerCase()}...`}
          />
        </div>
      );
    }

    if (prop.type === "text") {
      return (
        <div key={prop.id} className="space-y-2">
          <Label htmlFor={prop.id} className="text-sm font-medium">
            {prop.propertyLabel}
          </Label>
          <Input
            id={prop.id}
            value={(value as string) || ""}
            onChange={(e) =>
              handlePropertyChange(prop.propertyLabel, e.target.value)
            }
            placeholder={`Enter ${prop.propertyLabel.toLowerCase()}...`}
          />
        </div>
      );
    }

    return null;
  };

  // PD array tools still show ICT-specific global flags
  const isPDArrayTool = [
    "inefficiency",
    "block",
    "liquidity-pool",
    "premium-discount",
    "gap",
    "equilibrium-ce",
  ].includes(tool.type);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Configure {getToolName(tool.type)}
          </DialogTitle>
          <DialogDescription>
            Set properties for this tool in the{" "}
            <span className="font-semibold">{zone}</span> zone
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="properties" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="properties">Properties</TabsTrigger>
            <TabsTrigger value="interactions">Interactions</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="properties" className="space-y-4 mt-4">
            {customTool ? (
              <Accordion
                type="single"
                collapsible
                defaultValue="basic"
                className="w-full"
              >
                <AccordionItem value="basic">
                  <AccordionTrigger className="text-sm font-semibold">
                    Basic Configuration
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    {customTool.properties.map((prop) =>
                      renderCustomPropertyField(prop),
                    )}
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="advanced">
                  <AccordionTrigger className="text-sm font-semibold">
                    Advanced Settings
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="notes" className="text-sm font-medium">
                        Notes
                      </Label>
                      <Textarea
                        id="notes"
                        value={(properties.notes as string) || ""}
                        onChange={(e) =>
                          handlePropertyChange("notes", e.target.value)
                        }
                        placeholder="Add any additional notes or context..."
                        rows={3}
                      />
                    </div>
                    <div className="flex items-center justify-between space-x-2 py-2">
                      <Label htmlFor="enabled" className="text-sm font-medium">
                        Tool Enabled
                      </Label>
                      <Switch
                        id="enabled"
                        checked={
                          properties.enabled !== false &&
                          properties.enabled !== "false"
                        }
                        onCheckedChange={(checked) =>
                          handlePropertyChange("enabled", checked)
                        }
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            ) : Object.keys(propertyConfig).length > 0 ? (
              <Accordion
                type="single"
                collapsible
                defaultValue="basic"
                className="w-full"
              >
                <AccordionItem value="basic">
                  <AccordionTrigger className="text-sm font-semibold">
                    Basic Configuration
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    {Object.entries(propertyConfig).map(([key, config]) =>
                      renderPropertyField(key, config),
                    )}
                  </AccordionContent>
                </AccordionItem>

                {isPDArrayTool && (
                  <AccordionItem value="pd-flags">
                    <AccordionTrigger className="text-sm font-semibold">
                      PD Array Global Flags
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                      <p className="text-xs text-muted-foreground mb-3">
                        Universal flags for all PD array-based tools
                      </p>
                      {!propertyConfig.structuralState && (
                        <div className="space-y-2">
                          <Label
                            htmlFor="structuralState"
                            className="text-sm font-medium"
                          >
                            Structural State
                          </Label>
                          <Select
                            value={
                              (properties.structuralState as string) ||
                              "Regular"
                            }
                            onValueChange={(val) =>
                              handlePropertyChange("structuralState", val)
                            }
                          >
                            <SelectTrigger id="structuralState">
                              <SelectValue placeholder="Select structural state..." />
                            </SelectTrigger>
                            <SelectContent>
                              {STRUCTURAL_STATES.map((state) => (
                                <SelectItem key={state} value={state}>
                                  {state}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {!propertyConfig.locationVsDealingRange && (
                        <div className="space-y-2">
                          <Label
                            htmlFor="locationVsDealingRange"
                            className="text-sm font-medium"
                          >
                            Location vs Dealing Range
                          </Label>
                          <Select
                            value={
                              (properties.locationVsDealingRange as string) ||
                              "Inside Discount (0-50%)"
                            }
                            onValueChange={(val) =>
                              handlePropertyChange(
                                "locationVsDealingRange",
                                val,
                              )
                            }
                          >
                            <SelectTrigger id="locationVsDealingRange">
                              <SelectValue placeholder="Select location..." />
                            </SelectTrigger>
                            <SelectContent>
                              {LOCATION_VS_DEALING_RANGE.map((location) => (
                                <SelectItem key={location} value={location}>
                                  {location}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                )}

                <AccordionItem value="advanced">
                  <AccordionTrigger className="text-sm font-semibold">
                    Advanced Settings
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="notes" className="text-sm font-medium">
                        Notes
                      </Label>
                      <Textarea
                        id="notes"
                        value={(properties.notes as string) || ""}
                        onChange={(e) =>
                          handlePropertyChange("notes", e.target.value)
                        }
                        placeholder="Add any additional notes or context..."
                        rows={3}
                      />
                    </div>
                    <div className="flex items-center justify-between space-x-2 py-2">
                      <Label htmlFor="enabled" className="text-sm font-medium">
                        Tool Enabled
                      </Label>
                      <Switch
                        id="enabled"
                        checked={
                          properties.enabled !== false &&
                          properties.enabled !== "false"
                        }
                        onCheckedChange={(checked) =>
                          handlePropertyChange("enabled", checked)
                        }
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-sm">
                  No specific properties available for this tool type.
                </p>
                <p className="text-xs mt-2">
                  Use Interactions and Actions tabs to define behavior.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="interactions" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label
                  htmlFor="new-interaction"
                  className="text-sm font-medium"
                >
                  Add Interaction Condition
                </Label>
                <div className="flex gap-2">
                  <Textarea
                    id="new-interaction"
                    placeholder="e.g., When price interacts with this level during London session..."
                    value={newInteraction}
                    onChange={(e) => setNewInteraction(e.target.value)}
                    rows={2}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleAddInteraction}
                    size="icon"
                    className="flex-shrink-0 h-auto"
                    disabled={!newInteraction.trim()}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {interactions.length > 0 ? (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Defined Interactions
                  </Label>
                  {interactions.map((interaction, index) => (
                    <div
                      // biome-ignore lint/suspicious/noArrayIndexKey: interactions are ordered strings without stable IDs
                      key={index}
                      className="flex items-start gap-2 p-3 bg-muted rounded-lg border"
                    >
                      <div className="flex-1">
                        <p className="text-sm">{interaction}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 flex-shrink-0"
                        onClick={() => handleRemoveInteraction(index)}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    No interactions defined yet.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Add conditions that trigger actions when met.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="actions" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="new-action" className="text-sm font-medium">
                  Add Action
                </Label>
                <div className="flex gap-2">
                  <Textarea
                    id="new-action"
                    placeholder="e.g., Enter long position when setup confirms at this level..."
                    value={newAction}
                    onChange={(e) => setNewAction(e.target.value)}
                    rows={2}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleAddAction}
                    size="icon"
                    className="flex-shrink-0 h-auto"
                    disabled={!newAction.trim()}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {actions.length > 0 ? (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Defined Actions</Label>
                  {actions.map((action, index) => (
                    <div
                      // biome-ignore lint/suspicious/noArrayIndexKey: actions are ordered strings without stable IDs
                      key={index}
                      className="flex items-start gap-2 p-3 bg-muted rounded-lg border"
                    >
                      <div className="flex-1">
                        <p className="text-sm">{action}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 flex-shrink-0"
                        onClick={() => handleRemoveAction(index)}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    No actions defined yet.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Add what to do when interaction conditions are met.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="gap-2">
            <Save className="w-4 h-4" />
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
