import type { DayAggregates } from '../../utils/trade/tradeCalendar';

interface TradeCalendarDayCellProps {
  dayOfMonth: number;
  isCurrentMonth: boolean;
  aggregates?: DayAggregates;
  onClick?: () => void;
  isClickable?: boolean;
}

export default function TradeCalendarDayCell({
  dayOfMonth,
  isCurrentMonth,
  aggregates,
  onClick,
  isClickable = false,
}: TradeCalendarDayCellProps) {
  const hasTrades = aggregates && aggregates.tradeCount > 0;
  
  return (
    <div
      onClick={hasTrades && isClickable ? onClick : undefined}
      className={`
        min-h-[100px] p-2 border border-border rounded-lg
        ${!isCurrentMonth ? 'bg-muted/30 text-muted-foreground' : 'bg-card'}
        ${hasTrades && isClickable ? 'cursor-pointer hover:bg-accent/50 transition-colors' : ''}
        ${!hasTrades ? 'opacity-60' : ''}
      `}
    >
      <div className="text-sm font-medium mb-2">{dayOfMonth}</div>
      
      {hasTrades && (
        <div className="space-y-1 text-xs">
          <div className={`font-semibold ${aggregates.totalPLDollar >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            ${aggregates.totalPLDollar.toFixed(2)}
          </div>
          <div className="text-muted-foreground">
            {aggregates.totalPLPercent >= 0 ? '+' : ''}{aggregates.totalPLPercent.toFixed(1)}%
          </div>
          <div className="text-muted-foreground">
            {aggregates.netR >= 0 ? '+' : ''}{aggregates.netR.toFixed(2)}R
          </div>
          <div className="text-muted-foreground">
            {aggregates.tradeCount} trade{aggregates.tradeCount !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  );
}
