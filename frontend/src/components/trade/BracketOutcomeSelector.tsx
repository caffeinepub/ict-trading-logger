import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ClosureType as ClosureTypeEnum } from '../../backend';
import type { ClosureType } from '../../backend';

interface BracketOutcomeSelectorProps {
  selectedOutcome: ClosureType | null;
  onOutcomeChange: (outcome: ClosureType) => void;
}

export default function BracketOutcomeSelector({ selectedOutcome, onOutcomeChange }: BracketOutcomeSelectorProps) {
  const outcomes = [
    { value: ClosureTypeEnum.take_profit, label: 'Take Profit Hit' },
    { value: ClosureTypeEnum.stop_loss, label: 'Stop Hit' },
    { value: ClosureTypeEnum.break_even, label: 'Break Even' },
    { value: ClosureTypeEnum.manual_close, label: 'Manual Close' },
  ];

  return (
    <div className="space-y-2">
      <Label>Outcome Type</Label>
      {selectedOutcome === null && (
        <p className="text-sm text-muted-foreground mb-2">
          Select an outcome
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        {outcomes.map(outcome => (
          <Button
            key={outcome.value}
            variant={selectedOutcome === outcome.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => onOutcomeChange(outcome.value)}
            className="w-full"
          >
            {outcome.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
