import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Model, ToolConfig } from '../../backend';

interface ModelNotecardProps {
  model: Model;
}

export default function ModelNotecard({ model }: ModelNotecardProps) {
  const renderToolSummary = (tools: ToolConfig[], zone: string) => {
    if (tools.length === 0) {
      return <p className="text-sm text-muted-foreground italic">No tools configured</p>;
    }

    return (
      <div className="space-y-1">
        {tools.map((tool) => {
          const properties = JSON.parse(tool.properties || '{}');
          const toolName = getToolDisplayName(tool.type);
          
          // Extract key properties
          const keyProps: string[] = [];
          
          // Type properties
          const typeKeys = Object.keys(properties).filter(k => k.toLowerCase().includes('type') && k !== 'type');
          if (typeKeys.length > 0 && properties[typeKeys[0]]) {
            keyProps.push(properties[typeKeys[0]]);
          }
          
          // Direction/orientation
          const directionKeys = Object.keys(properties).filter(k => 
            k.toLowerCase().includes('direction') || k.toLowerCase().includes('orientation')
          );
          if (directionKeys.length > 0 && properties[directionKeys[0]]) {
            keyProps.push(properties[directionKeys[0]]);
          }
          
          // Timeframe
          const timeframeUnitKeys = Object.keys(properties).filter(k => k.toLowerCase().includes('timeframeunit'));
          const timeframeValueKeys = Object.keys(properties).filter(k => k.toLowerCase().includes('timeframevalue'));
          if (timeframeUnitKeys.length > 0 && timeframeValueKeys.length > 0) {
            const unit = properties[timeframeUnitKeys[0]];
            const value = properties[timeframeValueKeys[0]];
            if (unit && value) {
              keyProps.push(`${value}${unit.charAt(0)}`);
            }
          }
          
          return (
            <div key={tool.id} className="text-sm">
              <span className="font-medium">{toolName}</span>
              {keyProps.length > 0 && (
                <span className="text-muted-foreground ml-2">
                  ({keyProps.join(', ')})
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <div className="space-y-2">
          <CardTitle className="text-2xl">{model.name}</CardTitle>
          {model.description && (
            <p className="text-sm text-muted-foreground">{model.description}</p>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          {/* Narrative */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-1 w-8 bg-blue-500 rounded-full" />
              <h3 className="font-semibold text-sm text-blue-600 dark:text-blue-400">Narrative</h3>
              <Badge variant="secondary" className="ml-auto">{model.narrative.length}</Badge>
            </div>
            {renderToolSummary(model.narrative, 'narrative')}
          </div>

          {/* Framework */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-1 w-8 bg-purple-500 rounded-full" />
              <h3 className="font-semibold text-sm text-purple-600 dark:text-purple-400">Framework</h3>
              <Badge variant="secondary" className="ml-auto">{model.framework.length}</Badge>
            </div>
            {renderToolSummary(model.framework, 'framework')}
          </div>

          {/* Execution */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-1 w-8 bg-green-500 rounded-full" />
              <h3 className="font-semibold text-sm text-green-600 dark:text-green-400">Execution</h3>
              <Badge variant="secondary" className="ml-auto">{model.execution.length}</Badge>
            </div>
            {renderToolSummary(model.execution, 'execution')}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getToolDisplayName(typeId: string): string {
  const nameMap: Record<string, string> = {
    'htf-bias': 'HTF Bias',
    'market-phase': 'Market Phase',
    'liquidity-draw': 'Liquidity Draw',
    'market-structure': 'Market Structure',
    'dealing-range': 'Dealing Range',
    'equilibrium-ce': 'Equilibrium/CE',
    'gap': 'Gap',
    'key-level': 'Key Level',
    'pdh-pdl': 'PDH/PDL',
    'weekly-hl': 'Weekly H/L',
    'inefficiency': 'Inefficiency',
    'order-block': 'Order Block',
    'breaker': 'Breaker',
    'mitigation-block': 'Mitigation Block',
    'rejection-block': 'Rejection Block',
    'liquidity-pool': 'Liquidity Pool',
    'liquidity-sweep': 'Liquidity Sweep',
    'displacement': 'Displacement',
    'entry-model': 'Entry Model',
    'optimal-trade-entry': 'OTE',
    'session-timing': 'Session Timing',
  };
  
  return nameMap[typeId] || typeId;
}
