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
  const [showScenarios, setShowScenarios] = useState(false);

  const calculateScenarios = () => {
    if (bracketGroups.length === 0 || totalPositionSize === 0) {
      toast.error('Please configure bracket groups first');
      return;
    }

    const entry = safeParseFloat(entryPrice);
    const valuePerUnitNum = safeParseFloat(valuePerUnit);
    
    if (entry === 0 || valuePerUnitNum === 0 || !isValidNumber(entry) || !isValidNumber(valuePerUnitNum)) {
      toast.error('Please enter valid entry price and value per unit');
      return;
    }

    const newScenarios: ScenarioOutcome[] = [];

    // Scenario 1: All brackets hit TP
    const allTPOutcomes = bracketGroups.map((bg, idx) => ({
      bracketIndex: idx,
      outcome: 'TP'
    }));
    const allTPPL = bracketGroups.reduce((sum, bg) => {
      const distance = direction === 'long' 
        ? bg.take_profit_price - entry 
        : entry - bg.take_profit_price;
      return sum + (bg.size * distance * valuePerUnitNum);
    }, 0);
    const allTPRisk = Math.abs(bracketGroups.reduce((sum, bg) => {
      const distance = direction === 'long' 
        ? bg.stop_loss_price - entry 
        : entry - bg.stop_loss_price;
      return sum + (bg.size * distance * valuePerUnitNum);
    }, 0));
    newScenarios.push({
      scenarioDescription: 'All brackets hit Take Profit',
      bracketOutcomes: allTPOutcomes,
      totalPL: allTPPL,
      totalRisk: allTPRisk,
      totalReward: allTPPL,
      overallRR: allTPRisk !== 0 ? allTPPL / allTPRisk : 0,
      isValid: true
    });

    // Scenario 2: All brackets hit SL
    const allSLOutcomes = bracketGroups.map((bg, idx) => ({
      bracketIndex: idx,
      outcome: 'SL'
    }));
    const allSLPL = bracketGroups.reduce((sum, bg) => {
      const distance = direction === 'long' 
        ? bg.stop_loss_price - entry 
        : entry - bg.stop_loss_price;
      return sum + (bg.size * distance * valuePerUnitNum);
    }, 0);
    newScenarios.push({
      scenarioDescription: 'All brackets hit Stop Loss',
      bracketOutcomes: allSLOutcomes,
      totalPL: allSLPL,
      totalRisk: Math.abs(allSLPL),
      totalReward: 0,
      overallRR: allSLPL / Math.abs(allSLPL),
      isValid: true
    });

    // Scenario 3: First bracket TP, rest SL
    if (bracketGroups.length > 1) {
      const mixedOutcomes = bracketGroups.map((bg, idx) => ({
        bracketIndex: idx,
        outcome: idx === 0 ? 'TP' : 'SL'
      }));
      const mixedPL = bracketGroups.reduce((sum, bg, idx) => {
        const distance = idx === 0
          ? (direction === 'long' ? bg.take_profit_price - entry : entry - bg.take_profit_price)
          : (direction === 'long' ? bg.stop_loss_price - entry : entry - bg.stop_loss_price);
        return sum + (bg.size * distance * valuePerUnitNum);
      }, 0);
      const mixedRisk = Math.abs(bracketGroups.reduce((sum, bg) => {
        const distance = direction === 'long' 
          ? bg.stop_loss_price - entry 
          : entry - bg.stop_loss_price;
        return sum + (bg.size * distance * valuePerUnitNum);
      }, 0));
      newScenarios.push({
        scenarioDescription: 'First bracket TP, rest SL',
        bracketOutcomes: mixedOutcomes,
        totalPL: mixedPL,
        totalRisk: mixedRisk,
        totalReward: mixedPL > 0 ? mixedPL : 0,
        overallRR: mixedRisk !== 0 ? mixedPL / mixedRisk : 0,
        isValid: true
      });
    }

    setScenarios(newScenarios);
    setShowScenarios(true);
    toast.success('Scenarios calculated');
  };

  const validateForm = (): ValidationError[] => {
    const errors: ValidationError[] = [];

    if (!modelId) errors.push({ field: 'model', message: 'Please select a model' });
    if (!asset.trim()) errors.push({ field: 'asset', message: 'Please enter an asset' });
    if (!entryPrice || safeParseFloat(entryPrice) === 0) errors.push({ field: 'entryPrice', message: 'Please enter entry price' });
    if (!primaryStopLoss || safeParseFloat(primaryStopLoss) === 0) errors.push({ field: 'primaryStopLoss', message: 'Please enter primary stop-loss' });
    if (!primaryStopLossValid.valid) errors.push({ field: 'primaryStopLoss', message: primaryStopLossValid.message });
    if (bracketGroups.length === 0) errors.push({ field: 'brackets', message: 'Please add at least one bracket' });
    if (totalPositionSize === 0) errors.push({ field: 'brackets', message: 'Total position size cannot be zero' });

    bracketGroups.forEach((bg, idx) => {
      if (bg.size === 0) {
        errors.push({ field: `bracket-${idx}`, message: `Bracket ${idx + 1}: Size cannot be zero` });
      }
      if (bg.take_profit_price === 0) {
        errors.push({ field: `bracket-${idx}`, message: `Bracket ${idx + 1}: Take profit cannot be zero` });
      }
      if (bg.stop_loss_price === 0) {
        errors.push({ field: `bracket-${idx}`, message: `Bracket ${idx + 1}: Stop loss cannot be zero` });
      }

      // Validate TP/SL based on direction
      const entry = safeParseFloat(entryPrice);
      if (direction === 'long') {
        if (bg.take_profit_price <= entry) {
          errors.push({ field: `bracket-${idx}`, message: `Bracket ${idx + 1}: TP must be above entry for long trades` });
        }
        if (bg.stop_loss_price >= entry) {
          errors.push({ field: `bracket-${idx}`, message: `Bracket ${idx + 1}: SL must be below entry for long trades` });
        }
      } else {
        if (bg.take_profit_price >= entry) {
          errors.push({ field: `bracket-${idx}`, message: `Bracket ${idx + 1}: TP must be below entry for short trades` });
        }
        if (bg.stop_loss_price <= entry) {
          errors.push({ field: `bracket-${idx}`, message: `Bracket ${idx + 1}: SL must be above entry for short trades` });
        }
      }
    });

    return errors;
  };

  const handleSubmit = async () => {
    const errors = validateForm();
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
      asset: asset.trim(),
      direction,
      bracket_order: bracketOrder,
      bracket_order_outcomes: trade?.bracket_order_outcomes || [],
      notes: trade?.notes || '',
      mood: trade?.mood || '',
      images: trade?.images || [],
      quickTags: trade?.quickTags || [],
      mistakeTags: trade?.mistakeTags || [],
      strengthTags: trade?.strengthTags || [],
      created_at: trade?.created_at || BigInt(currentTime || Date.now() * 1000000),
      calculation_method: calculationMethod === 'tick' ? CalculationMethod.tick : CalculationMethod.point,
      value_per_unit: safeParseFloat(valuePerUnit),
      model_conditions: modelConditions,
      adherence_score: adherenceScore / 100,
      is_completed: trade?.is_completed || false,
      position_sizer: positionSizer,
      would_take_again: trade?.would_take_again || false,
    };

    try {
      if (trade) {
        await updateTrade.mutateAsync(tradeData);
        toast.success('Trade updated successfully');
      } else {
        await createTrade.mutateAsync(tradeData);
        toast.success('Trade created successfully');
      }
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save trade');
    }
  };

  const selectedModel = models.find(m => m.id === modelId);

  return (
    <div className="trade-form-inline space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Trade Information */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Trade Information</CardTitle>
          <CardDescription>Basic trade details and market context</CardDescription>
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
                  {models.map(model => (
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
                  <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Direction *</Label>
              <RadioGroup value={direction} onValueChange={(v) => setDirection(v as 'long' | 'short')}>
                <div className="flex items-center space-x-4">
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

      {/* Model Adherence */}
      {modelId && (
        <Card className="w-full">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <CardTitle>Model Adherence</CardTitle>
                <CardDescription>Check the conditions you observed in the market</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={adherenceScore >= 80 ? 'default' : adherenceScore >= 50 ? 'secondary' : 'destructive'}>
                  {adherenceScore.toFixed(0)}% Adherence
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
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Failed to load model conditions</AlertDescription>
              </Alert>
            ) : modelConditions.length === 0 ? (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  This model has no conditions defined. Add tools to your model to enable adherence tracking.
                </AlertDescription>
              </Alert>
            ) : (
              <ScrollArea className="h-[300px] w-full pr-4">
                <div className="space-y-3">
                  {['narrative', 'framework', 'execution'].map(zone => {
                    const zoneConditions = modelConditions.filter(c => c.zone === zone);
                    if (zoneConditions.length === 0) return null;

                    return (
                      <div key={zone} className="space-y-2">
                        <h4 className="font-semibold text-sm capitalize">{zone}</h4>
                        {zoneConditions.map(condition => (
                          <div key={condition.id} className="flex items-start space-x-2 p-2 rounded-lg hover:bg-accent">
                            <Checkbox
                              id={condition.id}
                              checked={condition.isChecked}
                              onCheckedChange={() => toggleCondition(condition.id)}
                            />
                            <Label
                              htmlFor={condition.id}
                              className="text-sm font-normal cursor-pointer flex-1 leading-relaxed"
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
          <CardDescription>Calculate your position size based on risk parameters</CardDescription>
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
                onChange={(e) => isValidNumericInput(e.target.value) && setEntryPrice(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="primary-sl">Primary Stop-Loss *</Label>
              <Input
                id="primary-sl"
                type="text"
                placeholder="0.00"
                value={primaryStopLoss}
                onChange={(e) => isValidNumericInput(e.target.value) && setPrimaryStopLoss(e.target.value)}
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
                onChange={(e) => isValidNumericInput(e.target.value) && setAccountCapital(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="risk-percent">Risk</Label>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="use-dollar" className="text-xs">Use $</Label>
                  <Switch
                    id="use-dollar"
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
                  onChange={(e) => isValidNumericInput(e.target.value) && setRiskDollar(e.target.value)}
                />
              ) : (
                <Input
                  id="risk-percent"
                  type="text"
                  placeholder="1"
                  value={riskPercent}
                  onChange={(e) => isValidNumericInput(e.target.value) && setRiskPercent(e.target.value)}
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
              <Label htmlFor="contract-unit">Contract/Lot Unit</Label>
              <Input
                id="contract-unit"
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
                onChange={(e) => isValidNumericInput(e.target.value) && setValuePerUnit(e.target.value)}
              />
            </div>
          </div>

          {assetType === 'futures' && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="allow-fractional"
                checked={allowFractional}
                onCheckedChange={(checked) => setAllowFractional(checked === true)}
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
              <span className="text-lg font-bold">{calculatedPositionSize.toFixed(assetType === 'crypto' ? 8 : 2)}</span>
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
            <div>
              <CardTitle>Bracket Configuration</CardTitle>
              <CardDescription>Define your OCO bracket orders</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={populateBracketSizes}
                      disabled={calculatedPositionSize === 0}
                    >
                      <Calculator className="w-4 h-4 mr-2" />
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
          {bracketGroups.map((group, index) => (
            <div key={group.bracket_id} className="space-y-3 p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Bracket {index + 1}</h4>
                {bracketGroups.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeBracketGroup(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor={`size-${index}`}>Size</Label>
                  <Input
                    id={`size-${index}`}
                    type="text"
                    placeholder="0"
                    value={group.size || ''}
                    onChange={(e) => updateBracketGroup(index, 'size', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`tp-${index}`}>Take Profit</Label>
                  <Input
                    id={`tp-${index}`}
                    type="text"
                    placeholder="0.00"
                    value={group.take_profit_price || ''}
                    onChange={(e) => updateBracketGroup(index, 'take_profit_price', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`sl-${index}`}>Stop Loss</Label>
                    {group.sl_modified_by_user && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" className="text-xs">Custom</Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Manually modified (won't sync with Primary SL)</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  <Input
                    id={`sl-${index}`}
                    type="text"
                    placeholder="0.00"
                    value={group.stop_loss_price || ''}
                    onChange={(e) => updateBracketGroup(index, 'stop_loss_price', e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}

          <Separator />

          <div className="bg-muted p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Position Size:</span>
              <span className="text-lg font-bold">{totalPositionSize.toFixed(assetType === 'crypto' ? 8 : 2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scenario Analysis */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Scenario Analysis</CardTitle>
          <CardDescription>Analyze potential outcomes before entering the trade</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" onClick={calculateScenarios} className="w-full">
            <Calculator className="w-4 h-4 mr-2" />
            Calculate Scenarios
          </Button>

          {showScenarios && scenarios.length > 0 && (
            <div className="space-y-3">
              {scenarios.map((scenario, idx) => (
                <div key={idx} className="p-4 border rounded-lg space-y-2">
                  <h4 className="font-semibold text-sm">{scenario.scenarioDescription}</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">P/L:</span>
                      <span className={`ml-2 font-semibold ${scenario.totalPL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        ${scenario.totalPL.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">R:R:</span>
                      <span className="ml-2 font-semibold">{scenario.overallRR.toFixed(2)}R</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
          {createTrade.isPending || updateTrade.isPending ? 'Saving...' : trade ? 'Update Trade' : 'Create Trade'}
        </Button>
      </div>
    </div>
  );
}
