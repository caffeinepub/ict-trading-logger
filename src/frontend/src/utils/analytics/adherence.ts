import type { Trade } from '../../backend';

export interface AdherenceComparison {
  filteredWinRate: number;
  filteredPL: number;
  filteredTrades: number;
  allWinRate: number;
  allPL: number;
  allTrades: number;
  winRateDelta: number;
  plDelta: number;
}

export function computeAdherenceComparison(
  allTrades: Trade[],
  threshold: number
): AdherenceComparison {
  const completed = allTrades.filter(t => t.is_completed);
  const filtered = completed.filter(t => t.adherence_score >= threshold);

  const computeStats = (trades: Trade[]) => {
    if (trades.length === 0) return { winRate: 0, pl: 0, trades: 0 };
    const wins = trades.filter(t => t.bracket_order_outcome.final_pl_usd > 0).length;
    const winRate = (wins / trades.length) * 100;
    const pl = trades.reduce((sum, t) => sum + t.bracket_order_outcome.final_pl_usd, 0);
    return { winRate, pl, trades: trades.length };
  };

  const filteredStats = computeStats(filtered);
  const allStats = computeStats(completed);

  return {
    filteredWinRate: filteredStats.winRate,
    filteredPL: filteredStats.pl,
    filteredTrades: filteredStats.trades,
    allWinRate: allStats.winRate,
    allPL: allStats.pl,
    allTrades: allStats.trades,
    winRateDelta: filteredStats.winRate - allStats.winRate,
    plDelta: filteredStats.pl - allStats.pl,
  };
}
