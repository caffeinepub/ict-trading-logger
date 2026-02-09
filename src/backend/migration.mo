import OrderedMap "mo:base/OrderedMap";
import Text "mo:base/Text";
import Nat "mo:base/Nat";
import Principal "mo:base/Principal";
import Storage "blob-storage/Storage";

module {
  // Old Trade type.
  type OldTrade = {
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
    bracket_order_outcomes : [{
      bracket_id : Text;
      closure_type : {
        #take_profit;
        #stop_loss;
        #break_even;
        #manual_close;
      };
      closure_price : Float;
      execution_price : Float;
      size : Float;
      outcome_time : Int;
      bracket_group : {
        bracket_id : Text;
        size : Float;
        take_profit_price : Float;
        stop_loss_price : Float;
        sl_modified_by_user : Bool;
      };
    }];
    notes : Text;
    mood : Text;
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
    would_take_again : Bool;
  };

  // New Trade type with expanded fields.
  type NewTrade = {
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
    bracket_order_outcomes : [{
      bracket_id : Text;
      closure_type : {
        #take_profit;
        #stop_loss;
        #break_even;
        #manual_close;
      };
      closure_price : Float;
      execution_price : Float;
      size : Float;
      outcome_time : Int;
      bracket_group : {
        bracket_id : Text;
        size : Float;
        take_profit_price : Float;
        stop_loss_price : Float;
        sl_modified_by_user : Bool;
      };
    }];
    notes : Text;
    mood : Text;
    images : [Storage.ExternalBlob];
    quickTags : [Text];
    mistakeTags : [Text];
    strengthTags : [Text];
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
    would_take_again : Bool;
  };

  // Old and new actor types holding shared state.
  type OldActor = { trades : OrderedMap.Map<Text, OldTrade> };
  type NewActor = { trades : OrderedMap.Map<Text, NewTrade> };

  // Migration function for upgrading trade state.
  public func run(old : OldActor) : NewActor {
    let textMap = OrderedMap.Make<Text>(Text.compare);
    let trades = textMap.map<OldTrade, NewTrade>(
      old.trades,
      func(_id, oldTrade) {
        {
          oldTrade with
          images = [];
          quickTags = [];
          mistakeTags = [];
          strengthTags = [];
        };
      },
    );
    { trades };
  };
};
