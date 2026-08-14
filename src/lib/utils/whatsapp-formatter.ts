// ============================================================
// WhatsApp Text Formatter
// ============================================================

import type { Liturgy, LiturgyItem, ChurchEvent } from '@/lib/types';
import { formatTime } from './liturgy-calculator';
import { formatDateShort, getWeekdayName, parseDate } from './dates';

/**
 * Generates a WhatsApp-friendly formatted text for a liturgy
 */
export function formatLiturgyForWhatsApp(
  liturgy: Liturgy,
  event: ChurchEvent,
  items: LiturgyItem[]
): string {
  const date = parseDate(event.date);
  const weekday = getWeekdayName(date);
  const dateStr = formatDateShort(event.date);

  let text = '';
  text += `⛪ *${event.title}*\n`;
  text += `📅 ${weekday}, ${dateStr}\n`;
  if (event.location) {
    text += `📍 ${event.location.name}\n`;
  }
  text += '\n';
  text += '━━━━━━━━━━━━━━━━━━━━\n';
  text += '*PROGRAMAÇÃO*\n';
  text += '━━━━━━━━━━━━━━━━━━━━\n\n';

  items.forEach((item) => {
    const time = formatTime(item.calculated_time || item.fixed_time);
    const icon = item.item_type?.icon || '📋';
    
    text += `${time} — ${icon} *${item.title}*\n`;
    
    if (item.responsible_person) {
      text += `    👤 ${item.responsible_person.name}\n`;
    }
    
    if (item.song) {
      text += `    🎵 ${item.song.title}`;
      if (item.song.artist) {
        text += ` / ${item.song.artist}`;
      }
      text += '\n';
    }
    
    if (item.notes) {
      text += `    📝 ${item.notes}\n`;
    }
    
    text += '\n';
  });

  text += '━━━━━━━━━━━━━━━━━━━━\n';
  
  if (event.preacher) {
    text += `🎙️ Pregador: *${event.preacher.name}*\n`;
  }
  if (event.worship_leader) {
    text += `🎵 Louvor: *${event.worship_leader.name}*\n`;
  }
  if (event.sound_person) {
    text += `🔊 Sonoplastia: *${event.sound_person.name}*\n`;
  }

  return text;
}

/**
 * Copies text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textarea);
    }
  }
}
