import type { Trade } from '../../backend';

export type VolatilityBucket = 'Low' | 'Medium' | 'High';

export interface VolatilityMetrics {
  bucket: VolatilityBucket;
  trades: number;
  winRate: number;
  totalPL: number;
  avgR: number;
  rValues: number[];
}

/**
 * Volatility proxy: uses the ratio of stop-loss distance to entry price
 * as a proxy for volatility. Higher ratio = higher volatility.
 */
function computeVolatilityProxy(trade: Trade): number {
  const entryPrice = trade.bracket_order.entry_price;
  const stopLoss = trade.bracket_order.primary_stop_loss;
  const distance = Math.abs(entryPrice - stopLoss);
  return distance / entryPrice;
}

function assignVolatilityBucket(proxy: number, thresholds: { low: number; high: number }): VolatilityBucket {
  if (proxy < thresholds.low) return 'Low';
  if (proxy < thresholds.high) return 'Medium';
  return 'High';
}

export function computeVolatilityMetrics(trades: Trade[]): VolatilityMetrics[] {
  const completedTrades = trades.filter(t => t.is_completed);
  
  if (completedTrades.length === 0) {
    return [];
  }

  // Compute volatility proxies
  const proxies = completedTrades.map(t => computeVolatilityProxy(t));
  proxies.sort((a, b) => a - b);

  // Define thresholds at 33rd and 66th percentiles
  const lowThreshold = proxies[Math.floor(proxies.length * 0.33)];
  const highThreshold = proxies[Math.floor(proxies.length * 0.66)];

  const buckets: Record<VolatilityBucket, Trade[]> = {
    Low: [],
    Medium: [],
    High: [],
  };

  for (const trade of completedTrades) {
    const proxy = computeVolatilityProxy(trade);
    const bucket = assignVolatilityBucket(proxy, { low: lowThreshold, high: highThreshold });
    buckets[bucket].push(trade);
  }

  const bucketNames: VolatilityBucket[] = ['Low', 'Medium', 'High'];

  return bucketNames.map(bucket => {
    const bucketTrades = buckets[bucket];
    const totalTrades = bucketTrades.length;

    if (totalTrades === 0) {
      return {
        bucket,
        trades: 0,
        winRate: 0,
        totalPL: 0,
        avgR: 0,
        rValues: [],
      };
    }

    const wins = bucketTrades.filter(t => t.bracket_order_outcome.final_pl_usd > 0).length;
    const winRate = (wins / totalTrades) * 100;
    const totalPL = bucketTrades.reduce((sum, t) => sum + t.bracket_order_outcome.final_pl_usd, 0);
    const rValues = bucketTrades.map(t => t.bracket_order_outcome.rr);
    const avgR = rValues.reduce((sum, r) => sum + r, 0) / totalTrades;

    return {
      bucket,
      trades: totalTrades,
      winRate,
      totalPL,
      avgR,
      rValues,
    };
  });
}
