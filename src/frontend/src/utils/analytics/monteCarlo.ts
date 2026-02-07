import type { Trade } from '../../backend';

export interface MonteCarloResult {
  paths: number[][];
  minEquity: number;
  avgEquity: number;
  maxEquity: number;
  minPath: number[];
  avgPath: number[];
  maxPath: number[];
}

const DEFAULT_RUNS = 100;
const DEFAULT_TRADES_PER_RUN = 200;

export function runMonteCarloSimulation(
  trades: Trade[],
  runs: number = DEFAULT_RUNS,
  tradesPerRun: number = DEFAULT_TRADES_PER_RUN
): MonteCarloResult | null {
  const completedTrades = trades.filter(t => t.is_completed);
  
  if (completedTrades.length < 5) {
    return null; // Insufficient data
  }

  const rValues = completedTrades.map(t => t.bracket_order_outcome.rr);
  
  const paths: number[][] = [];

  for (let run = 0; run < runs; run++) {
    const path: number[] = [0];
    let equity = 0;

    for (let i = 0; i < tradesPerRun; i++) {
      const randomR = rValues[Math.floor(Math.random() * rValues.length)];
      equity += randomR;
      path.push(equity);
    }

    paths.push(path);
  }

  const finalEquities = paths.map(p => p[p.length - 1]);
  const minEquity = Math.min(...finalEquities);
  const avgEquity = finalEquities.reduce((sum, e) => sum + e, 0) / runs;
  const maxEquity = Math.max(...finalEquities);

  const minPath = paths.find(p => p[p.length - 1] === minEquity) || [];
  const maxPath = paths.find(p => p[p.length - 1] === maxEquity) || [];

  // Compute average path
  const avgPath: number[] = [];
  for (let i = 0; i <= tradesPerRun; i++) {
    const sum = paths.reduce((s, p) => s + p[i], 0);
    avgPath.push(sum / runs);
  }

  return {
    paths,
    minEquity,
    avgEquity,
    maxEquity,
    minPath,
    avgPath,
    maxPath,
  };
}
