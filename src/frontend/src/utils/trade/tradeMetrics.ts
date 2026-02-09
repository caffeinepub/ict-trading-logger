import type { Trade, BracketOrderOutcome } from '../../backend';

/**
 * Computes total P/L in USD from bracket outcomes
 */
export function computeTradePLFromOutcomes(trade: Trade): number {
  if (!trade.is_completed || trade.bracket_order_outcomes.length === 0) {
    return 0;
  }

  const entry = trade.bracket_order.entry_price;
  const valuePerUnit = trade.value_per_unit;
  const isLong = trade.direction === 'long';
  
  let totalPL = 0;

  trade.bracket_order_outcomes.forEach(outcome => {
    const size = outcome.size;
    const closurePrice = outcome.closure_price;
    
    // Calculate P/L for this bracket
    const priceDiff = isLong ? (closurePrice - entry) : (entry - closurePrice);
    const bracketPL = priceDiff * size * valuePerUnit;
    
    totalPL += bracketPL;
  });

  return totalPL;
}

/**
 * Computes R:R ratio from bracket outcomes
 */
export function computeTradeRRFromOutcomes(trade: Trade): number {
  if (!trade.is_completed || trade.bracket_order_outcomes.length === 0) {
    return 0;
  }

  const totalPL = computeTradePLFromOutcomes(trade);
  
  // Calculate max risk based on primary stop loss
  const entry = trade.bracket_order.entry_price;
  const primaryStopDistance = Math.abs(entry - trade.bracket_order.primary_stop_loss);
  const maxRisk = primaryStopDistance * trade.bracket_order.position_size * trade.value_per_unit;
  
  return maxRisk > 0 ? totalPL / maxRisk : 0;
}

/**
 * Checks if a trade is a winner
 */
export function isTradeWinner(trade: Trade): boolean {
  if (!trade.is_completed) return false;
  return computeTradePLFromOutcomes(trade) > 0;
}

/**
 * Checks if a trade is a loser
 */
export function isTradeLoser(trade: Trade): boolean {
  if (!trade.is_completed) return false;
  return computeTradePLFromOutcomes(trade) < 0;
}
