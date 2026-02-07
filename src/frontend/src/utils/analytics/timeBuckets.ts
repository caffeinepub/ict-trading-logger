import type { Trade } from '../../backend';

export interface HourBucket {
  hour: string;
  trades: number;
  winRate: number;
  totalPL: number;
}

export interface WeekdayBucket {
  weekday: string;
  trades: number;
  winRate: number;
  totalPL: number;
}

export function computeHourBuckets(trades: Trade[]): HourBucket[] {
  const completedTrades = trades.filter(t => t.is_completed);
  const hourGroups: Record<number, Trade[]> = {};

  for (let i = 0; i < 24; i++) {
    hourGroups[i] = [];
  }

  for (const trade of completedTrades) {
    const date = new Date(Number(trade.created_at) / 1000000);
    const hour = date.getUTCHours();
    hourGroups[hour].push(trade);
  }

  return Object.entries(hourGroups).map(([hour, hourTrades]) => {
    const totalTrades = hourTrades.length;
    const wins = hourTrades.filter(t => t.bracket_order_outcome.final_pl_usd > 0).length;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    const totalPL = hourTrades.reduce((sum, t) => sum + t.bracket_order_outcome.final_pl_usd, 0);

    return {
      hour: `${hour}:00`,
      trades: totalTrades,
      winRate,
      totalPL,
    };
  }).filter(b => b.trades > 0);
}

export function computeWeekdayBuckets(trades: Trade[]): WeekdayBucket[] {
  const completedTrades = trades.filter(t => t.is_completed);
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const weekdayGroups: Record<string, Trade[]> = {};

  weekdays.forEach(day => {
    weekdayGroups[day] = [];
  });

  for (const trade of completedTrades) {
    const date = new Date(Number(trade.created_at) / 1000000);
    const weekday = weekdays[date.getDay()];
    weekdayGroups[weekday].push(trade);
  }

  return weekdays.map(weekday => {
    const dayTrades = weekdayGroups[weekday];
    const totalTrades = dayTrades.length;
    const wins = dayTrades.filter(t => t.bracket_order_outcome.final_pl_usd > 0).length;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    const totalPL = dayTrades.reduce((sum, t) => sum + t.bracket_order_outcome.final_pl_usd, 0);

    return {
      weekday,
      trades: totalTrades,
      winRate,
      totalPL,
    };
  }).filter(b => b.trades > 0);
}
