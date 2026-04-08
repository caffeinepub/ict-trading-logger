import AccessControl "mo:caffeineai-authorization/access-control";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import MixinObjectStorage "mo:caffeineai-object-storage/Mixin";
import Storage "mo:caffeineai-object-storage/Storage";
import Principal "mo:core/Principal";
import Map "mo:core/Map";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Float "mo:core/Float";
import Array "mo:core/Array";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Runtime "mo:core/Runtime";



actor {
  // Initialize the user system state
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // Initialize auth (first caller becomes admin, others become users)
  public shared ({ caller }) func initializeAccessControl() : async () {
    AccessControl.initialize(accessControlState, caller);
  };

  public type UserProfile = {
    name : Text;
    // Other user metadata if needed
  };

  let userProfiles = Map.empty<Principal, UserProfile>();

  // Helper function to automatically register authenticated users
  func ensureUserRegistered(caller : Principal) {
    let anonymousPrincipal = Principal.fromText("2vxsx-fae");
    if (caller == anonymousPrincipal) {
      return; // Don't auto-register anonymous users
    };

    if (AccessControl.getUserRole(accessControlState, caller) == #guest) {
      // Initialize the user with #user role
      AccessControl.initialize(accessControlState, caller);
      switch (userProfiles.get(caller)) {
        case (null) {
          let emptyProfile : UserProfile = {
            name = "";
          };
          userProfiles.add(caller, emptyProfile);
        };
        case (?_) {};
      };
    };
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    // Any authenticated user can view their own profile
    let anonymousPrincipal = Principal.fromText("2vxsx-fae");
    if (caller == anonymousPrincipal) {
      Runtime.trap("Unauthorized: Anonymous users cannot access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    // Users can only view their own profile, admins can view any profile
    let anonymousPrincipal = Principal.fromText("2vxsx-fae");
    if (caller == anonymousPrincipal) {
      Runtime.trap("Unauthorized: Anonymous users cannot access profiles");
    };

    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Cannot view another user's profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    ensureUserRegistered(caller);
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  public type ToolConfig = {
    id : Text;
    type_ : Text;
    properties : Text;
    interactions : [Text];
    actions : [Text];
    zone : Text;
    position : Nat;
  };

  // ExampleImage type
  public type ExampleImage = {
    id : Text;
    blob : Storage.ExternalBlob;
    description : Text;
    created_at : Int;
  };

  public type Model = {
    id : Text;
    owner : Principal;
    name : Text;
    description : Text;
    narrative : [ToolConfig];
    framework : [ToolConfig];
    execution : [ToolConfig];
    example_images : [ExampleImage];
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

  public type BracketOutcome = {
    closure_type : ClosureType;
    closure_price : Float;
    execution_price : Float;
    size : Float;
    outcome_time : Int;
  };

  public type BracketOrder = {
    entry_price : Float;
    primary_stop_loss : Float;
    bracket_groups : [BracketGroup];
    calculation_method : Text;
    value_per_unit : Float;
    position_size : Float;
    position_sizer : PositionSizer;
  };

  public type BracketOrderOutcome = {
    bracket_id : Text;
    closure_type : ClosureType;
    closure_price : Float;
    execution_price : Float;
    size : Float;
    outcome_time : Int;
    bracket_group : BracketGroup;
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
    bracket_order_outcomes : [BracketOrderOutcome];
    notes : Text;
    mood : Text;
    images : [Storage.ExternalBlob];
    quickTags : [Text];
    mistakeTags : [Text];
    strengthTags : [Text];
    created_at : Int;
    calculation_method : CalculationMethod;
    value_per_unit : Float;
    model_conditions : [ModelCondition];
    adherence_score : Float;
    is_completed : Bool;
    position_sizer : PositionSizer;
    would_take_again : Bool;
    close_time : ?Int;
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

  let models = Map.empty<Text, Model>();
  let trades = Map.empty<Text, Trade>();
  let customTools = Map.empty<Text, CustomToolDefinition>();

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
      Runtime.trap("Unauthorized: Only users can create models");
    };
    if (model.owner != caller) {
      Runtime.trap("Unauthorized: Cannot create model for another user");
    };
    models.add(model.id, model);
  };

  public query ({ caller }) func getModel(id : Text) : async ?Model {
    switch (models.get(id)) {
      case (null) { null };
      case (?model) {
        if (canAccessModel(caller, model)) {
          ?model;
        } else {
          Runtime.trap("Unauthorized: Cannot access another users model");
        };
      };
    };
  };

  public query ({ caller }) func getAllModels() : async [Model] {
    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    models.values().filter(func(model : Model) : Bool {
      isAdmin or model.owner == caller;
    }).toArray();
  };

  public shared ({ caller }) func updateModel(model : Model) : async () {
    ensureUserRegistered(caller);
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update models");
    };
    switch (models.get(model.id)) {
      case (null) { Runtime.trap("Model not found") };
      case (?existingModel) {
        if (not canAccessModel(caller, existingModel)) {
          Runtime.trap("Unauthorized: Cannot update another users model");
        };
        if (model.owner != existingModel.owner) {
          Runtime.trap("Unauthorized: Cannot change model ownership");
        };
        models.add(model.id, model);
      };
    };
  };

  public shared ({ caller }) func deleteModel(id : Text) : async () {
    ensureUserRegistered(caller);
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete models");
    };
    switch (models.get(id)) {
      case (null) { Runtime.trap("Model not found") };
      case (?model) {
        if (not canAccessModel(caller, model)) {
          Runtime.trap("Unauthorized: Cannot delete another users model");
        };
        models.remove(id);
      };
    };
  };

  // Trade operations
  public shared ({ caller }) func createTrade(trade : Trade) : async () {
    ensureUserRegistered(caller);
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create trades");
    };
    if (trade.owner != caller) {
      Runtime.trap("Unauthorized: Cannot create trade for another user");
    };
    switch (models.get(trade.model_id)) {
      case (null) { Runtime.trap("Model not found") };
      case (?model) {
        if (not canAccessModel(caller, model)) {
          Runtime.trap("Unauthorized: Cannot create trade with another users model");
        };
      };
    };
    trades.add(trade.id, trade);
  };

  public query ({ caller }) func getTrade(id : Text) : async ?Trade {
    switch (trades.get(id)) {
      case (null) { null };
      case (?trade) {
        if (canAccessTrade(caller, trade)) {
          ?trade;
        } else {
          Runtime.trap("Unauthorized: Cannot access another users trade");
        };
      };
    };
  };

  public query ({ caller }) func getAllTrades() : async [Trade] {
    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    trades.values().filter(func(trade : Trade) : Bool {
      isAdmin or trade.owner == caller;
    }).toArray();
  };

  public shared ({ caller }) func updateTrade(trade : Trade) : async () {
    ensureUserRegistered(caller);
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update trades");
    };
    switch (trades.get(trade.id)) {
      case (null) { Runtime.trap("Trade not found") };
      case (?existingTrade) {
        if (not canAccessTrade(caller, existingTrade)) {
          Runtime.trap("Unauthorized: Cannot update another users trade");
        };
        if (trade.owner != existingTrade.owner) {
          Runtime.trap("Unauthorized: Cannot change trade ownership");
        };
        trades.add(trade.id, trade);
      };
    };
  };

  public shared ({ caller }) func deleteTrade(id : Text) : async () {
    ensureUserRegistered(caller);
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete trades");
    };
    switch (trades.get(id)) {
      case (null) { Runtime.trap("Trade not found") };
      case (?trade) {
        if (not canAccessTrade(caller, trade)) {
          Runtime.trap("Unauthorized: Cannot delete another users trade");
        };
        trades.remove(id);
      };
    };
  };

  // Custom Tool Operations
  public shared ({ caller }) func createCustomTool(tool : CustomToolDefinition) : async Text {
    ensureUserRegistered(caller);

    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create custom tools");
    };

    let customToolCount = customTools.size();
    if (customToolCount >= maxCustomTools) {
      Runtime.trap("Tool limit reached. Please delete unused tools.");
    };

    if (tool.properties.size() > maxPropertiesPerTool) {
      Runtime.trap("Too many properties. Limit is 50 per tool.");
    };

    if (tool.owner != caller) {
      Runtime.trap("Unauthorized: You can only create tools for yourself");
    };

    customTools.add(tool.id, tool);
    tool.id;
  };

  public shared ({ caller }) func updateCustomTool(tool : CustomToolDefinition) : async Text {
    ensureUserRegistered(caller);

    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update custom tools");
    };

    switch (customTools.get(tool.id)) {
      case (null) { Runtime.trap("Tool not found") };
      case (?existingTool) {
        if (not (canAccessTool(caller, existingTool))) {
          Runtime.trap("Unauthorized: Cannot update another users tool");
        };

        if (tool.owner != existingTool.owner) {
          Runtime.trap("Unauthorized: Cannot change tool ownership");
        };

        customTools.add(tool.id, tool);
      };
    };

    tool.id;
  };

  public shared ({ caller }) func deleteCustomTool(id : Text) : async Text {
    ensureUserRegistered(caller);

    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete custom tools");
    };

    switch (customTools.get(id)) {
      case (null) { Runtime.trap("Tool not found") };
      case (?existingTool) {
        if (not (canAccessTool(caller, existingTool))) {
          Runtime.trap("Unauthorized: Cannot delete another users tool");
        };

        customTools.remove(id);
      };
    };

    id;
  };

  public query ({ caller }) func getCustomTool(id : Text) : async ?CustomToolDefinition {
    switch (customTools.get(id)) {
      case (null) { null };
      case (?tool) {
        if (canAccessTool(caller, tool)) {
          ?tool;
        } else {
          Runtime.trap("Unauthorized: Cannot access another users tool");
        };
      };
    };
  };

  public query ({ caller }) func getAllCustomTools() : async [CustomToolDefinition] {
    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    customTools.values().filter(func(tool : CustomToolDefinition) : Bool {
      isAdmin or tool.owner == caller;
    }).toArray();
  };

  public query ({ caller }) func getCustomToolCount() : async Nat {
    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    customTools.values().filter(func(tool : CustomToolDefinition) : Bool {
      isAdmin or tool.owner == caller;
    }).size();
  };

  public shared ({ caller }) func duplicateCustomTool(tool_id : Text, new_name : Text) : async Text {
    ensureUserRegistered(caller);

    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can duplicate custom tools");
    };

    switch (customTools.get(tool_id)) {
      case (null) { Runtime.trap("Tool not found") };
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
          customTools.add(newToolId, duplicatedTool);
          newToolId;
        } else {
          Runtime.trap("Unauthorized: Cannot duplicate another users tool");
        };
      };
    };
  };

  // Helper function to generate unique IDs
  func generateUniqueId() : Text {
    let timestamp = Time.now();
    let randomPart = Int.abs(timestamp).toText();
    "tool_" # Int.abs(timestamp).toText() # "_" # randomPart;
  };

  // Filtering operations
  public query ({ caller }) func getTradesByModel(model_id : Text) : async [Trade] {
    switch (models.get(model_id)) {
      case (null) { Runtime.trap("Model not found") };
      case (?model) {
        if (not canAccessModel(caller, model)) {
          Runtime.trap("Unauthorized: Cannot access trades for another users model");
        };
      };
    };
    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    trades.values().filter(func(trade : Trade) : Bool {
      trade.model_id == model_id and (isAdmin or trade.owner == caller);
    }).toArray();
  };

  public query ({ caller }) func getTradesByAsset(asset : Text) : async [Trade] {
    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    trades.values().filter(func(trade : Trade) : Bool {
      trade.asset == asset and (isAdmin or trade.owner == caller);
    }).toArray();
  };

  public query ({ caller }) func getTradesByDateRange(start : Int, end : Int) : async [Trade] {
    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    trades.values().filter(func(trade : Trade) : Bool {
      trade.created_at >= start and trade.created_at <= end and (isAdmin or trade.owner == caller);
    }).toArray();
  };

  // Save bracket-order outcome for a single bracket and update analytics
  public shared ({ caller }) func saveBracketOrderOutcome(
    trade_id : Text,
    bracket_outcome : BracketOrderOutcome,
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
      Runtime.trap("Unauthorized: Only users can save bracket order outcomes");
    };

    switch (trades.get(trade_id)) {
      case (null) { Runtime.trap("Trade not found") };
      case (?trade) {
        if (trade.owner != caller) {
          Runtime.trap("Unauthorized: Cannot save bracket outcome for another users trade");
        };

        let bracketValidation = validateBracketOrderRulesInternal(bracket_outcome, trade.bracket_order);

        switch (bracketValidation) {
          case (#valid) {
            let updatedBracketOutcomes = trade.bracket_order_outcomes.concat([bracket_outcome]);

            let updatedTrade : Trade = {
              id = trade.id;
              owner = trade.owner;
              model_id = trade.model_id;
              asset = trade.asset;
              direction = trade.direction;
              bracket_order = trade.bracket_order;
              bracket_order_outcomes = updatedBracketOutcomes;
              notes = trade.notes;
              mood = trade.mood;
              images = trade.images;
              quickTags = trade.quickTags;
              mistakeTags = trade.mistakeTags;
              strengthTags = trade.strengthTags;
              created_at = trade.created_at;
              calculation_method = trade.calculation_method;
              value_per_unit = trade.value_per_unit;
              model_conditions = trade.model_conditions;
              adherence_score = trade.adherence_score;
              is_completed = true;
              position_sizer = trade.position_sizer;
              would_take_again = trade.would_take_again;
              close_time = ?Time.now();
            };

            trades.add(trade_id, updatedTrade);

            let analytics = updateModelAnalyticsInternal(trade.model_id, caller);
            {
              updatedTrade;
              updatedAnalytics = {
                analytics with bracketOrderValidation = #valid;
              };
            };
          };
          case (#invalid_take_profit_order) {
            Runtime.trap("Invalid take profit order: TP events must be executed in ascending order without skipping levels");
          };
          case (#invalid_stop_loss_adjustment) {
            Runtime.trap("Invalid stop loss adjustment: Remaining SL size exceeds position remaining after TP events");
          };
          case (#invalid_event_combination) {
            Runtime.trap("Invalid event combination: Conflicting events detected (e.g. break-even with remaining SL events)");
          };
        };
      };
    };
  };

  // Helper functions - getCurrentTime accessible to all including guests
  public query func getCurrentTime() : async Int {
    Time.now();
  };

  // Enhanced validation functions - require user role
  public query ({ caller }) func validateBracketGroups(bracket_groups : [BracketGroup], direction : Text) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can validate bracket groups");
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
    bracket_order_outcomes : [BracketOrderOutcome],
  ) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can validate outcome sequence");
    };

    validateBracketOrderSequencingInternal(bracket_order_outcomes);
  };

  // Bracket-order validation and calculation logic
  public query ({ caller }) func validateBracketOrderRules(
    bracket_order_outcome : BracketOrderOutcome,
    original_bracket_order : BracketOrder,
  ) : async {
    #valid;
    #invalid_take_profit_order;
    #invalid_stop_loss_adjustment;
    #invalid_event_combination;
  } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can validate bracket order rules");
    };

    validateBracketOrderRulesInternal(bracket_order_outcome, original_bracket_order);
  };

  // Internal helper functions
  private func validateBracketOrderRulesInternal(
    bracket_order_outcome : BracketOrderOutcome,
    original_bracket_order : BracketOrder,
  ) : {
    #valid;
    #invalid_take_profit_order;
    #invalid_stop_loss_adjustment;
    #invalid_event_combination;
  } {
    let tpOrderValid = validateTakeProfitOrderInternal(bracket_order_outcome);
    let slAdjustmentValid = validateStopLossAdjustmentInternal(bracket_order_outcome, original_bracket_order);
    let eventCombinationValid = validateEventCombinationInternal(bracket_order_outcome);

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

  private func validateTakeProfitOrderInternal(bracket_order_outcome : BracketOrderOutcome) : Bool {
    let lastTpIndex : Nat = 0;
    switch (bracket_order_outcome.closure_type) {
      case (#take_profit) {
        let currentTpIndex = getBracketGroupIndexInternal(bracket_order_outcome.bracket_id) + 1;
        currentTpIndex > lastTpIndex;
      };
      case (#stop_loss) { true };
      case (#break_even) { true };
      case (#manual_close) { true };
    };
  };

  private func getBracketGroupIndexInternal(bracket_id : Text) : Nat {
    switch (trades.get(bracket_id)) {
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

  private func validateStopLossAdjustmentInternal(bracket_order_outcome : BracketOrderOutcome, original_bracket_order : BracketOrder) : Bool {
    var remainingPosition : Float = original_bracket_order.position_size;
    switch (bracket_order_outcome.closure_type) {
      case (#take_profit) { remainingPosition -= bracket_order_outcome.size };
      case (#stop_loss) { remainingPosition -= bracket_order_outcome.size };
      case (#break_even) { remainingPosition -= bracket_order_outcome.size };
      case (#manual_close) { remainingPosition -= bracket_order_outcome.size };
    };
    remainingPosition >= 0.0;
  };

  private func validateEventCombinationInternal(bracket_order_outcome : BracketOrderOutcome) : Bool {
    switch (bracket_order_outcome.closure_type) {
      case (#take_profit) { true };
      case (#stop_loss) { true };
      case (#break_even) { true };
      case (#manual_close) { true };
    };
  };

  private func validateBracketOrderSequencingInternal(
    bracket_order_outcomes : [BracketOrderOutcome],
  ) : Bool {
    var lastTpIndex : Nat = 0;
    for (outcome in bracket_order_outcomes.vals()) {
      switch (outcome.closure_type) {
        case (#take_profit) {
          let currentIndex = getBracketGroupIndexInternal(outcome.bracket_id) + 1;
          if (currentIndex <= lastTpIndex) {
            return false;
          };
          lastTpIndex := currentIndex;
        };
        case (_) {};
      };
    };
    true;
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
    switch (models.get(model_id)) {
      case (null) { Runtime.trap("Model not found") };
      case (?model) {
        if (model.owner != caller_principal and not AccessControl.isAdmin(accessControlState, caller_principal)) {
          Runtime.trap("Unauthorized: Cannot update analytics for another users model");
        };

        let isAdmin = AccessControl.isAdmin(accessControlState, caller_principal);
        let modelTrades = trades.values().filter(func(trade : Trade) : Bool {
          trade.model_id == model_id and trade.is_completed and (isAdmin or trade.owner == caller_principal);
        }).toArray();

        var totalTrades : Float = 0.0;
        var totalWins : Float = 0.0;
        var totalPL : Float = 0.0;
        var totalRR : Float = 0.0;

        for (trade in modelTrades.vals()) {
          totalTrades += 1.0;
          if (trade.bracket_order_outcomes.size() > 0 and trade.bracket_order_outcomes[0].closure_type == #take_profit) {
            totalWins += 1.0;
          };
          totalPL += Int.abs(trade.bracket_order_outcomes.size()).toFloat();
          totalRR += Int.abs(trade.bracket_order_outcomes.size()).toFloat();
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
      Runtime.trap("Unauthorized: Only users can update model analytics");
    };

    updateModelAnalyticsInternal(model_id, caller);
  };

  // Helper function for calculating total allocation
  public query ({ caller }) func getTotalAllocation(bracket_groups : [BracketGroup]) : async Float {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get total allocation");
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
      Runtime.trap("Unauthorized: Only users can map trade conditions");
    };

    if (model_conditions.size() == 0) {
      return [];
    };

    model_conditions.map(func(model_condition : ModelCondition) : ModelCondition {
      switch (findMatchingCondition(model_condition.id, trade_conditions)) {
        case (?trade_condition) {
          { model_condition with isChecked = trade_condition.isChecked };
        };
        case (null) {
          { model_condition with isChecked = false };
        };
      };
    });
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
    switch (models.get(model_id)) {
      case (null) { Runtime.trap("Model not found") };
      case (?model) {
        if (not canAccessModel(caller, model)) {
          Runtime.trap("Unauthorized: Cannot access another users model");
        };

        let narrativeConditions = model.narrative.map(func(tool : ToolConfig) : ModelCondition {
          { id = tool.id; description = tool.properties; zone = "narrative"; isChecked = false };
        });

        let frameworkConditions = model.framework.map(func(tool : ToolConfig) : ModelCondition {
          { id = tool.id; description = tool.properties; zone = "framework"; isChecked = false };
        });

        let executionConditions = model.execution.map(func(tool : ToolConfig) : ModelCondition {
          { id = tool.id; description = tool.properties; zone = "execution"; isChecked = false };
        });

        narrativeConditions.concat(frameworkConditions).concat(executionConditions);
      };
    };
  };

  // New function to calculate adherence score
  public query ({ caller }) func calculateAdherenceScore(conditions : [ModelCondition]) : async Float {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can calculate adherence score");
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

    checkedCount / Int.abs(conditions.size()).toFloat();
  };

  // New function to get trades by adherence score range
  public query ({ caller }) func getTradesByAdherenceRange(min_score : Float, max_score : Float) : async [Trade] {
    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    trades.values().filter(func(trade : Trade) : Bool {
      trade.adherence_score >= min_score and trade.adherence_score <= max_score and (isAdmin or trade.owner == caller);
    }).toArray();
  };

  // New function to get adherence analytics
  public query ({ caller }) func getAdherenceAnalytics() : async {
    total_trades : Nat;
    avg_adherence : Float;
    win_rate_high_adherence : Float;
    win_rate_low_adherence : Float;
  } {
    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    let userTrades = trades.values().filter(func(trade : Trade) : Bool {
      isAdmin or trade.owner == caller;
    }).toArray();

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
        if (trade.bracket_order_outcomes.size() > 0 and trade.bracket_order_outcomes[0].closure_type == #take_profit) {
          highAdherenceWins += 1.0;
        };
      } else {
        lowAdherenceCount += 1.0;
        if (trade.bracket_order_outcomes.size() > 0 and trade.bracket_order_outcomes[0].closure_type == #take_profit) {
          lowAdherenceWins += 1.0;
        };
      };
    };

    let avgAdherence = totalAdherence / Int.abs(totalTrades).toFloat();
    let winRateHigh = if (highAdherenceCount > 0.0) { highAdherenceWins / highAdherenceCount } else { 0.0 };
    let winRateLow = if (lowAdherenceCount > 0.0) { lowAdherenceWins / lowAdherenceCount } else { 0.0 };

    {
      total_trades = totalTrades;
      avg_adherence = avgAdherence;
      win_rate_high_adherence = winRateHigh;
      win_rate_low_adherence = winRateLow;
    };
  };

  // Storage setup
  include MixinObjectStorage();
};
