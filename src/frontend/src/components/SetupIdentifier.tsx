import { useState, useMemo } from 'react';
import { useGetAllModels } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';
import { ChevronDown, ChevronUp, Target, TrendingUp, AlertCircle } from 'lucide-react';
import type { Model, ModelCondition } from '../backend';
import { mapObservationsToModelConditions, calculateModelAdherence } from '../utils/setupIdentifier/adherence';

interface SetupIdentifierProps {
  onSelectModel: (modelId: string, qualifyingConditions: ModelCondition[]) => void;
}

interface ToolObservation {
  toolType: string;
  zone: 'narrative' | 'framework' | 'execution';
  isSelected: boolean;
}

interface ModelMatch {
  model: Model;
  overallAdherence: number;
  narrativeMatch: number;
  frameworkMatch: number;
  executionMatch: number;
  narrativeTotal: number;
  frameworkTotal: number;
  executionTotal: number;
  missingTools: string[];
  qualifyingConditions: ModelCondition[]; // Only conditions that met criteria
}

export default function SetupIdentifier({ onSelectModel }: SetupIdentifierProps) {
  const { data: models = [] } = useGetAllModels();
  
  const [isOpen, setIsOpen] = useState(false);
  const [adherenceThreshold, setAdherenceThreshold] = useState('70');
  const [observations, setObservations] = useState<ToolObservation[]>([]);

  // Extract unique tool types per zone from user's models
  const toolsByZone = useMemo(() => {
    const narrativeTools = new Set<string>();
    const frameworkTools = new Set<string>();
    const executionTools = new Set<string>();
    
    models.forEach(model => {
      model.narrative.forEach(tool => {
        narrativeTools.add(tool.type);
      });
      model.framework.forEach(tool => {
        frameworkTools.add(tool.type);
      });
      model.execution.forEach(tool => {
        executionTools.add(tool.type);
      });
    });

    return {
      narrative: Array.from(narrativeTools).sort(),
      framework: Array.from(frameworkTools).sort(),
      execution: Array.from(executionTools).sort()
    };
  }, [models]);

  // Initialize observations only for tools that exist in each zone
  useMemo(() => {
    if (observations.length === 0 && (toolsByZone.narrative.length > 0 || toolsByZone.framework.length > 0 || toolsByZone.execution.length > 0)) {
      const initialObservations: ToolObservation[] = [];
      
      // Add narrative tools
      toolsByZone.narrative.forEach(toolType => {
        initialObservations.push({
          toolType,
          zone: 'narrative',
          isSelected: false
        });
      });
      
      // Add framework tools
      toolsByZone.framework.forEach(toolType => {
        initialObservations.push({
          toolType,
          zone: 'framework',
          isSelected: false
        });
      });
      
      // Add execution tools
      toolsByZone.execution.forEach(toolType => {
        initialObservations.push({
          toolType,
          zone: 'execution',
          isSelected: false
        });
      });
      
      setObservations(initialObservations);
    }
  }, [toolsByZone, observations.length]);

  const toggleObservation = (toolType: string, zone: 'narrative' | 'framework' | 'execution') => {
    setObservations(prev => 
      prev.map(obs => 
        obs.toolType === toolType && obs.zone === zone
          ? { ...obs, isSelected: !obs.isSelected }
          : obs
      )
    );
  };

  const clearAllObservations = () => {
    setObservations(prev => prev.map(obs => ({ ...obs, isSelected: false })));
  };

  // Calculate model matches using Trade Logger Model Condition Check logic
  const modelMatches = useMemo((): ModelMatch[] => {
    const selectedObs = observations.filter(o => o.isSelected);
    
    if (selectedObs.length === 0) {
      return [];
    }

    const matches: ModelMatch[] = models.map(model => {
      // Map selected observations to the model's full condition list
      const modelConditions = mapObservationsToModelConditions(model, selectedObs);
      
      // Calculate adherence using Trade Logger logic: checked / total conditions
      const overallAdherence = calculateModelAdherence(modelConditions);
      
      // Extract only the qualifying conditions (those that are checked)
      const qualifyingConditions = modelConditions.filter(c => c.isChecked);
      
      // Calculate per-zone adherence for display
      const narrativeConditions = modelConditions.filter(c => c.zone === 'narrative');
      const frameworkConditions = modelConditions.filter(c => c.zone === 'framework');
      const executionConditions = modelConditions.filter(c => c.zone === 'execution');
      
      const narrativeMatch = narrativeConditions.length > 0 
        ? calculateModelAdherence(narrativeConditions)
        : 0;
      
      const frameworkMatch = frameworkConditions.length > 0 
        ? calculateModelAdherence(frameworkConditions)
        : 0;
      
      const executionMatch = executionConditions.length > 0 
        ? calculateModelAdherence(executionConditions)
        : 0;

      // Find missing tools (tools in model not observed)
      const missingTools: string[] = [];
      modelConditions.forEach(condition => {
        if (!condition.isChecked) {
          missingTools.push(`${condition.description.split(' - ')[0]} (${condition.zone})`);
        }
      });

      return {
        model,
        overallAdherence,
        narrativeMatch,
        frameworkMatch,
        executionMatch,
        narrativeTotal: narrativeConditions.length,
        frameworkTotal: frameworkConditions.length,
        executionTotal: executionConditions.length,
        missingTools,
        qualifyingConditions // Store only the qualifying subset
      };
    });

    // Filter by threshold and sort by adherence
    const threshold = parseFloat(adherenceThreshold) || 0;
    return matches
      .filter(m => m.overallAdherence >= threshold)
      .sort((a, b) => b.overallAdherence - a.overallAdherence);
  }, [models, observations, adherenceThreshold]);

  const selectedObservationsCount = observations.filter(o => o.isSelected).length;

  const observationsByZone = useMemo(() => {
    return {
      narrative: observations.filter(o => o.zone === 'narrative'),
      framework: observations.filter(o => o.zone === 'framework'),
      execution: observations.filter(o => o.zone === 'execution')
    };
  }, [observations]);

  const handleSelectModel = (match: ModelMatch) => {
    // Pass only the qualifying conditions (those that met the model's criteria)
    onSelectModel(match.model.id, match.qualifyingConditions);
  };

  return (
    <Card className="border-2 border-primary/30 shadow-lg">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Target className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Live Setup Identifier</CardTitle>
                  <CardDescription>
                    Mark what you're seeing in the market right now
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {selectedObservationsCount > 0 && (
                  <Badge variant="secondary" className="text-sm">
                    {selectedObservationsCount} selected
                  </Badge>
                )}
                {isOpen ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
            </div>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Adherence Threshold Setting */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="threshold">Minimum Adherence Threshold (%)</Label>
                <span className="text-sm font-medium text-primary">{adherenceThreshold}%</span>
              </div>
              <Input
                id="threshold"
                type="number"
                min="0"
                max="100"
                value={adherenceThreshold}
                onChange={(e) => setAdherenceThreshold(e.target.value)}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Only show models with adherence above this threshold
              </p>
            </div>

            <Separator />

            {/* Tool Selection by Zone */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">Select Observed Tools</h4>
                {selectedObservationsCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllObservations}
                    className="text-xs"
                  >
                    Clear All
                  </Button>
                )}
              </div>

              <ScrollArea className="h-[400px] rounded-md border p-4">
                <div className="space-y-6">
                  {/* Narrative Zone */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-500">Narrative</Badge>
                      <span className="text-xs text-muted-foreground">
                        {observationsByZone.narrative.filter(o => o.isSelected).length} selected
                      </span>
                    </div>
                    {toolsByZone.narrative.length === 0 ? (
                      <p className="text-xs text-muted-foreground pl-2">No narrative tools in your models</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 pl-2">
                        {toolsByZone.narrative.map(toolType => {
                          const obs = observationsByZone.narrative.find(o => o.toolType === toolType);
                          if (!obs) return null;
                          
                          return (
                            <div key={`narrative-${toolType}`} className="flex items-center gap-2">
                              <Checkbox
                                id={`narrative-${toolType}`}
                                checked={obs.isSelected}
                                onCheckedChange={() => toggleObservation(toolType, 'narrative')}
                              />
                              <Label
                                htmlFor={`narrative-${toolType}`}
                                className="text-sm cursor-pointer"
                              >
                                {toolType}
                              </Label>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Framework Zone */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-purple-500">Framework</Badge>
                      <span className="text-xs text-muted-foreground">
                        {observationsByZone.framework.filter(o => o.isSelected).length} selected
                      </span>
                    </div>
                    {toolsByZone.framework.length === 0 ? (
                      <p className="text-xs text-muted-foreground pl-2">No framework tools in your models</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 pl-2">
                        {toolsByZone.framework.map(toolType => {
                          const obs = observationsByZone.framework.find(o => o.toolType === toolType);
                          if (!obs) return null;
                          
                          return (
                            <div key={`framework-${toolType}`} className="flex items-center gap-2">
                              <Checkbox
                                id={`framework-${toolType}`}
                                checked={obs.isSelected}
                                onCheckedChange={() => toggleObservation(toolType, 'framework')}
                              />
                              <Label
                                htmlFor={`framework-${toolType}`}
                                className="text-sm cursor-pointer"
                              >
                                {toolType}
                              </Label>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Execution Zone */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-500">Execution</Badge>
                      <span className="text-xs text-muted-foreground">
                        {observationsByZone.execution.filter(o => o.isSelected).length} selected
                      </span>
                    </div>
                    {toolsByZone.execution.length === 0 ? (
                      <p className="text-xs text-muted-foreground pl-2">No execution tools in your models</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 pl-2">
                        {toolsByZone.execution.map(toolType => {
                          const obs = observationsByZone.execution.find(o => o.toolType === toolType);
                          if (!obs) return null;
                          
                          return (
                            <div key={`execution-${toolType}`} className="flex items-center gap-2">
                              <Checkbox
                                id={`execution-${toolType}`}
                                checked={obs.isSelected}
                                onCheckedChange={() => toggleObservation(toolType, 'execution')}
                              />
                              <Label
                                htmlFor={`execution-${toolType}`}
                                className="text-sm cursor-pointer"
                              >
                                {toolType}
                              </Label>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </div>

            <Separator />

            {/* Model Matches */}
            {selectedObservationsCount > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <h4 className="font-semibold">
                    Matching Models ({modelMatches.length})
                  </h4>
                </div>

                {modelMatches.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No models match your observations above {adherenceThreshold}% threshold</p>
                    <p className="text-xs mt-2">Try lowering the threshold or selecting different tools</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[300px] rounded-md border">
                    <div className="p-4 space-y-3">
                      {modelMatches.map((match) => (
                        <Card key={match.model.id} className="border-2 hover:border-primary/50 transition-colors">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="text-base">{match.model.name}</CardTitle>
                                <CardDescription className="text-xs mt-1">
                                  {match.model.description || 'No description'}
                                </CardDescription>
                              </div>
                              <Badge 
                                variant={match.overallAdherence >= 80 ? 'default' : 'secondary'}
                                className="text-lg font-bold"
                              >
                                {match.overallAdherence.toFixed(0)}%
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {/* Per-zone adherence breakdown */}
                            <div className="space-y-2">
                              {match.narrativeTotal > 0 && (
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">Narrative</span>
                                    <span className="font-medium">{match.narrativeMatch.toFixed(0)}%</span>
                                  </div>
                                  <Progress value={match.narrativeMatch} className="h-1.5" />
                                </div>
                              )}
                              
                              {match.frameworkTotal > 0 && (
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">Framework</span>
                                    <span className="font-medium">{match.frameworkMatch.toFixed(0)}%</span>
                                  </div>
                                  <Progress value={match.frameworkMatch} className="h-1.5" />
                                </div>
                              )}
                              
                              {match.executionTotal > 0 && (
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">Execution</span>
                                    <span className="font-medium">{match.executionMatch.toFixed(0)}%</span>
                                  </div>
                                  <Progress value={match.executionMatch} className="h-1.5" />
                                </div>
                              )}
                            </div>

                            {/* Missing tools */}
                            {match.missingTools.length > 0 && (
                              <div className="pt-2 border-t">
                                <p className="text-xs text-muted-foreground mb-1">Missing tools:</p>
                                <div className="flex flex-wrap gap-1">
                                  {match.missingTools.slice(0, 3).map((tool, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      {tool}
                                    </Badge>
                                  ))}
                                  {match.missingTools.length > 3 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{match.missingTools.length - 3} more
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Action button */}
                            <Button 
                              onClick={() => handleSelectModel(match)}
                              className="w-full mt-2"
                              size="sm"
                            >
                              Log Trade with This Model
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
