import type { Trade } from '../../backend';
import { computeTradePLFromOutcomes, computeTradeRRFromOutcomes, isTradeWinner } from '../trade/tradeMetrics';

export type TradingSession = 'Asia' | 'London' | 'NY';

export interface SessionMetrics {
  session: TradingSession;
  totalTrades: number;
  trades: number; // Alias for totalTrades
  winRate: number;
  totalPL: number;
  avgR: number;
}

export function getTradeSession(trade: Trade): TradingSession {
  const date = new Date(Number(trade.created_at) / 1000000);
  const hour = date.getUTCHours();
  
  // Asia: 00:00-08:00 UTC
  if (hour >= 0 && hour < 8) return 'Asia';
  // London: 08:00-16:00 UTC
  if (hour >= 8 && hour < 16) return 'London';
  // NY: 16:00-24:00 UTC
  return 'NY';
}

export function computeSessionMetrics(trades: Trade[]): SessionMetrics[] {
  const completedTrades = trades.filter(t => t.is_completed);
  
  const sessions: TradingSession[] = ['Asia', 'London', 'NY'];
  const metrics: SessionMetrics[] = [];
  
  sessions.forEach(session => {
    const sessionTrades = completedTrades.filter(t => getTradeSession(t) === session);
    
    if (sessionTrades.length === 0) {
      metrics.push({ 
        session, 
        totalTrades: 0, 
        trades: 0,
        winRate: 0, 
        totalPL: 0, 
        avgR: 0 
      });
      return;
    }
    
    const wins = sessionTrades.filter(t => isTradeWinner(t)).length;
    const winRate = (wins / sessionTrades.length) * 100;
    const totalPL = sessionTrades.reduce((sum, t) => sum + computeTradePLFromOutcomes(t), 0);
    const avgR = sessionTrades.length > 0 
      ? sessionTrades.reduce((sum, t) => sum + computeTradeRRFromOutcomes(t), 0) / sessionTrades.length 
      : 0;
    
    metrics.push({
      session,
      totalTrades: sessionTrades.length,
      trades: sessionTrades.length,
      winRate,
      totalPL,
      avgR,
    });
  });
  
  return metrics;
}
