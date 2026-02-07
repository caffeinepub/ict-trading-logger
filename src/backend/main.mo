import AccessControl "authorization/access-control";
import Principal "mo:base/Principal";
import OrderedMap "mo:base/OrderedMap";
import Iter "mo:base/Iter";
import Debug "mo:base/Debug";
import Storage "blob-storage/Storage";
import MixinStorage "blob-storage/Mixin";
import Time "mo:base/Time";
import Text "mo:base/Text";
import Float "mo:base/Float";
import Array "mo:base/Array";
import Nat "mo:base/Nat";
import Int "mo:base/Int";



// Specify the data migration function in with-clause

actor {
  // Initialize the user system state
  let accessControlState = AccessControl.initState();

  // Initialize auth (first caller becomes admin, others become users)
  public shared ({ caller }) func initializeAccessControl() : async () {
    AccessControl.initialize(accessControlState, caller);
  };

  public query ({ caller }) func getCallerUserRole() : async AccessControl.UserRole {
    AccessControl.getUserRole(accessControlState, caller);
  };

  public shared ({ caller }) func assignCallerUserRole(user : Principal, role : AccessControl.UserRole) : async () {
    // Admin-only check happens inside
    AccessControl.assignRole(accessControlState, caller, user, role);
  };

  public query ({ caller }) func isCallerAdmin() : async Bool {
    AccessControl.isAdmin(accessControlState, caller);
  };

  public type UserProfile = {
    name : Text;
    // Other user metadata if needed
  };

  transient let principalMap = OrderedMap.Make<Principal>(Principal.compare);
  var userProfiles = principalMap.empty<UserProfile>();

  // Helper function to automatically register authenticated users
  private func ensureUserRegistered(caller : Principal) {
    // Check if caller is anonymous
    let anonymousPrincipal = Principal.fromText("2vxsx-fae");
    if (caller == anonymousPrincipal) {
      return; // Don't auto-register anonymous users
    };

    // Check if user already has a role
    let currentRole = AccessControl.getUserRole(accessControlState, caller);

    // If user is a guest (no role assigned), automatically register them
    switch (currentRole) {
      case (#guest) {
        // Initialize the user with #user role
        AccessControl.initialize(accessControlState, caller);

        // Create empty profile if it doesn't exist
        switch (principalMap.get(userProfiles, caller)) {
          case (null) {
            let emptyProfile : UserProfile = {
              name = "";
            };
            userProfiles := principalMap.put(userProfiles, caller, emptyProfile);
          };
          case (?_) {
            // Profile already exists, do nothing
          };
        };
      };
      case (_) {
        // User already has a role (admin or user), do nothing
      };
    };
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    // Any authenticated user can view their own profile
    let anonymousPrincipal = Principal.fromText("2vxsx-fae");
    if (caller == anonymousPrincipal) {
      Debug.trap("Unauthorized: Anonymous users cannot access profiles");
    };
    principalMap.get(userProfiles, caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    // Users can only view their own profile, admins can view any profile
    let anonymousPrincipal = Principal.fromText("2vxsx-fae");
    if (caller == anonymousPrincipal) {
      Debug.trap("Unauthorized: Anonymous users cannot access profiles");
    };
    
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Cannot view another users profile");
    };
    principalMap.get(userProfiles, user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    ensureUserRegistered(caller);
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles := principalMap.put(userProfiles, caller, profile);
  };

  // Storage setup
  let storage = Storage.new();
  include MixinStorage(storage);

  // Data types
  public type ToolConfig = {
    id : Text;
    type_ : Text;
    properties : Text;
    interactions : [Text];
    actions : [Text];
    zone : Text;
    position : Nat;
  };

  public type Model = {
    id : Text;
    owner : Principal;
    name : Text;
    description : Text;
    narrative : [ToolConfig];
    framework : [ToolConfig];
    execution : [ToolConfig];
    created_at : Int;
  };

  public type PositionSizer = {
    risk_percentage : Float;
    account_capital : Float;
    entry_price : Float;
    primary_stop_loss : Float;
    asset_type : Text;
    contract_lot_unit : Text;
    value_per_point : Float;
    allow_fractional_size : Bool;
  };

  public type BracketGroup = {
    bracket_id : Text;
    size : Float;
    take_profit_price : Float;
    stop_loss_price : Float;
    sl_modified_by_user : Bool;
  };

  public type ClosureType = {
    #take_profit;
    #stop_loss;
    #break_even;
    #manual_close;
  };

  // Updated FilledBracketGroup to support per-bracket break even and manual close
  public type FilledBracketGroup = {
    bracket_id : Text;
    closure_type : ClosureType;
    closure_price : Float;
    size : Float;
    // Per-bracket break-even and manual close fields
    break_even_applied : Bool;
    break_even_price : ?Float;
    manual_close_applied : Bool;
    manual_close_price : ?Float;
  };

  public type BracketOrder = {
    entry_price : Float;
    primary_stop_loss : Float;
    bracket_groups : [BracketGroup];
    calculation_method : Text;
    value_per_unit : Float;
    position_size : Float;
    position_sizer : PositionSizer; // New field for position sizer data
  };

  // Updated BracketOrderOutcome to remove global break_even and manual_close fields
  public type BracketOrderOutcome = {
    filled_bracket_groups : [FilledBracketGroup];
    final_pl_pct : Float;
    final_pl_usd : Float;
    rr : Float;
  };

  public type CalculationMethod = {
    #tick;
    #point;
  };

  public type ModelCondition = {
    id : Text;
    description : Text;
    zone : Text;
    isChecked : Bool;
  };

  public type Trade = {
    id : Text;
    owner : Principal;
    model_id : Text;
    asset : Text;
    direction : Text;
    bracket_order : BracketOrder;
    bracket_order_outcome : BracketOrderOutcome;
    notes : Text;
    emotions : [Text];
    images : [Text];
    created_at : Int;
    calculation_method : CalculationMethod;
    value_per_unit : Float;
    model_conditions : [ModelCondition];
    adherence_score : Float;
    is_completed : Bool;
    position_sizer : PositionSizer; // New top-level field
  };

  // Custom Tool Types
  public type PropertyType = {
    #select;
    #text;
    #number;
    #toggle;
  };

  public type CustomProperty = {
    id : Text;
    propertyLabel : Text;
    type_ : PropertyType;
    default_value : Text;
    options : [Text];
  };

  public type CustomToolDefinition = {
    id : Text;
    owner : Principal;
    name : Text;
    properties : [CustomProperty];
    created_at : Int;
    updated_at : Int;
  };

  let maxCustomTools : Nat = 1000;
  let maxPropertiesPerTool : Nat = 50;

  // OrderedMap setup
  transient let textMap = OrderedMap.Make<Text>(Text.compare);

  var models = textMap.empty<Model>();
  var trades = textMap.empty<Trade>();
  var customTools = textMap.empty<CustomToolDefinition>();

  // Helper function to check ownership or admin
  private func canAccessModel(caller : Principal, model : Model) : Bool {
    caller == model.owner or AccessControl.isAdmin(accessControlState, caller);
  };

  private func canAccessTrade(caller : Principal, trade : Trade) : Bool {
    caller == trade.owner or AccessControl.isAdmin(accessControlState, caller);
  };

  private func canAccessTool(caller : Principal, tool : CustomToolDefinition) : Bool {
    caller == tool.owner or AccessControl.isAdmin(accessControlState, caller);
  };

  // Model operations
  public shared ({ caller }) func createModel(model : Model) : async () {
    ensureUserRegistered(caller);
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can create models");
    };
    // Verify the owner field matches the caller
    if (model.owner != caller) {
      Debug.trap("Unauthorized: Cannot create model for another user");
    };
    models := textMap.put(models, model.id, model);
  };

  public query ({ caller }) func getModel(id : Text) : async ?Model {
    switch (textMap.get(models, id)) {
      case (null) { null };
      case (?model) {
        if (canAccessModel(caller, model)) {
          ?model;
        } else {
          Debug.trap("Unauthorized: Cannot access another users model");
        };
      };
    };
  };

  public query ({ caller }) func getAllModels() : async [Model] {
    // Return only the caller's models (or all if admin)
    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    Iter.toArray(
      Iter.filter(
        textMap.vals(models),
        func(model : Model) : Bool {
          isAdmin or model.owner == caller;
        },
      )
    );
  };

  public shared ({ caller }) func updateModel(model : Model) : async () {
    ensureUserRegistered(caller);
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can update models");
    };
    // Check if model exists and caller has access
    switch (textMap.get(models, model.id)) {
      case (null) { Debug.trap("Model not found") };
      case (?existingModel) {
        if (not canAccessModel(caller, existingModel)) {
          Debug.trap("Unauthorized: Cannot update another users model");
        };
        // Ensure owner cannot be changed
        if (model.owner != existingModel.owner) {
          Debug.trap("Unauthorized: Cannot change model ownership");
        };
        models := textMap.put(models, model.id, model);
      };
    };
  };

  public shared ({ caller }) func deleteModel(id : Text) : async () {
    ensureUserRegistered(caller);
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can delete models");
    };
    switch (textMap.get(models, id)) {
      case (null) { Debug.trap("Model not found") };
      case (?model) {
        if (not canAccessModel(caller, model)) {
          Debug.trap("Unauthorized: Cannot delete another users model");
        };
        models := textMap.delete(models, id);
      };
    };
  };

  // Trade operations
  public shared ({ caller }) func createTrade(trade : Trade) : async () {
    ensureUserRegistered(caller);
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can create trades");
    };
    // Verify the owner field matches the caller
    if (trade.owner != caller) {
      Debug.trap("Unauthorized: Cannot create trade for another user");
    };
    // Verify the model belongs to the caller
    switch (textMap.get(models, trade.model_id)) {
      case (null) { Debug.trap("Model not found") };
      case (?model) {
        if (not canAccessModel(caller, model)) {
          Debug.trap("Unauthorized: Cannot create trade with another users model");
        };
      };
    };
    trades := textMap.put(trades, trade.id, trade);
  };

  public query ({ caller }) func getTrade(id : Text) : async ?Trade {
    switch (textMap.get(trades, id)) {
      case (null) { null };
      case (?trade) {
        if (canAccessTrade(caller, trade)) {
          ?trade;
        } else {
          Debug.trap("Unauthorized: Cannot access another users trade");
        };
      };
    };
  };

  public query ({ caller }) func getAllTrades() : async [Trade] {
    // Return only the caller's trades (or all if admin)
    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    Iter.toArray(
      Iter.filter(
        textMap.vals(trades),
        func(trade : Trade) : Bool {
          isAdmin or trade.owner == caller;
        },
      )
    );
  };

  public shared ({ caller }) func updateTrade(trade : Trade) : async () {
    ensureUserRegistered(caller);
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can update trades");
    };
    // Check if trade exists and caller has access
    switch (textMap.get(trades, trade.id)) {
      case (null) { Debug.trap("Trade not found") };
      case (?existingTrade) {
        if (not canAccessTrade(caller, existingTrade)) {
          Debug.trap("Unauthorized: Cannot update another users trade");
        };
        // Ensure owner cannot be changed
        if (trade.owner != existingTrade.owner) {
          Debug.trap("Unauthorized: Cannot change trade ownership");
        };
        trades := textMap.put(trades, trade.id, trade);
      };
    };
  };

  public shared ({ caller }) func deleteTrade(id : Text) : async () {
    ensureUserRegistered(caller);
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can delete trades");
    };
    switch (textMap.get(trades, id)) {
      case (null) { Debug.trap("Trade not found") };
      case (?trade) {
        if (not canAccessTrade(caller, trade)) {
          Debug.trap("Unauthorized: Cannot delete another users trade");
        };
        trades := textMap.delete(trades, id);
      };
    };
  };

  // Custom Tool Operations
  public shared ({ caller }) func createCustomTool(tool : CustomToolDefinition) : async Text {
    ensureUserRegistered(caller);

    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can create custom tools");
    };

    let customToolCount = textMap.size(customTools);
    if (customToolCount >= maxCustomTools) {
      Debug.trap("Tool limit reached. Please delete unused tools.");
    };

    if (tool.properties.size() > maxPropertiesPerTool) {
      Debug.trap("Too many properties. Limit is 50 per tool.");
    };

    if (tool.owner != caller) {
      Debug.trap("Unauthorized: You can only create tools for yourself");
    };

    customTools := textMap.put(customTools, tool.id, tool);
    tool.id;
  };

  public shared ({ caller }) func updateCustomTool(tool : CustomToolDefinition) : async Text {
    ensureUserRegistered(caller);

    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can update custom tools");
    };

    switch (textMap.get(customTools, tool.id)) {
      case (null) { Debug.trap("Tool not found") };
      case (?existingTool) {
        if (not (canAccessTool(caller, existingTool))) {
          Debug.trap("Unauthorized: Cannot update another users tool");
        };

        if (tool.owner != existingTool.owner) {
          Debug.trap("Unauthorized: Cannot change tool ownership");
        };

        customTools := textMap.put(customTools, tool.id, tool);
      };
    };

    tool.id;
  };

  public shared ({ caller }) func deleteCustomTool(id : Text) : async Text {
    ensureUserRegistered(caller);

    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can delete custom tools");
    };

    switch (textMap.get(customTools, id)) {
      case (null) { Debug.trap("Tool not found") };
      case (?existingTool) {
        if (not (canAccessTool(caller, existingTool))) {
          Debug.trap("Unauthorized: Cannot delete another users tool");
        };

        customTools := textMap.delete(customTools, id);
      };
    };

    id;
  };

  public query ({ caller }) func getCustomTool(id : Text) : async ?CustomToolDefinition {
    switch (textMap.get(customTools, id)) {
      case (null) { null };
      case (?tool) {
        if (canAccessTool(caller, tool)) {
          ?tool;
        } else {
          Debug.trap("Unauthorized: Cannot access another users tool");
        };
      };
    };
  };

  public query ({ caller }) func getAllCustomTools() : async [CustomToolDefinition] {
    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    Iter.toArray(
      Iter.filter(
        textMap.vals(customTools),
        func(tool : CustomToolDefinition) : Bool {
          isAdmin or tool.owner == caller;
        },
      )
    );
  };

  public query ({ caller }) func getCustomToolCount() : async Nat {
    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    let userTools = Iter.toArray(
      Iter.filter(
        textMap.vals(customTools),
        func(tool : CustomToolDefinition) : Bool {
          isAdmin or tool.owner == caller;
        },
      )
    );
    userTools.size();
  };

  public shared ({ caller }) func duplicateCustomTool(tool_id : Text, new_name : Text) : async Text {
    ensureUserRegistered(caller);

    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can duplicate custom tools");
    };

    switch (textMap.get(customTools, tool_id)) {
      case (null) { Debug.trap("Tool not found") };
      case (?tool) {
        if (canAccessTool(caller, tool)) {
          let newToolId = generateUniqueId();
          let duplicatedTool : CustomToolDefinition = {
            id = newToolId;
            owner = caller;
            name = new_name;
            properties = tool.properties;
            created_at = Time.now();
            updated_at = Time.now();
          };
          customTools := textMap.put(customTools, newToolId, duplicatedTool);
          newToolId;
        } else {
          Debug.trap("Unauthorized: Cannot duplicate another users tool");
        };
      };
    };
  };

  // Helper function to generate unique IDs
  func generateUniqueId() : Text {
    let timestamp = Time.now();
    let randomPart = Nat.toText(Int.abs(timestamp));
    "tool_" # Nat.toText(Int.abs(timestamp)) # "_" # randomPart;
  };

  // Filtering operations
  public query ({ caller }) func getTradesByModel(model_id : Text) : async [Trade] {
    // Verify the model belongs to the caller
    switch (textMap.get(models, model_id)) {
      case (null) { Debug.trap("Model not found") };
      case (?model) {
        if (not canAccessModel(caller, model)) {
          Debug.trap("Unauthorized: Cannot access trades for another users model");
        };
      };
    };
    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    Iter.toArray(
      Iter.filter(
        textMap.vals(trades),
        func(trade : Trade) : Bool {
          trade.model_id == model_id and (isAdmin or trade.owner == caller);
        },
      )
    );
  };

  public query ({ caller }) func getTradesByAsset(asset : Text) : async [Trade] {
    // Return only the caller's trades for this asset
    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    Iter.toArray(
      Iter.filter(
        textMap.vals(trades),
        func(trade : Trade) : Bool {
          trade.asset == asset and (isAdmin or trade.owner == caller);
        },
      )
    );
  };

  public query ({ caller }) func getTradesByDateRange(start : Int, end : Int) : async [Trade] {
    // Return only the caller's trades in this date range
    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    Iter.toArray(
      Iter.filter(
        textMap.vals(trades),
        func(trade : Trade) : Bool {
          trade.created_at >= start and trade.created_at <= end and (isAdmin or trade.owner == caller);
        },
      )
    );
  };

  // Save bracket-order outcome and update analytics
  public shared ({ caller }) func saveBracketOrderOutcome(
    trade_id : Text,
    outcome_data : BracketOrderOutcome,
  ) : async {
    updatedTrade : Trade;
    updatedAnalytics : {
      totalTrades : Float;
      totalWins : Float;
      totalPL : Float;
      totalRR : Float;
      winRate : Float;
      avgPL : Float;
      avgRR : Float;
      bracketOrderValidation : {
        #valid;
        #invalid_take_profit_order;
        #invalid_stop_loss_adjustment;
        #invalid_event_combination;
      };
    };
  } {
    ensureUserRegistered(caller);
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can save trade outcomes");
    };

    switch (textMap.get(trades, trade_id)) {
      case (null) { Debug.trap("Trade not found") };
      case (?trade) {
        if (trade.owner != caller) {
          Debug.trap("Unauthorized: Cannot save outcome for another users trade");
        };

        // Validate bracket-order rules for the new outcome
        let bracketValidation = validateBracketOrderRulesInternal(outcome_data, trade.bracket_order);

        // Save the updated trade only if bracket rules are valid
        switch (bracketValidation) {
          case (#valid) {
            let updatedTrade : Trade = {
              id = trade.id;
              owner = trade.owner;
              model_id = trade.model_id;
              asset = trade.asset;
              direction = trade.direction;
              bracket_order = trade.bracket_order;
              bracket_order_outcome = outcome_data;
              notes = trade.notes;
              emotions = trade.emotions;
              images = trade.images;
              created_at = trade.created_at;
              calculation_method = trade.calculation_method;
              value_per_unit = trade.value_per_unit;
              model_conditions = trade.model_conditions;
              adherence_score = trade.adherence_score;
              is_completed = true;
              position_sizer = trade.position_sizer; // new field
            };

            trades := textMap.put(trades, trade_id, updatedTrade);

            let analytics = updateModelAnalyticsInternal(trade.model_id, caller);
            {
              updatedTrade;
              updatedAnalytics = {
                analytics with bracketOrderValidation = #valid;
              };
            };
          };
          case (#invalid_take_profit_order) {
            Debug.trap("Invalid take profit order: TP events must be executed in ascending order without skipping levels");
          };
          case (#invalid_stop_loss_adjustment) {
            Debug.trap("Invalid stop loss adjustment: Remaining SL size exceeds position remaining after TP events");
          };
          case (#invalid_event_combination) {
            Debug.trap("Invalid event combination: Conflicting events detected (e.g. break-even with remaining SL events)");
          };
        };
      };
    };
  };

  // Helper functions - getCurrentTime accessible to all including guests
  public query func getCurrentTime() : async Int {
    // Utility function accessible to all users (including guests)
    Time.now();
  };

  // Enhanced validation functions - require user role
  public query ({ caller }) func validateBracketGroups(bracket_groups : [BracketGroup], direction : Text) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can validate bracket groups");
    };

    for (group in bracket_groups.vals()) {
      if (direction == "long") {
        if (group.stop_loss_price >= group.take_profit_price) {
          return false;
        };
      } else {
        if (group.stop_loss_price <= group.take_profit_price) {
          return false;
        };
      };
    };
    true;
  };

  public query ({ caller }) func validateOutcomeSequence(
    filled_bracket_groups : [FilledBracketGroup],
  ) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can validate outcome sequence");
    };

    // Validate sequencing and logical combinations
    validateBracketOrderSequencingInternal(filled_bracket_groups);
  };

  // Bracket-order validation and calculation logic
  public query ({ caller }) func validateBracketOrderRules(
    outcome_data : BracketOrderOutcome,
    original_bracket_order : BracketOrder,
  ) : async {
    #valid;
    #invalid_take_profit_order;
    #invalid_stop_loss_adjustment;
    #invalid_event_combination;
  } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can validate bracket order rules");
    };

    validateBracketOrderRulesInternal(outcome_data, original_bracket_order);
  };

  // Internal helper functions
  private func validateBracketOrderRulesInternal(
    outcome_data : BracketOrderOutcome,
    original_bracket_order : BracketOrder,
  ) : {
    #valid;
    #invalid_take_profit_order;
    #invalid_stop_loss_adjustment;
    #invalid_event_combination;
  } {
    // Validate take profit order (TP events must be in ascending order)
    let tpOrderValid = validateTakeProfitOrderInternal(outcome_data.filled_bracket_groups);

    // Validate stop loss adjustment (remaining SL matches remaining position)
    let slAdjustmentValid = validateStopLossAdjustmentInternal(outcome_data.filled_bracket_groups, original_bracket_order);

    // Validate event combination (no conflicting events)
    let eventCombinationValid = validateEventCombinationInternal(outcome_data.filled_bracket_groups);

    if (tpOrderValid and slAdjustmentValid and eventCombinationValid) {
      #valid;
    } else if (not tpOrderValid) {
      #invalid_take_profit_order;
    } else if (not slAdjustmentValid) {
      #invalid_stop_loss_adjustment;
    } else {
      #invalid_event_combination;
    };
  };

  private func validateTakeProfitOrderInternal(filled_bracket_groups : [FilledBracketGroup]) : Bool {
    // Ensure TP events are executed in ascending order (TP1, TP2, TP3, ...)
    var lastTpIndex : Nat = 0;
    for (group in filled_bracket_groups.vals()) {
      switch (group.closure_type) {
        case (#take_profit) {
          let currentTpIndex = getBracketGroupIndexInternal(group.bracket_id) + 1;
          if (currentTpIndex <= lastTpIndex) {
            return false;
          };
          lastTpIndex := currentTpIndex;
        };
        case (#stop_loss) {
          // Ignore for TP ordering
        };
        case (#break_even) {
          // Ignore for TP ordering
        };
        case (#manual_close) {
          // Ignore for TP ordering
        };
      };
    };
    true;
  };

  private func getBracketGroupIndexInternal(bracket_id : Text) : Nat {
    switch (textMap.get(trades, bracket_id)) {
      case (null) { 0 };
      case (?trade) {
        var index : Nat = 0;
        for (group in trade.bracket_order.bracket_groups.vals()) {
          if (group.bracket_id == bracket_id) {
            return index;
          };
          index += 1;
        };
        0;
      };
    };
  };

  private func validateStopLossAdjustmentInternal(filled_bracket_groups : [FilledBracketGroup], original_bracket_order : BracketOrder) : Bool {
    // Calculate total remaining after TP/SL events in the same bracket group
    var remainingPosition : Float = original_bracket_order.position_size;
    for (group in filled_bracket_groups.vals()) {
      switch (group.closure_type) {
        case (#take_profit) {
          remainingPosition -= group.size;
        };
        case (#stop_loss) {
          remainingPosition -= group.size;
        };
        case (#break_even) {
          if (original_bracket_order.position_size >= group.size) {
            remainingPosition -= group.size;
          };
        };
        case (#manual_close) {
          if (original_bracket_order.position_size >= group.size) {
            remainingPosition -= group.size;
          };
        };
      };
    };
    remainingPosition >= 0.0;
  };

  private func validateEventCombinationInternal(filled_bracket_groups : [FilledBracketGroup]) : Bool {
    var tp_events : Nat = 0;
    var sl_events : Nat = 0;
    var break_even_events : Nat = 0;
    var manual_close_events : Nat = 0;

    for (group in filled_bracket_groups.vals()) {
      switch (group.closure_type) {
        case (#take_profit) { tp_events += 1 };
        case (#stop_loss) { sl_events += 1 };
        case (#break_even) { break_even_events += 1 };
        case (#manual_close) { manual_close_events += 1 };
      };
    };

    // Allow only one break-even or manual close after TP events
    if (break_even_events > 0 and manual_close_events > 0) {
      false;
    } else {
      // Allow up to one break-even or manual close event after TP
      break_even_events + manual_close_events <= tp_events + 1;
    };
  };

  private func validateBracketOrderSequencingInternal(
    filled_bracket_groups : [FilledBracketGroup],
  ) : Bool {
    // Validate take-profit sequencing
    var lastTpIndex : Nat = 0;
    for (group in filled_bracket_groups.vals()) {
      switch (group.closure_type) {
        case (#take_profit) {
          let currentIndex = getBracketGroupIndexInternal(group.bracket_id) + 1;
          if (currentIndex <= lastTpIndex) {
            return false;
          };
          lastTpIndex := currentIndex;
        };
        case (_) {};
      };
    };

    // Break-even can only be applied after at least one TP or manual close
    let breakEvenAppliedValid = let hasTpOrManualClose = Iter.size(
      Iter.filter(
        Iter.map(
          filled_bracket_groups.vals(),
          func(group : FilledBracketGroup) : Bool {
            switch (group.closure_type) {
              case (#take_profit) { true };
              case (#manual_close) { true };
              case (_) { false };
            };
          },
        ),
        func(isTpOrManualClose : Bool) : Bool {
          isTpOrManualClose;
        },
      )
    ) > 0;

    breakEvenAppliedValid;
  };

  // Model analytics functions
  private func updateModelAnalyticsInternal(model_id : Text, caller_principal : Principal) : {
    totalTrades : Float;
    totalWins : Float;
    totalPL : Float;
    totalRR : Float;
    winRate : Float;
    avgPL : Float;
    avgRR : Float;
    bracketOrderValidation : {
      #valid;
      #invalid_take_profit_order;
      #invalid_stop_loss_adjustment;
      #invalid_event_combination;
    };
  } {
    switch (textMap.get(models, model_id)) {
      case (null) { Debug.trap("Model not found") };
      case (?model) {
        if (model.owner != caller_principal and not AccessControl.isAdmin(accessControlState, caller_principal)) {
          Debug.trap("Unauthorized: Cannot update analytics for another users model");
        };

        let isAdmin = AccessControl.isAdmin(accessControlState, caller_principal);
        let modelTrades = Iter.toArray(
          Iter.filter(
            textMap.vals(trades),
            func(trade : Trade) : Bool {
              trade.model_id == model_id and trade.is_completed and (isAdmin or trade.owner == caller_principal);
            },
          )
        );

        var totalTrades : Float = 0.0;
        var totalWins : Float = 0.0;
        var totalPL : Float = 0.0;
        var totalRR : Float = 0.0;

        for (trade in modelTrades.vals()) {
          totalTrades += 1.0;
          if (trade.bracket_order_outcome.final_pl_pct > 0.0) {
            totalWins += 1.0;
          };
          totalPL += trade.bracket_order_outcome.final_pl_pct;
          totalRR += trade.bracket_order_outcome.rr;
        };

        let winRate = if (totalTrades > 0.0) { totalWins / totalTrades } else { 0.0 };
        let avgPL = if (totalTrades > 0.0) { totalPL / totalTrades } else { 0.0 };
        let avgRR = if (totalTrades > 0.0) { totalRR / totalTrades } else { 0.0 };

        {
          totalTrades;
          totalWins;
          totalPL;
          totalRR;
          winRate;
          avgPL;
          avgRR;
          bracketOrderValidation = #valid;
        };
      };
    };
  };

  public shared ({ caller }) func updateModelAnalytics(model_id : Text) : async {
    totalTrades : Float;
    totalWins : Float;
    totalPL : Float;
    totalRR : Float;
    winRate : Float;
    avgPL : Float;
    avgRR : Float;
    bracketOrderValidation : {
      #valid;
      #invalid_take_profit_order;
      #invalid_stop_loss_adjustment;
      #invalid_event_combination;
    };
  } {
    ensureUserRegistered(caller);
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can update model analytics");
    };

    updateModelAnalyticsInternal(model_id, caller);
  };

  // Helper function for calculating total allocation
  public query ({ caller }) func getTotalAllocation(bracket_groups : [BracketGroup]) : async Float {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can get total allocation");
    };

    var totalAllocation : Float = 0.0;
    for (group in bracket_groups.vals()) {
      totalAllocation += group.size;
    };

    totalAllocation;
  };

  // Updated function to map trade conditions to model conditions
  public query ({ caller }) func mapTradeConditionsToModel(trade_conditions : [ModelCondition], model_conditions : [ModelCondition]) : async [ModelCondition] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can map trade conditions");
    };

    // Map trade conditions to model conditions
    if (model_conditions.size() == 0) {
      return [];
    };

    let mappedConditions = Iter.toArray(
      Iter.map(
        model_conditions.vals(),
        func(model_condition : ModelCondition) : ModelCondition {
          switch (findMatchingCondition(model_condition.id, trade_conditions)) {
            case (?trade_condition) {
              { model_condition with isChecked = trade_condition.isChecked };
            };
            case (null) {
              { model_condition with isChecked = false };
            };
          };
        },
      )
    );

    mappedConditions;
  };

  // Helper function to find a matching condition by id
  func findMatchingCondition(id : Text, conditions : [ModelCondition]) : ?ModelCondition {
    for (condition in conditions.vals()) {
      if (condition.id == id) {
        return ?condition;
      };
    };
    null;
  };

  // Updated function to extract model conditions
  public query ({ caller }) func getModelConditions(model_id : Text) : async [ModelCondition] {
    switch (textMap.get(models, model_id)) {
      case (null) { Debug.trap("Model not found") };
      case (?model) {
        if (not canAccessModel(caller, model)) {
          Debug.trap("Unauthorized: Cannot access another users model");
        };

        // Extract conditions from narrative, framework, and execution zones
        let narrativeConditions = Iter.toArray(
          Iter.map(
            model.narrative.vals(),
            func(tool : ToolConfig) : ModelCondition {
              {
                id = tool.id;
                description = tool.properties;
                zone = "narrative";
                isChecked = false;
              };
            },
          )
        );

        let frameworkConditions = Iter.toArray(
          Iter.map(
            model.framework.vals(),
            func(tool : ToolConfig) : ModelCondition {
              {
                id = tool.id;
                description = tool.properties;
                zone = "framework";
                isChecked = false;
              };
            },
          )
        );

        let executionConditions = Iter.toArray(
          Iter.map(
            model.execution.vals(),
            func(tool : ToolConfig) : ModelCondition {
              {
                id = tool.id;
                description = tool.properties;
                zone = "execution";
                isChecked = false;
              };
            },
          )
        );

        // Combine all conditions using Array.append
        let narrativeAndFramework = Array.append<ModelCondition>(narrativeConditions, frameworkConditions);
        let allConditions = Array.append<ModelCondition>(narrativeAndFramework, executionConditions);

        allConditions;
      };
    };
  };

  // New function to calculate adherence score
  public query ({ caller }) func calculateAdherenceScore(conditions : [ModelCondition]) : async Float {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can calculate adherence score");
    };

    if (conditions.size() == 0) {
      return 0.0;
    };

    var checkedCount : Float = 0.0;
    for (condition in conditions.vals()) {
      if (condition.isChecked) {
        checkedCount += 1.0;
      };
    };

    checkedCount / Float.fromInt(conditions.size());
  };

  // New function to get trades by adherence score range
  public query ({ caller }) func getTradesByAdherenceRange(min_score : Float, max_score : Float) : async [Trade] {
    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    Iter.toArray(
      Iter.filter(
        textMap.vals(trades),
        func(trade : Trade) : Bool {
          trade.adherence_score >= min_score and trade.adherence_score <= max_score and (isAdmin or trade.owner == caller);
        },
      )
    );
  };

  // New function to get adherence analytics
  public query ({ caller }) func getAdherenceAnalytics() : async {
    total_trades : Nat;
    avg_adherence : Float;
    win_rate_high_adherence : Float;
    win_rate_low_adherence : Float;
  } {
    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    let userTrades = Iter.toArray(
      Iter.filter(
        textMap.vals(trades),
        func(trade : Trade) : Bool {
          isAdmin or trade.owner == caller;
        },
      )
    );

    let totalTrades = userTrades.size();

    if (totalTrades == 0) {
      return {
        total_trades = 0;
        avg_adherence = 0.0;
        win_rate_high_adherence = 0.0;
        win_rate_low_adherence = 0.0;
      };
    };

    var totalAdherence : Float = 0.0;
    var highAdherenceWins : Float = 0.0;
    var highAdherenceCount : Float = 0.0;
    var lowAdherenceWins : Float = 0.0;
    var lowAdherenceCount : Float = 0.0;

    for (trade in userTrades.vals()) {
      totalAdherence += trade.adherence_score;

      if (trade.adherence_score >= 0.8) {
        highAdherenceCount += 1.0;
        if (trade.bracket_order_outcome.final_pl_pct > 0.0) {
          highAdherenceWins += 1.0;
        };
      } else {
        lowAdherenceCount += 1.0;
        if (trade.bracket_order_outcome.final_pl_pct > 0.0) {
          lowAdherenceWins += 1.0;
        };
      };
    };

    let avgAdherence = totalAdherence / Float.fromInt(totalTrades);
    let winRateHigh = if (highAdherenceCount > 0.0) { highAdherenceWins / highAdherenceCount } else { 0.0 };
    let winRateLow = if (lowAdherenceCount > 0.0) { lowAdherenceWins / lowAdherenceCount } else { 0.0 };

    {
      total_trades = totalTrades;
      avg_adherence = avgAdherence;
      win_rate_high_adherence = winRateHigh;
      win_rate_low_adherence = winRateLow;
    };
  };
};
