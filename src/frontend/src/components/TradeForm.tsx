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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { CalendarIcon, Plus, Trash2, AlertCircle, Info, CheckCircle2, Calculator, ArrowDown } from 'lucide-react';
import { format } from 'date-fns';
import { CalculationMethod } from '../backend';
import type { Model, Trade, ModelCondition, ToolConfig, BracketOrderOutcome, BracketGroup, BracketOrder, PositionSizer } from '../backend';

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
  bracketOutcomes: { bracketIndex: number; outcome: 'TP' | 'SL' }[];
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

  // Bracket-level validation
  const bracketValidation = useMemo(() => {
    const errors: ValidationError[] = [];
    const entry = safeParseFloat(entryPrice);

    bracketGroups.forEach((group, index) => {
      if (group.size <= 0) {
        errors.push({ field: `bracket_${index}_size`, message: `Bracket ${index + 1}: Size must be greater than 0` });
      }

      if (direction === 'long') {
        if (group.take_profit_price <= entry) {
          errors.push({ field: `bracket_${index}_tp`, message: `Bracket ${index + 1}: Take profit must be above entry for long trades` });
        }
        if (group.stop_loss_price >= entry) {
          errors.push({ field: `bracket_${index}_sl`, message: `Bracket ${index + 1}: Stop loss must be below entry for long trades` });
        }
      } else {
        if (group.take_profit_price >= entry) {
          errors.push({ field: `bracket_${index}_tp`, message: `Bracket ${index + 1}: Take profit must be below entry for short trades` });
        }
        if (group.stop_loss_price <= entry) {
          errors.push({ field: `bracket_${index}_sl`, message: `Bracket ${index + 1}: Stop loss must be above entry for short trades` });
        }
      }
    });

    return errors;
  }, [bracketGroups, entryPrice, direction]);

  // Scenario analysis
  const scenarioAnalysis = useMemo((): ScenarioOutcome[] => {
    const entry = safeParseFloat(entryPrice);
    const valuePerUnitNum = safeParseFloat(valuePerUnit);

    if (entry === 0 || valuePerUnitNum === 0 || !isValidNumber(entry) || !isValidNumber(valuePerUnitNum)) {
      return [];
    }

    const scenarios: ScenarioOutcome[] = [];

    // All TP scenario
    let totalPL = 0;
    let totalRisk = 0;
    let totalReward = 0;

    bracketGroups.forEach((group, index) => {
      const tpDistance = Math.abs(group.take_profit_price - entry);
      const slDistance = Math.abs(group.stop_loss_price - entry);
      const reward = group.size * tpDistance * valuePerUnitNum;
      const risk = group.size * slDistance * valuePerUnitNum;

      totalPL += reward;
      totalReward += reward;
      totalRisk += risk;
    });

    const allTPRR = totalRisk > 0 ? totalReward / totalRisk : 0;

    scenarios.push({
      scenarioDescription: 'All Take Profits Hit',
      bracketOutcomes: bracketGroups.map((_, index) => ({ bracketIndex: index, outcome: 'TP' as const })),
      totalPL,
      totalRisk,
      totalReward,
      overallRR: allTPRR,
      isValid: isValidNumber(totalPL) && isValidNumber(allTPRR),
    });

    // All SL scenario
    totalPL = 0;
    totalRisk = 0;
    totalReward = 0;

    bracketGroups.forEach((group) => {
      const slDistance = Math.abs(group.stop_loss_price - entry);
      const risk = group.size * slDistance * valuePerUnitNum;
      totalPL -= risk;
      totalRisk += risk;
    });

    const allSLRR = totalRisk > 0 ? 0 / totalRisk : 0;

    scenarios.push({
      scenarioDescription: 'All Stop Losses Hit',
      bracketOutcomes: bracketGroups.map((_, index) => ({ bracketIndex: index, outcome: 'SL' as const })),
      totalPL,
      totalRisk,
      totalReward: 0,
      overallRR: allSLRR,
      isValid: isValidNumber(totalPL) && isValidNumber(allSLRR),
    });

    // Mixed scenarios (first N TPs, rest SL)
    for (let tpCount = 1; tpCount < bracketGroups.length; tpCount++) {
      totalPL = 0;
      totalRisk = 0;
      totalReward = 0;

      bracketGroups.forEach((group, index) => {
        if (index < tpCount) {
          const tpDistance = Math.abs(group.take_profit_price - entry);
          const reward = group.size * tpDistance * valuePerUnitNum;
          totalPL += reward;
          totalReward += reward;
        } else {
          const slDistance = Math.abs(group.stop_loss_price - entry);
          const risk = group.size * slDistance * valuePerUnitNum;
          totalPL -= risk;
          totalRisk += risk;
        }
      });

      const mixedRR = totalRisk > 0 ? totalReward / totalRisk : 0;

      scenarios.push({
        scenarioDescription: `First ${tpCount} TP${tpCount > 1 ? 's' : ''}, Rest SL`,
        bracketOutcomes: bracketGroups.map((_, index) => ({
          bracketIndex: index,
          outcome: (index < tpCount ? 'TP' : 'SL') as 'TP' | 'SL',
        })),
        totalPL,
        totalRisk,
        totalReward,
        overallRR: mixedRR,
        isValid: isValidNumber(totalPL) && isValidNumber(mixedRR),
      });
    }

    return scenarios.filter(s => s.isValid);
  }, [bracketGroups, entryPrice, valuePerUnit]);

  const handleSubmit = async () => {
    if (!modelId || !asset || !identity) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (bracketValidation.length > 0) {
      toast.error('Please fix bracket validation errors');
      return;
    }

    if (!primaryStopLossValid.valid) {
      toast.error(primaryStopLossValid.message);
      return;
    }

    try {
      const timestamp = currentTime || BigInt(Date.now() * 1000000);

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

      const emptyOutcome: BracketOrderOutcome = {
        filled_bracket_groups: [],
        final_pl_pct: 0,
        final_pl_usd: 0,
        rr: 0,
      };

      const adherenceScoreDecimal = adherenceScore / 100;

      const tradeData: Trade = {
        id: trade?.id || crypto.randomUUID(),
        owner: identity.getPrincipal(),
        model_id: modelId,
        asset,
        direction,
        bracket_order: bracketOrder,
        bracket_order_outcome: emptyOutcome,
        notes: '',
        emotions: [],
        images: [],
        created_at: trade?.created_at || timestamp,
        calculation_method: calculationMethod === 'tick' ? CalculationMethod.tick : CalculationMethod.point,
        value_per_unit: safeParseFloat(valuePerUnit),
        model_conditions: modelConditions,
        adherence_score: adherenceScoreDecimal,
        is_completed: false,
        position_sizer: positionSizer,
      };

      if (trade) {
        await updateTrade.mutateAsync(tradeData);
        toast.success('Trade updated successfully');
      } else {
        await createTrade.mutateAsync(tradeData);
        toast.success('Trade logged successfully');
      }

      onClose();
    } catch (error: any) {
      console.error('Failed to save trade:', error);
      toast.error(error.message || 'Failed to save trade');
    }
  };

  const selectedModel = models.find(m => m.id === modelId);

  return (
    <div className="trade-form-inline w-full space-y-6">
      {/* Trade Information Section */}
      <Card>
        <CardHeader>
          <CardTitle>Trade Information</CardTitle>
          <CardDescription>Basic trade details and model selection</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="model">Trading Model *</Label>
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
                value={asset}
                onChange={(e) => setAsset(e.target.value)}
                placeholder="e.g., NQ, ES, EURUSD"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Trade Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'PPP') : <span>Pick a date</span>}
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
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="long" id="long" />
                    <Label htmlFor="long">Long</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="short" id="short" />
                    <Label htmlFor="short">Short</Label>
                  </div>
                </div>
              </RadioGroup>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Model Adherence Section - Now positioned directly under Trade Information */}
      {modelId && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Model Adherence</CardTitle>
                <CardDescription>
                  Check the conditions that were present in this trade
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={adherenceScore} className="w-32" />
                <Badge variant={adherenceScore >= 80 ? 'default' : adherenceScore >= 50 ? 'secondary' : 'destructive'}>
                  {adherenceScore.toFixed(0)}%
                </Badge>
              </div>
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
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Failed to load model conditions. Please try selecting the model again.
                </AlertDescription>
              </Alert>
            ) : modelConditions.length === 0 ? (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  No conditions found for this model. Add tools to your model to track adherence.
                </AlertDescription>
              </Alert>
            ) : (
              <ScrollArea className="h-[300px] w-full">
                <div className="space-y-3 pr-4">
                  {['narrative', 'framework', 'execution'].map((zone) => {
                    const zoneConditions = modelConditions.filter(c => c.zone === zone);
                    if (zoneConditions.length === 0) return null;

                    return (
                      <div key={zone} className="space-y-2">
                        <h4 className="font-semibold text-sm capitalize">{zone}</h4>
                        {zoneConditions.map((condition) => (
                          <div key={condition.id} className="flex items-start space-x-2 p-2 rounded-lg hover:bg-accent">
                            <Checkbox
                              id={condition.id}
                              checked={condition.isChecked}
                              onCheckedChange={() => toggleCondition(condition.id)}
                            />
                            <Label
                              htmlFor={condition.id}
                              className="text-sm cursor-pointer flex-1 leading-relaxed"
                            >
                              {condition.description}
                            </Label>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}

      {/* Position Sizer Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Position Sizer
          </CardTitle>
          <CardDescription>Calculate recommended position size based on risk parameters</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entryPrice">Entry Price *</Label>
              <Input
                id="entryPrice"
                value={entryPrice}
                onChange={(e) => isValidNumericInput(e.target.value) && setEntryPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="primaryStopLoss">Primary Stop-Loss *</Label>
              <Input
                id="primaryStopLoss"
                value={primaryStopLoss}
                onChange={(e) => isValidNumericInput(e.target.value) && setPrimaryStopLoss(e.target.value)}
                placeholder="0.00"
                className={!primaryStopLossValid.valid ? 'border-destructive' : ''}
              />
              {!primaryStopLossValid.valid && (
                <p className="text-sm text-destructive">{primaryStopLossValid.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountCapital">Account Capital</Label>
              <Input
                id="accountCapital"
                value={accountCapital}
                onChange={(e) => isValidNumericInput(e.target.value) && setAccountCapital(e.target.value)}
                placeholder="10000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="assetType">Asset Type</Label>
              <Select value={assetType} onValueChange={(v) => setAssetType(v as any)}>
                <SelectTrigger id="assetType">
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
              <Label htmlFor="calculationMethod">Calculation Method</Label>
              <Select value={calculationMethod} onValueChange={(v) => setCalculationMethod(v as 'tick' | 'point')}>
                <SelectTrigger id="calculationMethod">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="point">Point</SelectItem>
                  <SelectItem value="tick">Tick</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="valuePerUnit">Value Per {calculationMethod === 'tick' ? 'Tick' : 'Point'}</Label>
              <Input
                id="valuePerUnit"
                value={valuePerUnit}
                onChange={(e) => isValidNumericInput(e.target.value) && setValuePerUnit(e.target.value)}
                placeholder="5"
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="useRiskDollar">Use Risk Dollar Amount</Label>
              <Switch
                id="useRiskDollar"
                checked={useRiskDollar}
                onCheckedChange={setUseRiskDollar}
              />
            </div>

            {useRiskDollar ? (
              <div className="space-y-2">
                <Label htmlFor="riskDollar">Risk Amount ($)</Label>
                <Input
                  id="riskDollar"
                  value={riskDollar}
                  onChange={(e) => isValidNumericInput(e.target.value) && setRiskDollar(e.target.value)}
                  placeholder="100"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="riskPercent">Risk Percentage (%)</Label>
                <Input
                  id="riskPercent"
                  value={riskPercent}
                  onChange={(e) => isValidNumericInput(e.target.value) && setRiskPercent(e.target.value)}
                  placeholder="1"
                />
              </div>
            )}
          </div>

          {positionSizerResults.recommendedSize > 0 && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-semibold">Recommended Position Size: {positionSizerResults.recommendedSize}</p>
                  <p className="text-sm">Risk: ${positionSizerResults.riskDollars.toFixed(2)} ({positionSizerResults.riskPercent.toFixed(2)}%)</p>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Bracket Order Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Bracket Order Configuration</CardTitle>
              <CardDescription>Define your take-profit and stop-loss brackets</CardDescription>
            </div>
            <div className="flex gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={populateBracketSizes}
                      disabled={calculatedPositionSize === 0}
                    >
                      <ArrowDown className="w-4 h-4 mr-2" />
                      Populate Sizes
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Distribute calculated position size evenly across brackets</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Button variant="outline" size="sm" onClick={addBracketGroup}>
                <Plus className="w-4 h-4 mr-2" />
                Add Bracket
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Bracket</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Take Profit</TableHead>
                  <TableHead>Stop Loss</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bracketGroups.map((group, index) => (
                  <TableRow key={group.bracket_id}>
                    <TableCell className="font-medium">#{index + 1}</TableCell>
                    <TableCell>
                      <Input
                        value={group.size || ''}
                        onChange={(e) => updateBracketGroup(index, 'size', e.target.value)}
                        placeholder="0"
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={group.take_profit_price || ''}
                        onChange={(e) => updateBracketGroup(index, 'take_profit_price', e.target.value)}
                        placeholder="0.00"
                        className="w-32"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={group.stop_loss_price || ''}
                        onChange={(e) => updateBracketGroup(index, 'stop_loss_price', e.target.value)}
                        placeholder="0.00"
                        className="w-32"
                      />
                    </TableCell>
                    <TableCell>
                      {bracketGroups.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeBracketGroup(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {bracketValidation.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {bracketValidation.map((error, index) => (
                    <li key={index}>{error.message}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <span className="font-semibold">Total Position Size:</span>
            <span className="text-lg font-bold">{totalPositionSize.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Scenario Analysis Section */}
      {scenarioAnalysis.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Scenario Analysis</CardTitle>
            <CardDescription>Potential outcomes based on bracket configuration</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {scenarioAnalysis.map((scenario, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">{scenario.scenarioDescription}</h4>
                    <Badge variant={scenario.totalPL > 0 ? 'default' : 'destructive'}>
                      {scenario.overallRR.toFixed(2)}R
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">P/L</p>
                      <p className={`font-medium ${scenario.totalPL > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        ${scenario.totalPL.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Risk</p>
                      <p className="font-medium">${scenario.totalRisk.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Reward</p>
                      <p className="font-medium">${scenario.totalReward.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={createTrade.isPending || updateTrade.isPending || !modelId || !asset || bracketValidation.length > 0 || !primaryStopLossValid.valid}
        >
          {createTrade.isPending || updateTrade.isPending ? 'Saving...' : trade ? 'Update Trade' : 'Log Trade'}
        </Button>
      </div>
    </div>
  );
}
