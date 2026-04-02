import type { Trade } from '../../backend';
import { ClosureType } from '../../backend';

export interface BracketMetrics {
  bracketIndex: number;
  tpHitRate: number;
  slHitRate: number;
  avgR: number;
  avgRealizedR: number; // Alias for avgR
  totalTrades: number;
  totalHits: number; // Alias for totalTrades
}

export function computeBracketMetrics(trades: Trade[]): BracketMetrics[] {
  const completedTrades = trades.filter(t => t.is_completed && t.bracket_order_outcomes.length > 0);
  
  if (completedTrades.length === 0) return [];

  // Determine max bracket count
  const maxBrackets = Math.max(...completedTrades.map(t => t.bracket_order.bracket_groups.length));
  
  const metrics: BracketMetrics[] = [];

  for (let i = 0; i < maxBrackets; i++) {
    let tpCount = 0;
    let slCount = 0;
    let totalR = 0;
    let count = 0;

    completedTrades.forEach(trade => {
      if (i >= trade.bracket_order.bracket_groups.length) return;
      
      const bracketGroup = trade.bracket_order.bracket_groups[i];
      const filled = trade.bracket_order_outcomes.find(
        outcome => outcome.bracket_id === bracketGroup.bracket_id
      );

      if (filled) {
        count++;
        
        if (filled.closure_type === ClosureType.take_profit) {
          tpCount++;
        } else if (filled.closure_type === ClosureType.stop_loss) {
          slCount++;
        }

        // Calculate R for this bracket
        const entry = trade.bracket_order.entry_price;
        const primarySL = trade.bracket_order.primary_stop_loss;
        const isLong = trade.direction === 'long';
        
        const priceDiff = isLong 
          ? (filled.closure_price - entry) 
          : (entry - filled.closure_price);
        const stopDistance = Math.abs(entry - primarySL);
        const r = stopDistance > 0 ? priceDiff / stopDistance : 0;
        
        totalR += r;
      }
    });

    if (count > 0) {
      const avgR = totalR / count;
      metrics.push({
        bracketIndex: i,
        tpHitRate: (tpCount / count) * 100,
        slHitRate: (slCount / count) * 100,
        avgR,
        avgRealizedR: avgR,
        totalTrades: count,
        totalHits: count,
      });
    }
  }

  return metrics;
}
