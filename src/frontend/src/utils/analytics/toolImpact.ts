import type { Trade, Model, ToolConfig } from '../../backend';

export interface ToolImpact {
  toolId: string;
  toolName: string;
  toolType: string;
  zone: string;
  impactScore: number;
  sampleSize: number;
  avgPLWithTool: number;
  avgPLWithoutTool: number;
  winRateWithTool: number;
  winRateWithoutTool: number;
}

const MIN_SAMPLE_SIZE = 3;

function getToolIdentifier(tool: ToolConfig): string {
  return `${tool.zone}-${tool.type}-${tool.id}`;
}

function getToolName(tool: ToolConfig): string {
  try {
    const props = JSON.parse(tool.properties);
    return props.name || tool.type || 'Unknown Tool';
  } catch {
    return tool.type || 'Unknown Tool';
  }
}

export function computeToolImpact(
  trades: Trade[],
  models: Model[]
): ToolImpact[] {
  const completedTrades = trades.filter(t => t.is_completed);
  
  if (completedTrades.length < MIN_SAMPLE_SIZE) {
    return [];
  }

  // Collect all unique tools
  const toolMap = new Map<string, { tool: ToolConfig; trades: Trade[] }>();

  for (const trade of completedTrades) {
    const model = models.find(m => m.id === trade.model_id);
    if (!model) continue;

    const allTools = [...model.narrative, ...model.framework, ...model.execution];
    
    for (const tool of allTools) {
      const id = getToolIdentifier(tool);
      if (!toolMap.has(id)) {
        toolMap.set(id, { tool, trades: [] });
      }
      toolMap.get(id)!.trades.push(trade);
    }
  }

  const impacts: ToolImpact[] = [];

  for (const [toolId, { tool, trades: tradesWithTool }] of toolMap.entries()) {
    if (tradesWithTool.length < MIN_SAMPLE_SIZE) continue;

    const tradesWithoutTool = completedTrades.filter(t => !tradesWithTool.includes(t));
    if (tradesWithoutTool.length < MIN_SAMPLE_SIZE) continue;

    const computeStats = (tradeList: Trade[]) => {
      const wins = tradeList.filter(t => t.bracket_order_outcome.final_pl_usd > 0).length;
      const winRate = (wins / tradeList.length) * 100;
      const avgPL = tradeList.reduce((sum, t) => sum + t.bracket_order_outcome.final_pl_usd, 0) / tradeList.length;
      return { winRate, avgPL };
    };

    const withStats = computeStats(tradesWithTool);
    const withoutStats = computeStats(tradesWithoutTool);

    // Impact score: weighted combination of win rate delta and avg PL delta
    const winRateDelta = withStats.winRate - withoutStats.winRate;
    const plDelta = withStats.avgPL - withoutStats.avgPL;
    const impactScore = winRateDelta * 0.5 + plDelta * 0.5;

    impacts.push({
      toolId,
      toolName: getToolName(tool),
      toolType: tool.type,
      zone: tool.zone,
      impactScore,
      sampleSize: tradesWithTool.length,
      avgPLWithTool: withStats.avgPL,
      avgPLWithoutTool: withoutStats.avgPL,
      winRateWithTool: withStats.winRate,
      winRateWithoutTool: withoutStats.winRate,
    });
  }

  return impacts.sort((a, b) => Math.abs(b.impactScore) - Math.abs(a.impactScore));
}
