import type { ClosureType } from '../../backend';

/**
 * Frontend editing model for bracket outcomes, supporting unselected state (null) for new trades
 */
export interface BracketOutcomeState {
  selectedOutcome: ClosureType | null;
  manualClosePrice?: number;
}

/**
 * Maps bracket outcome state to a format suitable for persistence
 */
export function mapBracketStateToOutcome(
  bracketId: string,
  state: BracketOutcomeState
): {
  bracket_id: string;
  closure_type: ClosureType;
  manual_close_price?: number;
} | null {
  if (state.selectedOutcome === null) {
    return null;
  }
  
  return {
    bracket_id: bracketId,
    closure_type: state.selectedOutcome,
    manual_close_price: state.manualClosePrice,
  };
}

/**
 * Maps persisted outcome to bracket state for editing
 */
export function mapOutcomeToBracketState(
  closureType: ClosureType,
  closurePrice: number
): BracketOutcomeState {
  return {
    selectedOutcome: closureType,
    manualClosePrice: closureType === 'manual_close' ? closurePrice : undefined,
  };
}
