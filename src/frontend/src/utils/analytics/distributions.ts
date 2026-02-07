export interface HistogramBin {
  bin: string;
  count: number;
  minValue: number;
  maxValue: number;
}

export function binRValues(rValues: number[], binCount: number = 10): HistogramBin[] {
  if (rValues.length === 0) return [];

  const min = Math.min(...rValues);
  const max = Math.max(...rValues);
  const range = max - min;
  const binSize = range / binCount;

  const bins: HistogramBin[] = [];

  for (let i = 0; i < binCount; i++) {
    const minValue = min + i * binSize;
    const maxValue = min + (i + 1) * binSize;
    const count = rValues.filter(r => r >= minValue && (i === binCount - 1 ? r <= maxValue : r < maxValue)).length;
    
    bins.push({
      bin: `${minValue.toFixed(1)} to ${maxValue.toFixed(1)}`,
      count,
      minValue,
      maxValue,
    });
  }

  return bins;
}
