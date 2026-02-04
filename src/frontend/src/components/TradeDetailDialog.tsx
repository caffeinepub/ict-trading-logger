import { useState, useRef, useEffect } from 'react';
import { useAddReflection } from '../hooks/useQueries';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { TrendingUp, TrendingDown, Upload, X, AlertCircle, CheckCircle, Info } from 'lucide-react';
import type { Trade, Model, BracketOrderOutcome, FilledBracketGroup } from '../backend';
import { ClosureType } from '../backend';

interface TradeDetailDialogProps {
  trade: Trade;
  model?: Model;
  onClose: () => void;
}

interface BracketState {
  closureType: ClosureType | null;
  breakEvenApplied: boolean;
  breakEvenPrice: number;
  manualCloseApplied: boolean;
  manualClosePrice: number;
}

const EMOTION_OPTIONS = ['😊', '😐', '😔', '😤', '🤔', '😰', '🎯', '💪', '🔥', '😎'];

export default function TradeDetailDialog({ trade, model, onClose }: TradeDetailDialogProps) {
  const [isCompleted, setIsCompleted] = useState(trade.is_completed);
  const [bracketStates, setBracketStates] = useState<Map<string, BracketState>>(new Map());
  const [notes, setNotes] = useState(trade.notes);
  const [emotions, setEmotions] = useState<string[]>(trade.emotions);
  const [wouldTakeAgain, setWouldTakeAgain] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>(trade.images || []);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addReflection = useAddReflection();

  useEffect(() => {
    // Initialize bracket states from saved trade outcome
    const initialStates = new Map<string, BracketState>();
    
    trade.bracket_order.bracket_groups.forEach(group => {
      initialStates.set(group.bracket_id, {
        closureType: null,
        breakEvenApplied: false,
        breakEvenPrice: trade.bracket_order.entry_price,
        manualCloseApplied: false,
        manualClosePrice: 0,
      });
    });

    if (trade.bracket_order_outcome && trade.bracket_order_outcome.filled_bracket_groups) {
      trade.bracket_order_outcome.filled_bracket_groups.forEach(filled => {
        initialStates.set(filled.bracket_id, {
          closureType: filled.closure_type,
          breakEvenApplied: filled.break_even_applied || false,
          breakEvenPrice: filled.break_even_price || trade.bracket_order.entry_price,
          manualCloseApplied: filled.manual_close_applied || false,
          manualClosePrice: filled.manual_close_price || 0,
        });
      });
    }

    setBracketStates(initialStates);
  }, [trade.bracket_order_outcome, trade.bracket_order.entry_price, trade.bracket_order.bracket_groups]);

  useEffect(() => {
    setIsCompleted(trade.is_completed);
  }, [trade.is_completed]);

  const toggleEmotion = (emotion: string) => {
    setEmotions((prev) => (prev.includes(emotion) ? prev.filter((e) => e !== emotion) : [...prev, emotion]));
  };

  const updateBracketState = (bracketId: string, updates: Partial<BracketState>) => {
    if (isCompleted) return;
    setBracketStates(prev => {
      const newMap = new Map(prev);
      const currentState = newMap.get(bracketId) || {
        closureType: null,
        breakEvenApplied: false,
        breakEvenPrice: trade.bracket_order.entry_price,
        manualCloseApplied: false,
        manualClosePrice: 0,
      };
      newMap.set(bracketId, { ...currentState, ...updates });
      return newMap;
    });
  };

  // Enhanced update function with mutually exclusive logic
  const updateBracketStateExclusive = (bracketId: string, updates: Partial<BracketState>) => {
    if (isCompleted) return;
    
    setBracketStates(prev => {
      const newMap = new Map(prev);
      const currentState = newMap.get(bracketId) || {
        closureType: null,
        breakEvenApplied: false,
        breakEvenPrice: trade.bracket_order.entry_price,
        manualCloseApplied: false,
        manualClosePrice: 0,
      };

      // Implement mutually exclusive logic
      let newState = { ...currentState, ...updates };

      // If break-even is being enabled, disable manual close
      if (updates.breakEvenApplied === true) {
        newState.manualCloseApplied = false;
        newState.manualClosePrice = 0;
      }

      // If manual close is being enabled, disable break-even
      if (updates.manualCloseApplied === true) {
        newState.breakEvenApplied = false;
        newState.breakEvenPrice = trade.bracket_order.entry_price;
      }

      newMap.set(bracketId, newState);
      return newMap;
    });
  };

  // Calculate P/L using OCO bracket structure with per-bracket break-even and manual close
  const calculateOutcome = () => {
    const entry = trade.bracket_order.entry_price;
    const valuePerUnit = trade.value_per_unit;

    let totalPL = 0;
    const filledGroups: FilledBracketGroup[] = [];

    trade.bracket_order.bracket_groups.forEach(group => {
      const state = bracketStates.get(group.bracket_id);
      if (!state) return;

      let closurePrice = 0;
      let actualClosureType = state.closureType;

      // Determine closure price based on bracket state with mutually exclusive logic
      if (state.closureType === ClosureType.take_profit) {
        closurePrice = group.take_profit_price;
      } else if (state.closureType === ClosureType.stop_loss) {
        closurePrice = group.stop_loss_price;
      } else if (state.breakEvenApplied && !state.manualCloseApplied) {
        // Only apply break-even if manual close is not applied
        closurePrice = state.breakEvenPrice;
        actualClosureType = ClosureType.break_even;
      } else if (state.manualCloseApplied && !state.breakEvenApplied) {
        // Only apply manual close if break-even is not applied
        closurePrice = state.manualClosePrice;
        actualClosureType = ClosureType.manual_close;
      }

      if (closurePrice > 0 && actualClosureType) {
        const distance = Math.abs(closurePrice - entry);
        const dollarAmount = distance * valuePerUnit * group.size;
        const isProfit = (trade.direction === 'long' && closurePrice > entry) || 
                         (trade.direction === 'short' && closurePrice < entry);
        totalPL += dollarAmount * (isProfit ? 1 : -1);

        filledGroups.push({
          bracket_id: group.bracket_id,
          closure_type: actualClosureType,
          closure_price: closurePrice,
          size: group.size,
          break_even_applied: state.breakEvenApplied && !state.manualCloseApplied,
          break_even_price: (state.breakEvenApplied && !state.manualCloseApplied) ? state.breakEvenPrice : undefined,
          manual_close_applied: state.manualCloseApplied && !state.breakEvenApplied,
          manual_close_price: (state.manualCloseApplied && !state.breakEvenApplied) ? state.manualClosePrice : undefined,
        });
      }
    });

    const totalRisk = trade.bracket_order.bracket_groups.reduce((sum, group) => {
      const distance = Math.abs(entry - group.stop_loss_price);
      const dollarAmount = distance * valuePerUnit * group.size;
      return sum + dollarAmount;
    }, 0);

    const rr = totalRisk > 0 ? totalPL / totalRisk : 0;
    const plPct = trade.bracket_order.position_size > 0 ? (totalPL / (entry * trade.bracket_order.position_size)) * 100 : 0;

    const remainingCount = trade.bracket_order.bracket_groups.filter(group => {
      const state = bracketStates.get(group.bracket_id);
      return !state || (!state.closureType && !state.breakEvenApplied && !state.manualCloseApplied);
    }).length;

    return {
      final_pl_usd: totalPL,
      final_pl_pct: plPct,
      rr,
      remaining_brackets: remainingCount,
      filled_groups: filledGroups,
    };
  };

  const validateOutcome = (): string[] => {
    const errors: string[] = [];

    // Validate that at least one bracket has a closure
    const hasAnyClosure = Array.from(bracketStates.values()).some(
      state => state.closureType !== null || state.breakEvenApplied || state.manualCloseApplied
    );
    
    if (!hasAnyClosure) {
      errors.push('Please select at least one bracket closure or action');
    }

    // Validate per-bracket manual close prices
    bracketStates.forEach((state, bracketId) => {
      if (state.manualCloseApplied && (!state.manualClosePrice || state.manualClosePrice === 0)) {
        errors.push(`Bracket ${bracketId}: Manual close requires a valid price`);
      }
    });

    // Validate per-bracket break-even prices
    bracketStates.forEach((state, bracketId) => {
      if (state.breakEvenApplied && (!state.breakEvenPrice || state.breakEvenPrice === 0)) {
        errors.push(`Bracket ${bracketId}: Break-even requires a valid price`);
      }
    });

    // Validate mutually exclusive selection
    bracketStates.forEach((state, bracketId) => {
      if (state.breakEvenApplied && state.manualCloseApplied) {
        errors.push(`Bracket ${bracketId}: Cannot have both break-even and manual close selected`);
      }
    });

    return errors;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newFiles: File[] = [];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`);
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 5MB)`);
        continue;
      }

      newFiles.push(file);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setImagePreviews((prev) => [...prev, e.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    }

    setImageFiles((prev) => [...prev, ...newFiles]);
  };

  const removeImageFile = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const removeUploadedImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const convertImageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          resolve(reader.result as string);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const uploadImages = async (): Promise<string[]> => {
    if (imageFiles.length === 0) return uploadedImages;

    const uploadedUrls: string[] = [...uploadedImages];

    try {
      for (const file of imageFiles) {
        const base64Url = await convertImageToBase64(file);
        uploadedUrls.push(base64Url);
      }
    } catch (error) {
      console.error('Failed to process images:', error);
      toast.error('Failed to process some images');
    }

    return uploadedUrls;
  };

  const handleSaveReflection = async () => {
    if (isCompleted) {
      toast.error('Trade Already Completed', {
        description: 'This trade has already been completed and cannot be modified.',
      });
      return;
    }

    const validationErrors = validateOutcome();
    if (validationErrors.length > 0) {
      toast.error('Validation Error', {
        description: validationErrors[0],
      });
      return;
    }

    try {
      const allImageUrls = await uploadImages();
      const outcome = calculateOutcome();

      const bracketOutcome: BracketOrderOutcome = {
        filled_bracket_groups: outcome.filled_groups,
        final_pl_pct: outcome.final_pl_pct,
        final_pl_usd: outcome.final_pl_usd,
        rr: outcome.rr,
      };

      await addReflection.mutateAsync({
        tradeId: trade.id,
        notes,
        emotions,
        images: allImageUrls,
        bracketOutcome,
      });
      
      setIsCompleted(true);
      
      toast.success('Trade Completed Successfully', {
        description: 'Your reflection and outcome have been saved. Analytics have been updated.',
        icon: <CheckCircle className="w-4 h-4" />,
        duration: 3000,
      });
      
      setImageFiles([]);
      setImagePreviews([]);
      
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error: any) {
      console.error('Failed to save reflection:', error);
      
      let errorTitle = 'Failed to Save';
      let errorDescription = 'An unexpected error occurred. Please try again.';
      
      const errorMessage = error?.message || error?.toString() || '';
      
      if (errorMessage.includes('Trade not found')) {
        errorTitle = 'Trade Not Found';
        errorDescription = 'The trade you are trying to update no longer exists.';
      } else if (errorMessage.includes('Unauthorized')) {
        errorTitle = 'Unauthorized';
        errorDescription = 'You do not have permission to update this trade.';
      } else if (errorMessage.includes('Actor not available')) {
        errorTitle = 'Connection Error';
        errorDescription = 'Unable to connect to the backend. Please check your connection and try again.';
      } else if (errorMessage) {
        errorDescription = errorMessage;
      }
      
      toast.error(errorTitle, {
        description: errorDescription,
        duration: 5000,
      });
    }
  };

  // Use stored outcome values if trade is completed, otherwise calculate preview
  const displayedOutcome = isCompleted && trade.bracket_order_outcome.filled_bracket_groups.length > 0
    ? {
        final_pl_usd: trade.bracket_order_outcome.final_pl_usd,
        final_pl_pct: trade.bracket_order_outcome.final_pl_pct,
        rr: trade.bracket_order_outcome.rr,
        remaining_brackets: 0,
      }
    : calculateOutcome();

  const validationErrors = validateOutcome();
  const hasOutcomeErrors = validationErrors.length > 0;
  const hasOutcomeSelection = Array.from(bracketStates.values()).some(
    state => state.closureType !== null || state.breakEvenApplied || state.manualCloseApplied
  );

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                trade.direction === 'long' ? 'bg-green-500/10' : 'bg-red-500/10'
              }`}
            >
              {trade.direction === 'long' ? (
                <TrendingUp className="w-6 h-6 text-green-500" />
              ) : (
                <TrendingDown className="w-6 h-6 text-red-500" />
              )}
            </div>
            <div>
              <DialogTitle className="text-2xl">{trade.asset}</DialogTitle>
              <DialogDescription>
                {model?.name} • {new Date(Number(trade.created_at) / 1000000).toLocaleDateString()}
                {isCompleted && (
                  <Badge variant="default" className="ml-2">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Completed
                  </Badge>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Direction</p>
              <p className="font-medium capitalize">{trade.direction}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Entry Price</p>
              <p className="font-medium">${trade.bracket_order.entry_price.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Position Size</p>
              <p className="font-medium">{trade.bracket_order.position_size.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Value per {trade.calculation_method === 'tick' ? 'Tick' : 'Point'}</p>
              <p className="font-medium">${trade.value_per_unit.toFixed(2)}</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">OCO Bracket-Order Outcome</h3>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Per-Bracket Controls:</strong> For each bracket, select whether it closed via Take Profit, Stop Loss, Break Even, or Manual Close. Only one closure type can be selected per bracket.
              </AlertDescription>
            </Alert>

            {isCompleted && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  This trade has been completed. The outcome and reflection have been saved and analytics have been updated.
                </AlertDescription>
              </Alert>
            )}

            {hasOutcomeErrors && !isCompleted && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside">
                    {validationErrors.map((error, i) => (
                      <li key={i} className="text-sm">
                        {error}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">OCO Bracket Groups</Label>
                <div className="space-y-3">
                  {trade.bracket_order.bracket_groups.map((group, index) => {
                    const state = bracketStates.get(group.bracket_id);
                    const closureType = state?.closureType;
                    
                    return (
                      <div
                        key={group.bracket_id}
                        className="p-4 border rounded-lg bg-muted/50 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Bracket {index + 1}</p>
                            <p className="text-sm text-muted-foreground">
                              Size: {group.size.toFixed(2)} contracts
                            </p>
                          </div>
                          {closureType && (
                            <Badge variant={closureType === ClosureType.take_profit ? 'default' : 'destructive'}>
                              {closureType === ClosureType.take_profit ? 'TP Filled' : 'SL Filled'}
                            </Badge>
                          )}
                          {state?.breakEvenApplied && (
                            <Badge variant="secondary">Break Even</Badge>
                          )}
                          {state?.manualCloseApplied && (
                            <Badge variant="outline">Manual Close</Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 border rounded-lg bg-background">
                            <p className="text-xs text-muted-foreground mb-1">Take Profit</p>
                            <p className="font-medium">${group.take_profit_price.toFixed(2)}</p>
                          </div>
                          <div className="p-3 border rounded-lg bg-background">
                            <p className="text-xs text-muted-foreground mb-1">Stop Loss</p>
                            <p className="font-medium">${group.stop_loss_price.toFixed(2)}</p>
                          </div>
                        </div>

                        <RadioGroup
                          value={closureType || 'none'}
                          onValueChange={(value) => {
                            if (value === 'none') {
                              updateBracketState(group.bracket_id, { closureType: null });
                            } else {
                              updateBracketState(group.bracket_id, { closureType: value as ClosureType });
                            }
                          }}
                          disabled={isCompleted}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value={ClosureType.take_profit} id={`${group.bracket_id}-tp`} />
                            <Label htmlFor={`${group.bracket_id}-tp`} className="cursor-pointer">
                              Take Profit Hit
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value={ClosureType.stop_loss} id={`${group.bracket_id}-sl`} />
                            <Label htmlFor={`${group.bracket_id}-sl`} className="cursor-pointer">
                              Stop Loss Hit
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="none" id={`${group.bracket_id}-none`} />
                            <Label htmlFor={`${group.bracket_id}-none`} className="cursor-pointer">
                              Not Filled via TP/SL
                            </Label>
                          </div>
                        </RadioGroup>

                        <Separator />

                        <div className="space-y-3">
                          <Label className="text-sm font-medium">Per-Bracket Actions (Mutually Exclusive)</Label>
                          
                          <div className="flex items-center justify-between p-3 border rounded-lg bg-background">
                            <div className="flex items-center gap-3">
                              <Switch
                                checked={state?.breakEvenApplied || false}
                                onCheckedChange={(checked) => 
                                  updateBracketStateExclusive(group.bracket_id, { breakEvenApplied: checked })
                                }
                                disabled={isCompleted}
                              />
                              <div>
                                <Label className="font-medium cursor-pointer text-sm">Break Even</Label>
                                <p className="text-xs text-muted-foreground">Close at 0% P/L</p>
                              </div>
                            </div>
                            {state?.breakEvenApplied && (
                              <Input
                                type="number"
                                step="0.01"
                                value={state.breakEvenPrice}
                                onChange={(e) => 
                                  updateBracketState(group.bracket_id, { 
                                    breakEvenPrice: parseFloat(e.target.value) || trade.bracket_order.entry_price 
                                  })
                                }
                                disabled={isCompleted}
                                className="w-32"
                                placeholder="Price"
                              />
                            )}
                          </div>

                          <div className="flex items-center justify-between p-3 border rounded-lg bg-background">
                            <div className="flex items-center gap-3">
                              <Switch
                                checked={state?.manualCloseApplied || false}
                                onCheckedChange={(checked) => 
                                  updateBracketStateExclusive(group.bracket_id, { manualCloseApplied: checked })
                                }
                                disabled={isCompleted}
                              />
                              <div>
                                <Label className="font-medium cursor-pointer text-sm">Manual Close</Label>
                                <p className="text-xs text-muted-foreground">Close at custom price</p>
                              </div>
                            </div>
                            {state?.manualCloseApplied && (
                              <Input
                                type="number"
                                step="0.01"
                                value={state.manualClosePrice || ''}
                                onChange={(e) => 
                                  updateBracketState(group.bracket_id, { 
                                    manualClosePrice: parseFloat(e.target.value) || 0 
                                  })
                                }
                                disabled={isCompleted}
                                className="w-32"
                                placeholder="Price"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-4 bg-muted rounded-lg space-y-3">
              <h4 className="font-medium">{isCompleted ? 'Final Outcome (Stored)' : 'Calculated Outcome (Preview)'}</h4>
              
              {!isCompleted && displayedOutcome.remaining_brackets > 0 && (
                <div className="text-sm text-muted-foreground">
                  Remaining brackets: <span className="font-medium">{displayedOutcome.remaining_brackets}</span>
                </div>
              )}
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">P/L</p>
                  <p className={`text-xl font-bold ${displayedOutcome.final_pl_usd >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    ${displayedOutcome.final_pl_usd.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">P/L %</p>
                  <p className={`text-xl font-bold ${displayedOutcome.final_pl_pct >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {displayedOutcome.final_pl_pct.toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">R:R</p>
                  <p className="text-xl font-bold">{displayedOutcome.rr.toFixed(2)}R</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Reflection</h3>

            <div className="space-y-2">
              <Label>How did you feel?</Label>
              <div className="flex flex-wrap gap-2">
                {EMOTION_OPTIONS.map((emotion) => (
                  <Button
                    key={emotion}
                    type="button"
                    variant={emotions.includes(emotion) ? 'default' : 'outline'}
                    size="lg"
                    onClick={() => toggleEmotion(emotion)}
                    className="text-2xl"
                    disabled={isCompleted}
                  >
                    {emotion}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="What did you learn from this trade?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                disabled={isCompleted}
              />
            </div>

            <div className="space-y-2">
              <Label>Attach Images</Label>
              <div className="border-2 border-dashed rounded-lg p-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={isCompleted}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                  disabled={isCompleted}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Screenshots
                </Button>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  PNG, JPG up to 5MB each
                </p>
              </div>

              {uploadedImages.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Uploaded Images:</p>
                  <div className="grid grid-cols-3 gap-2">
                    {uploadedImages.map((url, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={url}
                          alt={`Uploaded ${index + 1}`}
                          className="w-full h-24 object-cover rounded border"
                        />
                        {!isCompleted && (
                          <button
                            onClick={() => removeUploadedImage(index)}
                            className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {imageFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Pending Upload:</p>
                  <div className="space-y-2">
                    {imageFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-2 flex-1">
                          {imagePreviews[index] && (
                            <img
                              src={imagePreviews[index]}
                              alt={file.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(file.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeImageFile(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <Label htmlFor="wouldTakeAgain" className="cursor-pointer">
                Would you take this trade again?
              </Label>
              <Switch 
                id="wouldTakeAgain" 
                checked={wouldTakeAgain} 
                onCheckedChange={setWouldTakeAgain}
                disabled={isCompleted}
              />
            </div>
          </div>

          <div className="pt-4 mt-6 border-t">
            <Button 
              onClick={handleSaveReflection} 
              disabled={addReflection.isPending || hasOutcomeErrors || !hasOutcomeSelection || isCompleted} 
              className="w-full"
              size="lg"
            >
              {addReflection.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Saving...
                </>
              ) : isCompleted ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Trade Already Completed
                </>
              ) : (
                'Save Reflection & Complete Trade'
              )}
            </Button>
            {!isCompleted && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                This will save your reflection, mark the trade as completed, and update analytics
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
