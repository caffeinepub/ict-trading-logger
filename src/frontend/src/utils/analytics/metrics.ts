import type { Trade } from '../../backend';

export interface PerformanceMetrics {
  totalTrades: number;
  totalWins: number;
  totalLosses: number;
  winRate: number;
  totalPL: number;
  avgPL: number;
  avgR: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
}

export function computeMetrics(trades: Trade[]): PerformanceMetrics {
  const completedTrades = trades.filter(t => t.is_completed);
  const totalTrades = completedTrades.length;
  
  if (totalTrades === 0) {
    return {
      totalTrades: 0,
      totalWins: 0,
      totalLosses: 0,
      winRate: 0,
      totalPL: 0,
      avgPL: 0,
      avgR: 0,
      profitFactor: 0,
      avgWin: 0,
      avgLoss: 0,
    };
  }

  const wins = completedTrades.filter(t => t.bracket_order_outcome.final_pl_usd > 0);
  const losses = completedTrades.filter(t => t.bracket_order_outcome.final_pl_usd < 0);
  
  const totalWins = wins.length;
  const totalLosses = losses.length;
  const winRate = (totalWins / totalTrades) * 100;
  
  const totalPL = completedTrades.reduce((sum, t) => sum + t.bracket_order_outcome.final_pl_usd, 0);
  const avgPL = totalPL / totalTrades;
  
  const totalR = completedTrades.reduce((sum, t) => sum + t.bracket_order_outcome.rr, 0);
  const avgR = totalR / totalTrades;
  
  const grossProfit = wins.reduce((sum, t) => sum + t.bracket_order_outcome.final_pl_usd, 0);
  const grossLoss = Math.abs(losses.reduce((sum, t) => sum + t.bracket_order_outcome.final_pl_usd, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? Infinity : 0);
  
  const avgWin = totalWins > 0 ? grossProfit / totalWins : 0;
  const avgLoss = totalLosses > 0 ? grossLoss / totalLosses : 0;

  return {
    totalTrades,
    totalWins,
    totalLosses,
    winRate,
    totalPL,
    avgPL,
    avgR,
    profitFactor,
    avgWin,
    avgLoss,
  };
}
