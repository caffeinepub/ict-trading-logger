import type { Trade } from '../../backend';
import { inferSession, type Session } from './tradeScope';

export interface SessionMetrics {
  session: Session;
  trades: number;
  winRate: number;
  totalPL: number;
  avgPL: number;
  avgR: number;
}

export function computeSessionMetrics(trades: Trade[]): SessionMetrics[] {
  const sessions: Session[] = ['Asia', 'London', 'NY'];
  const completedTrades = trades.filter(t => t.is_completed);

  return sessions.map(session => {
    const sessionTrades = completedTrades.filter(t => inferSession(t.created_at) === session);
    const totalTrades = sessionTrades.length;

    if (totalTrades === 0) {
      return {
        session,
        trades: 0,
        winRate: 0,
        totalPL: 0,
        avgPL: 0,
        avgR: 0,
      };
    }

    const wins = sessionTrades.filter(t => t.bracket_order_outcome.final_pl_usd > 0).length;
    const winRate = (wins / totalTrades) * 100;
    const totalPL = sessionTrades.reduce((sum, t) => sum + t.bracket_order_outcome.final_pl_usd, 0);
    const avgPL = totalPL / totalTrades;
    const totalR = sessionTrades.reduce((sum, t) => sum + t.bracket_order_outcome.rr, 0);
    const avgR = totalR / totalTrades;

    return {
      session,
      trades: totalTrades,
      winRate,
      totalPL,
      avgPL,
      avgR,
    };
  });
}
