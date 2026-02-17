import { useState, useEffect, useMemo } from 'react';
import { useCreateTrade, useUpdateTrade, useGetCurrentTime, useGetModelConditions } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { CalendarIcon, Plus, Trash2, AlertCircle, Info, Calculator, ArrowDown, X } from 'lucide-react';
import { format } from 'date-fns';
import { CalculationMethod } from '../backend';
import type { Model, Trade, ModelCondition, ToolConfig, BracketGroup, BracketOrder, PositionSizer } from '../backend';

interface TradeFormProps {
  trade?: Trade | null;
  models: Model[];
  onClose: () => void;
  preloadedModelId?: string | null;
  preloadedObservations?: ModelCondition[];
}

interface ValidationError {
  field: string;
  message: string;
}

interface ScenarioOutcome {
  scenarioDescription: string;
  bracketOutcomes: { bracketIndex: number; outcome: string }[];
  totalPL: number;
  totalRisk: number;
  totalReward: number;
  overallRR: number;
  isValid: boolean;
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

// Helper to check if a number is valid for calculations
const isValidNumber = (value: number): boolean => {
  return typeof value === 'number' && isFinite(value) && !isNaN(value);
};

// Helper to extract readable description from tool properties
const extractToolDescription = (tool: ToolConfig): string => {
  try {
    const props = JSON.parse(tool.properties);
    const parts: string[] = [];
    
    parts.push(tool.type);
    
    if (props.type) parts.push(props.type);
    if (props.direction) parts.push(props.direction);
    if (props.timeframe) parts.push(`${props.timeframe.value}${props.timeframe.unit}`);
    if (props.structuralState && props.structuralState !== 'Regular') parts.push(props.structuralState);
    
    return parts.join(' - ');
  } catch {
    return `${tool.type} condition`;
  }
};

export default function TradeForm({ trade, models, onClose, preloadedModelId, preloadedObservations }: TradeFormProps) {
  const [modelId, setModelId] = useState('');
  const [asset, setAsset] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [direction, setDirection] = useState<'long' | 'short'>('long');
  const [modelConditions, setModelConditions] = useState<ModelCondition[]>([]);

  // Primary Position Sizing Parameters
  const [entryPrice, setEntryPrice] = useState('');
  const [primaryStopLoss, setPrimaryStopLoss] = useState('');
  const [accountCapital, setAccountCapital] = useState('10000');
  const [riskPercent, setRiskPercent] = useState('1');
  const [riskDollar, setRiskDollar] = useState('');
  const [useRiskDollar, setUseRiskDollar] = useState(false);
  const [assetType, setAssetType] = useState<'futures' | 'forex' | 'crypto' | 'stocks'>('futures');
  const [contractLotUnit, setContractLotUnit] = useState('contract');
  const [allowFractional, setAllowFractional] = useState(false);
  const [calculationMethod, setCalculationMethod] = useState<'tick' | 'point'>('point');
  const [valuePerUnit, setValuePerUnit] = useState('5');

  // OCO Bracket Groups with sl_modified_by_user flag
  const [bracketGroups, setBracketGroups] = useState<BracketGroup[]>([
    { bracket_id: crypto.randomUUID(), size: 0, take_profit_price: 0, stop_loss_price: 0, sl_modified_by_user: false }
  ]);

  // Track if we're in edit mode and have loaded the trade data
  const [isEditMode, setIsEditMode] = useState(false);
  const [hasLoadedTradeData, setHasLoadedTradeData] = useState(false);

  const createTrade = useCreateTrade();
  const updateTrade = useUpdateTrade();
  const { data: currentTime } = useGetCurrentTime();
  const { identity } = useInternetIdentity();
  
  const { 
    data: fetchedConditions, 
    isLoading: conditionsLoading, 
    isError: conditionsError,
    isFetching: conditionsFetching 
  } = useGetModelConditions(modelId);

  // Auto-derived total position size from sum of all bracket quantities
  const totalPositionSize = useMemo(() => {
    const total = bracketGroups.reduce((sum, group) => {
      const groupSize = isValidNumber(group.size) ? group.size : 0;
      return sum + groupSize;
    }, 0);
    return isValidNumber(total) ? total : 0;
  }, [bracketGroups]);

  // Load preloaded data from Setup Identifier (only for new trades)
  useEffect(() => {
    if (preloadedModelId && !trade) {
      setModelId(preloadedModelId);
    }
  }, [preloadedModelId, trade]);

  // Load model conditions and merge with persisted checkbox states or preloaded observations
  useEffect(() => {
    if (modelId && fetchedConditions && fetchedConditions.length > 0) {
      // If we're in edit mode and have persisted conditions, merge the isChecked states
      if (isEditMode && trade && trade.model_conditions && trade.model_conditions.length > 0) {
        // Create a map of persisted condition states
        const persistedStates = new Map(
          trade.model_conditions.map(c => [c.id, c.isChecked])
        );
        
        // Merge fetched conditions with persisted checkbox states
        const mergedConditions = fetchedConditions.map(condition => ({
          ...condition,
          isChecked: persistedStates.get(condition.id) ?? condition.isChecked
        }));
        
        setModelConditions(mergedConditions);
      } else if (!trade && preloadedObservations && preloadedObservations.length > 0) {
        // For new trades with preloaded observations, only check qualifying conditions
        const preloadedIds = new Set(preloadedObservations.map(obs => obs.id));
        
        const mergedConditions = fetchedConditions.map(condition => ({
          ...condition,
          isChecked: preloadedIds.has(condition.id)
        }));
        
        setModelConditions(mergedConditions);
      } else {
        // For new trades without preloaded data, use fetched conditions as-is
        setModelConditions(fetchedConditions);
      }
    } else if (modelId && !conditionsLoading && !conditionsFetching && fetchedConditions) {
      setModelConditions(fetchedConditions);
    }
  }, [fetchedConditions, modelId, conditionsLoading, conditionsFetching, isEditMode, trade, preloadedObservations]);

  // Load trade data for editing - load exactly as stored, no recalculation
  useEffect(() => {
    if (trade && !hasLoadedTradeData) {
      setIsEditMode(true);
      
      // Load basic trade info
      setModelId(trade.model_id);
      setAsset(trade.asset);
      setDate(new Date(Number(trade.created_at) / 1000000));
      setDirection(trade.direction as 'long' | 'short');
      
      // Load stored values exactly as they are from bracket_order
      setEntryPrice(trade.bracket_order.entry_price.toString());
      setPrimaryStopLoss(trade.bracket_order.primary_stop_loss.toString());
      setCalculationMethod(trade.calculation_method === CalculationMethod.tick ? 'tick' : 'point');
      setValuePerUnit(trade.value_per_unit.toString());
      
      // Load Position Sizer data from persisted position_sizer field
      if (trade.position_sizer) {
        setRiskPercent(trade.position_sizer.risk_percentage.toString());
        setAccountCapital(trade.position_sizer.account_capital.toString());
        setAssetType(trade.position_sizer.asset_type as 'futures' | 'forex' | 'crypto' | 'stocks');
        setContractLotUnit(trade.position_sizer.contract_lot_unit);
        setAllowFractional(trade.position_sizer.allow_fractional_size);
      }
      
      // Load bracket groups exactly as stored - preserve all fields including sl_modified_by_user
      if (trade.bracket_order.bracket_groups.length > 0) {
        setBracketGroups(trade.bracket_order.bracket_groups.map(bg => ({
          bracket_id: bg.bracket_id,
          size: bg.size,
          take_profit_price: bg.take_profit_price,
          stop_loss_price: bg.stop_loss_price,
          sl_modified_by_user: bg.sl_modified_by_user ?? false
        })));
      }
      
      // Load model conditions with persisted checkbox states
      if (trade.model_conditions && trade.model_conditions.length > 0) {
        setModelConditions(trade.model_conditions);
      }
      
      setHasLoadedTradeData(true);
    }
  }, [trade, hasLoadedTradeData]);

  useEffect(() => {
    if (assetType === 'crypto') {
      setAllowFractional(true);
    }
  }, [assetType]);

  const adherenceScore = useMemo(() => {
    if (modelConditions.length === 0) return 0;
    const checkedCount = modelConditions.filter(c => c.isChecked).length;
    return (checkedCount / modelConditions.length) * 100;
  }, [modelConditions]);

  const toggleCondition = (conditionId: string) => {
    setModelConditions(prev =>
      prev.map(c => c.id === conditionId ? { ...c, isChecked: !c.isChecked } : c)
    );
  };

  // Enhanced Stop-Loss Validation: Validate Primary Stop-Loss based on trade direction
  const primaryStopLossValid = useMemo(() => {
    const entry = safeParseFloat(entryPrice);
    const primarySL = safeParseFloat(primaryStopLoss);
    
    if (entry === 0 || primarySL === 0 || !isValidNumber(entry) || !isValidNumber(primarySL)) {
      return { valid: true, message: '' }; // Don't show error if values are not yet entered
    }

    if (direction === 'long') {
      // For long trades, Primary Stop-Loss must be less than Entry Price
      if (primarySL >= entry) {
        return { 
          valid: false, 
          message: 'For long trades, stop-loss must be below entry price' 
        };
      }
    } else {
      // For short trades, Primary Stop-Loss must be greater than Entry Price
      if (primarySL <= entry) {
        return { 
          valid: false, 
          message: 'For short trades, stop-loss must be above entry price' 
        };
      }
    }

    return { valid: true, message: '' };
  }, [entryPrice, primaryStopLoss, direction]);

  // Calculate total position size based on risk and primary stop-loss
  // Only calculate when Primary Stop-Loss validation passes
  const calculatedPositionSize = useMemo(() => {
    // Block calculation if Primary Stop-Loss validation fails
    if (!primaryStopLossValid.valid) {
      return 0;
    }

    const entry = safeParseFloat(entryPrice);
    const primarySL = safeParseFloat(primaryStopLoss);
    const capital = safeParseFloat(accountCapital);
    const valuePerUnitNum = safeParseFloat(valuePerUnit);
    
    if (entry === 0 || primarySL === 0 || capital === 0 || valuePerUnitNum === 0 || 
        !isValidNumber(entry) || !isValidNumber(primarySL) || !isValidNumber(capital) || !isValidNumber(valuePerUnitNum)) {
      return 0;
    }

    let riskAmount = 0;
    if (useRiskDollar) {
      riskAmount = safeParseFloat(riskDollar);
    } else {
      const riskPct = safeParseFloat(riskPercent);
      riskAmount = (capital * riskPct) / 100;
    }

    if (riskAmount === 0 || !isValidNumber(riskAmount)) {
      return 0;
    }

    const stopDistance = Math.abs(entry - primarySL);
    let size = riskAmount / (stopDistance * valuePerUnitNum);

    if (assetType === 'futures' && !allowFractional) {
      size = Math.floor(size);
    } else if (assetType === 'crypto') {
      size = Math.round(size * 100000000) / 100000000;
    } else {
      size = Math.round(size * 100) / 100;
    }

    return isValidNumber(size) ? size : 0;
  }, [entryPrice, primaryStopLoss, accountCapital, riskPercent, riskDollar, useRiskDollar, assetType, allowFractional, valuePerUnit, primaryStopLossValid]);

  // Manual bracket population function
  const populateBracketSizes = () => {
    if (calculatedPositionSize > 0 && bracketGroups.length > 0) {
      const evenSize = calculatedPositionSize / bracketGroups.length;
      const roundedSize = assetType === 'futures' && !allowFractional 
        ? Math.floor(evenSize) 
        : Math.round(evenSize * 100) / 100;
      
      setBracketGroups(prev => prev.map(group => ({
        ...group,
        size: roundedSize
      })));
      
      toast.success('Bracket sizes populated from calculated position size');
    } else if (calculatedPositionSize === 0) {
      toast.error('Cannot populate: calculated position size is zero');
    }
  };

  // Dynamic Primary SL Synchronization: Update bracket SL values when Primary Stop-Loss changes
  // Only sync if Primary Stop-Loss validation passes and NOT in edit mode after initial load
  useEffect(() => {
    if (!isEditMode) {
      const primarySLValue = safeParseFloat(primaryStopLoss);
      
      // Only sync if Primary Stop-Loss validation passes
      if (primarySLValue !== 0 && isValidNumber(primarySLValue) && primaryStopLossValid.valid) {
        setBracketGroups(prev => prev.map(group => {
          // Only update SL if sl_modified_by_user is false
          if (!group.sl_modified_by_user) {
            return {
              ...group,
              stop_loss_price: primarySLValue
            };
          }
          return group;
        }));
      }
    }
  }, [primaryStopLoss, primaryStopLossValid, isEditMode]);

  const addBracketGroup = () => {
    const primarySLValue = safeParseFloat(primaryStopLoss);
    
    const newBracket: BracketGroup = { 
      bracket_id: crypto.randomUUID(), 
      size: 0, 
      take_profit_price: 0, 
      stop_loss_price: primarySLValue, // Initialize with current Primary SL
      sl_modified_by_user: false // New brackets default to false
    };
    
    const newGroups = [...bracketGroups, newBracket];
    setBracketGroups(newGroups);
  };

  const removeBracketGroup = (index: number) => {
    if (bracketGroups.length > 1) {
      const newGroups = bracketGroups.filter((_, i) => i !== index);
      setBracketGroups(newGroups);
    }
  };

  const updateBracketGroup = (index: number, field: keyof BracketGroup, value: string) => {
    if (field === 'bracket_id' || field === 'sl_modified_by_user') return;
    if (!isValidNumericInput(value)) return;
    
    const newGroups = [...bracketGroups];
    const numValue = value === '' ? 0 : safeParseFloat(value);
    
    // If user manually edits the SL field, set sl_modified_by_user to true
    if (field === 'stop_loss_price') {
      newGroups[index] = { 
        ...newGroups[index], 
        [field]: numValue,
        sl_modified_by_user: true // Mark as manually modified
      };
    } else {
      newGroups[index] = { ...newGroups[index], [field]: numValue };
    }
    
    setBracketGroups(newGroups);
  };

  // Position Sizer results display
  // Only calculate when Primary Stop-Loss validation passes
  const positionSizerResults = useMemo(() => {
    // Block calculation if Primary Stop-Loss validation fails
    if (!primaryStopLossValid.valid) {
      return {
        recommendedSize: 0,
        riskDollars: 0,
        riskPercent: 0,
        potentialReward: 0,
        potentialRR: 0,
      };
    }

    const entry = safeParseFloat(entryPrice);
    const primarySL = safeParseFloat(primaryStopLoss);
    const capital = safeParseFloat(accountCapital);
    const valuePerUnitNum = safeParseFloat(valuePerUnit);
    
    if (entry === 0 || primarySL === 0 || capital === 0 || valuePerUnitNum === 0 || 
        !isValidNumber(entry) || !isValidNumber(primarySL) || !isValidNumber(capital) || !isValidNumber(valuePerUnitNum)) {
      return {
        recommendedSize: 0,
        riskDollars: 0,
        riskPercent: 0,
        potentialReward: 0,
        potentialRR: 0,
      };
    }

    let riskAmount = 0;
    if (useRiskDollar) {
      riskAmount = safeParseFloat(riskDollar);
    } else {
      const riskPct = safeParseFloat(riskPercent);
      riskAmount = (capital * riskPct) / 100;
    }

    if (riskAmount === 0 || !isValidNumber(riskAmount)) {
      return {
        recommendedSize: 0,
        riskDollars: 0,
        riskPercent: 0,
        potentialReward: 0,
        potentialRR: 0,
      };
    }

    const stopDistance = Math.abs(entry - primarySL);
    let size = riskAmount / (stopDistance * valuePerUnitNum);

    if (assetType === 'futures' && !allowFractional) {
      size = Math.floor(size);
    } else if (assetType === 'crypto') {
      size = Math.round(size * 100000000) / 100000000;
    } else {
      size = Math.round(size * 100) / 100;
    }

    const actualRiskDollars = size * stopDistance * valuePerUnitNum;
    const actualRiskPercent = (actualRiskDollars / capital) * 100;

    return {
      recommendedSize: isValidNumber(size) ? size : 0,
      riskDollars: isValidNumber(actualRiskDollars) ? actualRiskDollars : 0,
      riskPercent: isValidNumber(actualRiskPercent) ? actualRiskPercent : 0,
      potentialReward: 0,
      potentialRR: 0,
    };
  }, [entryPrice, primaryStopLoss, accountCapital, riskPercent, riskDollar, useRiskDollar, assetType, allowFractional, valuePerUnit, primaryStopLossValid]);

  // Scenario Analysis
  const [scenarios, setScenarios] = useState<ScenarioOutcome[]>([]);

  const calculateScenario = (scenarioDescription: string, bracketOutcomes: { bracketIndex: number; outcome: string }[]): ScenarioOutcome => {
    const entry = safeParseFloat(entryPrice);
    const primarySL = safeParseFloat(primaryStopLoss);
    const valuePerUnitNum = safeParseFloat(valuePerUnit);
    
    if (entry === 0 || primarySL === 0 || valuePerUnitNum === 0 || 
        !isValidNumber(entry) || !isValidNumber(primarySL) || !isValidNumber(valuePerUnitNum)) {
      return {
        scenarioDescription,
        bracketOutcomes,
        totalPL: 0,
        totalRisk: 0,
        totalReward: 0,
        overallRR: 0,
        isValid: false,
      };
    }

    let totalPL = 0;
    let totalRisk = 0;
    let totalReward = 0;

    bracketOutcomes.forEach(({ bracketIndex, outcome }) => {
      const bracket = bracketGroups[bracketIndex];
      if (!bracket) return;

      const size = bracket.size;
      const tp = bracket.take_profit_price;
      const sl = bracket.stop_loss_price;

      if (outcome === 'tp') {
        const plPerUnit = direction === 'long' ? (tp - entry) : (entry - tp);
        const pl = plPerUnit * size * valuePerUnitNum;
        totalPL += pl;
        totalReward += pl;
      } else if (outcome === 'sl') {
        const plPerUnit = direction === 'long' ? (sl - entry) : (entry - sl);
        const pl = plPerUnit * size * valuePerUnitNum;
        totalPL += pl;
        totalRisk += Math.abs(pl);
      }
    });

    const overallRR = totalRisk !== 0 ? totalPL / totalRisk : 0;

    return {
      scenarioDescription,
      bracketOutcomes,
      totalPL: isValidNumber(totalPL) ? totalPL : 0,
      totalRisk: isValidNumber(totalRisk) ? totalRisk : 0,
      totalReward: isValidNumber(totalReward) ? totalReward : 0,
      overallRR: isValidNumber(overallRR) ? overallRR : 0,
      isValid: true,
    };
  };

  const addScenario = () => {
    const newScenario = calculateScenario(
      `Scenario ${scenarios.length + 1}`,
      bracketGroups.map((_, index) => ({ bracketIndex: index, outcome: 'tp' }))
    );
    setScenarios([...scenarios, newScenario]);
  };

  const removeScenario = (index: number) => {
    setScenarios(scenarios.filter((_, i) => i !== index));
  };

  const updateScenarioOutcome = (scenarioIndex: number, bracketIndex: number, outcome: string) => {
    const updatedScenarios = [...scenarios];
    const scenario = updatedScenarios[scenarioIndex];
    const updatedBracketOutcomes = scenario.bracketOutcomes.map((bo) =>
      bo.bracketIndex === bracketIndex ? { ...bo, outcome } : bo
    );
    updatedScenarios[scenarioIndex] = calculateScenario(scenario.scenarioDescription, updatedBracketOutcomes);
    setScenarios(updatedScenarios);
  };

  const handleSubmit = async () => {
    // Validation
    const errors: ValidationError[] = [];

    if (!modelId) errors.push({ field: 'model', message: 'Please select a model' });
    if (!asset) errors.push({ field: 'asset', message: 'Please enter an asset' });
    if (!entryPrice || safeParseFloat(entryPrice) === 0) errors.push({ field: 'entryPrice', message: 'Please enter entry price' });
    if (!primaryStopLoss || safeParseFloat(primaryStopLoss) === 0) errors.push({ field: 'primaryStopLoss', message: 'Please enter primary stop-loss' });
    if (!primaryStopLossValid.valid) errors.push({ field: 'primaryStopLoss', message: primaryStopLossValid.message });
    if (bracketGroups.length === 0) errors.push({ field: 'brackets', message: 'Please add at least one bracket' });
    if (totalPositionSize === 0) errors.push({ field: 'brackets', message: 'Total position size cannot be zero' });

    // Validate bracket groups
    bracketGroups.forEach((bg, index) => {
      if (bg.size === 0) {
        errors.push({ field: `bracket-${index}`, message: `Bracket ${index + 1}: Size cannot be zero` });
      }
      if (bg.take_profit_price === 0) {
        errors.push({ field: `bracket-${index}`, message: `Bracket ${index + 1}: Take profit price cannot be zero` });
      }
      if (bg.stop_loss_price === 0) {
        errors.push({ field: `bracket-${index}`, message: `Bracket ${index + 1}: Stop loss price cannot be zero` });
      }

      // Validate TP/SL relationship based on direction
      if (direction === 'long') {
        if (bg.take_profit_price <= safeParseFloat(entryPrice)) {
          errors.push({ field: `bracket-${index}`, message: `Bracket ${index + 1}: For long trades, take profit must be above entry` });
        }
        if (bg.stop_loss_price >= safeParseFloat(entryPrice)) {
          errors.push({ field: `bracket-${index}`, message: `Bracket ${index + 1}: For long trades, stop loss must be below entry` });
        }
      } else {
        if (bg.take_profit_price >= safeParseFloat(entryPrice)) {
          errors.push({ field: `bracket-${index}`, message: `Bracket ${index + 1}: For short trades, take profit must be below entry` });
        }
        if (bg.stop_loss_price <= safeParseFloat(entryPrice)) {
          errors.push({ field: `bracket-${index}`, message: `Bracket ${index + 1}: For short trades, stop loss must be above entry` });
        }
      }
    });

    if (errors.length > 0) {
      toast.error(errors[0].message);
      return;
    }

    if (!identity) {
      toast.error('Please log in to create a trade');
      return;
    }

    const positionSizer: PositionSizer = {
      risk_percentage: safeParseFloat(riskPercent),
      account_capital: safeParseFloat(accountCapital),
      entry_price: safeParseFloat(entryPrice),
      primary_stop_loss: safeParseFloat(primaryStopLoss),
      asset_type: assetType,
      contract_lot_unit: contractLotUnit,
      value_per_point: safeParseFloat(valuePerUnit),
      allow_fractional_size: allowFractional,
    };

    const bracketOrder: BracketOrder = {
      entry_price: safeParseFloat(entryPrice),
      primary_stop_loss: safeParseFloat(primaryStopLoss),
      bracket_groups: bracketGroups,
      calculation_method: calculationMethod,
      value_per_unit: safeParseFloat(valuePerUnit),
      position_size: totalPositionSize,
      position_sizer: positionSizer,
    };

    const tradeData: Trade = {
      id: trade?.id || crypto.randomUUID(),
      owner: identity.getPrincipal(),
      model_id: modelId,
      asset,
      direction,
      bracket_order: bracketOrder,
      bracket_order_outcomes: trade?.bracket_order_outcomes || [],
      notes: trade?.notes || '',
      mood: trade?.mood || '',
      images: trade?.images || [],
      quickTags: trade?.quickTags || [],
      mistakeTags: trade?.mistakeTags || [],
      strengthTags: trade?.strengthTags || [],
      created_at: trade?.created_at || BigInt(date.getTime() * 1000000),
      calculation_method: calculationMethod === 'tick' ? CalculationMethod.tick : CalculationMethod.point,
      value_per_unit: safeParseFloat(valuePerUnit),
      model_conditions: modelConditions,
      adherence_score: adherenceScore / 100,
      is_completed: trade?.is_completed || false,
      position_sizer: positionSizer,
      would_take_again: trade?.would_take_again || false,
      close_time: trade?.close_time || undefined,
    };

    try {
      if (trade) {
        await updateTrade.mutateAsync(tradeData);
        toast.success('Trade updated successfully!');
      } else {
        await createTrade.mutateAsync(tradeData);
        toast.success('Trade created successfully!');
      }
      onClose();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save trade');
      console.error(error);
    }
  };

  return (
    <div className="trade-form-inline space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Trade Information */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Trade Information</CardTitle>
          <CardDescription>Basic details about your trade</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="model">Model *</Label>
              <Select value={modelId} onValueChange={setModelId}>
                <SelectTrigger id="model">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="asset">Asset *</Label>
              <Input
                id="asset"
                placeholder="e.g., ES, NQ, EURUSD"
                value={asset}
                onChange={(e) => setAsset(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(date, 'PPP')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Direction *</Label>
              <RadioGroup value={direction} onValueChange={(v) => setDirection(v as 'long' | 'short')}>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="long" id="long" />
                    <Label htmlFor="long" className="font-normal cursor-pointer">
                      Long
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="short" id="short" />
                    <Label htmlFor="short" className="font-normal cursor-pointer">
                      Short
                    </Label>
                  </div>
                </div>
              </RadioGroup>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Model Adherence */}
      {modelId && (
        <Card className="w-full">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="min-w-0 flex-1">
                <CardTitle>Model Adherence</CardTitle>
                <CardDescription>Check the conditions you observed</CardDescription>
              </div>
              <Badge variant="outline" className="text-lg px-3 py-1 shrink-0">
                {adherenceScore.toFixed(0)}%
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {conditionsLoading || conditionsFetching ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : conditionsError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Failed to load model conditions</AlertDescription>
              </Alert>
            ) : modelConditions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No conditions defined for this model</p>
            ) : (
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-3">
                  {modelConditions.map((condition) => (
                    <div key={condition.id} className="flex items-start space-x-3 p-3 rounded-lg border">
                      <Checkbox
                        id={condition.id}
                        checked={condition.isChecked}
                        onCheckedChange={() => toggleCondition(condition.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <Label htmlFor={condition.id} className="text-sm font-medium cursor-pointer break-words">
                          {condition.description}
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Zone: {condition.zone}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
            <div className="mt-4">
              <Progress value={adherenceScore} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Position Sizing */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Position Sizing</CardTitle>
          <CardDescription>Calculate your position size based on risk</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entry-price">Entry Price *</Label>
              <Input
                id="entry-price"
                type="text"
                placeholder="0.00"
                value={entryPrice}
                onChange={(e) => {
                  if (isValidNumericInput(e.target.value)) {
                    setEntryPrice(e.target.value);
                  }
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="primary-sl">Primary Stop-Loss *</Label>
              <Input
                id="primary-sl"
                type="text"
                placeholder="0.00"
                value={primaryStopLoss}
                onChange={(e) => {
                  if (isValidNumericInput(e.target.value)) {
                    setPrimaryStopLoss(e.target.value);
                  }
                }}
                className={!primaryStopLossValid.valid ? 'border-destructive' : ''}
              />
              {!primaryStopLossValid.valid && (
                <p className="text-sm text-destructive">{primaryStopLossValid.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="account-capital">Account Capital</Label>
              <Input
                id="account-capital"
                type="text"
                placeholder="10000"
                value={accountCapital}
                onChange={(e) => {
                  if (isValidNumericInput(e.target.value)) {
                    setAccountCapital(e.target.value);
                  }
                }}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="risk-percent">Risk %</Label>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="use-risk-dollar" className="text-xs text-muted-foreground">
                    Use $
                  </Label>
                  <Switch
                    id="use-risk-dollar"
                    checked={useRiskDollar}
                    onCheckedChange={setUseRiskDollar}
                  />
                </div>
              </div>
              {useRiskDollar ? (
                <Input
                  id="risk-dollar"
                  type="text"
                  placeholder="100"
                  value={riskDollar}
                  onChange={(e) => {
                    if (isValidNumericInput(e.target.value)) {
                      setRiskDollar(e.target.value);
                    }
                  }}
                />
              ) : (
                <Input
                  id="risk-percent"
                  type="text"
                  placeholder="1"
                  value={riskPercent}
                  onChange={(e) => {
                    if (isValidNumericInput(e.target.value)) {
                      setRiskPercent(e.target.value);
                    }
                  }}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="asset-type">Asset Type</Label>
              <Select value={assetType} onValueChange={(v) => setAssetType(v as typeof assetType)}>
                <SelectTrigger id="asset-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="futures">Futures</SelectItem>
                  <SelectItem value="forex">Forex</SelectItem>
                  <SelectItem value="crypto">Crypto</SelectItem>
                  <SelectItem value="stocks">Stocks</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contract-lot-unit">Contract/Lot Unit</Label>
              <Input
                id="contract-lot-unit"
                placeholder="contract"
                value={contractLotUnit}
                onChange={(e) => setContractLotUnit(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="calculation-method">Calculation Method</Label>
              <Select value={calculationMethod} onValueChange={(v) => setCalculationMethod(v as 'tick' | 'point')}>
                <SelectTrigger id="calculation-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="point">Point</SelectItem>
                  <SelectItem value="tick">Tick</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="value-per-unit">Value Per {calculationMethod === 'tick' ? 'Tick' : 'Point'}</Label>
              <Input
                id="value-per-unit"
                type="text"
                placeholder="5"
                value={valuePerUnit}
                onChange={(e) => {
                  if (isValidNumericInput(e.target.value)) {
                    setValuePerUnit(e.target.value);
                  }
                }}
              />
            </div>
          </div>

          {assetType === 'futures' && (
            <div className="flex items-center space-x-2">
              <Switch
                id="allow-fractional"
                checked={allowFractional}
                onCheckedChange={setAllowFractional}
              />
              <Label htmlFor="allow-fractional" className="text-sm">
                Allow fractional contracts
              </Label>
            </div>
          )}

          <Separator />

          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Calculated Position Size:</span>
              <span className="text-lg font-bold">
                {calculatedPositionSize.toFixed(assetType === 'crypto' ? 8 : 2)} {contractLotUnit}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Risk Amount:</span>
              <span>${positionSizerResults.riskDollars.toFixed(2)} ({positionSizerResults.riskPercent.toFixed(2)}%)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bracket Configuration */}
      <Card className="w-full">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="min-w-0 flex-1">
              <CardTitle>Bracket Configuration</CardTitle>
              <CardDescription>Define your take-profit and stop-loss brackets</CardDescription>
            </div>
            <Button onClick={populateBracketSizes} variant="outline" size="sm" className="gap-2 shrink-0">
              <Calculator className="w-4 h-4" />
              Populate Sizes
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            {bracketGroups.map((group, index) => (
              <div key={group.bracket_id} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Bracket {index + 1}</h4>
                  {bracketGroups.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeBracketGroup(index)}
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor={`bracket-${index}-size`}>Size</Label>
                    <Input
                      id={`bracket-${index}-size`}
                      type="text"
                      placeholder="0"
                      value={group.size === 0 ? '' : group.size.toString()}
                      onChange={(e) => updateBracketGroup(index, 'size', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`bracket-${index}-tp`}>Take Profit</Label>
                    <Input
                      id={`bracket-${index}-tp`}
                      type="text"
                      placeholder="0.00"
                      value={group.take_profit_price === 0 ? '' : group.take_profit_price.toString()}
                      onChange={(e) => updateBracketGroup(index, 'take_profit_price', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`bracket-${index}-sl`}>Stop Loss</Label>
                    <Input
                      id={`bracket-${index}-sl`}
                      type="text"
                      placeholder="0.00"
                      value={group.stop_loss_price === 0 ? '' : group.stop_loss_price.toString()}
                      onChange={(e) => updateBracketGroup(index, 'stop_loss_price', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button onClick={addBracketGroup} variant="outline" className="w-full gap-2">
            <Plus className="w-4 h-4" />
            Add Bracket
          </Button>

          <div className="bg-muted p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Position Size:</span>
              <span className="text-lg font-bold">
                {totalPositionSize.toFixed(assetType === 'crypto' ? 8 : 2)} {contractLotUnit}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scenario Analysis */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Scenario Analysis</CardTitle>
          <CardDescription>Model different outcome scenarios</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {scenarios.length === 0 ? (
            <p className="text-sm text-muted-foreground">No scenarios added yet</p>
          ) : (
            <div className="space-y-4">
              {scenarios.map((scenario, scenarioIndex) => (
                <div key={scenarioIndex} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">{scenario.scenarioDescription}</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeScenario(scenarioIndex)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {scenario.bracketOutcomes.map(({ bracketIndex, outcome }) => (
                      <div key={bracketIndex} className="space-y-2">
                        <Label className="text-xs">Bracket {bracketIndex + 1}</Label>
                        <Select
                          value={outcome}
                          onValueChange={(v) => updateScenarioOutcome(scenarioIndex, bracketIndex, v)}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="tp">TP</SelectItem>
                            <SelectItem value="sl">SL</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>

                  {scenario.isValid && (
                    <div className="bg-muted p-3 rounded-lg space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>Total P/L:</span>
                        <span className={`font-semibold ${scenario.totalPL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          ${scenario.totalPL.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>R:R Ratio:</span>
                        <span className="font-semibold">{scenario.overallRR.toFixed(2)}R</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <Button onClick={addScenario} variant="outline" className="w-full gap-2">
            <Plus className="w-4 h-4" />
            Add Scenario
          </Button>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-end">
        <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={createTrade.isPending || updateTrade.isPending}
          className="w-full sm:w-auto"
        >
          {createTrade.isPending || updateTrade.isPending
            ? 'Saving...'
            : trade
            ? 'Update Trade'
            : 'Create Trade'}
        </Button>
      </div>
    </div>
  );
}
