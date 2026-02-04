import { useState, useEffect, useMemo } from 'react';
import { useCreateTrade, useUpdateTrade, useGetCurrentTime, useGetModelConditions } from '../hooks/useQueries';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { toast } from 'sonner';
import { CalendarIcon, Plus, Trash2, AlertCircle, Info, CheckCircle2, Calculator, ArrowDown } from 'lucide-react';
import { format } from 'date-fns';
import type { Model, Trade, CalculationMethod, ModelCondition, ToolConfig, BracketOrderOutcome, BracketGroup, BracketOrder, PositionSizer } from '../backend';

interface TradeFormProps {
  trade?: Trade | null;
  models: Model[];
  onClose: () => void;
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

export default function TradeForm({ trade, models, onClose }: TradeFormProps) {
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

  // Load model conditions and merge with persisted checkbox states
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
      } else {
        // For new trades, use fetched conditions as-is
        setModelConditions(fetchedConditions);
      }
    } else if (modelId && !conditionsLoading && !conditionsFetching && fetchedConditions) {
      setModelConditions(fetchedConditions);
    }
  }, [fetchedConditions, modelId, conditionsLoading, conditionsFetching, isEditMode, trade]);

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
      setCalculationMethod(trade.calculation_method === 'tick' ? 'tick' : 'point');
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

    // Primary risk is based on total position size and primary stop loss
    const stopDistance = Math.abs(entry - primarySL);
    const totalRisk = stopDistance * valuePerUnitNum * totalPositionSize;
    const actualRiskPercent = (totalRisk / capital) * 100;

    // Calculate potential reward from all bracket groups (sum of all TPs)
    let potentialReward = 0;
    bracketGroups.forEach(group => {
      if (group.take_profit_price !== 0 && group.size !== 0 && 
          isValidNumber(group.take_profit_price) && isValidNumber(group.size)) {
        const tpDistance = Math.abs(group.take_profit_price - entry);
        const tpReward = tpDistance * valuePerUnitNum * group.size;
        if (isValidNumber(tpReward)) {
          potentialReward += tpReward;
        }
      }
    });

    const potentialRR = totalRisk > 0 && isValidNumber(totalRisk) && isValidNumber(potentialReward)
      ? potentialReward / totalRisk
      : 0;

    return {
      recommendedSize: isValidNumber(calculatedPositionSize) ? calculatedPositionSize : 0,
      riskDollars: isValidNumber(totalRisk) ? totalRisk : 0,
      riskPercent: isValidNumber(actualRiskPercent) ? actualRiskPercent : 0,
      potentialReward: isValidNumber(potentialReward) ? potentialReward : 0,
      potentialRR: isValidNumber(potentialRR) ? potentialRR : 0,
    };
  }, [entryPrice, primaryStopLoss, accountCapital, riskPercent, riskDollar, useRiskDollar, assetType, allowFractional, 
      valuePerUnit, bracketGroups, calculatedPositionSize, totalPositionSize, primaryStopLossValid]);

  const validatePriceLevels = (): ValidationError[] => {
    const errors: ValidationError[] = [];
    const entry = safeParseFloat(entryPrice);

    if (entry === 0 || !isValidNumber(entry)) return errors;

    bracketGroups.forEach((group, index) => {
      if (group.stop_loss_price === 0 || !isValidNumber(group.stop_loss_price)) return;
      if (group.take_profit_price === 0 || !isValidNumber(group.take_profit_price)) return;
      
      if (direction === 'long') {
        if (group.stop_loss_price >= entry) {
          errors.push({
            field: `bracket_${index}_sl`,
            message: `Bracket ${index + 1} SL must be below entry price for Long trades`,
          });
        }
        if (group.take_profit_price <= entry) {
          errors.push({
            field: `bracket_${index}_tp`,
            message: `Bracket ${index + 1} TP must be above entry price for Long trades`,
          });
        }
      } else {
        if (group.stop_loss_price <= entry) {
          errors.push({
            field: `bracket_${index}_sl`,
            message: `Bracket ${index + 1} SL must be above entry price for Short trades`,
          });
        }
        if (group.take_profit_price >= entry) {
          errors.push({
            field: `bracket_${index}_tp`,
            message: `Bracket ${index + 1} TP must be below entry price for Short trades`,
          });
        }
      }
    });

    return errors;
  };

  const validateRequiredFields = (): ValidationError[] => {
    const errors: ValidationError[] = [];

    if (!modelId) errors.push({ field: 'model', message: 'Model is required' });
    if (!asset.trim()) errors.push({ field: 'asset', message: 'Asset is required' });
    
    const entryVal = safeParseFloat(entryPrice);
    if (!entryPrice || entryVal === 0 || !isValidNumber(entryVal)) {
      errors.push({ field: 'entryPrice', message: 'Entry price is required' });
    }

    const primarySLVal = safeParseFloat(primaryStopLoss);
    if (!primaryStopLoss || primarySLVal === 0 || !isValidNumber(primarySLVal)) {
      errors.push({ field: 'primaryStopLoss', message: 'Primary stop-loss is required for position sizing' });
    }
    
    // Add Primary Stop-Loss validation error if it fails
    if (!primaryStopLossValid.valid) {
      errors.push({ field: 'primaryStopLoss', message: primaryStopLossValid.message });
    }
    
    if (totalPositionSize === 0 || !isValidNumber(totalPositionSize)) {
      errors.push({ field: 'positionSize', message: 'Position size must be greater than zero (sum of bracket sizes)' });
    }
    
    const valueVal = safeParseFloat(valuePerUnit);
    if (!valuePerUnit || valueVal === 0 || !isValidNumber(valueVal)) {
      errors.push({ field: 'valuePerUnit', message: 'Value per unit is required' });
    }

    return errors;
  };

  const allValidationErrors = useMemo(() => {
    try {
      return [
        ...validateRequiredFields(),
        ...validatePriceLevels(),
      ];
    } catch (error) {
      console.error('Validation error:', error);
      return [];
    }
  }, [modelId, asset, entryPrice, primaryStopLoss, totalPositionSize, valuePerUnit, bracketGroups, direction, primaryStopLossValid]);

  const calculatePL = (priceDistance: number, size: number): number => {
    const valuePerUnitNum = safeParseFloat(valuePerUnit);

    if (size === 0 || valuePerUnitNum === 0 || !isValidNumber(size) || !isValidNumber(valuePerUnitNum)) {
      return 0;
    }

    if (!isValidNumber(priceDistance)) return 0;

    return priceDistance * valuePerUnitNum * size;
  };

  // Calculate primary trade risk (single value for entire position)
  // Only calculate when Primary Stop-Loss validation passes
  const calculatePrimaryRisk = (): number => {
    // Block calculation if Primary Stop-Loss validation fails
    if (!primaryStopLossValid.valid) {
      return 0;
    }

    const entry = safeParseFloat(entryPrice);
    const primarySL = safeParseFloat(primaryStopLoss);
    const valuePerUnitNum = safeParseFloat(valuePerUnit);
    
    if (entry === 0 || primarySL === 0 || totalPositionSize === 0 || valuePerUnitNum === 0 ||
        !isValidNumber(entry) || !isValidNumber(primarySL) || !isValidNumber(totalPositionSize) || !isValidNumber(valuePerUnitNum)) {
      return 0;
    }

    const stopDistance = Math.abs(entry - primarySL);
    const risk = stopDistance * valuePerUnitNum * totalPositionSize;
    
    return isValidNumber(risk) ? risk : 0;
  };

  const calculateRR = () => {
    const entry = safeParseFloat(entryPrice);
    
    if (entry === 0 || !isValidNumber(entry)) {
      return { maxRR: 0, totalRisk: 0, potentialReward: 0 };
    }

    // Primary risk is constant for the entire position
    const totalRisk = calculatePrimaryRisk();

    // Potential reward is sum of all TPs
    const potentialReward = bracketGroups.reduce((sum, group) => {
      if (group.take_profit_price === 0 || !isValidNumber(group.take_profit_price) || !isValidNumber(group.size)) return sum;
      const distance = Math.abs(group.take_profit_price - entry);
      const dollarAmount = calculatePL(distance, group.size);
      if (!isValidNumber(dollarAmount)) return sum;
      return sum + dollarAmount;
    }, 0);

    const maxRR = totalRisk > 0 && isValidNumber(totalRisk) && isValidNumber(potentialReward) 
      ? potentialReward / totalRisk 
      : 0;

    return { 
      maxRR: isValidNumber(maxRR) ? maxRR : 0, 
      totalRisk: isValidNumber(totalRisk) ? totalRisk : 0, 
      potentialReward: isValidNumber(potentialReward) ? potentialReward : 0 
    };
  };

  // Check if all bracket inputs are complete
  const allBracketsComplete = useMemo(() => {
    return bracketGroups.every(group => {
      const hasQty = group.size > 0 && isValidNumber(group.size);
      const hasSL = group.stop_loss_price !== 0 && isValidNumber(group.stop_loss_price);
      const hasTP = group.take_profit_price !== 0 && isValidNumber(group.take_profit_price);
      return hasQty && hasSL && hasTP;
    });
  }, [bracketGroups]);

  // Validate bracket configuration for scenario insights
  // Include enhanced stop-loss validation
  const bracketConfigurationValid = useMemo(() => {
    const entry = safeParseFloat(entryPrice);
    
    if (entry === 0 || !isValidNumber(entry)) {
      return { valid: false, message: 'Entry price is required' };
    }

    // Check Primary Stop-Loss validation first
    if (!primaryStopLossValid.valid) {
      return { valid: false, message: primaryStopLossValid.message };
    }

    // Check if all brackets are complete
    if (!allBracketsComplete) {
      return { valid: false, message: 'Complete all bracket fields (Qty, SL, TP)' };
    }

    // Validate SL levels according to trade direction
    for (let i = 0; i < bracketGroups.length; i++) {
      const group = bracketGroups[i];
      
      if (direction === 'long') {
        // For long trades, SL must be less than Entry Price
        if (group.stop_loss_price >= entry) {
          return { 
            valid: false, 
            message: `Bracket ${i + 1} SL must be below entry price for long trades` 
          };
        }
      } else {
        // For short trades, SL must be greater than Entry Price
        if (group.stop_loss_price <= entry) {
          return { 
            valid: false, 
            message: `Bracket ${i + 1} SL must be above entry price for short trades` 
          };
        }
      }
    }

    return { valid: true, message: '' };
  }, [bracketGroups, entryPrice, direction, allBracketsComplete, primaryStopLossValid]);

  // Enhanced OCO Scenario Insights - Full-Trade Aggregated Outcomes
  // Only calculate scenarios when bracket configuration is valid (including enhanced stop-loss validation)
  const scenarioOutcomes = useMemo((): ScenarioOutcome[] => {
    // Only calculate scenarios if bracket configuration is valid
    if (!bracketConfigurationValid.valid) {
      return [];
    }

    try {
      const entry = safeParseFloat(entryPrice);
      const valuePerUnitNum = safeParseFloat(valuePerUnit);
      
      if (entry === 0 || valuePerUnitNum === 0 || 
          !isValidNumber(entry) || !isValidNumber(valuePerUnitNum)) {
        return [];
      }

      const hasValidBrackets = bracketGroups.some(group => 
        group.stop_loss_price !== 0 && group.take_profit_price !== 0 && 
        isValidNumber(group.stop_loss_price) && isValidNumber(group.take_profit_price) &&
        isValidNumber(group.size) && group.size > 0
      );
      
      if (!hasValidBrackets) {
        return [];
      }

      // Calculate primary risk once (constant for all scenarios)
      const primaryRisk = calculatePrimaryRisk();
      
      if (primaryRisk === 0 || !isValidNumber(primaryRisk)) {
        return [];
      }

      const outcomes: ScenarioOutcome[] = [];
      const numBrackets = bracketGroups.length;

      // Generate all valid OCO permutations: each bracket has exactly one outcome (TP or SL)
      const totalScenarios = Math.pow(2, numBrackets); // 2 states per bracket: TP or SL

      for (let i = 0; i < totalScenarios; i++) {
        const bracketOutcomes: { bracketIndex: number; outcome: 'TP' | 'SL' }[] = [];
        let scenarioCode = i;
        
        // Decode scenario: 0 = SL, 1 = TP
        for (let j = 0; j < numBrackets; j++) {
          const state = scenarioCode % 2;
          scenarioCode = Math.floor(scenarioCode / 2);
          
          const outcome = state === 1 ? 'TP' : 'SL';
          bracketOutcomes.push({ bracketIndex: j, outcome });
        }

        // Calculate full-trade aggregated outcome
        let totalPL = 0;
        let totalReward = 0; // Sum of realized profits from TPs

        bracketOutcomes.forEach(({ bracketIndex, outcome }) => {
          const group = bracketGroups[bracketIndex];
          
          if (!isValidNumber(group.size) || group.size === 0) return;
          
          if (outcome === 'TP' && group.take_profit_price !== 0) {
            // TP hit: calculate reward for this bracket
            const tpDistance = Math.abs(group.take_profit_price - entry);
            const bracketReward = calculatePL(tpDistance, group.size);
            
            if (isValidNumber(bracketReward)) {
              totalPL += bracketReward;
              totalReward += bracketReward;
            }
          } else if (outcome === 'SL' && group.stop_loss_price !== 0) {
            // SL hit: calculate loss for this bracket
            const slDistance = Math.abs(entry - group.stop_loss_price);
            const bracketLoss = calculatePL(slDistance, group.size);
            
            if (isValidNumber(bracketLoss)) {
              totalPL -= bracketLoss;
            }
          }
        });

        // Calculate overall R:R for the entire trade
        // Overall R:R = Total P/L / Primary Risk (single risk value)
        const overallRR = primaryRisk > 0 && isValidNumber(totalPL)
          ? totalPL / primaryRisk 
          : 0;

        // Generate scenario description
        const scenarioDescription = bracketOutcomes
          .map(({ bracketIndex, outcome }) => `B${bracketIndex + 1}:${outcome}`)
          .join(', ');

        outcomes.push({
          scenarioDescription,
          bracketOutcomes,
          totalPL: isValidNumber(totalPL) ? totalPL : 0,
          totalRisk: primaryRisk, // Same for all scenarios
          totalReward: isValidNumber(totalReward) ? totalReward : 0,
          overallRR: isValidNumber(overallRR) ? overallRR : 0,
          isValid: true,
        });
      }

      // Sort by overall R:R descending and limit to top 20 scenarios
      return outcomes
        .sort((a, b) => b.overallRR - a.overallRR)
        .slice(0, 20);
    } catch (error) {
      console.error('Error calculating OCO scenarios:', error);
      return [];
    }
  }, [entryPrice, bracketGroups, valuePerUnit, primaryStopLoss, totalPositionSize, bracketConfigurationValid]);

  const { maxRR, totalRisk, potentialReward } = calculateRR();

  const hasErrors = allValidationErrors.length > 0;

  const handleSubmit = async () => {
    if (hasErrors) {
      toast.error('Please fix all validation errors before saving');
      return;
    }

    // Create default bracket outcome without global break_even and manual_close fields
    const defaultBracketOutcome: BracketOrderOutcome = {
      filled_bracket_groups: [],
      final_pl_pct: 0,
      final_pl_usd: 0,
      rr: 0,
    };

    // Create Position Sizer data object
    const positionSizerData: PositionSizer = {
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
      position_size: totalPositionSize, // Use auto-derived total position size
      position_sizer: positionSizerData,
    };

    const tradeData = {
      id: trade?.id || crypto.randomUUID(),
      model_id: modelId,
      asset: asset.trim(),
      direction,
      bracket_order: bracketOrder,
      calculation_method: calculationMethod as CalculationMethod,
      value_per_unit: safeParseFloat(valuePerUnit),
      model_conditions: modelConditions,
      adherence_score: adherenceScore / 100,
      bracket_order_outcome: trade?.bracket_order_outcome || defaultBracketOutcome,
      notes: trade?.notes || '',
      emotions: trade?.emotions || [],
      images: trade?.images || [],
      created_at: trade?.created_at || BigInt(date.getTime() * 1000000),
      is_completed: trade?.is_completed || false,
      position_sizer: positionSizerData,
    };

    try {
      if (trade) {
        await updateTrade.mutateAsync({ ...tradeData, owner: trade.owner });
        toast.success('Trade updated successfully!');
      } else {
        await createTrade.mutateAsync(tradeData);
        toast.success('Trade logged successfully!');
      }
      onClose();
    } catch (error) {
      toast.error(trade ? 'Failed to update trade' : 'Failed to log trade');
      console.error(error);
    }
  };

  const getFieldError = (field: string) => {
    return allValidationErrors.find((e) => e.field === field);
  };

  const conditionsByZone = useMemo(() => {
    const grouped: Record<string, ModelCondition[]> = {
      narrative: [],
      framework: [],
      execution: [],
    };
    
    modelConditions.forEach(condition => {
      if (grouped[condition.zone]) {
        grouped[condition.zone].push(condition);
      }
    });
    
    return grouped;
  }, [modelConditions]);

  const getToolFromModel = (model: Model, zone: string, toolId: string): ToolConfig | undefined => {
    let tools: ToolConfig[] = [];
    
    if (zone === 'narrative') {
      tools = model.narrative;
    } else if (zone === 'framework') {
      tools = model.framework;
    } else if (zone === 'execution') {
      tools = model.execution;
    }
    
    return tools.find(t => t.id === toolId);
  };

  const showConditionsSection = modelId && !conditionsError;
  const isLoadingConditions = conditionsLoading || conditionsFetching;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{trade ? 'Edit Trade' : 'Log New Trade'}</DialogTitle>
          <DialogDescription>Define your unified position sizing and OCO bracket structure</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {hasErrors && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please fix the following errors:
                <ul className="list-disc list-inside mt-2">
                  {allValidationErrors.slice(0, 3).map((error, i) => (
                    <li key={i} className="text-sm">
                      {error.message}
                    </li>
                  ))}
                  {allValidationErrors.length > 3 && (
                    <li className="text-sm">...and {allValidationErrors.length - 3} more</li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {conditionsError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to load model conditions. Please try selecting the model again.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="model" className="flex items-center gap-2">
                Model *
                {getFieldError('model') && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{getFieldError('model')?.message}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </Label>
              <Select value={modelId} onValueChange={setModelId}>
                <SelectTrigger id="model" className={getFieldError('model') ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {getFieldError('model') && (
                <p className="text-xs text-destructive mt-1">{getFieldError('model')?.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="asset" className="flex items-center gap-2">
                Asset *
                {getFieldError('asset') && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{getFieldError('asset')?.message}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </Label>
              <Input
                id="asset"
                placeholder="e.g., ES, NQ, EURUSD"
                value={asset}
                onChange={(e) => setAsset(e.target.value)}
                className={getFieldError('asset') ? 'border-destructive' : ''}
              />
              {getFieldError('asset') && (
                <p className="text-xs text-destructive mt-1">{getFieldError('asset')?.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date *</Label>
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
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="long" id="long" />
                    <Label htmlFor="long" className="cursor-pointer">
                      Long
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="short" id="short" />
                    <Label htmlFor="short" className="cursor-pointer">
                      Short
                    </Label>
                  </div>
                </div>
              </RadioGroup>
            </div>
          </div>

          {showConditionsSection && (
            <Card className="border-2 border-primary/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                      Model Condition Check
                    </CardTitle>
                    <CardDescription>Mark which conditions were met for this trade</CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">{adherenceScore.toFixed(0)}%</div>
                    <div className="text-xs text-muted-foreground">Model Adherence</div>
                  </div>
                </div>
                <Progress value={adherenceScore} className="mt-2" />
              </CardHeader>
              <CardContent>
                {isLoadingConditions ? (
                  <div className="space-y-3">
                    <div className="text-center py-2 text-sm text-muted-foreground">Loading conditions...</div>
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : modelConditions.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No conditions defined for this model
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(conditionsByZone).map(([zone, conditions]) => {
                      if (conditions.length === 0) return null;
                      
                      return (
                        <div key={zone} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="capitalize">
                              {zone}
                            </Badge>
                            <Separator className="flex-1" />
                          </div>
                          <div className="space-y-2 pl-2">
                            {conditions.map((condition) => {
                              const selectedModel = models.find(m => m.id === modelId);
                              const tool = selectedModel ? getToolFromModel(selectedModel, zone, condition.id) : undefined;
                              const description = tool ? extractToolDescription(tool) : condition.description;
                              
                              return (
                                <div key={condition.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                                  <Checkbox
                                    id={condition.id}
                                    checked={condition.isChecked}
                                    onCheckedChange={() => toggleCondition(condition.id)}
                                    className="mt-1"
                                  />
                                  <Label
                                    htmlFor={condition.id}
                                    className="flex-1 cursor-pointer text-sm leading-relaxed"
                                  >
                                    {description}
                                  </Label>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="border-2 border-green-500/20 bg-gradient-to-br from-green-50/50 to-blue-50/50 dark:from-green-950/20 dark:to-blue-950/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calculator className="h-5 w-5 text-green-600 dark:text-green-400" />
                Unified Position Sizer & OCO Bracket System
              </CardTitle>
              <CardDescription>Risk-based position sizing with manual bracket distribution and dynamic Primary SL synchronization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-semibold text-sm">Primary Position Sizing</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="entryPrice" className="flex items-center gap-2 font-semibold">
                      Entry Price *
                      {getFieldError('entryPrice') && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <AlertCircle className="h-4 w-4 text-destructive" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{getFieldError('entryPrice')?.message}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </Label>
                    <input
                      id="entryPrice"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={entryPrice}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (isValidNumericInput(value)) {
                          setEntryPrice(value);
                        }
                      }}
                      className={`flex h-10 w-full rounded-md border ${
                        getFieldError('entryPrice') ? 'border-destructive' : 'border-input'
                      } bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`}
                    />
                    {getFieldError('entryPrice') && (
                      <p className="text-xs text-destructive mt-1">{getFieldError('entryPrice')?.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="primaryStopLoss" className="flex items-center gap-2 font-semibold">
                      Primary Stop-Loss * (for sizing)
                      {getFieldError('primaryStopLoss') && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <AlertCircle className="h-4 w-4 text-destructive" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{getFieldError('primaryStopLoss')?.message}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </Label>
                    <input
                      id="primaryStopLoss"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={primaryStopLoss}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (isValidNumericInput(value)) {
                          setPrimaryStopLoss(value);
                        }
                      }}
                      className={`flex h-10 w-full rounded-md border ${
                        !primaryStopLossValid.valid ? 'border-destructive' : getFieldError('primaryStopLoss') ? 'border-destructive' : 'border-input'
                      } bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`}
                    />
                    {!primaryStopLossValid.valid && (
                      <Alert variant="destructive" className="mt-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          {primaryStopLossValid.message}
                        </AlertDescription>
                      </Alert>
                    )}
                    {getFieldError('primaryStopLoss') && primaryStopLossValid.valid && (
                      <p className="text-xs text-destructive mt-1">{getFieldError('primaryStopLoss')?.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="accountCapital">Account Capital ($)</Label>
                    <input
                      id="accountCapital"
                      type="text"
                      inputMode="decimal"
                      placeholder="10000"
                      value={accountCapital}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (isValidNumericInput(value)) {
                          setAccountCapital(value);
                        }
                      }}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={useRiskDollar ? 'riskDollar' : 'riskPercent'}>
                        {useRiskDollar ? 'Risk ($)' : 'Risk (%)'}
                      </Label>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="useRiskDollar" className="text-xs text-muted-foreground">
                          Use $
                        </Label>
                        <Switch
                          id="useRiskDollar"
                          checked={useRiskDollar}
                          onCheckedChange={setUseRiskDollar}
                        />
                      </div>
                    </div>
                    {useRiskDollar ? (
                      <input
                        id="riskDollar"
                        type="text"
                        inputMode="decimal"
                        placeholder="100"
                        value={riskDollar}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (isValidNumericInput(value)) {
                            setRiskDollar(value);
                          }
                        }}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      />
                    ) : (
                      <input
                        id="riskPercent"
                        type="text"
                        inputMode="decimal"
                        placeholder="1"
                        value={riskPercent}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (isValidNumericInput(value)) {
                            setRiskPercent(value);
                          }
                        }}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="assetType">Asset Type</Label>
                    <Select value={assetType} onValueChange={(v) => setAssetType(v as typeof assetType)}>
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
                    <Label htmlFor="calculationMethod">Unit Type *</Label>
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
                    <Label htmlFor="valuePerUnit" className="flex items-center gap-2">
                      Value per {calculationMethod === 'tick' ? 'Tick' : 'Point'} ($) *
                      {getFieldError('valuePerUnit') && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <AlertCircle className="h-4 w-4 text-destructive" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{getFieldError('valuePerUnit')?.message}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </Label>
                    <input
                      id="valuePerUnit"
                      type="text"
                      inputMode="decimal"
                      placeholder="e.g., 5.00"
                      value={valuePerUnit}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (isValidNumericInput(value)) {
                          setValuePerUnit(value);
                        }
                      }}
                      className={`flex h-10 w-full rounded-md border ${
                        getFieldError('valuePerUnit') ? 'border-destructive' : 'border-input'
                      } bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`}
                    />
                    {getFieldError('valuePerUnit') && (
                      <p className="text-xs text-destructive mt-1">{getFieldError('valuePerUnit')?.message}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                  <Label htmlFor="allowFractional" className="cursor-pointer text-sm">
                    Allow Fractional Size
                  </Label>
                  <Switch
                    id="allowFractional"
                    checked={allowFractional}
                    onCheckedChange={setAllowFractional}
                    disabled={assetType === 'crypto'}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Calculated Total Position Size</h4>
                {!primaryStopLossValid.valid && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Position size calculation blocked: {primaryStopLossValid.message}
                    </AlertDescription>
                  </Alert>
                )}
                <div className="p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground">Total Position Size (from risk calculation)</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={populateBracketSizes}
                      disabled={calculatedPositionSize === 0 || !primaryStopLossValid.valid}
                      className="gap-2"
                    >
                      <ArrowDown className="w-4 h-4" />
                      Populate Brackets
                    </Button>
                  </div>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {positionSizerResults.recommendedSize > 0 
                      ? positionSizerResults.recommendedSize.toFixed(assetType === 'crypto' ? 8 : assetType === 'futures' && !allowFractional ? 0 : 2)
                      : '—'} contracts
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-background rounded-lg border">
                    <p className="text-xs text-muted-foreground mb-1">Total Risk ($)</p>
                    <p className="text-lg font-bold text-red-600 dark:text-red-400">
                      ${positionSizerResults.riskDollars > 0 ? positionSizerResults.riskDollars.toFixed(2) : '—'}
                    </p>
                  </div>

                  <div className="p-3 bg-background rounded-lg border">
                    <p className="text-xs text-muted-foreground mb-1">Risk (%)</p>
                    <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                      {positionSizerResults.riskPercent > 0 ? positionSizerResults.riskPercent.toFixed(2) : '—'}%
                    </p>
                  </div>

                  <div className="p-3 bg-background rounded-lg border">
                    <p className="text-xs text-muted-foreground mb-1">Potential R:R</p>
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">
                      {positionSizerResults.potentialRR > 0 ? positionSizerResults.potentialRR.toFixed(2) : '—'}R
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold">
                    OCO Bracket Groups (Total: {isValidNumber(totalPositionSize) ? totalPositionSize.toFixed(2) : '0.00'} contracts)
                  </Label>
                  <Button type="button" variant="outline" size="sm" onClick={addBracketGroup} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add Bracket
                  </Button>
                </div>
                
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Click "Populate Brackets" above to distribute the calculated position size evenly across all brackets. Each bracket is an independent OCO unit. Bracket SL values automatically sync with Primary Stop-Loss unless manually edited.
                  </AlertDescription>
                </Alert>

                {bracketGroups.map((group, index) => {
                  // Individual bracket SL validation
                  const entry = safeParseFloat(entryPrice);
                  let bracketSLValid = true;
                  let bracketSLMessage = '';
                  
                  if (entry !== 0 && group.stop_loss_price !== 0 && isValidNumber(entry) && isValidNumber(group.stop_loss_price)) {
                    if (direction === 'long' && group.stop_loss_price >= entry) {
                      bracketSLValid = false;
                      bracketSLMessage = 'SL must be below entry for long trades';
                    } else if (direction === 'short' && group.stop_loss_price <= entry) {
                      bracketSLValid = false;
                      bracketSLMessage = 'SL must be above entry for short trades';
                    }
                  }

                  return (
                    <div key={group.bracket_id} className="space-y-2 p-4 border rounded-lg bg-muted/30">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Label className="font-medium">Bracket {index + 1}</Label>
                          {!group.sl_modified_by_user && (
                            <Badge variant="outline" className="text-xs">Auto-sync SL</Badge>
                          )}
                        </div>
                        {bracketGroups.length > 1 && (
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeBracketGroup(index)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">QTY (contracts)</Label>
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="Size"
                            value={group.size === 0 ? '' : group.size.toString()}
                            onChange={(e) => updateBracketGroup(index, 'size', e.target.value)}
                            className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          />
                        </div>
                        
                        <div className="space-y-1">
                          <Label className="text-xs">TP Price</Label>
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="TP"
                            value={group.take_profit_price === 0 ? '' : group.take_profit_price.toString()}
                            onChange={(e) => updateBracketGroup(index, 'take_profit_price', e.target.value)}
                            className={`flex h-9 w-full rounded-md border ${
                              getFieldError(`bracket_${index}_tp`) ? 'border-destructive' : 'border-input'
                            } bg-background px-2 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`}
                          />
                        </div>
                        
                        <div className="space-y-1">
                          <Label className="text-xs">SL Price</Label>
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="SL"
                            value={group.stop_loss_price === 0 ? '' : group.stop_loss_price.toString()}
                            onChange={(e) => updateBracketGroup(index, 'stop_loss_price', e.target.value)}
                            className={`flex h-9 w-full rounded-md border ${
                              !bracketSLValid || getFieldError(`bracket_${index}_sl`) ? 'border-destructive' : 'border-input'
                            } bg-background px-2 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`}
                          />
                        </div>
                      </div>
                      
                      {(!bracketSLValid || getFieldError(`bracket_${index}_tp`) || getFieldError(`bracket_${index}_sl`)) && (
                        <div className="space-y-1">
                          {!bracketSLValid && (
                            <Alert variant="destructive" className="mt-2">
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription className="text-xs">
                                {bracketSLMessage}
                              </AlertDescription>
                            </Alert>
                          )}
                          {getFieldError(`bracket_${index}_tp`) && (
                            <p className="text-xs text-destructive">{getFieldError(`bracket_${index}_tp`)?.message}</p>
                          )}
                          {getFieldError(`bracket_${index}_sl`) && bracketSLValid && (
                            <p className="text-xs text-destructive">{getFieldError(`bracket_${index}_sl`)?.message}</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Label htmlFor="positionSize" className="flex items-center gap-2">
              Position Size * (Auto-derived from sum of bracket sizes)
              {getFieldError('positionSize') && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{getFieldError('positionSize')?.message}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </Label>
            <div className="relative">
              <input
                id="positionSize"
                type="text"
                value={totalPositionSize.toFixed(assetType === 'crypto' ? 8 : assetType === 'futures' && !allowFractional ? 0 : 2)}
                readOnly
                disabled
                className={`flex h-10 w-full rounded-md border ${
                  getFieldError('positionSize') ? 'border-destructive' : 'border-input'
                } bg-muted px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground cursor-not-allowed opacity-70`}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              This field is automatically calculated as the sum of all bracket quantities
            </p>
            {getFieldError('positionSize') && (
              <p className="text-xs text-destructive mt-1">{getFieldError('positionSize')?.message}</p>
            )}
          </div>

          <div className="p-4 bg-muted rounded-lg space-y-2">
            <h4 className="font-medium">Trade Calculations (Full Position)</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Max R:R</p>
                <p className="font-bold text-lg">{isValidNumber(maxRR) ? maxRR.toFixed(2) : '0.00'}R</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Risk</p>
                <p className="font-bold text-lg text-red-500">${isValidNumber(totalRisk) ? totalRisk.toFixed(2) : '0.00'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Potential Reward</p>
                <p className="font-bold text-lg text-green-500">${isValidNumber(potentialReward) ? potentialReward.toFixed(2) : '0.00'}</p>
              </div>
            </div>
          </div>

          {!bracketConfigurationValid.valid && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {bracketConfigurationValid.message}
              </AlertDescription>
            </Alert>
          )}

          {bracketConfigurationValid.valid && scenarioOutcomes.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h4 className="font-medium">Full-Trade OCO Scenario Insights</h4>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Each scenario shows a complete trade outcome where each bracket hits either TP or SL (true OCO behavior). Total P/L is aggregated across all brackets. Total Risk is constant (primary trade risk). Overall R:R = Total P/L / Total Risk.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              
              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-64 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Scenario</TableHead>
                        <TableHead className="text-right">Total P/L</TableHead>
                        <TableHead className="text-right">Overall R:R</TableHead>
                        <TableHead className="text-right">Total Risk</TableHead>
                        <TableHead className="text-right">Total Reward</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {scenarioOutcomes.map((outcome, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono text-xs">
                            {outcome.scenarioDescription}
                          </TableCell>
                          <TableCell className={`text-right font-medium ${outcome.totalPL >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            ${isValidNumber(outcome.totalPL) ? outcome.totalPL.toFixed(2) : '0.00'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {isValidNumber(outcome.overallRR) ? outcome.overallRR.toFixed(2) : '0.00'}R
                          </TableCell>
                          <TableCell className="text-right text-red-500">
                            ${isValidNumber(outcome.totalRisk) ? outcome.totalRisk.toFixed(2) : '0.00'}
                          </TableCell>
                          <TableCell className="text-right text-green-500">
                            ${isValidNumber(outcome.totalReward) ? outcome.totalReward.toFixed(2) : '0.00'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={createTrade.isPending || updateTrade.isPending}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={createTrade.isPending || updateTrade.isPending || hasErrors}
          >
            {createTrade.isPending || updateTrade.isPending
              ? 'Saving...'
              : trade
              ? 'Update Trade'
              : 'Log Trade'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
