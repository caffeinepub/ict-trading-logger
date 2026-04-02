import type { Trade } from '../../backend';
import { computeTradePLFromOutcomes, isTradeWinner } from '../trade/tradeMetrics';

export interface AdherenceMetrics {
  winRate: number;
  totalPL: number;
}

export interface AdherenceComparisonResult {
  highAdherence: AdherenceMetrics;
  lowAdherence: AdherenceMetrics;
  delta: { winRate: number; totalPL: number };
  filteredTrades: number;
  filteredWinRate: number;
  filteredPL: number;
  allTrades: number;
  allWinRate: number;
  allPL: number;
  winRateDelta: number;
  plDelta: number;
}

export function filterByAdherence(trades: Trade[], minAdherence: number): Trade[] {
  return trades.filter(t => t.is_completed && t.adherence_score >= minAdherence);
}

export function computeAdherenceMetrics(trades: Trade[]): AdherenceMetrics {
  const completedTrades = trades.filter(t => t.is_completed);
  
  if (completedTrades.length === 0) {
    return { winRate: 0, totalPL: 0 };
  }

  const wins = completedTrades.filter(t => isTradeWinner(t)).length;
  const winRate = (wins / completedTrades.length) * 100;
  const pl = completedTrades.reduce((sum, t) => sum + computeTradePLFromOutcomes(t), 0);

  return { winRate, totalPL: pl };
}

export function computeAdherenceComparison(
  trades: Trade[],
  threshold: number
): AdherenceComparisonResult {
  const completedTrades = trades.filter(t => t.is_completed);
  const high = filterByAdherence(trades, threshold);
  const low = completedTrades.filter(t => t.adherence_score < threshold);

  const highMetrics = computeAdherenceMetrics(high);
  const lowMetrics = computeAdherenceMetrics(completedTrades);

  return {
    highAdherence: highMetrics,
    lowAdherence: lowMetrics,
    delta: {
      winRate: highMetrics.winRate - lowMetrics.winRate,
      totalPL: highMetrics.totalPL - lowMetrics.totalPL,
    },
    filteredTrades: high.length,
    filteredWinRate: highMetrics.winRate,
    filteredPL: highMetrics.totalPL,
    allTrades: completedTrades.length,
    allWinRate: lowMetrics.winRate,
    allPL: lowMetrics.totalPL,
    winRateDelta: highMetrics.winRate - lowMetrics.winRate,
    plDelta: highMetrics.totalPL - lowMetrics.totalPL,
  };
}
