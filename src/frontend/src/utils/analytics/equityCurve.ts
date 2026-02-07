import type { Trade } from '../../backend';

export interface EquityPoint {
  index: number;
  equity: number;
  date: string;
}

export function computeEquityCurve(trades: Trade[]): EquityPoint[] {
  const completedTrades = trades
    .filter(t => t.is_completed)
    .sort((a, b) => Number(a.created_at - b.created_at));

  let runningEquity = 0;
  return completedTrades.map((trade, index) => {
    runningEquity += trade.bracket_order_outcome.final_pl_usd;
    const date = new Date(Number(trade.created_at) / 1000000);
    return {
      index: index + 1,
      equity: runningEquity,
      date: date.toLocaleDateString(),
    };
  });
}

export function computeMaxDrawdown(equityCurve: EquityPoint[]): number {
  if (equityCurve.length === 0) return 0;

  let maxDrawdown = 0;
  let peak = equityCurve[0].equity;

  for (const point of equityCurve) {
    if (point.equity > peak) {
      peak = point.equity;
    }
    const drawdown = peak - point.equity;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  return maxDrawdown;
}
