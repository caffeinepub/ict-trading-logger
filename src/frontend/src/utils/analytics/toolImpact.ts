import type { Trade, Model, ToolConfig } from '../../backend';
import { computeTradePLFromOutcomes, isTradeWinner } from '../trade/tradeMetrics';

export interface ToolImpactMetrics {
  toolType: string;
  toolId: string; // Same as toolType for compatibility
  toolName: string; // Same as toolType for compatibility
  zone: string;
  totalTrades: number;
  sampleSize: number; // Alias for totalTrades
  winRate: number;
  avgPL: number;
  impactScore: number;
}

/**
 * Computes impact score for each tool type
 */
export function computeToolImpact(
  trades: Trade[],
  models: Model[],
  minSampleSize: number = 5
): ToolImpactMetrics[] {
  const completedTrades = trades.filter(t => t.is_completed);
  
  if (completedTrades.length === 0) return [];
  
  // Create model lookup
  const modelMap = new Map(models.map(m => [m.id, m]));
  
  // Collect all unique tool types with their zones
  const toolTypesMap = new Map<string, Set<string>>();
  models.forEach(model => {
    [...model.narrative, ...model.framework, ...model.execution].forEach(tool => {
      if (!toolTypesMap.has(tool.type)) {
        toolTypesMap.set(tool.type, new Set());
      }
      toolTypesMap.get(tool.type)!.add(tool.zone);
    });
  });
  
  const metrics: ToolImpactMetrics[] = [];
  
  toolTypesMap.forEach((zones, toolType) => {
    // Find trades using models with this tool
    const tradesWithTool = completedTrades.filter(trade => {
      const model = modelMap.get(trade.model_id);
      if (!model) return false;
      
      const allTools = [...model.narrative, ...model.framework, ...model.execution];
      return allTools.some(t => t.type === toolType);
    });
    
    if (tradesWithTool.length < minSampleSize) return;
    
    // Compute metrics for trades with this tool
    const tradeList = tradesWithTool;
    const wins = tradeList.filter(t => isTradeWinner(t)).length;
    const winRate = (wins / tradeList.length) * 100;
    const avgPL = tradeList.reduce((sum, t) => sum + computeTradePLFromOutcomes(t), 0) / tradeList.length;
    
    // Compute baseline (all trades)
    const baselineWinRate = (completedTrades.filter(t => isTradeWinner(t)).length / completedTrades.length) * 100;
    const baselineAvgPL = completedTrades.reduce((sum, t) => sum + computeTradePLFromOutcomes(t), 0) / completedTrades.length;
    
    // Impact score: weighted combination of win rate delta and avg PL delta
    const winRateDelta = winRate - baselineWinRate;
    const avgPLDelta = avgPL - baselineAvgPL;
    const impactScore = (winRateDelta * 0.5) + (avgPLDelta * 0.5);
    
    // Get primary zone (most common)
    const zoneArray = Array.from(zones);
    const primaryZone = zoneArray[0] || 'unknown';
    
    metrics.push({
      toolType,
      toolId: toolType,
      toolName: toolType,
      zone: primaryZone,
      totalTrades: tradeList.length,
      sampleSize: tradeList.length,
      winRate,
      avgPL,
      impactScore,
    });
  });
  
  // Sort by impact score descending
  return metrics.sort((a, b) => b.impactScore - a.impactScore);
}
