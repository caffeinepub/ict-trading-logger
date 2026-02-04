import OrderedMap "mo:base/OrderedMap";
import Text "mo:base/Text";
import Principal "mo:base/Principal";
import Float "mo:base/Float";
import Nat "mo:base/Nat";

module {
  // Type definitions for Custom Tools
  type PropertyType = {
    #select;
    #text;
    #number;
    #toggle;
  };

  type CustomProperty = {
    id : Text;
    propertyLabel : Text;
    type_ : PropertyType;
    default_value : Text;
    options : [Text];
  };

  type CustomToolDefinition = {
    id : Text;
    owner : Principal;
    name : Text;
    properties : [CustomProperty];
    created_at : Int;
    updated_at : Int;
  };

  // Original types
  type OldActor = {
    models : OrderedMap.Map<Text, {
      id : Text;
      owner : Principal;
      name : Text;
      description : Text;
      narrative : [{
        id : Text;
        type_ : Text;
        properties : Text;
        interactions : [Text];
        actions : [Text];
        zone : Text;
        position : Nat;
      }];
      framework : [{
        id : Text;
        type_ : Text;
        properties : Text;
        interactions : [Text];
        actions : [Text];
        zone : Text;
        position : Nat;
      }];
      execution : [{
        id : Text;
        type_ : Text;
        properties : Text;
        interactions : [Text];
        actions : [Text];
        zone : Text;
        position : Nat;
      }];
      created_at : Int;
    }>;
    trades : OrderedMap.Map<Text, {
      id : Text;
      owner : Principal;
      model_id : Text;
      asset : Text;
      direction : Text;
      bracket_order : {
        entry_price : Float;
        primary_stop_loss : Float;
        bracket_groups : [{
          bracket_id : Text;
          size : Float;
          take_profit_price : Float;
          stop_loss_price : Float;
          sl_modified_by_user : Bool;
        }];
        calculation_method : Text;
        value_per_unit : Float;
        position_size : Float;
        position_sizer : {
          risk_percentage : Float;
          account_capital : Float;
          entry_price : Float;
          primary_stop_loss : Float;
          asset_type : Text;
          contract_lot_unit : Text;
          value_per_point : Float;
          allow_fractional_size : Bool;
        };
      };
      bracket_order_outcome : {
        filled_bracket_groups : [{
          bracket_id : Text;
          closure_type : {
            #take_profit;
            #stop_loss;
            #break_even;
            #manual_close;
          };
          closure_price : Float;
          size : Float;
          break_even_applied : Bool;
          break_even_price : ?Float;
          manual_close_applied : Bool;
          manual_close_price : ?Float;
        }];
        final_pl_pct : Float;
        final_pl_usd : Float;
        rr : Float;
      };
      notes : Text;
      emotions : [Text];
      images : [Text];
      created_at : Int;
      calculation_method : {
        #tick;
        #point;
      };
      value_per_unit : Float;
      model_conditions : [{
        id : Text;
        description : Text;
        zone : Text;
        isChecked : Bool;
      }];
      adherence_score : Float;
      is_completed : Bool;
      position_sizer : {
        risk_percentage : Float;
        account_capital : Float;
        entry_price : Float;
        primary_stop_loss : Float;
        asset_type : Text;
        contract_lot_unit : Text;
        value_per_point : Float;
        allow_fractional_size : Bool;
      };
    }>;
    userProfiles : OrderedMap.Map<Principal, { name : Text }>;
  };

  // New type with custom tool support
  type NewActor = {
    models : OrderedMap.Map<Text, {
      id : Text;
      owner : Principal;
      name : Text;
      description : Text;
      narrative : [{
        id : Text;
        type_ : Text;
        properties : Text;
        interactions : [Text];
        actions : [Text];
        zone : Text;
        position : Nat;
      }];
      framework : [{
        id : Text;
        type_ : Text;
        properties : Text;
        interactions : [Text];
        actions : [Text];
        zone : Text;
        position : Nat;
      }];
      execution : [{
        id : Text;
        type_ : Text;
        properties : Text;
        interactions : [Text];
        actions : [Text];
        zone : Text;
        position : Nat;
      }];
      created_at : Int;
    }>;
    trades : OrderedMap.Map<Text, {
      id : Text;
      owner : Principal;
      model_id : Text;
      asset : Text;
      direction : Text;
      bracket_order : {
        entry_price : Float;
        primary_stop_loss : Float;
        bracket_groups : [{
          bracket_id : Text;
          size : Float;
          take_profit_price : Float;
          stop_loss_price : Float;
          sl_modified_by_user : Bool;
        }];
        calculation_method : Text;
        value_per_unit : Float;
        position_size : Float;
        position_sizer : {
          risk_percentage : Float;
          account_capital : Float;
          entry_price : Float;
          primary_stop_loss : Float;
          asset_type : Text;
          contract_lot_unit : Text;
          value_per_point : Float;
          allow_fractional_size : Bool;
        };
      };
      bracket_order_outcome : {
        filled_bracket_groups : [{
          bracket_id : Text;
          closure_type : {
            #take_profit;
            #stop_loss;
            #break_even;
            #manual_close;
          };
          closure_price : Float;
          size : Float;
          break_even_applied : Bool;
          break_even_price : ?Float;
          manual_close_applied : Bool;
          manual_close_price : ?Float;
        }];
        final_pl_pct : Float;
        final_pl_usd : Float;
        rr : Float;
      };
      notes : Text;
      emotions : [Text];
      images : [Text];
      created_at : Int;
      calculation_method : {
        #tick;
        #point;
      };
      value_per_unit : Float;
      model_conditions : [{
        id : Text;
        description : Text;
        zone : Text;
        isChecked : Bool;
      }];
      adherence_score : Float;
      is_completed : Bool;
      position_sizer : {
        risk_percentage : Float;
        account_capital : Float;
        entry_price : Float;
        primary_stop_loss : Float;
        asset_type : Text;
        contract_lot_unit : Text;
        value_per_point : Float;
        allow_fractional_size : Bool;
      };
    }>;
    customTools : OrderedMap.Map<Text, CustomToolDefinition>;
    userProfiles : OrderedMap.Map<Principal, { name : Text }>;
  };

  // Migration function adding customTools map
  public func run(old : OldActor) : NewActor {
    let textMap = OrderedMap.Make<Text>(Text.compare);
    {
      models = old.models;
      trades = old.trades;
      customTools = textMap.empty<CustomToolDefinition>(); // Initialize empty custom tool map
      userProfiles = old.userProfiles;
    };
  };
};

