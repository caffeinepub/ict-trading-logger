import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TradeCalendarDayCell from './TradeCalendarDayCell';
import type { CalendarDay, DayAggregates } from '../../utils/trade/tradeCalendar';

interface TradeCalendarMonthProps {
  year: number;
  month: number;
  calendarDays: CalendarDay[];
  onDayClick: (day: CalendarDay) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function TradeCalendarMonth({
  year,
  month,
  calendarDays,
  onDayClick,
  onPrevMonth,
  onNextMonth,
}: TradeCalendarMonthProps) {
  return (
    <div className="space-y-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          {MONTH_NAMES[month]} {year}
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={onPrevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={onNextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-2">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="text-center text-sm font-medium text-muted-foreground py-2">
            {label}
          </div>
        ))}
      </div>
      
      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {calendarDays.map((day) => (
          <TradeCalendarDayCell
            key={day.date}
            dayOfMonth={day.dayOfMonth}
            isCurrentMonth={day.isCurrentMonth}
            aggregates={day.aggregates}
            onClick={() => onDayClick(day)}
            isClickable={true}
          />
        ))}
      </div>
    </div>
  );
}
