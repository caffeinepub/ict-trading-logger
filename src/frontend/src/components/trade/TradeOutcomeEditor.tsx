import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Save, TrendingUp, TrendingDown, DollarSign, Target, Clock } from 'lucide-react';
import type { Trade, BracketOrderOutcome } from '../../backend';
import { ClosureType as ClosureTypeEnum, ExternalBlob } from '../../backend';
import BracketOutcomeSelector from './BracketOutcomeSelector';
import ManualClosePriceField from './ManualClosePriceField';
import EmojiMultiSelect from './EmojiMultiSelect';
import TradeImagesField from './TradeImagesField';
import { deriveBracketClosurePrice, computeTradePL } from '../../utils/trade/outcomeMath';
import type { BracketOutcomeState } from '../../utils/trade/outcomeModel';

interface TradeOutcomeEditorProps {
  trade: Trade;
  onSave: (updatedTrade: Trade) => Promise<void>;
  onCancel?: () => void;
  isSaving?: boolean;
}

export default function TradeOutcomeEditor({ trade, onSave, onCancel, isSaving = false }: TradeOutcomeEditorProps) {
  const [bracketStates, setBracketStates] = useState<Map<string, BracketOutcomeState>>(new Map());
  const [notes, setNotes] = useState('');
  const [mood, setMood] = useState<string[]>([]);
  const [images, setImages] = useState<ExternalBlob[]>([]);
  const [wouldTakeAgain, setWouldTakeAgain] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  // Trade close time state
  const [closeDateTime, setCloseDateTime] = useState('');
  const [useCurrentTime, setUseCurrentTime] = useState(true);

  // Update current time when toggle is enabled
  useEffect(() => {
    if (useCurrentTime) {
      const updateTime = () => {
        const now = new Date();
        // Format as datetime-local input value (YYYY-MM-DDTHH:mm)
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        setCloseDateTime(`${year}-${month}-${day}T${hours}:${minutes}`);
      };
      
      updateTime();
      const interval = setInterval(updateTime, 1000);
      return () => clearInterval(interval);
    }
  }, [useCurrentTime]);

  // Load trade data
  useEffect(() => {
    setNotes(trade.notes || '');
    setMood(trade.mood ? [trade.mood] : []);
    setImages(trade.images || []);
    setWouldTakeAgain(trade.would_take_again || false);
    
    // Initialize close time from trade if present
    if (trade.close_time) {
      const closeDate = new Date(Number(trade.close_time) / 1000000);
      const year = closeDate.getFullYear();
      const month = String(closeDate.getMonth() + 1).padStart(2, '0');
      const day = String(closeDate.getDate()).padStart(2, '0');
      const hours = String(closeDate.getHours()).padStart(2, '0');
      const minutes = String(closeDate.getMinutes()).padStart(2, '0');
      setCloseDateTime(`${year}-${month}-${day}T${hours}:${minutes}`);
      setUseCurrentTime(false);
    } else {
      // Default to current time for new outcomes
      setUseCurrentTime(true);
    }
    
    const newStates = new Map<string, BracketOutcomeState>();
    
    if (trade.is_completed && trade.bracket_order_outcomes.length > 0) {
      // Load existing outcomes for completed trades
      trade.bracket_order_outcomes.forEach(outcome => {
        newStates.set(outcome.bracket_id, {
          selectedOutcome: outcome.closure_type,
          manualClosePrice: outcome.closure_type === ClosureTypeEnum.manual_close ? outcome.closure_price : undefined,
        });
      });
    } else {
      // Initialize with unselected state (null) for non-completed trades
      trade.bracket_order.bracket_groups.forEach(bg => {
        newStates.set(bg.bracket_id, {
          selectedOutcome: null,
          manualClosePrice: undefined,
        });
      });
    }
    
    setBracketStates(newStates);
  }, [trade]);

  const handleOutcomeChange = (bracketId: string, outcome: ClosureTypeEnum) => {
    setBracketStates(prev => {
      const newStates = new Map(prev);
      const currentState = newStates.get(bracketId) || { selectedOutcome: null };
      newStates.set(bracketId, {
        ...currentState,
        selectedOutcome: outcome,
        manualClosePrice: outcome === ClosureTypeEnum.manual_close ? currentState.manualClosePrice : undefined,
      });
      return newStates;
    });
    setValidationError(null);
  };

  const handleManualPriceChange = (bracketId: string, price: number | undefined) => {
    setBracketStates(prev => {
      const newStates = new Map(prev);
      const currentState = newStates.get(bracketId) || { selectedOutcome: ClosureTypeEnum.manual_close };
      newStates.set(bracketId, {
        ...currentState,
        manualClosePrice: price,
      });
      return newStates;
    });
    setValidationError(null);
  };

  const calculateOutcome = () => {
    const outcomes: BracketOrderOutcome[] = [];
    let hasUnselected = false;
    
    trade.bracket_order.bracket_groups.forEach(bg => {
      const state = bracketStates.get(bg.bracket_id);
      if (!state || state.selectedOutcome === null) {
        hasUnselected = true;
        return;
      }
      
      const closurePrice = deriveBracketClosurePrice(
        trade,
        bg,
        state.selectedOutcome,
        state.manualClosePrice
      );
      
      // Skip if closure price is null (shouldn't happen if selectedOutcome is not null)
      if (closurePrice === null) {
        hasUnselected = true;
        return;
      }
      
      outcomes.push({
        bracket_id: bg.bracket_id,
        closure_type: state.selectedOutcome,
        closure_price: closurePrice,
        execution_price: closurePrice,
        size: bg.size,
        outcome_time: BigInt(Date.now() * 1000000),
        bracket_group: bg,
      });
    });
    
    // If any bracket is unselected, return safe defaults
    if (hasUnselected || outcomes.length === 0) {
      return { outcomes: [], totalPL: 0, finalPLPct: 0, rr: 0, hasUnselected: true };
    }
    
    const { totalPL, finalPLPct, rr } = computeTradePL(trade, outcomes);
    
    return { outcomes, totalPL, finalPLPct, rr, hasUnselected: false };
  };

  const handleSave = async () => {
    // Validate that all brackets have an outcome selected
    const unselectedBrackets: string[] = [];
    bracketStates.forEach((state, bracketId) => {
      if (state.selectedOutcome === null) {
        unselectedBrackets.push(bracketId);
      }
    });
    
    if (unselectedBrackets.length > 0) {
      setValidationError('Please select an outcome for all brackets before saving');
      return;
    }
    
    // Validate manual close prices
    const invalidManualClose: string[] = [];
    bracketStates.forEach((state, bracketId) => {
      if (state.selectedOutcome === ClosureTypeEnum.manual_close) {
        if (state.manualClosePrice === undefined || state.manualClosePrice === 0) {
          invalidManualClose.push(bracketId);
        }
      }
    });
    
    if (invalidManualClose.length > 0) {
      setValidationError('Please enter manual close prices for all brackets set to Manual Close');
      return;
    }

    // Validate close date/time
    if (!closeDateTime) {
      setValidationError('Please enter a trade close date and time');
      return;
    }

    const { outcomes } = calculateOutcome();
    
    // Convert closeDateTime to nanoseconds timestamp
    const closeDate = new Date(closeDateTime);
    const closeTimeNanos = BigInt(closeDate.getTime() * 1000000);
    
    // Update trade with outcomes, reflection fields, and close_time
    await onSave({
      ...trade,
      bracket_order_outcomes: outcomes,
      notes,
      mood: mood.length > 0 ? mood[0] : '',
      images,
      would_take_again: wouldTakeAgain,
      is_completed: true,
      close_time: closeTimeNanos,
    });
  };

  const { totalPL, finalPLPct, rr, hasUnselected } = calculateOutcome();
  const isProfit = totalPL > 0;

  return (
    <div className="trade-outcome-inline space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Trade Information Summary */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Trade Information</CardTitle>
          <CardDescription>
            {trade.asset} {trade.direction.toUpperCase()} • Entry: ${trade.bracket_order.entry_price.toFixed(2)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Position Size</p>
              <p className="font-semibold">{trade.bracket_order.position_size.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Primary SL</p>
              <p className="font-semibold">${trade.bracket_order.primary_stop_loss.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Brackets</p>
              <p className="font-semibold">{trade.bracket_order.bracket_groups.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Adherence</p>
              <p className="font-semibold">{(trade.adherence_score * 100).toFixed(0)}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Total P/L
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasUnselected ? (
              <div className="text-2xl font-bold text-muted-foreground">
                --
              </div>
            ) : (
              <div className={`text-2xl font-bold ${isProfit ? 'text-green-500' : 'text-red-500'}`}>
                ${totalPL.toFixed(2)}
              </div>
            )}
            <p className="text-sm text-muted-foreground mt-1">
              {hasUnselected ? 'Select outcomes' : `${finalPLPct.toFixed(1)}% of risk`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              R:R Ratio
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasUnselected ? (
              <div className="text-2xl font-bold text-muted-foreground">
                --
              </div>
            ) : (
              <div className={`text-2xl font-bold ${isProfit ? 'text-green-500' : 'text-red-500'}`}>
                {rr.toFixed(2)}R
              </div>
            )}
            <p className="text-sm text-muted-foreground mt-1">
              Risk-to-reward
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              {isProfit ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              Result
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasUnselected ? (
              <Badge variant="outline" className="text-lg px-3 py-1">
                Pending
              </Badge>
            ) : (
              <Badge variant={isProfit ? 'default' : 'destructive'} className="text-lg px-3 py-1">
                {isProfit ? 'Win' : 'Loss'}
              </Badge>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              Trade outcome
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bracket Outcomes */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Bracket Outcomes</CardTitle>
          <CardDescription>
            Select the outcome for each bracket order
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {trade.bracket_order.bracket_groups.map((bg, index) => {
            const state = bracketStates.get(bg.bracket_id);
            if (!state) return null;

            const closurePrice = deriveBracketClosurePrice(
              trade,
              bg,
              state.selectedOutcome,
              state.manualClosePrice
            );

            return (
              <div key={bg.bracket_id} className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold">Bracket {index + 1}</h4>
                    <p className="text-sm text-muted-foreground break-words">
                      Size: {bg.size} | TP: ${bg.take_profit_price.toFixed(2)} | SL: ${bg.stop_loss_price.toFixed(2)}
                    </p>
                  </div>
                  {closurePrice !== null && (
                    <Badge variant="outline" className="shrink-0">
                      Close: ${closurePrice.toFixed(2)}
                    </Badge>
                  )}
                </div>

                <BracketOutcomeSelector
                  selectedOutcome={state.selectedOutcome}
                  onOutcomeChange={(outcome) => handleOutcomeChange(bg.bracket_id, outcome)}
                />

                {state.selectedOutcome === ClosureTypeEnum.manual_close && (
                  <ManualClosePriceField
                    value={state.manualClosePrice}
                    onChange={(price) => handleManualPriceChange(bg.bracket_id, price)}
                  />
                )}

                {index < trade.bracket_order.bracket_groups.length - 1 && (
                  <Separator className="mt-6" />
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Reflection Section */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Trade Reflection</CardTitle>
          <CardDescription>
            Document your thoughts and learnings from this trade
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="What did you observe? What went well? What could be improved?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Mood</Label>
            <EmojiMultiSelect
              selected={mood}
              onChange={setMood}
            />
          </div>

          <div className="space-y-2">
            <Label>Screenshots</Label>
            <TradeImagesField
              images={images}
              onChange={setImages}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="would-take-again"
              checked={wouldTakeAgain}
              onCheckedChange={(checked) => setWouldTakeAgain(checked === true)}
            />
            <Label
              htmlFor="would-take-again"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Would you take this trade again?
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Trade Close Time */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Trade Close Time
          </CardTitle>
          <CardDescription>
            Specify when this trade was closed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="use-current-time"
              checked={useCurrentTime}
              onCheckedChange={setUseCurrentTime}
            />
            <Label
              htmlFor="use-current-time"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Set close time to now
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="close-datetime">Close Date & Time</Label>
            <Input
              id="close-datetime"
              type="datetime-local"
              value={closeDateTime}
              onChange={(e) => {
                setCloseDateTime(e.target.value);
                setUseCurrentTime(false);
              }}
              disabled={useCurrentTime}
              className="w-full"
            />
            <p className="text-sm text-muted-foreground">
              {useCurrentTime 
                ? 'Time is automatically set to current time' 
                : 'Manually set the trade close time'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Validation Error */}
      {validationError && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg">
          {validationError}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-end">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={isSaving} className="w-full sm:w-auto">
            Cancel
          </Button>
        )}
        <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto gap-2">
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving...' : 'Save Outcome'}
        </Button>
      </div>
    </div>
  );
}
