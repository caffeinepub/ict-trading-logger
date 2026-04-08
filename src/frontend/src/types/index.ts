import type { Principal } from "@icp-sdk/core/principal";
import type { ExternalBlob } from "../backend";

// ── Tool & Model Types ────────────────────────────────────────────────────────

export interface ToolConfig {
  id: string;
  type: string;
  properties: string;
  interactions: string[];
  actions: string[];
  zone: string;
  position: bigint;
}

export interface ExampleImage {
  id: string;
  description: string;
  blob: ExternalBlob;
  created_at?: bigint;
}

export interface Model {
  id: string;
  owner: Principal;
  name: string;
  description: string;
  narrative: ToolConfig[];
  framework: ToolConfig[];
  execution: ToolConfig[];
  example_images: ExampleImage[];
  created_at: bigint;
}

// ── Trade Types ───────────────────────────────────────────────────────────────

export interface BracketGroup {
  bracket_id: string;
  size: number;
  take_profit_price: number;
  stop_loss_price: number;
  sl_modified_by_user?: boolean;
}

export interface BracketOrder {
  entry_price: number;
  primary_stop_loss: number;
  bracket_groups: BracketGroup[];
  position_size: number;
  value_per_unit: number;
  calculation_method?: string;
  position_sizer?: PositionSizer;
}

export type ClosureType =
  | "take_profit"
  | "stop_loss"
  | "break_even"
  | "manual_close";

// Runtime enum for value comparisons
export const ClosureTypeEnum = {
  take_profit: "take_profit" as ClosureType,
  stop_loss: "stop_loss" as ClosureType,
  break_even: "break_even" as ClosureType,
  manual_close: "manual_close" as ClosureType,
};

export interface BracketOrderOutcome {
  bracket_id: string;
  size: number;
  closure_price: number;
  closure_type: ClosureType;
  execution_price?: number;
  outcome_time?: bigint;
}

export interface ModelCondition {
  id: string;
  description: string;
  zone: "narrative" | "framework" | "execution";
  isChecked: boolean;
}

export type CalculationMethodType = "tick" | "point";

// Runtime enum for value comparisons
export const CalculationMethod = {
  tick: "tick" as CalculationMethodType,
  point: "point" as CalculationMethodType,
};

export interface PositionSizer {
  account_size?: number;
  account_capital?: number;
  risk_percent?: number;
  risk_percentage?: number;
  tick_size?: number;
  tick_value?: number;
  point_value?: number;
  value_per_point?: number;
  entry_price?: number;
  primary_stop_loss?: number;
  asset_type?: string;
  contract_lot_unit?: string;
  allow_fractional_size?: boolean;
}

export interface Trade {
  id: string;
  owner: Principal;
  model_id: string;
  model_name?: string;
  instrument?: string;
  asset?: string;
  direction: "long" | "short";
  bracket_order: BracketOrder;
  value_per_unit: number;
  calculation_method: CalculationMethodType;
  position_sizer?: PositionSizer;
  model_conditions: ModelCondition[];
  bracket_order_outcomes: BracketOrderOutcome[];
  is_completed: boolean;
  notes: string;
  mood: string;
  images: ExternalBlob[];
  would_take_again: boolean;
  close_time?: bigint | null;
  created_at: bigint;
  adherence_score?: number;
  quickTags?: string[];
  mistakeTags?: string[];
  strengthTags?: string[];
}

// ── Custom Tool Types ─────────────────────────────────────────────────────────

export type PropertyType =
  | "text"
  | "number"
  | "dropdown"
  | "multiselect"
  | "boolean"
  | "timeframe"
  | "datetime"
  | "range"
  | "select"
  | "toggle";

export interface CustomProperty {
  id: string;
  propertyLabel: string;
  type?: PropertyType;
  propertyType?: PropertyType;
  default_value: string;
  options: string[];
  is_required?: boolean;
}

export interface CustomToolDefinition {
  id: string;
  owner: Principal;
  name: string;
  properties: CustomProperty[];
  created_at: bigint;
  updated_at?: bigint;
}

// ── User Types ────────────────────────────────────────────────────────────────

export interface UserProfile {
  name: string;
  created_at?: bigint;
}

// ── Backend Actor Interface ───────────────────────────────────────────────────

export interface BackendActor {
  getAllModels(): Promise<Model[]>;
  getModel(id: string): Promise<Model | null>;
  createModel(model: Model): Promise<void>;
  updateModel(model: Model): Promise<void>;
  deleteModel(id: string): Promise<void>;
  getAllTrades(): Promise<Trade[]>;
  getTrade(id: string): Promise<Trade | null>;
  getTradesByModel(modelId: string): Promise<Trade[]>;
  createTrade(trade: Trade): Promise<void>;
  updateTrade(trade: Trade): Promise<void>;
  deleteTrade(id: string): Promise<void>;
  getCurrentTime(): Promise<bigint>;
  getCallerUserProfile(): Promise<UserProfile | null>;
  saveCallerUserProfile(profile: UserProfile): Promise<void>;
  getAllCustomTools(): Promise<CustomToolDefinition[]>;
  createCustomTool(tool: CustomToolDefinition): Promise<void>;
  updateCustomTool(tool: CustomToolDefinition): Promise<void>;
  deleteCustomTool(id: string): Promise<void>;
  getModelConditions(modelId: string): Promise<ModelCondition[]>;
  calculateAdherenceScore(conditions: ModelCondition[]): Promise<number>;
}
