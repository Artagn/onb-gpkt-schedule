import { format, parseISO, startOfISOWeek, endOfISOWeek, eachDayOfInterval, getISOWeek } from 'date-fns';

/**
 * Get ISO week ID from a date string (YYYY-MM-DD)
 * Returns format: 'YYYY-Wxx'
 */
export function getISOWeekId(dateStr: string): string {
    const date = parseISO(dateStr);
    const weekNumber = getISOWeek(date);
    const thursday = new Date(date);
    // Find Thursday of the same week to determine correct year for ISO week
    thursday.setDate(date.getDate() + (3 - ((date.getDay() + 6) % 7)));
    return `${thursday.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
}

/**
 * Get Monday (start) of the ISO week for a given date in YYYY-MM-DD format
 */
export function getWeekStart(dateStr: string): string {
    const date = parseISO(dateStr);
    const monday = startOfISOWeek(date);
    return format(monday, 'yyyy-MM-dd');
}

/**
 * Get Sunday (end) of the ISO week for a given date in YYYY-MM-DD format
 */
export function getWeekEnd(dateStr: string): string {
    const date = parseISO(dateStr);
    const sunday = endOfISOWeek(date);
    return format(sunday, 'yyyy-MM-dd');
}

/**
 * Check if a date is Monday (start of ISO week)
 */
export function isMonday(dateStr: string): boolean {
    const date = parseISO(dateStr);
    return date.getDay() === 1;
}

/**
 * Get all dates in the ISO week of a given date (Mon-Sun) in YYYY-MM-DD format
 */
export function getWeekDates(dateStr: string): string[] {
    const date = parseISO(dateStr);
    const start = startOfISOWeek(date);
    const end = endOfISOWeek(date);
    const days = eachDayOfInterval({ start, end });
    return days.map(d => format(d, 'yyyy-MM-dd'));
}
