import type { Trade } from '../../backend';
import { computeTradePLFromOutcomes, computeTradeRRFromOutcomes } from './tradeMetrics';

export interface DayAggregates {
  date: string; // YYYY-MM-DD format
  totalPLDollar: number;
  totalPLPercent: number;
  netR: number;
  tradeCount: number;
  trades: Trade[];
}

/**
 * Normalize a timestamp (nanoseconds) to a local date key (YYYY-MM-DD)
 */
export function getLocalDateKey(timestampNs: bigint): string {
  const date = new Date(Number(timestampNs) / 1000000);
  return date.toISOString().split('T')[0];
}

/**
 * Filter to completed trades with close_time
 */
export function getCompletedTradesWithCloseTime(trades: Trade[]): Trade[] {
  return trades.filter(t => t.is_completed && t.close_time !== undefined && t.close_time !== null);
}

/**
 * Aggregate trades by close_time date
 */
export function aggregateTradesByDay(trades: Trade[]): Map<string, DayAggregates> {
  const dayMap = new Map<string, DayAggregates>();
  
  const completedTrades = getCompletedTradesWithCloseTime(trades);
  
  for (const trade of completedTrades) {
    if (!trade.close_time) continue;
    
    const dateKey = getLocalDateKey(trade.close_time);
    const tradePL = computeTradePLFromOutcomes(trade);
    const tradeR = computeTradeRRFromOutcomes(trade);
    
    // Calculate percentage P/L based on risk
    const riskAmount = Math.abs(
      (trade.bracket_order.entry_price - trade.bracket_order.primary_stop_loss) *
      trade.bracket_order.position_size *
      trade.bracket_order.value_per_unit
    );
    const percentPL = riskAmount > 0 ? (tradePL / riskAmount) * 100 : 0;
    
    if (!dayMap.has(dateKey)) {
      dayMap.set(dateKey, {
        date: dateKey,
        totalPLDollar: 0,
        totalPLPercent: 0,
        netR: 0,
        tradeCount: 0,
        trades: [],
      });
    }
    
    const dayAgg = dayMap.get(dateKey)!;
    dayAgg.totalPLDollar += tradePL;
    dayAgg.totalPLPercent += percentPL;
    dayAgg.netR += tradeR;
    dayAgg.tradeCount += 1;
    dayAgg.trades.push(trade);
  }
  
  return dayMap;
}

/**
 * Get calendar grid for a given month (year, month 0-11)
 */
export interface CalendarDay {
  date: string; // YYYY-MM-DD
  dayOfMonth: number;
  isCurrentMonth: boolean;
  aggregates?: DayAggregates;
}

export function getMonthCalendarGrid(year: number, month: number, dayAggregates: Map<string, DayAggregates>): CalendarDay[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDayOfWeek = firstDay.getDay(); // 0 = Sunday
  const daysInMonth = lastDay.getDate();
  
  const grid: CalendarDay[] = [];
  
  // Add previous month days to fill the first week
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const day = prevMonthLastDay - i;
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const dateKey = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    grid.push({
      date: dateKey,
      dayOfMonth: day,
      isCurrentMonth: false,
      aggregates: dayAggregates.get(dateKey),
    });
  }
  
  // Add current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    grid.push({
      date: dateKey,
      dayOfMonth: day,
      isCurrentMonth: true,
      aggregates: dayAggregates.get(dateKey),
    });
  }
  
  // Add next month days to complete the grid (up to 6 weeks)
  const remainingCells = 42 - grid.length; // 6 weeks * 7 days
  for (let day = 1; day <= remainingCells; day++) {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    const dateKey = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    grid.push({
      date: dateKey,
      dayOfMonth: day,
      isCurrentMonth: false,
      aggregates: dayAggregates.get(dateKey),
    });
  }
  
  return grid;
}

/**
 * Get the current week's days (Sunday to Saturday)
 */
export function getCurrentWeekDays(dayAggregates: Map<string, DayAggregates>): CalendarDay[] {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday
  
  const weekDays: CalendarDay[] = [];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - dayOfWeek + i);
    
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    weekDays.push({
      date: dateKey,
      dayOfMonth: day,
      isCurrentMonth: true,
      aggregates: dayAggregates.get(dateKey),
    });
  }
  
  return weekDays;
}
