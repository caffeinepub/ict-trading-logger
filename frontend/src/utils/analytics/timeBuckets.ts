import type { Trade } from '../../backend';
import { computeTradePLFromOutcomes, isTradeWinner } from '../trade/tradeMetrics';

export interface HourMetrics {
  hour: number;
  totalTrades: number;
  winRate: number;
  totalPL: number;
}

export interface DayMetrics {
  day: string;
  totalTrades: number;
  winRate: number;
  totalPL: number;
}

export function computeHourBuckets(trades: Trade[]): HourMetrics[] {
  const completedTrades = trades.filter(t => t.is_completed);
  const metrics: HourMetrics[] = [];
  
  for (let hour = 0; hour < 24; hour++) {
    const hourTrades = completedTrades.filter(t => {
      const date = new Date(Number(t.created_at) / 1000000);
      return date.getUTCHours() === hour;
    });
    
    if (hourTrades.length === 0) {
      metrics.push({ hour, totalTrades: 0, winRate: 0, totalPL: 0 });
      continue;
    }
    
    const wins = hourTrades.filter(t => isTradeWinner(t)).length;
    const winRate = (wins / hourTrades.length) * 100;
    const totalPL = hourTrades.reduce((sum, t) => sum + computeTradePLFromOutcomes(t), 0);
    
    metrics.push({
      hour,
      totalTrades: hourTrades.length,
      winRate,
      totalPL,
    });
  }
  
  return metrics;
}

export function computeWeekdayBuckets(trades: Trade[]): DayMetrics[] {
  const completedTrades = trades.filter(t => t.is_completed);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const metrics: DayMetrics[] = [];
  
  days.forEach((day, dayIndex) => {
    const dayTrades = completedTrades.filter(t => {
      const date = new Date(Number(t.created_at) / 1000000);
      return date.getUTCDay() === dayIndex;
    });
    
    if (dayTrades.length === 0) {
      metrics.push({ day, totalTrades: 0, winRate: 0, totalPL: 0 });
      return;
    }
    
    const wins = dayTrades.filter(t => isTradeWinner(t)).length;
    const winRate = (wins / dayTrades.length) * 100;
    const totalPL = dayTrades.reduce((sum, t) => sum + computeTradePLFromOutcomes(t), 0);
    
    metrics.push({
      day,
      totalTrades: dayTrades.length,
      winRate,
      totalPL,
    });
  });
  
  return metrics;
}

// Aliases for backward compatibility
export const computeHourMetrics = computeHourBuckets;
export const computeDayMetrics = computeWeekdayBuckets;
