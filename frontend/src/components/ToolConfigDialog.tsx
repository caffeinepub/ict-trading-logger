import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Plus, X, Save } from 'lucide-react';
import type { ToolConfig, CustomToolDefinition } from '../backend';

interface ToolConfigDialogProps {
  tool: ToolConfig;
  zone: string;
  getToolName: (typeId: string) => string;
  customToolsLookup: Map<string, CustomToolDefinition>;
  onSave: (tool: ToolConfig) => void;
  onClose: () => void;
}

// Unified ICT Configuration Enumerations
const TIMEFRAME_UNITS = ['Minute', 'Hourly', 'Daily', 'Weekly', 'Monthly'];
const DIRECTIONS = ['Bullish', 'Bearish', 'Neutral'];
const STRUCTURAL_STATES = ['Regular', 'Inverted', 'Reclaimed'];
const LOCATION_VS_DEALING_RANGE = ['Inside Discount (0-50%)', 'Near Equilibrium (≈50%)', 'Inside Premium (50-100%)'];

// Inefficiency Tool Types
const INEFFICIENCY_TYPES = ['FVG', 'SIBI', 'BISI', 'Liquidity Void', 'Volume Imbalance', 'BPR'];
const FILL_STATES = ['Unfilled', 'Partially Filled', 'Fully Filled'];

// Gap Tool Types
const GAP_TYPES = ['New Week Opening Gap', 'New Day Opening Gap', 'Opening Range Gap'];
const BEHAVIOR_TAGS = ['Trending Signature', 'Consolidation Signature'];

// Block Tool Types
const BLOCK_TYPES = ['Order Block', 'Breaker Block', 'Mitigation Block', 'Rejection Block', 'Propulsion Block'];
const REFERENCE_POINTS = ['Open', 'High', 'Low', 'CE'];

// Equilibrium/CE Level Tool
const CE_SOURCES = ['Single Candle', 'Dealing Range', 'Gap'];
const CE_LEVEL_TYPES = ['CE', 'Fraction'];
const CE_CONTEXTS = ['Fair Value', 'Target', 'Invalidation'];

// Other PD Arrays
const LIQUIDITY_POOL_TYPES = ['Equal Highs', 'Equal Lows', 'Swing Highs', 'Swing Lows'];
const PD_ROLES = ['Target', 'Entry Filter', 'Invalidation'];
const PREMIUM_DISCOUNT_TYPES = ['Premium', 'Discount'];

// Context & Narrative
const SESSIONS = ['Asian', 'London', 'New York', 'Sydney'];
const MARKET_PHASES = ['Accumulation', 'Manipulation', 'Distribution', 'Reaccumulation'];
const MARKET_STRUCTURES = ['Higher Highs/Higher Lows', 'Lower Highs/Lower Lows', 'Ranging', 'Consolidation'];
const LIQUIDITY_TYPES = ['Buy Side', 'Sell Side', 'Equal Highs', 'Equal Lows'];
const KEY_LEVEL_TYPES = ['Support', 'Resistance', 'Premium', 'Discount', 'Equilibrium'];
const SILVER_BULLET_TYPES = ['AM (10:00-11:00)', 'PM (14:00-15:00)'];
const KILLZONE_TYPES = ['London Killzone', 'New York Killzone', 'Asian Killzone', 'London Open', 'New York Open'];
const STRENGTH_LEVELS = ['Strong', 'Moderate', 'Weak'];
const PRIORITY_LEVELS = ['High', 'Medium', 'Low'];
const PD_TYPES = ['PDH', 'PDL', 'Both'];
const WEEKLY_TYPES = ['Weekly High', 'Weekly Low', 'Both'];

// Unified Tool Property Configurations
const TOOL_PROPERTY_CONFIGS: Record<string, any> = {
  // Context & Narrative Tools
  'htf-bias': {
    biasDirection: { type: 'select', options: DIRECTIONS, label: 'Bias Direction' },
    biasTimeframeUnit: { type: 'select', options: TIMEFRAME_UNITS, label: 'Bias Timeframe Unit' },
    biasTimeframeValue: { type: 'number', label: 'Bias Timeframe Value', min: 1, max: 999 },
    biasStrength: { type: 'select', options: STRENGTH_LEVELS, label: 'Bias Strength' },
  },
  'market-phase': {
    phase: { type: 'select', options: MARKET_PHASES, label: 'Current Phase' },
    confirmed: { type: 'toggle', label: 'Phase Confirmed' },
  },
  'liquidity-draw': {
    liquidityType: { type: 'select', options: LIQUIDITY_TYPES, label: 'Liquidity Type' },
    priority: { type: 'select', options: PRIORITY_LEVELS, label: 'Priority' },
    levelLabel: { type: 'text', label: 'Level Label (optional)' },
  },
  'market-structure': {
    structureType: { type: 'select', options: MARKET_STRUCTURES, label: 'Structure Type' },
    structureTimeframeUnit: { type: 'select', options: TIMEFRAME_UNITS, label: 'Structure Timeframe Unit' },
    structureTimeframeValue: { type: 'number', label: 'Structure Timeframe Value', min: 1, max: 999 },
    confirmed: { type: 'toggle', label: 'Structure Confirmed' },
  },
  
  // Reference Levels
  'dealing-range': {
    rangeTimeframeUnit: { type: 'select', options: TIMEFRAME_UNITS, label: 'Range Timeframe Unit' },
    rangeTimeframeValue: { type: 'number', label: 'Range Timeframe Value', min: 1, max: 999 },
    rangeLabel: { type: 'text', label: 'Range Label' },
  },
  'equilibrium-ce': {
    source: { type: 'select', options: CE_SOURCES, label: 'Source' },
    levelType: { type: 'select', options: CE_LEVEL_TYPES, label: 'Level Type' },
    context: { type: 'select', options: CE_CONTEXTS, label: 'Context' },
    structuralState: { type: 'select', options: STRUCTURAL_STATES, label: 'Structural State' },
  },
  'gap': {
    gapType: { type: 'select', options: GAP_TYPES, label: 'Gap Type' },
    orientation: { type: 'select', options: DIRECTIONS, label: 'Orientation' },
    internalLevels: { type: 'toggle', label: 'Internal Levels (CE + Quadrants)' },
    behaviorTag: { type: 'select', options: BEHAVIOR_TAGS, label: 'Behavior Tag' },
    structuralState: { type: 'select', options: STRUCTURAL_STATES, label: 'Structural State' },
  },
  'key-level': {
    levelType: { type: 'select', options: KEY_LEVEL_TYPES, label: 'Level Type' },
    tested: { type: 'toggle', label: 'Level Tested' },
    levelLabel: { type: 'text', label: 'Level Label' },
  },
  'pdh-pdl': {
    pdType: { type: 'select', options: PD_TYPES, label: 'Level Type' },
    respected: { type: 'toggle', label: 'Level Respected' },
  },
  'weekly-hl': {
    weeklyType: { type: 'select', options: WEEKLY_TYPES, label: 'Level Type' },
    currentWeek: { type: 'toggle', label: 'Current Week' },
  },
  
  // Unified PD Arrays
  'inefficiency': {
    inefficiencyType: { type: 'select', options: INEFFICIENCY_TYPES, label: 'Inefficiency Type' },
    direction: { type: 'select', options: DIRECTIONS, label: 'Direction' },
    timeframeUnit: { type: 'select', options: TIMEFRAME_UNITS, label: 'Timeframe Unit' },
    timeframeValue: { type: 'number', label: 'Timeframe Value', min: 1, max: 999 },
    fillState: { type: 'select', options: FILL_STATES, label: 'Fill State' },
    structuralState: { type: 'select', options: STRUCTURAL_STATES, label: 'Structural State' },
    locationVsDealingRange: { type: 'select', options: LOCATION_VS_DEALING_RANGE, label: 'Location vs Dealing Range' },
  },
  'block': {
    blockType: { type: 'select', options: BLOCK_TYPES, label: 'Block Type' },
    direction: { type: 'select', options: DIRECTIONS, label: 'Direction' },
    timeframeUnit: { type: 'select', options: TIMEFRAME_UNITS, label: 'Timeframe Unit' },
    timeframeValue: { type: 'number', label: 'Timeframe Value', min: 1, max: 999 },
    referencePoint: { type: 'select', options: REFERENCE_POINTS, label: 'Reference Point' },
    structuralState: { type: 'select', options: STRUCTURAL_STATES, label: 'Structural State' },
    locationVsDealingRange: { type: 'select', options: LOCATION_VS_DEALING_RANGE, label: 'Location vs Dealing Range' },
  },
  'liquidity-pool': {
    poolType: { type: 'select', options: LIQUIDITY_POOL_TYPES, label: 'Pool Type' },
    timeframeUnit: { type: 'select', options: TIMEFRAME_UNITS, label: 'Timeframe Unit' },
    timeframeValue: { type: 'number', label: 'Timeframe Value', min: 1, max: 999 },
    role: { type: 'select', options: PD_ROLES, label: 'Role' },
    structuralState: { type: 'select', options: STRUCTURAL_STATES, label: 'Structural State' },
    locationVsDealingRange: { type: 'select', options: LOCATION_VS_DEALING_RANGE, label: 'Location vs Dealing Range' },
  },
  'premium-discount': {
    zoneType: { type: 'select', options: PREMIUM_DISCOUNT_TYPES, label: 'Zone Type' },
    timeframeUnit: { type: 'select', options: TIMEFRAME_UNITS, label: 'Timeframe Unit' },
    timeframeValue: { type: 'number', label: 'Timeframe Value', min: 1, max: 999 },
    role: { type: 'select', options: PD_ROLES, label: 'Role' },
    structuralState: { type: 'select', options: STRUCTURAL_STATES, label: 'Structural State' },
  },
  
  // Time & Session Tools
  'session': {
    sessionType: { type: 'select', options: SESSIONS, label: 'Trading Session' },
    sessionTime: { type: 'text', label: 'Session Time Range' },
    active: { type: 'toggle', label: 'Session Active' },
  },
  'killzone': {
    killzoneType: { type: 'select', options: KILLZONE_TYPES, label: 'Killzone Type' },
    killzoneTime: { type: 'text', label: 'Killzone Time Range' },
    priority: { type: 'select', options: PRIORITY_LEVELS, label: 'Priority' },
  },
  'silver-bullet': {
    silverBulletType: { type: 'select', options: SILVER_BULLET_TYPES, label: 'Silver Bullet Type' },
    timeWindow: { type: 'text', label: 'Time Window' },
    active: { type: 'toggle', label: 'Currently Active' },
  },
  'time-rule': {
    ruleDescription: { type: 'text', label: 'Time-Based Rule' },
    enforced: { type: 'toggle', label: 'Rule Enforced' },
  },
};

export default function ToolConfigDialog({ tool, zone, getToolName, customToolsLookup, onSave, onClose }: ToolConfigDialogProps) {
  const [properties, setProperties] = useState<Record<string, any>>({});
  const [interactions, setInteractions] = useState<string[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [newInteraction, setNewInteraction] = useState('');
  const [newAction, setNewAction] = useState('');

  const customTool = customToolsLookup.get(tool.type);

  useEffect(() => {
    setProperties(JSON.parse(tool.properties || '{}'));
    setInteractions([...tool.interactions]);
    setActions([...tool.actions]);
  }, [tool]);

  const handlePropertyChange = (key: string, value: any) => {
    setProperties({ ...properties, [key]: value });
  };

  const handleAddInteraction = () => {
    if (newInteraction.trim()) {
      setInteractions([...interactions, newInteraction.trim()]);
      setNewInteraction('');
    }
  };

  const handleRemoveInteraction = (index: number) => {
    setInteractions(interactions.filter((_, i) => i !== index));
  };

  const handleAddAction = () => {
    if (newAction.trim()) {
      setActions([...actions, newAction.trim()]);
      setNewAction('');
    }
  };

  const handleRemoveAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const updatedTool: ToolConfig = {
      ...tool,
      properties: JSON.stringify(properties),
      interactions,
      actions,
    };
    onSave(updatedTool);
  };

  const propertyConfig = TOOL_PROPERTY_CONFIGS[tool.type] || {};

  const renderPropertyField = (key: string, config: any) => {
    const value = properties[key];

    if (config.type === 'select') {
      return (
        <div key={key} className="space-y-2">
          <Label htmlFor={key} className="text-sm font-medium">
            {config.label}
          </Label>
          <Select value={value || ''} onValueChange={(val) => handlePropertyChange(key, val)}>
            <SelectTrigger id={key}>
              <SelectValue placeholder={`Select ${config.label.toLowerCase()}...`} />
            </SelectTrigger>
            <SelectContent>
              {config.options.map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (config.type === 'toggle') {
      return (
        <div key={key} className="flex items-center justify-between space-x-2 py-2">
          <Label htmlFor={key} className="text-sm font-medium">
            {config.label}
          </Label>
          <Switch
            id={key}
            checked={value === true || value === 'true'}
            onCheckedChange={(checked) => handlePropertyChange(key, checked)}
          />
        </div>
      );
    }

    if (config.type === 'number') {
      return (
        <div key={key} className="space-y-2">
          <Label htmlFor={key} className="text-sm font-medium">
            {config.label}
          </Label>
          <Input
            id={key}
            type="number"
            min={config.min || 0}
            max={config.max || 999}
            value={value || ''}
            onChange={(e) => handlePropertyChange(key, parseInt(e.target.value) || 1)}
            placeholder={`Enter ${config.label.toLowerCase()}...`}
          />
        </div>
      );
    }

    if (config.type === 'text') {
      return (
        <div key={key} className="space-y-2">
          <Label htmlFor={key} className="text-sm font-medium">
            {config.label}
          </Label>
          <Input
            id={key}
            value={value || ''}
            onChange={(e) => handlePropertyChange(key, e.target.value)}
            placeholder={`Enter ${config.label.toLowerCase()}...`}
          />
        </div>
      );
    }

    return null;
  };

  const renderCustomPropertyField = (prop: any) => {
    const value = properties[prop.propertyLabel];

    if (prop.type === 'select') {
      return (
        <div key={prop.id} className="space-y-2">
          <Label htmlFor={prop.id} className="text-sm font-medium">
            {prop.propertyLabel}
          </Label>
          <Select value={value || ''} onValueChange={(val) => handlePropertyChange(prop.propertyLabel, val)}>
            <SelectTrigger id={prop.id}>
              <SelectValue placeholder={`Select ${prop.propertyLabel.toLowerCase()}...`} />
            </SelectTrigger>
            <SelectContent>
              {prop.options.map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (prop.type === 'toggle') {
      return (
        <div key={prop.id} className="flex items-center justify-between space-x-2 py-2">
          <Label htmlFor={prop.id} className="text-sm font-medium">
            {prop.propertyLabel}
          </Label>
          <Switch
            id={prop.id}
            checked={value === true || value === 'true'}
            onCheckedChange={(checked) => handlePropertyChange(prop.propertyLabel, checked)}
          />
        </div>
      );
    }

    if (prop.type === 'number') {
      return (
        <div key={prop.id} className="space-y-2">
          <Label htmlFor={prop.id} className="text-sm font-medium">
            {prop.propertyLabel}
          </Label>
          <Input
            id={prop.id}
            type="number"
            value={value || ''}
            onChange={(e) => handlePropertyChange(prop.propertyLabel, parseInt(e.target.value) || 0)}
            placeholder={`Enter ${prop.propertyLabel.toLowerCase()}...`}
          />
        </div>
      );
    }

    if (prop.type === 'text') {
      return (
        <div key={prop.id} className="space-y-2">
          <Label htmlFor={prop.id} className="text-sm font-medium">
            {prop.propertyLabel}
          </Label>
          <Input
            id={prop.id}
            value={value || ''}
            onChange={(e) => handlePropertyChange(prop.propertyLabel, e.target.value)}
            placeholder={`Enter ${prop.propertyLabel.toLowerCase()}...`}
          />
        </div>
      );
    }

    return null;
  };

  // Determine if this is a PD Array tool that should show global flags
  const isPDArrayTool = ['inefficiency', 'block', 'liquidity-pool', 'premium-discount', 'gap', 'equilibrium-ce'].includes(tool.type);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Configure {getToolName(tool.type)}</DialogTitle>
          <DialogDescription>
            Set properties for this tool in the <span className="font-semibold">{zone}</span> zone
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="properties" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="properties">Properties</TabsTrigger>
            <TabsTrigger value="interactions">Interactions</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="properties" className="space-y-4 mt-4">
            {customTool ? (
              <Accordion type="single" collapsible defaultValue="basic" className="w-full">
                <AccordionItem value="basic">
                  <AccordionTrigger className="text-sm font-semibold">
                    Basic Configuration
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    {customTool.properties.map((prop) => renderCustomPropertyField(prop))}
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="advanced">
                  <AccordionTrigger className="text-sm font-semibold">
                    Advanced Settings
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="notes" className="text-sm font-medium">
                        Notes
                      </Label>
                      <Textarea
                        id="notes"
                        value={properties.notes || ''}
                        onChange={(e) => handlePropertyChange('notes', e.target.value)}
                        placeholder="Add any additional notes or context..."
                        rows={3}
                      />
                    </div>
                    <div className="flex items-center justify-between space-x-2 py-2">
                      <Label htmlFor="enabled" className="text-sm font-medium">
                        Tool Enabled
                      </Label>
                      <Switch
                        id="enabled"
                        checked={properties.enabled !== false && properties.enabled !== 'false'}
                        onCheckedChange={(checked) => handlePropertyChange('enabled', checked)}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            ) : Object.keys(propertyConfig).length > 0 ? (
              <Accordion type="single" collapsible defaultValue="basic" className="w-full">
                <AccordionItem value="basic">
                  <AccordionTrigger className="text-sm font-semibold">
                    Basic Configuration
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    {Object.entries(propertyConfig).map(([key, config]) =>
                      renderPropertyField(key, config)
                    )}
                  </AccordionContent>
                </AccordionItem>

                {isPDArrayTool && (
                  <AccordionItem value="pd-flags">
                    <AccordionTrigger className="text-sm font-semibold">
                      PD Array Global Flags
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                      <p className="text-xs text-muted-foreground mb-3">
                        Universal flags for all PD array-based tools
                      </p>
                      {!propertyConfig.structuralState && (
                        <div className="space-y-2">
                          <Label htmlFor="structuralState" className="text-sm font-medium">
                            Structural State
                          </Label>
                          <Select 
                            value={properties.structuralState || 'Regular'} 
                            onValueChange={(val) => handlePropertyChange('structuralState', val)}
                          >
                            <SelectTrigger id="structuralState">
                              <SelectValue placeholder="Select structural state..." />
                            </SelectTrigger>
                            <SelectContent>
                              {STRUCTURAL_STATES.map((state) => (
                                <SelectItem key={state} value={state}>
                                  {state}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {!propertyConfig.locationVsDealingRange && (
                        <div className="space-y-2">
                          <Label htmlFor="locationVsDealingRange" className="text-sm font-medium">
                            Location vs Dealing Range
                          </Label>
                          <Select 
                            value={properties.locationVsDealingRange || 'Inside Discount (0-50%)'} 
                            onValueChange={(val) => handlePropertyChange('locationVsDealingRange', val)}
                          >
                            <SelectTrigger id="locationVsDealingRange">
                              <SelectValue placeholder="Select location..." />
                            </SelectTrigger>
                            <SelectContent>
                              {LOCATION_VS_DEALING_RANGE.map((location) => (
                                <SelectItem key={location} value={location}>
                                  {location}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                )}

                <AccordionItem value="advanced">
                  <AccordionTrigger className="text-sm font-semibold">
                    Advanced Settings
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="notes" className="text-sm font-medium">
                        Notes
                      </Label>
                      <Textarea
                        id="notes"
                        value={properties.notes || ''}
                        onChange={(e) => handlePropertyChange('notes', e.target.value)}
                        placeholder="Add any additional notes or context..."
                        rows={3}
                      />
                    </div>
                    <div className="flex items-center justify-between space-x-2 py-2">
                      <Label htmlFor="enabled" className="text-sm font-medium">
                        Tool Enabled
                      </Label>
                      <Switch
                        id="enabled"
                        checked={properties.enabled !== false && properties.enabled !== 'false'}
                        onCheckedChange={(checked) => handlePropertyChange('enabled', checked)}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-sm">No specific properties available for this tool type.</p>
                <p className="text-xs mt-2">Use Interactions and Actions tabs to define behavior.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="interactions" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="new-interaction" className="text-sm font-medium">
                  Add Interaction Condition
                </Label>
                <div className="flex gap-2">
                  <Textarea
                    id="new-interaction"
                    placeholder="e.g., When price interacts with inefficiency at 50% level during London session..."
                    value={newInteraction}
                    onChange={(e) => setNewInteraction(e.target.value)}
                    rows={2}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleAddInteraction}
                    size="icon"
                    className="flex-shrink-0 h-auto"
                    disabled={!newInteraction.trim()}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {interactions.length > 0 ? (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Defined Interactions</Label>
                  {interactions.map((interaction, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 p-3 bg-muted rounded-lg border"
                    >
                      <div className="flex-1">
                        <p className="text-sm">{interaction}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 flex-shrink-0"
                        onClick={() => handleRemoveInteraction(index)}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    No interactions defined yet.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Add conditions that trigger actions when met.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="actions" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="new-action" className="text-sm font-medium">
                  Add Action
                </Label>
                <div className="flex gap-2">
                  <Textarea
                    id="new-action"
                    placeholder="e.g., Enter long position at block low with stop loss below order block..."
                    value={newAction}
                    onChange={(e) => setNewAction(e.target.value)}
                    rows={2}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleAddAction}
                    size="icon"
                    className="flex-shrink-0 h-auto"
                    disabled={!newAction.trim()}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {actions.length > 0 ? (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Defined Actions</Label>
                  {actions.map((action, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 p-3 bg-muted rounded-lg border"
                    >
                      <div className="flex-1">
                        <p className="text-sm">{action}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 flex-shrink-0"
                        onClick={() => handleRemoveAction(index)}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    No actions defined yet.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Add what to do when interaction conditions are met.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="gap-2">
            <Save className="w-4 h-4" />
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
