// ============================================================
// Date Utilities
// ============================================================

const WEEKDAYS_PT = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const WEEKDAYS_SHORT_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];
const MONTHS_SHORT_PT = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

export function getWeekdayName(date: Date): string {
  return WEEKDAYS_PT[date.getDay()];
}

export function getWeekdayShort(date: Date): string {
  return WEEKDAYS_SHORT_PT[date.getDay()];
}

export function getMonthName(month: number): string {
  return MONTHS_PT[month];
}

export function getMonthShort(month: number): string {
  return MONTHS_SHORT_PT[month];
}

/**
 * Format: "Sábado, 15 de Agosto de 2026"
 */
export function formatDateLong(date: Date): string {
  return `${getWeekdayName(date)}, ${date.getDate()} de ${getMonthName(date.getMonth())} de ${date.getFullYear()}`;
}

/**
 * Format: "15/08/2026"
 */
export function formatDateShort(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : date;
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
}

/**
 * Format: "Agosto 2026"
 */
export function formatMonthYear(date: Date): string {
  return `${getMonthName(date.getMonth())} ${date.getFullYear()}`;
}

/**
 * Format: "15 Ago"
 */
export function formatDayMonth(date: Date): string {
  return `${date.getDate()} ${getMonthShort(date.getMonth())}`;
}

/**
 * Check if two dates are the same day
 */
export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

/**
 * Check if a date is today
 */
export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

/**
 * Get the start of the week (Sunday)
 */
export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get all days of a month (including padding days from prev/next months)
 */
export function getMonthDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: Date[] = [];

  // Pad start with previous month days
  const startPad = firstDay.getDay();
  for (let i = startPad - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push(d);
  }

  // Current month days
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i));
  }

  // Pad end with next month days
  const endPad = 6 - lastDay.getDay();
  for (let i = 1; i <= endPad; i++) {
    days.push(new Date(year, month + 1, i));
  }

  return days;
}

/**
 * Get the days of a week starting from a given date
 */
export function getWeekDays(startDate: Date): Date[] {
  const start = startOfWeek(startDate);
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

/**
 * Converts a date string (YYYY-MM-DD) to a Date object in local timezone
 */
export function parseDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00');
}

/**
 * Converts a Date to YYYY-MM-DD string
 */
export function toDateString(date: Date): string {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
}
