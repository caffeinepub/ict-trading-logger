import type { Trade } from '../../backend';

export interface BracketMetrics {
  bracketIndex: number;
  tpHitRate: number;
  slHitRate: number;
  avgRealizedR: number;
  totalHits: number;
}

export function computeBracketMetrics(trades: Trade[]): BracketMetrics[] {
  const completedTrades = trades.filter(t => t.is_completed);
  
  // Find max bracket count
  let maxBrackets = 0;
  for (const trade of completedTrades) {
    const count = trade.bracket_order.bracket_groups.length;
    if (count > maxBrackets) maxBrackets = count;
  }

  const metrics: BracketMetrics[] = [];

  for (let i = 0; i < maxBrackets; i++) {
    let tpCount = 0;
    let slCount = 0;
    let totalR = 0;
    let totalHits = 0;

    for (const trade of completedTrades) {
      const bracketGroup = trade.bracket_order.bracket_groups[i];
      if (!bracketGroup) continue;

      const filled = trade.bracket_order_outcome.filled_bracket_groups.find(
        f => f.bracket_id === bracketGroup.bracket_id
      );

      if (filled) {
        totalHits++;
        
        if (filled.closure_type === 'take_profit') {
          tpCount++;
        } else if (filled.closure_type === 'stop_loss') {
          slCount++;
        }

        // Compute realized R for this bracket
        const entryPrice = trade.bracket_order.entry_price;
        const stopLoss = trade.bracket_order.primary_stop_loss;
        const risk = Math.abs(entryPrice - stopLoss);
        
        if (risk > 0) {
          const pnl = (filled.closure_price - entryPrice) * (trade.direction === 'long' ? 1 : -1);
          const r = pnl / risk;
          totalR += r;
        }
      }
    }

    const tpHitRate = totalHits > 0 ? (tpCount / totalHits) * 100 : 0;
    const slHitRate = totalHits > 0 ? (slCount / totalHits) * 100 : 0;
    const avgRealizedR = totalHits > 0 ? totalR / totalHits : 0;

    metrics.push({
      bracketIndex: i + 1,
      tpHitRate,
      slHitRate,
      avgRealizedR,
      totalHits,
    });
  }

  return metrics.filter(m => m.totalHits > 0);
}
