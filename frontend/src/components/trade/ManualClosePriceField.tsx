import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ManualClosePriceFieldProps {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}

export default function ManualClosePriceField({ value, onChange }: ManualClosePriceFieldProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      onChange(undefined);
      return;
    }
    
    // Validate numeric input
    if (!/^\d*\.?\d*$/.test(val)) return;
    
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && isFinite(parsed)) {
      onChange(parsed);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="manual-close-price">Manual Close Price *</Label>
      <Input
        id="manual-close-price"
        type="number"
        step="0.01"
        value={value ?? ''}
        onChange={handleChange}
        placeholder="Enter manual close price"
        className="font-mono"
      />
      <p className="text-xs text-muted-foreground">
        Enter the actual price at which you manually closed this bracket
      </p>
    </div>
  );
}
