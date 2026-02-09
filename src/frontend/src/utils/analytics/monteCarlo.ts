import type { Trade } from '../../backend';
import { computeTradeRRFromOutcomes } from '../trade/tradeMetrics';

export interface MonteCarloResult {
  paths: number[][];
  minEquity: number;
  avgEquity: number;
  maxEquity: number;
  minPath: number[];
  avgPath: number[];
  maxPath: number[];
}

/**
 * Runs Monte Carlo simulation sampling from empirical R distribution
 */
export function runMonteCarloSimulation(
  trades: Trade[],
  numSimulations: number = 1000,
  numTrades: number = 100,
  startingCapital: number = 10000
): MonteCarloResult {
  const completedTrades = trades.filter(t => t.is_completed);
  
  if (completedTrades.length === 0) {
    const emptyPath = Array(numTrades + 1).fill(startingCapital);
    return { 
      paths: [], 
      minEquity: startingCapital, 
      avgEquity: startingCapital, 
      maxEquity: startingCapital,
      minPath: emptyPath,
      avgPath: emptyPath,
      maxPath: emptyPath,
    };
  }

  const rValues = completedTrades.map(t => computeTradeRRFromOutcomes(t));
  
  const paths: number[][] = [];
  
  for (let sim = 0; sim < numSimulations; sim++) {
    const path: number[] = [startingCapital];
    let equity = startingCapital;
    
    for (let i = 0; i < numTrades; i++) {
      // Sample random R from empirical distribution
      const randomR = rValues[Math.floor(Math.random() * rValues.length)];
      
      // Assume 1% risk per trade
      const riskAmount = equity * 0.01;
      const plAmount = randomR * riskAmount;
      
      equity += plAmount;
      path.push(equity);
    }
    
    paths.push(path);
  }
  
  // Compute statistics
  const finalEquities = paths.map(p => p[p.length - 1]);
  const minEquity = Math.min(...finalEquities);
  const maxEquity = Math.max(...finalEquities);
  const avgEquity = finalEquities.reduce((sum, e) => sum + e, 0) / finalEquities.length;
  
  // Find representative paths
  const minPathIndex = finalEquities.indexOf(minEquity);
  const maxPathIndex = finalEquities.indexOf(maxEquity);
  
  // Compute average path
  const avgPath: number[] = [];
  for (let i = 0; i <= numTrades; i++) {
    const sum = paths.reduce((s, p) => s + p[i], 0);
    avgPath.push(sum / paths.length);
  }
  
  return { 
    paths, 
    minEquity, 
    avgEquity, 
    maxEquity,
    minPath: paths[minPathIndex],
    avgPath,
    maxPath: paths[maxPathIndex],
  };
}

// Alias for backward compatibility
export const runMonteCarlo = runMonteCarloSimulation;
