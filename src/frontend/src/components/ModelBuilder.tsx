import { useState, useEffect } from 'react';
import { useCreateModel, useUpdateModel, useGetCurrentTime, useGetAllCustomTools } from '../hooks/useQueries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { ChevronDown, ChevronRight, Plus, X, Settings, Save, FileText, GripVertical, ArrowLeft, Menu, MousePointer2, Wrench } from 'lucide-react';
import type { Model, ToolConfig, CustomToolDefinition } from '../backend';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import ToolConfigDialog from './ToolConfigDialog';
import ModelCardSummary from './ModelCardSummary';
import CustomToolManagerDialog from './CustomToolManagerDialog';

interface ModelBuilderProps {
  model?: Model | null;
  onClose: () => void;
}

interface ICTTool {
  id: string;
  name: string;
  category: string;
  defaultProperties: Record<string, any>;
}

const ICT_TOOLS: ICTTool[] = [
  // Context & Narrative Tools
  { id: 'htf-bias', name: 'HTF Bias', category: 'Context & Narrative', defaultProperties: { biasDirection: 'Bullish', biasTimeframeUnit: 'Daily', biasTimeframeValue: 1 } },
  { id: 'market-phase', name: 'Market Phase', category: 'Context & Narrative', defaultProperties: { phase: 'Accumulation', confirmed: false } },
  { id: 'liquidity-draw', name: 'Liquidity Draw', category: 'Context & Narrative', defaultProperties: { liquidityType: 'Buy Side', priority: 'High' } },
  { id: 'market-structure', name: 'Market Structure', category: 'Context & Narrative', defaultProperties: { structureType: 'Higher Highs/Higher Lows', structureTimeframeUnit: 'Hourly', structureTimeframeValue: 4, confirmed: false } },
  
  // Reference Levels & Ranges
  { id: 'dealing-range', name: 'Dealing Range', category: 'Reference Levels', defaultProperties: { rangeTimeframeUnit: 'Daily', rangeTimeframeValue: 1, rangeLabel: '' } },
  { id: 'equilibrium-ce', name: 'Equilibrium / CE Level', category: 'Reference Levels', defaultProperties: { source: 'Single Candle', levelType: 'CE', context: 'Fair Value', structuralState: 'Regular' } },
  { id: 'gap', name: 'Gap', category: 'Reference Levels', defaultProperties: { gapType: 'New Week Opening Gap', orientation: 'Bullish', internalLevels: false, behaviorTag: 'Trending Signature', structuralState: 'Regular' } },
  { id: 'key-level', name: 'Key Level', category: 'Reference Levels', defaultProperties: { levelType: 'Support', tested: false } },
  { id: 'pdh-pdl', name: 'Previous Day High/Low', category: 'Reference Levels', defaultProperties: { pdType: 'PDH', respected: false } },
  { id: 'weekly-hl', name: 'Weekly High/Low', category: 'Reference Levels', defaultProperties: { weeklyType: 'Weekly High', currentWeek: true } },
  
  // PD Arrays & Price Delivery (Unified Tools)
  { id: 'inefficiency', name: 'Inefficiency', category: 'PD Arrays', defaultProperties: { inefficiencyType: 'FVG', direction: 'Bullish', timeframeUnit: 'Minute', timeframeValue: 15, fillState: 'Unfilled', structuralState: 'Regular', locationVsDealingRange: 'Inside Discount (0-50%)' } },
  { id: 'block', name: 'Block', category: 'PD Arrays', defaultProperties: { blockType: 'Order Block', direction: 'Bullish', timeframeUnit: 'Minute', timeframeValue: 5, referencePoint: 'CE', structuralState: 'Regular', locationVsDealingRange: 'Inside Discount (0-50%)' } },
  { id: 'liquidity-pool', name: 'Liquidity Pool', category: 'PD Arrays', defaultProperties: { poolType: 'Equal Highs', timeframeUnit: 'Hourly', timeframeValue: 1, role: 'Target', structuralState: 'Regular', locationVsDealingRange: 'Inside Premium (50-100%)' } },
  { id: 'premium-discount', name: 'Premium/Discount Zone', category: 'PD Arrays', defaultProperties: { zoneType: 'Premium', timeframeUnit: 'Daily', timeframeValue: 1, role: 'Entry Filter', structuralState: 'Regular' } },
  
  // Time & Session Tools
  { id: 'session', name: 'Trading Session', category: 'Time & Session', defaultProperties: { sessionType: 'London', sessionTime: '03:00-12:00', active: false } },
  { id: 'killzone', name: 'Killzone', category: 'Time & Session', defaultProperties: { killzoneType: 'London Killzone', killzoneTime: '02:00-05:00', priority: 'High' } },
  { id: 'silver-bullet', name: 'Silver Bullet', category: 'Time & Session', defaultProperties: { silverBulletType: 'AM (10:00-11:00)', timeWindow: '10:00-11:00', active: false } },
  { id: 'time-rule', name: 'Time-Based Rule', category: 'Time & Session', defaultProperties: { ruleDescription: 'No trades after 12:00', enforced: true } },
];

const TOOL_CATEGORIES = [
  'Context & Narrative',
  'Reference Levels',
  'PD Arrays',
  'Time & Session',
];

export default function ModelBuilder({ model, onClose }: ModelBuilderProps) {
  const [step, setStep] = useState<'build' | 'summary'>('build');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [narrativeTools, setNarrativeTools] = useState<ToolConfig[]>([]);
  const [frameworkTools, setFrameworkTools] = useState<ToolConfig[]>([]);
  const [executionTools, setExecutionTools] = useState<ToolConfig[]>([]);
  const [editingTool, setEditingTool] = useState<{ tool: ToolConfig; zone: string } | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [isToolPaletteOpen, setIsToolPaletteOpen] = useState(false);
  const [isCustomToolManagerOpen, setIsCustomToolManagerOpen] = useState(false);
  
  // Unified tool selection state for click/tap-to-add flow (all screen sizes)
  const [selectedToolToPlace, setSelectedToolToPlace] = useState<ICTTool | null>(null);

  const createModel = useCreateModel();
  const updateModel = useUpdateModel();
  const { data: currentTime } = useGetCurrentTime();
  const { identity } = useInternetIdentity();
  const { data: customTools = [] } = useGetAllCustomTools();

  useEffect(() => {
    if (model) {
      setName(model.name);
      setDescription(model.description);
      setNarrativeTools(model.narrative);
      setFrameworkTools(model.framework);
      setExecutionTools(model.execution);
    }
  }, [model]);

  // Haptic feedback helper
  const triggerHapticFeedback = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  };

  // Unified tool selection handler (all screen sizes)
  const handleToolSelect = (tool: ICTTool) => {
    setSelectedToolToPlace(tool);
    setIsToolPaletteOpen(false);
    triggerHapticFeedback();
  };

  // Unified zone selection handler (all screen sizes)
  const handleZoneSelect = (zone: string) => {
    if (!selectedToolToPlace) return;
    
    addToolToZone(selectedToolToPlace, zone);
    setSelectedToolToPlace(null);
    triggerHapticFeedback();
  };

  // Cancel placement mode
  const handleCancelPlacement = () => {
    setSelectedToolToPlace(null);
  };

  // Unified function to add tool to zone (always appends to end)
  const addToolToZone = (tool: ICTTool, zone: string) => {
    const newTool: ToolConfig = {
      id: crypto.randomUUID(),
      type: tool.id,
      properties: JSON.stringify(tool.defaultProperties),
      interactions: [],
      actions: [],
      zone,
      position: BigInt(Date.now()),
    };

    if (zone === 'narrative') {
      setNarrativeTools([...narrativeTools, newTool]);
    } else if (zone === 'framework') {
      setFrameworkTools([...frameworkTools, newTool]);
    } else if (zone === 'execution') {
      setExecutionTools([...executionTools, newTool]);
    }
  };

  const handleRemoveTool = (toolId: string, zone: string) => {
    if (zone === 'narrative') {
      setNarrativeTools(narrativeTools.filter(t => t.id !== toolId));
    } else if (zone === 'framework') {
      setFrameworkTools(frameworkTools.filter(t => t.id !== toolId));
    } else if (zone === 'execution') {
      setExecutionTools(executionTools.filter(t => t.id !== toolId));
    }
  };

  const handleUpdateTool = (updatedTool: ToolConfig, zone: string) => {
    if (zone === 'narrative') {
      setNarrativeTools(narrativeTools.map(t => t.id === updatedTool.id ? updatedTool : t));
    } else if (zone === 'framework') {
      setFrameworkTools(frameworkTools.map(t => t.id === updatedTool.id ? updatedTool : t));
    } else if (zone === 'execution') {
      setExecutionTools(executionTools.map(t => t.id === updatedTool.id ? updatedTool : t));
    }
  };

  const toggleCategory = (category: string) => {
    const newCollapsed = new Set(collapsedCategories);
    if (newCollapsed.has(category)) {
      newCollapsed.delete(category);
    } else {
      newCollapsed.add(category);
    }
    setCollapsedCategories(newCollapsed);
  };

  const getToolName = (typeId: string): string => {
    const builtInTool = ICT_TOOLS.find(t => t.id === typeId);
    if (builtInTool) return builtInTool.name;
    
    const customTool = customTools.find(t => t.id === typeId);
    if (customTool) return customTool.name;
    
    return typeId;
  };

  const customToolsLookup = new Map(customTools.map(t => [t.id, t]));

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Please enter a model name');
      return;
    }

    if (!identity) {
      toast.error('Please log in to save the model');
      return;
    }

    const modelData: Model = {
      id: model?.id || crypto.randomUUID(),
      owner: model?.owner || identity.getPrincipal(),
      name: name.trim(),
      description: description.trim(),
      narrative: narrativeTools,
      framework: frameworkTools,
      execution: executionTools,
      created_at: model?.created_at || currentTime || BigInt(Date.now() * 1000000),
    };

    try {
      if (model) {
        await updateModel.mutateAsync(modelData);
        toast.success('Model updated successfully!');
      } else {
        await createModel.mutateAsync(modelData);
        toast.success('Model created successfully!');
      }
      onClose();
    } catch (error) {
      toast.error(model ? 'Failed to update model' : 'Failed to create model');
      console.error(error);
    }
  };

  const renderToolCard = (tool: ToolConfig, zone: string) => {
    const properties = JSON.parse(tool.properties || '{}');
    return (
      <div
        key={tool.id}
        className="group relative bg-card border rounded-lg p-3 hover:shadow-md transition-all"
      >
        <div className="flex items-start gap-2">
          <GripVertical className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm">{getToolName(tool.type)}</h4>
            <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
              {Object.entries(properties).slice(0, 3).map(([key, value]) => (
                <div key={key} className="truncate">
                  <span className="font-medium">{key}:</span> {String(value)}
                </div>
              ))}
            </div>
            {tool.interactions.length > 0 && (
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                {tool.interactions.length} interaction(s)
              </div>
            )}
            {tool.actions.length > 0 && (
              <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                {tool.actions.length} action(s)
              </div>
            )}
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setEditingTool({ tool, zone })}
            >
              <Settings className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => handleRemoveTool(tool.id, zone)}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // Tool Palette Content Component (reusable for both desktop sidebar and mobile sheet)
  const ToolPaletteContent = () => (
    <>
      {/* Fixed Header Area */}
      <div className="flex-shrink-0 p-4 border-b bg-background/95 backdrop-blur">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <ChevronRight className="w-4 h-4" />
            Tool Palette
          </h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsCustomToolManagerOpen(true)}
            title="Manage Custom Tools"
          >
            <Wrench className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Select a tool, then select a zone
        </p>
      </div>

      {/* Scrollable Tool List Area */}
      <ScrollArea className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-2">
          {/* Custom Tools Category */}
          {customTools.length > 0 && (
            <Collapsible open={!collapsedCategories.has('Custom Tools')}>
              <CollapsibleTrigger
                className="flex items-center justify-between w-full p-3 hover:bg-accent rounded-lg text-sm font-medium transition-colors"
                onClick={() => toggleCategory('Custom Tools')}
              >
                <span>Custom Tools</span>
                {collapsedCategories.has('Custom Tools') ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 mt-2">
                {customTools.map((customTool) => {
                  const defaultProps: Record<string, any> = {};
                  customTool.properties.forEach(prop => {
                    defaultProps[prop.propertyLabel] = prop.default_value;
                  });
                  
                  const tool: ICTTool = {
                    id: customTool.id,
                    name: customTool.name,
                    category: 'Custom Tools',
                    defaultProperties: defaultProps,
                  };

                  return (
                    <div
                      key={tool.id}
                      onClick={() => handleToolSelect(tool)}
                      className={`p-4 bg-card border rounded-lg cursor-pointer active:scale-95 hover:shadow-md hover:border-primary/50 transition-all text-sm min-h-[44px] ${
                        selectedToolToPlace?.id === tool.id
                          ? 'bg-primary/10 border-primary ring-2 ring-primary/20'
                          : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Plus className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium">{tool.name}</span>
                      </div>
                    </div>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Built-in ICT Tools */}
          {TOOL_CATEGORIES.map((category) => {
            const categoryTools = ICT_TOOLS.filter(t => t.category === category);
            const isCollapsed = collapsedCategories.has(category);

            return (
              <Collapsible key={category} open={!isCollapsed}>
                <CollapsibleTrigger
                  className="flex items-center justify-between w-full p-3 hover:bg-accent rounded-lg text-sm font-medium transition-colors"
                  onClick={() => toggleCategory(category)}
                >
                  <span>{category}</span>
                  {isCollapsed ? (
                    <ChevronRight className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 mt-2">
                  {categoryTools.map((tool) => (
                    <div
                      key={tool.id}
                      onClick={() => handleToolSelect(tool)}
                      className={`p-4 bg-card border rounded-lg cursor-pointer active:scale-95 hover:shadow-md hover:border-primary/50 transition-all text-sm min-h-[44px] ${
                        selectedToolToPlace?.id === tool.id
                          ? 'bg-primary/10 border-primary ring-2 ring-primary/20'
                          : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Plus className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium">{tool.name}</span>
                      </div>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>
    </>
  );

  if (step === 'summary') {
    return (
      <ModelCardSummary
        name={name}
        description={description}
        narrativeTools={narrativeTools}
        frameworkTools={frameworkTools}
        executionTools={executionTools}
        getToolName={getToolName}
        onBack={() => setStep('build')}
        onSave={handleSave}
        isSaving={createModel.isPending || updateModel.isPending}
      />
    );
  }

  return (
    <div className="fixed inset-0 pt-32 md:pt-16 pb-[72px] md:pb-0 z-40 bg-background flex flex-col">
      {/* Zone Selection Prompt (all screen sizes) */}
      {selectedToolToPlace && (
        <div className="fixed top-32 md:top-16 left-0 right-0 z-50 bg-primary text-primary-foreground px-4 py-3 shadow-lg">
          <div className="flex items-center gap-3">
            <MousePointer2 className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-sm">
                Select a zone to add "{selectedToolToPlace.name}"
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
              onClick={handleCancelPlacement}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Compact Sticky Header - Responsive for mobile and desktop */}
      <div className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3">
          {/* Back Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="flex-shrink-0 h-9 w-9"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          {/* Mobile: Hamburger Menu + Model Name */}
          <div className="flex-1 flex items-center gap-2 md:hidden">
            <Sheet open={isToolPaletteOpen} onOpenChange={setIsToolPaletteOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9 flex-shrink-0">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[80vh] flex flex-col p-0">
                <SheetHeader className="p-4 border-b">
                  <SheetTitle>Add Tools</SheetTitle>
                </SheetHeader>
                <div className="flex-1 flex flex-col overflow-hidden">
                  <ToolPaletteContent />
                </div>
              </SheetContent>
            </Sheet>
            
            <Input
              id="model-name-mobile"
              placeholder="Model Name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 text-sm flex-1"
            />
          </div>

          {/* Desktop: Full layout with name and description */}
          <div className="hidden md:flex flex-1 gap-3 items-center">
            <div className="flex-1 max-w-xs">
              <Input
                id="model-name"
                placeholder="Model Name *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="flex-1 max-w-md">
              <Input
                id="model-description"
                placeholder="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          {/* Action buttons - responsive */}
          <div className="flex gap-2 flex-shrink-0">
            <Button
              variant="outline"
              onClick={() => setStep('summary')}
              disabled={!name.trim() || (narrativeTools.length === 0 && frameworkTools.length === 0 && executionTools.length === 0)}
              size="icon"
              className="h-9 w-9 md:w-auto md:px-3"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden md:inline md:ml-2">Preview</span>
            </Button>
            <Button
              onClick={handleSave}
              disabled={!name.trim() || createModel.isPending || updateModel.isPending}
              size="icon"
              className="h-9 w-9 md:w-auto md:px-3"
            >
              <Save className="w-4 h-4" />
              <span className="hidden md:inline md:ml-2">
                {createModel.isPending || updateModel.isPending ? 'Saving...' : 'Save'}
              </span>
            </Button>
          </div>
        </div>

        {/* Mobile: Description field in second row */}
        <div className="md:hidden px-3 pb-2">
          <Input
            id="model-description-mobile"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="h-9 text-sm"
          />
        </div>
      </div>

      {/* Main Content Area - Responsive layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop: Left Sidebar - Tool Palette (Pinned and Visible) */}
        <div className="hidden md:flex w-80 lg:w-96 flex-shrink-0 border-r bg-muted/30 flex-col overflow-hidden">
          <ToolPaletteContent />
        </div>

        {/* Workspace - Responsive: Horizontal on desktop, Vertical on mobile */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-3 md:p-6 space-y-3 md:space-y-6">
              {/* Narrative Zone */}
              <div
                data-drop-zone="narrative"
                className={`border-2 border-dashed rounded-xl p-4 md:p-6 min-h-[200px] md:min-h-[280px] transition-all ${
                  selectedToolToPlace
                    ? 'border-blue-500 bg-blue-500/5 shadow-lg cursor-pointer'
                    : 'border-border hover:border-blue-500/50'
                }`}
                onClick={() => selectedToolToPlace && handleZoneSelect('narrative')}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-8 md:h-10 w-1.5 bg-blue-500 rounded-full" />
                  <div>
                    <h3 className="font-semibold text-base md:text-lg">Narrative Zone</h3>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      Context & market story
                    </p>
                  </div>
                </div>
                {narrativeTools.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 md:h-48 text-muted-foreground border-2 border-dashed border-muted rounded-lg">
                    <Plus className="w-8 md:w-12 h-8 md:h-12 mb-2 opacity-50" />
                    <p className="text-xs md:text-sm font-medium text-center px-4">
                      Select a tool, then select this zone
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {narrativeTools.map((tool) => renderToolCard(tool, 'narrative'))}
                  </div>
                )}
              </div>

              {/* Framework Zone */}
              <div
                data-drop-zone="framework"
                className={`border-2 border-dashed rounded-xl p-4 md:p-6 min-h-[200px] md:min-h-[280px] transition-all ${
                  selectedToolToPlace
                    ? 'border-purple-500 bg-purple-500/5 shadow-lg cursor-pointer'
                    : 'border-border hover:border-purple-500/50'
                }`}
                onClick={() => selectedToolToPlace && handleZoneSelect('framework')}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-8 md:h-10 w-1.5 bg-purple-500 rounded-full" />
                  <div>
                    <h3 className="font-semibold text-base md:text-lg">Framework Zone</h3>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      Reference levels & structure
                    </p>
                  </div>
                </div>
                {frameworkTools.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 md:h-48 text-muted-foreground border-2 border-dashed border-muted rounded-lg">
                    <Plus className="w-8 md:w-12 h-8 md:h-12 mb-2 opacity-50" />
                    <p className="text-xs md:text-sm font-medium text-center px-4">
                      Select a tool, then select this zone
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {frameworkTools.map((tool) => renderToolCard(tool, 'framework'))}
                  </div>
                )}
              </div>

              {/* Execution Zone */}
              <div
                data-drop-zone="execution"
                className={`border-2 border-dashed rounded-xl p-4 md:p-6 min-h-[200px] md:min-h-[280px] transition-all ${
                  selectedToolToPlace
                    ? 'border-green-500 bg-green-500/5 shadow-lg cursor-pointer'
                    : 'border-border hover:border-green-500/50'
                }`}
                onClick={() => selectedToolToPlace && handleZoneSelect('execution')}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-8 md:h-10 w-1.5 bg-green-500 rounded-full" />
                  <div>
                    <h3 className="font-semibold text-base md:text-lg">Execution Zone</h3>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      Entry/exit rules & PD arrays
                    </p>
                  </div>
                </div>
                {executionTools.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 md:h-48 text-muted-foreground border-2 border-dashed border-muted rounded-lg">
                    <Plus className="w-8 md:w-12 h-8 md:h-12 mb-2 opacity-50" />
                    <p className="text-xs md:text-sm font-medium text-center px-4">
                      Select a tool, then select this zone
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {executionTools.map((tool) => renderToolCard(tool, 'execution'))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Floating Action Buttons - Mobile Only (Bottom Right) */}
      <div className="md:hidden fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        <Button
          onClick={() => setStep('summary')}
          disabled={!name.trim() || (narrativeTools.length === 0 && frameworkTools.length === 0 && executionTools.length === 0)}
          size="icon"
          variant="secondary"
          className="h-12 w-12 rounded-full shadow-lg"
        >
          <FileText className="w-5 h-5" />
        </Button>
        <Button
          onClick={handleSave}
          disabled={!name.trim() || createModel.isPending || updateModel.isPending}
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg"
        >
          <Save className="w-6 h-6" />
        </Button>
      </div>

      {/* Tool Config Dialog */}
      {editingTool && (
        <ToolConfigDialog
          tool={editingTool.tool}
          zone={editingTool.zone}
          getToolName={getToolName}
          customToolsLookup={customToolsLookup}
          onSave={(updatedTool) => {
            handleUpdateTool(updatedTool, editingTool.zone);
            setEditingTool(null);
          }}
          onClose={() => setEditingTool(null)}
        />
      )}

      {/* Custom Tool Manager Dialog */}
      <CustomToolManagerDialog
        open={isCustomToolManagerOpen}
        onClose={() => setIsCustomToolManagerOpen(false)}
      />
    </div>
  );
}
