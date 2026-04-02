import type { Trade } from '../../backend';
import { computeTradePLFromOutcomes, computeTradeRRFromOutcomes, isTradeWinner } from '../trade/tradeMetrics';

export type VolatilityBucket = 'Low' | 'Medium' | 'High';

export interface VolatilityMetrics {
  bucket: VolatilityBucket;
  totalTrades: number;
  trades: number; // Alias for totalTrades
  winRate: number;
  totalPL: number;
  avgR: number;
  rDistribution: number[];
}

/**
 * Computes a volatility proxy from stop-loss distance
 */
export function computeVolatilityProxy(trade: Trade): number {
  const entry = trade.bracket_order.entry_price;
  const primarySL = trade.bracket_order.primary_stop_loss;
  const stopDistance = Math.abs(entry - primarySL);
  
  // Normalize by entry price to get percentage distance
  return (stopDistance / entry) * 100;
}

/**
 * Buckets trade into volatility category
 */
export function getVolatilityBucket(trade: Trade): VolatilityBucket {
  const volProxy = computeVolatilityProxy(trade);
  
  // Thresholds (can be adjusted)
  if (volProxy < 1.0) return 'Low';
  if (volProxy < 2.0) return 'Medium';
  return 'High';
}

/**
 * Computes metrics per volatility bucket
 */
export function computeVolatilityMetrics(trades: Trade[]): VolatilityMetrics[] {
  const completedTrades = trades.filter(t => t.is_completed);
  
  const buckets: VolatilityBucket[] = ['Low', 'Medium', 'High'];
  const metrics: VolatilityMetrics[] = [];
  
  buckets.forEach(bucket => {
    const bucketTrades = completedTrades.filter(t => getVolatilityBucket(t) === bucket);
    
    if (bucketTrades.length === 0) {
      metrics.push({
        bucket,
        totalTrades: 0,
        trades: 0,
        winRate: 0,
        totalPL: 0,
        avgR: 0,
        rDistribution: [],
      });
      return;
    }
    
    const wins = bucketTrades.filter(t => isTradeWinner(t)).length;
    const winRate = (wins / bucketTrades.length) * 100;
    const totalPL = bucketTrades.reduce((sum, t) => sum + computeTradePLFromOutcomes(t), 0);
    const avgR = bucketTrades.reduce((sum, t) => sum + computeTradeRRFromOutcomes(t), 0) / bucketTrades.length;
    const rValues = bucketTrades.map(t => computeTradeRRFromOutcomes(t));
    
    metrics.push({
      bucket,
      totalTrades: bucketTrades.length,
      trades: bucketTrades.length,
      winRate,
      totalPL,
      avgR,
      rDistribution: rValues,
    });
  });
  
  return metrics;
}
