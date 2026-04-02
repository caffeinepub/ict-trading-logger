import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, Save } from 'lucide-react';
import type { ToolConfig } from '../backend';

interface ModelCardSummaryProps {
  name: string;
  description: string;
  narrativeTools: ToolConfig[];
  frameworkTools: ToolConfig[];
  executionTools: ToolConfig[];
  getToolName: (typeId: string) => string;
  onBack: () => void;
  onSave: () => void;
  isSaving: boolean;
}

export default function ModelCardSummary({
  name,
  description,
  narrativeTools,
  frameworkTools,
  executionTools,
  getToolName,
  onBack,
  onSave,
  isSaving,
}: ModelCardSummaryProps) {
  const renderConciseToolList = (tools: ToolConfig[]) => {
    if (tools.length === 0) {
      return <p className="text-sm text-muted-foreground italic">No tools defined</p>;
    }

    return (
      <div className="space-y-2">
        {tools.map((tool) => {
          const properties = JSON.parse(tool.properties || '{}');
          const toolName = getToolName(tool.type);
          
          // Extract key properties for concise display (prioritize type, direction, and timeframe)
          const keyProps: [string, any][] = [];
          
          // Look for type properties (unified tools)
          const typeKeys = Object.keys(properties).filter(k => k.toLowerCase().includes('type') && k !== 'type');
          if (typeKeys.length > 0) {
            keyProps.push([typeKeys[0], properties[typeKeys[0]]]);
          }
          
          // Look for direction properties
          const directionKeys = Object.keys(properties).filter(k => 
            k.toLowerCase().includes('direction') || k.toLowerCase().includes('orientation')
          );
          if (directionKeys.length > 0) {
            keyProps.push([directionKeys[0], properties[directionKeys[0]]]);
          }
          
          // Look for timeframe properties
          const timeframeUnitKeys = Object.keys(properties).filter(k => k.toLowerCase().includes('timeframeunit'));
          const timeframeValueKeys = Object.keys(properties).filter(k => k.toLowerCase().includes('timeframevalue'));
          if (timeframeUnitKeys.length > 0 && timeframeValueKeys.length > 0) {
            const unit = properties[timeframeUnitKeys[0]];
            const value = properties[timeframeValueKeys[0]];
            keyProps.push(['Timeframe', `${value} ${unit}`]);
          }
          
          // Look for structural state (PD arrays)
          if (properties.structuralState && properties.structuralState !== 'Regular') {
            keyProps.push(['State', properties.structuralState]);
          }
          
          // If we don't have enough props yet, add first available
          if (keyProps.length < 2) {
            const remainingProps = Object.entries(properties)
              .filter(([k]) => 
                !k.toLowerCase().includes('direction') && 
                !k.toLowerCase().includes('timeframe') &&
                !k.toLowerCase().includes('type') &&
                k !== 'structuralState' &&
                k !== 'locationVsDealingRange' &&
                k !== 'notes' &&
                k !== 'enabled'
              )
              .slice(0, 2 - keyProps.length);
            keyProps.push(...remainingProps);
          }
          
          return (
            <div key={tool.id} className="text-sm">
              <span className="font-medium">{toolName}</span>
              {keyProps.length > 0 && (
                <span className="text-muted-foreground ml-2">
                  ({keyProps.map(([k, v]) => `${k}: ${v}`).join(', ')})
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Dialog open={true} onOpenChange={onBack}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0 gap-0 w-[95vw]">
        <DialogHeader className="px-4 sm:px-6 py-4 border-b">
          <DialogTitle className="text-lg sm:text-xl">Model Card Summary</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Review your unified ICT trading model before saving
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-4 sm:px-6 py-4 sm:py-6">
          <div className="space-y-4 sm:space-y-6">
            {/* Model Header */}
            <div className="text-center space-y-2 pb-4 border-b">
              <h2 className="text-xl sm:text-2xl font-bold break-words">{name}</h2>
              {description && (
                <p className="text-sm sm:text-base text-muted-foreground break-words">{description}</p>
              )}
            </div>

            {/* ICT Index Card Style Layout - Responsive Grid */}
            <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-3">
              {/* Narrative Card */}
              <Card className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
                  <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                    <div className="h-5 sm:h-6 w-1 bg-blue-500 rounded-full flex-shrink-0" />
                    <span>Narrative</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                  {renderConciseToolList(narrativeTools)}
                </CardContent>
              </Card>

              {/* Framework Card */}
              <Card className="border-l-4 border-l-purple-500">
                <CardHeader className="pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
                  <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                    <div className="h-5 sm:h-6 w-1 bg-purple-500 rounded-full flex-shrink-0" />
                    <span>Framework</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                  {renderConciseToolList(frameworkTools)}
                </CardContent>
              </Card>

              {/* Execution Card */}
              <Card className="border-l-4 border-l-green-500">
                <CardHeader className="pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
                  <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                    <div className="h-5 sm:h-6 w-1 bg-green-500 rounded-full flex-shrink-0" />
                    <span>Execution</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                  {renderConciseToolList(executionTools)}
                </CardContent>
              </Card>
            </div>

            {/* Concise Text Summary */}
            <Card className="bg-muted/50">
              <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6 pb-3">
                <CardTitle className="text-sm sm:text-base">Quick Overview</CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6 space-y-3 text-xs sm:text-sm">
                {narrativeTools.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-1 text-blue-600 dark:text-blue-400">Narrative:</h4>
                    <p className="text-muted-foreground leading-relaxed">
                      {narrativeTools.map(tool => getToolName(tool.type)).join(', ')}
                    </p>
                  </div>
                )}

                {frameworkTools.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-1 text-purple-600 dark:text-purple-400">Framework:</h4>
                    <p className="text-muted-foreground leading-relaxed">
                      {frameworkTools.map(tool => getToolName(tool.type)).join(', ')}
                    </p>
                  </div>
                )}

                {executionTools.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-1 text-green-600 dark:text-green-400">Execution:</h4>
                    <p className="text-muted-foreground leading-relaxed">
                      {executionTools.map(tool => getToolName(tool.type)).join(', ')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        <DialogFooter className="px-4 sm:px-6 py-3 sm:py-4 border-t gap-2 flex-col sm:flex-row">
          <Button variant="outline" onClick={onBack} className="gap-2 w-full sm:w-auto">
            <ChevronLeft className="w-4 h-4" />
            Back to Editor
          </Button>
          <Button onClick={onSave} disabled={isSaving} className="gap-2 w-full sm:w-auto">
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Model'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
