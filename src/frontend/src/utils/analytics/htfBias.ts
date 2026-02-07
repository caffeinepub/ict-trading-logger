import type { Trade, Model, ToolConfig } from '../../backend';

export type BiasType = 'Bullish' | 'Bearish' | 'Unknown';

export interface BiasMetrics {
  bias: BiasType;
  trades: number;
  winRate: number;
  totalPL: number;
  avgR: number;
  rValues: number[];
}

function extractBiasFromTool(tool: ToolConfig): BiasType {
  try {
    const props = JSON.parse(tool.properties);
    
    // Check for direction/bias fields
    if (props.direction) {
      const dir = props.direction.toLowerCase();
      if (dir.includes('bull') || dir === 'long') return 'Bullish';
      if (dir.includes('bear') || dir === 'short') return 'Bearish';
    }
    
    if (props.bias) {
      const bias = props.bias.toLowerCase();
      if (bias.includes('bull')) return 'Bullish';
      if (bias.includes('bear')) return 'Bearish';
    }

    if (props.htf_bias) {
      const htf = props.htf_bias.toLowerCase();
      if (htf.includes('bull')) return 'Bullish';
      if (htf.includes('bear')) return 'Bearish';
    }
  } catch {
    // Invalid JSON, return Unknown
  }
  
  return 'Unknown';
}

export function deriveBiasFromModel(model: Model): BiasType {
  // Check narrative tools first
  for (const tool of model.narrative) {
    const bias = extractBiasFromTool(tool);
    if (bias !== 'Unknown') return bias;
  }
  
  // Check framework tools
  for (const tool of model.framework) {
    const bias = extractBiasFromTool(tool);
    if (bias !== 'Unknown') return bias;
  }
  
  return 'Unknown';
}

export function computeBiasMetrics(
  trades: Trade[],
  models: Model[]
): BiasMetrics[] {
  const completedTrades = trades.filter(t => t.is_completed);
  
  const biasGroups: Record<BiasType, Trade[]> = {
    Bullish: [],
    Bearish: [],
    Unknown: [],
  };

  for (const trade of completedTrades) {
    const model = models.find(m => m.id === trade.model_id);
    const bias = model ? deriveBiasFromModel(model) : 'Unknown';
    biasGroups[bias].push(trade);
  }

  const biases: BiasType[] = ['Bullish', 'Bearish', 'Unknown'];
  
  return biases.map(bias => {
    const biasTrades = biasGroups[bias];
    const totalTrades = biasTrades.length;

    if (totalTrades === 0) {
      return {
        bias,
        trades: 0,
        winRate: 0,
        totalPL: 0,
        avgR: 0,
        rValues: [],
      };
    }

    const wins = biasTrades.filter(t => t.bracket_order_outcome.final_pl_usd > 0).length;
    const winRate = (wins / totalTrades) * 100;
    const totalPL = biasTrades.reduce((sum, t) => sum + t.bracket_order_outcome.final_pl_usd, 0);
    const rValues = biasTrades.map(t => t.bracket_order_outcome.rr);
    const avgR = rValues.reduce((sum, r) => sum + r, 0) / totalTrades;

    return {
      bias,
      trades: totalTrades,
      winRate,
      totalPL,
      avgR,
      rValues,
    };
  });
}
