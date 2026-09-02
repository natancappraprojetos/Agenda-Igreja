// ============================================================
// Liturgy Time Calculator
// ============================================================

import type { LiturgyItem } from '@/lib/types';

/**
 * Parses a time string (HH:MM or HH:MM:SS) to total minutes from midnight
 */
export function timeToMinutes(time: string | null | undefined): number {
  if (!time) return 0;
  const parts = time.split(':').map(Number);
  return parts[0] * 60 + parts[1];
}

/**
 * Converts total minutes from midnight to a HH:MM time string
 */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Formats time for display (removes seconds if present)
 */
export function formatTime(time: string | null | undefined): string {
  if (!time) return '--:--';
  return time.substring(0, 5);
}

/**
 * Calculates liturgy item times based on start time and durations.
 * Items with fixed times keep their time; automatic items are calculated
 * sequentially from the previous item.
 */
export function calculateLiturgyTimes(
  items: Partial<LiturgyItem>[],
  startTime: string
): Partial<LiturgyItem>[] {
  let currentMinutes = timeToMinutes(startTime);
  
  return items.map((item, index) => {
    let calculatedTime: string;

    if (item.is_fixed_time && item.fixed_time) {
      // Fixed time items don't move
      calculatedTime = item.fixed_time;
      // Update current time for next automatic item
      currentMinutes = timeToMinutes(item.fixed_time) + (item.duration_minutes || 5);
    } else {
      // Automatic: calculated from previous
      calculatedTime = minutesToTime(currentMinutes);
      currentMinutes += item.duration_minutes || 5;
    }

    return {
      ...item,
      calculated_time: calculatedTime,
      order_index: index + 1,
    };
  });
}

/**
 * Gets the total duration of a liturgy in minutes
 */
export function getTotalDuration(items: Partial<LiturgyItem>[]): number {
  return items.reduce((total, item) => total + (item.duration_minutes || 0), 0);
}

/**
 * Gets the estimated end time
 */
export function getEndTime(items: Partial<LiturgyItem>[], startTime: string): string {
  const totalDuration = getTotalDuration(items);
  const startMinutes = timeToMinutes(startTime);
  return minutesToTime(startMinutes + totalDuration);
}
