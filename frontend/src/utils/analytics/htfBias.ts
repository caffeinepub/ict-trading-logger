import type { Trade, Model, ToolConfig } from '../../backend';
import { computeTradePLFromOutcomes, computeTradeRRFromOutcomes, isTradeWinner } from '../trade/tradeMetrics';

export type HTFBias = 'Bullish' | 'Bearish' | 'Unknown';

export interface HTFBiasMetrics {
  bias: HTFBias;
  totalTrades: number;
  trades: number; // Alias for totalTrades
  winRate: number;
  totalPL: number;
  avgR: number;
  rDistribution: number[];
  rValues: number[]; // Alias for rDistribution
}

/**
 * Derives HTF bias from model tool configuration
 */
export function deriveHTFBias(model: Model): HTFBias {
  // Check narrative zone for HTF bias indicators
  const narrativeTools = model.narrative;
  
  for (const tool of narrativeTools) {
    try {
      const props = JSON.parse(tool.properties);
      
      // Look for direction property
      if (props.direction) {
        const dir = props.direction.toLowerCase();
        if (dir.includes('bull') || dir === 'long') return 'Bullish';
        if (dir.includes('bear') || dir === 'short') return 'Bearish';
      }
      
      // Look for bias in tool type
      const toolType = tool.type.toLowerCase();
      if (toolType.includes('bull')) return 'Bullish';
      if (toolType.includes('bear')) return 'Bearish';
      
    } catch {
      // Skip invalid JSON
    }
  }
  
  return 'Unknown';
}

/**
 * Groups trades by HTF bias and computes metrics
 */
export function computeBiasMetrics(
  trades: Trade[],
  models: Model[]
): HTFBiasMetrics[] {
  const completedTrades = trades.filter(t => t.is_completed);
  
  // Create model lookup
  const modelMap = new Map(models.map(m => [m.id, m]));
  
  // Group trades by bias
  const biasGroups = new Map<HTFBias, Trade[]>();
  
  completedTrades.forEach(trade => {
    const model = modelMap.get(trade.model_id);
    if (!model) return;
    
    const bias = deriveHTFBias(model);
    const group = biasGroups.get(bias) || [];
    group.push(trade);
    biasGroups.set(bias, group);
  });
  
  // Compute metrics for each bias
  const metrics: HTFBiasMetrics[] = [];
  
  biasGroups.forEach((biasTrades, bias) => {
    if (biasTrades.length === 0) return;
    
    const wins = biasTrades.filter(t => isTradeWinner(t)).length;
    const winRate = (wins / biasTrades.length) * 100;
    const totalPL = biasTrades.reduce((sum, t) => sum + computeTradePLFromOutcomes(t), 0);
    const avgR = biasTrades.reduce((sum, t) => sum + computeTradeRRFromOutcomes(t), 0) / biasTrades.length;
    const rValues = biasTrades.map(t => computeTradeRRFromOutcomes(t));
    
    metrics.push({
      bias,
      totalTrades: biasTrades.length,
      trades: biasTrades.length,
      winRate,
      totalPL,
      avgR,
      rDistribution: rValues,
      rValues,
    });
  });
  
  return metrics;
}

// Alias for backward compatibility
export const computeHTFBiasMetrics = computeBiasMetrics;
