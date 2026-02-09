import type { Trade } from '../../backend';
import { ExternalBlob } from '../../backend';

/**
 * Reflection fields stored at trade level
 */
export interface TradeReflection {
  notes: string;
  mood: string;
  images: ExternalBlob[];
  would_take_again: boolean;
}

/**
 * Extracts reflection fields from a Trade object
 */
export function extractReflectionFromTrade(trade: Trade): TradeReflection {
  return {
    notes: trade.notes || '',
    mood: trade.mood || '',
    images: trade.images || [],
    would_take_again: trade.would_take_again || false,
  };
}

/**
 * Merges reflection fields into a Trade object
 */
export function mergeReflectionIntoTrade(
  trade: Trade,
  reflection: TradeReflection
): Trade {
  return {
    ...trade,
    notes: reflection.notes,
    mood: reflection.mood,
    images: reflection.images,
    would_take_again: reflection.would_take_again,
  };
}
