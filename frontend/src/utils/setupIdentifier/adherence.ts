import type { Model, ModelCondition, ToolConfig } from '../../backend';

/**
 * Maps selected tool observations from Live Setup Identifier onto a model's full condition list.
 * Returns a complete ModelCondition array with isChecked set based on observations.
 */
export function mapObservationsToModelConditions(
  model: Model,
  selectedObservations: { toolType: string; zone: 'narrative' | 'framework' | 'execution' }[]
): ModelCondition[] {
  const conditions: ModelCondition[] = [];

  // Helper to extract tool description
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

  // Process narrative tools
  model.narrative.forEach(tool => {
    const isObserved = selectedObservations.some(
      obs => obs.toolType === tool.type && obs.zone === 'narrative'
    );
    conditions.push({
      id: tool.id,
      description: extractToolDescription(tool),
      zone: 'narrative',
      isChecked: isObserved
    });
  });

  // Process framework tools
  model.framework.forEach(tool => {
    const isObserved = selectedObservations.some(
      obs => obs.toolType === tool.type && obs.zone === 'framework'
    );
    conditions.push({
      id: tool.id,
      description: extractToolDescription(tool),
      zone: 'framework',
      isChecked: isObserved
    });
  });

  // Process execution tools
  model.execution.forEach(tool => {
    const isObserved = selectedObservations.some(
      obs => obs.toolType === tool.type && obs.zone === 'execution'
    );
    conditions.push({
      id: tool.id,
      description: extractToolDescription(tool),
      zone: 'execution',
      isChecked: isObserved
    });
  });

  return conditions;
}

/**
 * Calculates adherence score using the same logic as Trade Logger Model Condition Check.
 * Score = (number of checked conditions) / (total conditions in model) * 100
 */
export function calculateModelAdherence(conditions: ModelCondition[]): number {
  if (conditions.length === 0) return 0;
  
  const checkedCount = conditions.filter(c => c.isChecked).length;
  return (checkedCount / conditions.length) * 100;
}
