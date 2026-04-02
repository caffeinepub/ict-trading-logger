import type { Trade, BracketGroup, BracketOrderOutcome, ClosureType } from '../../backend';
import { ClosureType as ClosureTypeEnum } from '../../backend';

/**
 * Derives the closure price for a bracket based on the selected outcome type
 * Returns null if closureType is null (unselected state)
 */
export function deriveBracketClosurePrice(
  trade: Trade,
  bracketGroup: BracketGroup,
  closureType: ClosureType | null,
  manualClosePrice?: number
): number | null {
  if (closureType === null) {
    return null;
  }
  
  switch (closureType) {
    case ClosureTypeEnum.take_profit:
      return bracketGroup.take_profit_price;
    
    case ClosureTypeEnum.stop_loss:
      return bracketGroup.stop_loss_price;
    
    case ClosureTypeEnum.break_even:
      return trade.bracket_order.entry_price;
    
    case ClosureTypeEnum.manual_close:
      return manualClosePrice ?? 0;
    
    default:
      return 0;
  }
}

/**
 * Computes total P/L, percentage of risk, and R:R ratio for a trade
 */
export function computeTradePL(
  trade: Trade,
  outcomes: BracketOrderOutcome[]
): {
  totalPL: number;
  finalPLPct: number;
  rr: number;
} {
  const entry = trade.bracket_order.entry_price;
  const valuePerUnit = trade.value_per_unit;
  const isLong = trade.direction === 'long';
  
  let totalPL = 0;

  outcomes.forEach(outcome => {
    const size = outcome.size;
    const closurePrice = outcome.closure_price;
    
    // Calculate P/L for this bracket
    const priceDiff = isLong ? (closurePrice - entry) : (entry - closurePrice);
    const bracketPL = priceDiff * size * valuePerUnit;
    
    totalPL += bracketPL;
  });

  // Calculate max risk based on primary stop loss
  const primaryStopDistance = Math.abs(entry - trade.bracket_order.primary_stop_loss);
  const maxRisk = primaryStopDistance * trade.bracket_order.position_size * valuePerUnit;
  
  // Calculate R:R ratio (P/L divided by max risk)
  const rr = maxRisk > 0 ? totalPL / maxRisk : 0;
  
  // Calculate percentage P/L (as percentage of risk)
  const finalPLPct = maxRisk > 0 ? (totalPL / maxRisk) * 100 : 0;

  return {
    totalPL,
    finalPLPct,
    rr,
  };
}
