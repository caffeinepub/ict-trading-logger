import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface BracketOrder {
    bracket_groups: Array<BracketGroup>;
    primary_stop_loss: number;
    calculation_method: string;
    position_sizer: PositionSizer;
    position_size: number;
    entry_price: number;
    value_per_unit: number;
}
export interface Trade {
    id: string;
    direction: string;
    asset: string;
    owner: Principal;
    model_conditions: Array<ModelCondition>;
    created_at: bigint;
    bracket_order_outcome: BracketOrderOutcome;
    calculation_method: CalculationMethod;
    is_completed: boolean;
    position_sizer: PositionSizer;
    notes: string;
    adherence_score: number;
    emotions: Array<string>;
    model_id: string;
    bracket_order: BracketOrder;
    value_per_unit: number;
    images: Array<string>;
}
export interface CustomToolDefinition {
    id: string;
    updated_at: bigint;
    owner: Principal;
    name: string;
    properties: Array<CustomProperty>;
    created_at: bigint;
}
export interface BracketGroup {
    size: number;
    take_profit_price: number;
    sl_modified_by_user: boolean;
    bracket_id: string;
    stop_loss_price: number;
}
export interface ModelCondition {
    id: string;
    isChecked: boolean;
    zone: string;
    description: string;
}
export interface BracketOrderOutcome {
    rr: number;
    final_pl_pct: number;
    final_pl_usd: number;
    filled_bracket_groups: Array<FilledBracketGroup>;
}
export interface ToolConfig {
    id: string;
    type: string;
    zone: string;
    properties: string;
    actions: Array<string>;
    interactions: Array<string>;
    position: bigint;
}
export interface PositionSizer {
    contract_lot_unit: string;
    allow_fractional_size: boolean;
    asset_type: string;
    account_capital: number;
    value_per_point: number;
    primary_stop_loss: number;
    risk_percentage: number;
    entry_price: number;
}
export interface FilledBracketGroup {
    manual_close_price?: number;
    break_even_applied: boolean;
    closure_price: number;
    size: number;
    break_even_price?: number;
    bracket_id: string;
    manual_close_applied: boolean;
    closure_type: ClosureType;
}
export interface Model {
    id: string;
    owner: Principal;
    name: string;
    framework: Array<ToolConfig>;
    description: string;
    created_at: bigint;
    narrative: Array<ToolConfig>;
    execution: Array<ToolConfig>;
}
export interface CustomProperty {
    id: string;
    type: PropertyType;
    propertyLabel: string;
    options: Array<string>;
    default_value: string;
}
export interface UserProfile {
    name: string;
}
export enum CalculationMethod {
    tick = "tick",
    point = "point"
}
export enum ClosureType {
    take_profit = "take_profit",
    manual_close = "manual_close",
    stop_loss = "stop_loss",
    break_even = "break_even"
}
export enum PropertyType {
    text = "text",
    select = "select",
    toggle = "toggle",
    number_ = "number"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export enum Variant_valid_invalid_take_profit_order_invalid_event_combination_invalid_stop_loss_adjustment {
    valid = "valid",
    invalid_take_profit_order = "invalid_take_profit_order",
    invalid_event_combination = "invalid_event_combination",
    invalid_stop_loss_adjustment = "invalid_stop_loss_adjustment"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    calculateAdherenceScore(conditions: Array<ModelCondition>): Promise<number>;
    createCustomTool(tool: CustomToolDefinition): Promise<string>;
    createModel(model: Model): Promise<void>;
    createTrade(trade: Trade): Promise<void>;
    deleteCustomTool(id: string): Promise<string>;
    deleteModel(id: string): Promise<void>;
    deleteTrade(id: string): Promise<void>;
    duplicateCustomTool(tool_id: string, new_name: string): Promise<string>;
    getAdherenceAnalytics(): Promise<{
        avg_adherence: number;
        total_trades: bigint;
        win_rate_high_adherence: number;
        win_rate_low_adherence: number;
    }>;
    getAllCustomTools(): Promise<Array<CustomToolDefinition>>;
    getAllModels(): Promise<Array<Model>>;
    getAllTrades(): Promise<Array<Trade>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCurrentTime(): Promise<bigint>;
    getCustomTool(id: string): Promise<CustomToolDefinition | null>;
    getCustomToolCount(): Promise<bigint>;
    getModel(id: string): Promise<Model | null>;
    getModelConditions(model_id: string): Promise<Array<ModelCondition>>;
    getTotalAllocation(bracket_groups: Array<BracketGroup>): Promise<number>;
    getTrade(id: string): Promise<Trade | null>;
    getTradesByAdherenceRange(min_score: number, max_score: number): Promise<Array<Trade>>;
    getTradesByAsset(asset: string): Promise<Array<Trade>>;
    getTradesByDateRange(start: bigint, end: bigint): Promise<Array<Trade>>;
    getTradesByModel(model_id: string): Promise<Array<Trade>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    initializeAccessControl(): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    mapTradeConditionsToModel(trade_conditions: Array<ModelCondition>, model_conditions: Array<ModelCondition>): Promise<Array<ModelCondition>>;
    saveBracketOrderOutcome(trade_id: string, outcome_data: BracketOrderOutcome): Promise<{
        updatedTrade: Trade;
        updatedAnalytics: {
            totalTrades: number;
            avgPL: number;
            avgRR: number;
            totalPL: number;
            totalRR: number;
            totalWins: number;
            bracketOrderValidation: Variant_valid_invalid_take_profit_order_invalid_event_combination_invalid_stop_loss_adjustment;
            winRate: number;
        };
    }>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    updateCustomTool(tool: CustomToolDefinition): Promise<string>;
    updateModel(model: Model): Promise<void>;
    updateModelAnalytics(model_id: string): Promise<{
        totalTrades: number;
        avgPL: number;
        avgRR: number;
        totalPL: number;
        totalRR: number;
        totalWins: number;
        bracketOrderValidation: Variant_valid_invalid_take_profit_order_invalid_event_combination_invalid_stop_loss_adjustment;
        winRate: number;
    }>;
    updateTrade(trade: Trade): Promise<void>;
    validateBracketGroups(bracket_groups: Array<BracketGroup>, direction: string): Promise<boolean>;
    validateBracketOrderRules(outcome_data: BracketOrderOutcome, original_bracket_order: BracketOrder): Promise<Variant_valid_invalid_take_profit_order_invalid_event_combination_invalid_stop_loss_adjustment>;
    validateOutcomeSequence(filled_bracket_groups: Array<FilledBracketGroup>): Promise<boolean>;
}
