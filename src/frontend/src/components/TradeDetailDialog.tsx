import { useState, useRef, useEffect } from 'react';
import { useSaveBracketOrderOutcome, useUpdateTrade } from '../hooks/useQueries';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Save, X, TrendingUp, TrendingDown, DollarSign, Target, AlertCircle } from 'lucide-react';
import type { Trade, FilledBracketGroup, ClosureType, BracketOrderOutcome } from '../backend';
import { ClosureType as ClosureTypeEnum } from '../backend';

interface TradeDetailDialogProps {
  trade: Trade | null;
  open: boolean;
  onClose: () => void;
}

// Helper function to safely parse float values
const safeParseFloat = (value: string | number): number => {
  if (value === '' || value === undefined || value === null) return 0;
  const parsed = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(parsed) || !isFinite(parsed) ? 0 : parsed;
};

// Helper function to validate numeric input
const isValidNumericInput = (value: string): boolean => {
  if (value === '') return true;
  return /^\d*\.?\d*$/.test(value);
};

export default function TradeDetailDialog({ trade, open, onClose }: TradeDetailDialogProps) {
  const [filledBrackets, setFilledBrackets] = useState<FilledBracketGroup[]>([]);
  const [notes, setNotes] = useState('');
  const [emotions, setEmotions] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);
  
  const saveBracketOrderOutcome = useSaveBracketOrderOutcome();
  const updateTrade = useUpdateTrade();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load trade data when dialog opens
  useEffect(() => {
    if (trade && open) {
      setNotes(trade.notes || '');
      setEmotions(trade.emotions || []);
      setImages(trade.images || []);
      
      // Initialize filled brackets from trade outcome if completed
      if (trade.is_completed && trade.bracket_order_outcome.filled_bracket_groups.length > 0) {
        setFilledBrackets(trade.bracket_order_outcome.filled_bracket_groups);
      } else {
        // Initialize empty filled brackets for each bracket group
        const initialBrackets: FilledBracketGroup[] = trade.bracket_order.bracket_groups.map(bg => ({
          bracket_id: bg.bracket_id,
          closure_type: ClosureTypeEnum.take_profit,
          closure_price: 0,
          size: bg.size,
          break_even_applied: false,
          break_even_price: undefined,
          manual_close_applied: false,
          manual_close_price: undefined,
        }));
        setFilledBrackets(initialBrackets);
      }
    }
  }, [trade, open]);

  if (!trade) return null;

  const handleClosureTypeChange = (index: number, type: ClosureType) => {
    const newBrackets = [...filledBrackets];
    newBrackets[index] = {
      ...newBrackets[index],
      closure_type: type,
    };
    setFilledBrackets(newBrackets);
  };

  const handleClosurePriceChange = (index: number, value: string) => {
    if (!isValidNumericInput(value)) return;
    
    const newBrackets = [...filledBrackets];
    newBrackets[index] = {
      ...newBrackets[index],
      closure_price: value === '' ? 0 : safeParseFloat(value),
    };
    setFilledBrackets(newBrackets);
  };

  const handleBreakEvenToggle = (index: number, enabled: boolean) => {
    const newBrackets = [...filledBrackets];
    
    // If enabling break-even, disable manual close
    if (enabled) {
      newBrackets[index] = {
        ...newBrackets[index],
        break_even_applied: true,
        manual_close_applied: false,
        manual_close_price: undefined,
      };
    } else {
      newBrackets[index] = {
        ...newBrackets[index],
        break_even_applied: false,
        break_even_price: undefined,
      };
    }
    
    setFilledBrackets(newBrackets);
  };

  const handleBreakEvenPriceChange = (index: number, value: string) => {
    if (!isValidNumericInput(value)) return;
    
    const newBrackets = [...filledBrackets];
    newBrackets[index] = {
      ...newBrackets[index],
      break_even_price: value === '' ? undefined : safeParseFloat(value),
    };
    setFilledBrackets(newBrackets);
  };

  const handleManualCloseToggle = (index: number, enabled: boolean) => {
    const newBrackets = [...filledBrackets];
    
    // If enabling manual close, disable break-even
    if (enabled) {
      newBrackets[index] = {
        ...newBrackets[index],
        manual_close_applied: true,
        break_even_applied: false,
        break_even_price: undefined,
      };
    } else {
      newBrackets[index] = {
        ...newBrackets[index],
        manual_close_applied: false,
        manual_close_price: undefined,
      };
    }
    
    setFilledBrackets(newBrackets);
  };

  const handleManualClosePriceChange = (index: number, value: string) => {
    if (!isValidNumericInput(value)) return;
    
    const newBrackets = [...filledBrackets];
    newBrackets[index] = {
      ...newBrackets[index],
      manual_close_price: value === '' ? undefined : safeParseFloat(value),
    };
    setFilledBrackets(newBrackets);
  };

  const calculateOutcome = (): BracketOrderOutcome => {
    const entry = trade.bracket_order.entry_price;
    const valuePerUnit = trade.value_per_unit;
    const isLong = trade.direction === 'long';
    
    let totalPL = 0;
    let totalRisk = 0;
    let totalReward = 0;

    filledBrackets.forEach(bracket => {
      const size = bracket.size;
      const closurePrice = bracket.closure_price;
      
      // Calculate P/L for this bracket
      const priceDiff = isLong ? (closurePrice - entry) : (entry - closurePrice);
      const bracketPL = priceDiff * size * valuePerUnit;
      
      totalPL += bracketPL;
      
      // Track risk/reward
      if (bracketPL > 0) {
        totalReward += bracketPL;
      } else {
        totalRisk += Math.abs(bracketPL);
      }
    });

    // Calculate R:R ratio
    const primaryStopDistance = Math.abs(entry - trade.bracket_order.primary_stop_loss);
    const maxRisk = primaryStopDistance * trade.bracket_order.position_size * valuePerUnit;
    const rr = maxRisk > 0 ? totalPL / maxRisk : 0;

    // Calculate percentage P/L
    const finalPLPct = maxRisk > 0 ? (totalPL / maxRisk) * 100 : 0;

    return {
      filled_bracket_groups: filledBrackets,
      final_pl_pct: finalPLPct,
      final_pl_usd: totalPL,
      rr: rr,
    };
  };

  const handleSave = async () => {
    try {
      // Validate that all brackets have closure prices
      const invalidBrackets = filledBrackets.filter(b => b.closure_price === 0);
      if (invalidBrackets.length > 0) {
        toast.error('Please enter closure prices for all brackets');
        return;
      }

      // Validate break-even prices if enabled
      const invalidBreakEven = filledBrackets.filter(
        b => b.break_even_applied && (b.break_even_price === undefined || b.break_even_price === 0)
      );
      if (invalidBreakEven.length > 0) {
        toast.error('Please enter break-even prices for all enabled break-even brackets');
        return;
      }

      // Validate manual close prices if enabled
      const invalidManualClose = filledBrackets.filter(
        b => b.manual_close_applied && (b.manual_close_price === undefined || b.manual_close_price === 0)
      );
      if (invalidManualClose.length > 0) {
        toast.error('Please enter manual close prices for all enabled manual close brackets');
        return;
      }

      const outcome = calculateOutcome();
      
      // Save bracket order outcome
      await saveBracketOrderOutcome.mutateAsync({
        tradeId: trade.id,
        outcome,
      });

      // Update trade notes, emotions, and images
      await updateTrade.mutateAsync({
        ...trade,
        notes,
        emotions,
        images,
        is_completed: true,
        bracket_order_outcome: outcome,
      });

      toast.success('Trade outcome saved successfully!');
      onClose();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save trade outcome');
      console.error(error);
    }
  };

  const outcome = calculateOutcome();
  const isProfit = outcome.final_pl_usd > 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Trade Outcome</DialogTitle>
          <DialogDescription>
            Record the outcome of your trade
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 py-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <DollarSign className="w-4 h-4" />
                  <span>Total P/L</span>
                </div>
                <div className={`text-2xl font-bold ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                  ${outcome.final_pl_usd.toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {outcome.final_pl_pct.toFixed(2)}% of risk
                </div>
              </div>

              <div className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Target className="w-4 h-4" />
                  <span>R:R Ratio</span>
                </div>
                <div className="text-2xl font-bold">
                  {outcome.rr.toFixed(2)}R
                </div>
                <div className="text-xs text-muted-foreground">
                  Risk-to-reward ratio
                </div>
              </div>

              <div className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {isProfit ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  <span>Result</span>
                </div>
                <Badge variant={isProfit ? 'default' : 'destructive'} className="text-lg">
                  {isProfit ? 'Win' : 'Loss'}
                </Badge>
              </div>
            </div>

            <Separator />

            {/* Bracket Outcomes */}
            <div className="space-y-4">
              <h3 className="font-semibold">Bracket Outcomes</h3>
              {filledBrackets.map((bracket, index) => {
                const originalBracket = trade.bracket_order.bracket_groups[index];
                
                return (
                  <div key={bracket.bracket_id} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Bracket {index + 1}</h4>
                      <Badge variant="outline">
                        Size: {originalBracket.size}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Closure Type</Label>
                        <div className="flex gap-2">
                          <Button
                            variant={bracket.closure_type === ClosureTypeEnum.take_profit ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleClosureTypeChange(index, ClosureTypeEnum.take_profit)}
                          >
                            Take Profit
                          </Button>
                          <Button
                            variant={bracket.closure_type === ClosureTypeEnum.stop_loss ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleClosureTypeChange(index, ClosureTypeEnum.stop_loss)}
                          >
                            Stop Loss
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`closure-price-${index}`}>Closure Price *</Label>
                        <Input
                          id={`closure-price-${index}`}
                          type="number"
                          step="0.01"
                          value={bracket.closure_price || ''}
                          onChange={(e) => handleClosurePriceChange(index, e.target.value)}
                          placeholder="Enter closure price"
                        />
                      </div>
                    </div>

                    {/* Break-Even Control */}
                    <div className="space-y-3 border-t pt-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`break-even-${index}`}>Break-Even Applied</Label>
                        <Switch
                          id={`break-even-${index}`}
                          checked={bracket.break_even_applied}
                          onCheckedChange={(checked) => handleBreakEvenToggle(index, checked)}
                        />
                      </div>
                      
                      {bracket.break_even_applied && (
                        <div className="space-y-2">
                          <Label htmlFor={`break-even-price-${index}`}>Break-Even Price *</Label>
                          <Input
                            id={`break-even-price-${index}`}
                            type="number"
                            step="0.01"
                            value={bracket.break_even_price || ''}
                            onChange={(e) => handleBreakEvenPriceChange(index, e.target.value)}
                            placeholder="Enter break-even price"
                          />
                        </div>
                      )}
                    </div>

                    {/* Manual Close Control */}
                    <div className="space-y-3 border-t pt-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`manual-close-${index}`}>Manual Close Applied</Label>
                        <Switch
                          id={`manual-close-${index}`}
                          checked={bracket.manual_close_applied}
                          onCheckedChange={(checked) => handleManualCloseToggle(index, checked)}
                        />
                      </div>
                      
                      {bracket.manual_close_applied && (
                        <div className="space-y-2">
                          <Label htmlFor={`manual-close-price-${index}`}>Manual Close Price *</Label>
                          <Input
                            id={`manual-close-price-${index}`}
                            type="number"
                            step="0.01"
                            value={bracket.manual_close_price || ''}
                            onChange={(e) => handleManualClosePriceChange(index, e.target.value)}
                            placeholder="Enter manual close price"
                          />
                        </div>
                      )}
                    </div>

                    {bracket.break_even_applied && bracket.manual_close_applied && (
                      <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-2 rounded">
                        <AlertCircle className="w-4 h-4" />
                        <span>Both break-even and manual close are enabled. Only one should be active per bracket.</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <Separator />

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Trade Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this trade..."
                rows={4}
              />
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saveBracketOrderOutcome.isPending || updateTrade.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            {saveBracketOrderOutcome.isPending || updateTrade.isPending ? 'Saving...' : 'Save Outcome'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
