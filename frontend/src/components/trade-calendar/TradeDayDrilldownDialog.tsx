import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { DayAggregates } from '../../utils/trade/tradeCalendar';
import { computeTradePLFromOutcomes, computeTradeRRFromOutcomes } from '../../utils/trade/tradeMetrics';

interface TradeDayDrilldownDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dayAggregates: DayAggregates | null;
}

export default function TradeDayDrilldownDialog({
  open,
  onOpenChange,
  dayAggregates,
}: TradeDayDrilldownDialogProps) {
  if (!dayAggregates) return null;
  
  const formattedDate = new Date(dayAggregates.date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{formattedDate}</DialogTitle>
          <DialogDescription>
            {dayAggregates.tradeCount} trade{dayAggregates.tradeCount !== 1 ? 's' : ''} closed on this day
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Day Aggregates */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total P/L ($)</p>
              <p className={`text-2xl font-bold ${dayAggregates.totalPLDollar >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                ${dayAggregates.totalPLDollar.toFixed(2)}
              </p>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total P/L (%)</p>
              <p className={`text-2xl font-bold ${dayAggregates.totalPLPercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {dayAggregates.totalPLPercent >= 0 ? '+' : ''}{dayAggregates.totalPLPercent.toFixed(1)}%
              </p>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Net R</p>
              <p className={`text-2xl font-bold ${dayAggregates.netR >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {dayAggregates.netR >= 0 ? '+' : ''}{dayAggregates.netR.toFixed(2)}R
              </p>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Trades</p>
              <p className="text-2xl font-bold">{dayAggregates.tradeCount}</p>
            </div>
          </div>
          
          {/* Trade List */}
          <div className="space-y-3">
            <h3 className="font-semibold">Trades</h3>
            {dayAggregates.trades.map((trade) => {
              const tradePL = computeTradePLFromOutcomes(trade);
              const tradeR = computeTradeRRFromOutcomes(trade);
              
              return (
                <div
                  key={trade.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        trade.direction === 'long' ? 'bg-green-500/10' : 'bg-red-500/10'
                      }`}
                    >
                      {trade.direction === 'long' ? (
                        <TrendingUp className="w-5 h-5 text-green-500" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{trade.asset}</p>
                      <p className="text-sm text-muted-foreground capitalize">{trade.direction}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${tradePL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      ${tradePL.toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {tradeR >= 0 ? '+' : ''}{tradeR.toFixed(2)}R
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
