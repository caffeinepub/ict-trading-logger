import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TradeCalendarDayCell from './TradeCalendarDayCell';
import type { CalendarDay } from '../../utils/trade/tradeCalendar';

interface TradeCalendarWeekProps {
  weekDays: CalendarDay[];
  onViewFullCalendar: () => void;
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function TradeCalendarWeek({ weekDays, onViewFullCalendar }: TradeCalendarWeekProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">This Week</h3>
        <Button variant="outline" size="sm" onClick={onViewFullCalendar} className="gap-2">
          <Calendar className="w-4 h-4" />
          View Full Calendar
        </Button>
      </div>
      
      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-2">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="text-center text-xs font-medium text-muted-foreground">
            {label}
          </div>
        ))}
      </div>
      
      {/* Week Row */}
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => (
          <TradeCalendarDayCell
            key={day.date}
            dayOfMonth={day.dayOfMonth}
            isCurrentMonth={day.isCurrentMonth}
            aggregates={day.aggregates}
            isClickable={false}
          />
        ))}
      </div>
    </div>
  );
}
