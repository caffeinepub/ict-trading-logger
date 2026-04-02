import type { Trade, Model } from '../../backend';

/**
 * Session mapping based on UTC hours:
 * - Asia: 00:00-08:00 UTC
 * - London: 08:00-16:00 UTC
 * - NY: 16:00-24:00 UTC
 */
export type Session = 'Asia' | 'London' | 'NY' | 'All';

export function inferSession(timestamp: bigint): Session {
  const date = new Date(Number(timestamp) / 1000000);
  const hour = date.getUTCHours();
  
  if (hour >= 0 && hour < 8) return 'Asia';
  if (hour >= 8 && hour < 16) return 'London';
  return 'NY';
}

export interface FilterOptions {
  modelId?: string;
  session?: Session;
  adherenceThreshold?: number;
}

export function filterTrades(
  trades: Trade[],
  options: FilterOptions
): Trade[] {
  let filtered = trades;

  // Filter by model
  if (options.modelId && options.modelId !== 'all') {
    filtered = filtered.filter(t => t.model_id === options.modelId);
  }

  // Filter by session
  if (options.session && options.session !== 'All') {
    filtered = filtered.filter(t => inferSession(t.created_at) === options.session);
  }

  // Filter by adherence threshold
  if (options.adherenceThreshold !== undefined && options.adherenceThreshold !== null) {
    const threshold = options.adherenceThreshold;
    filtered = filtered.filter(t => t.adherence_score >= threshold);
  }

  return filtered;
}

export function getCompletedTrades(trades: Trade[]): Trade[] {
  return trades.filter(t => t.is_completed);
}
