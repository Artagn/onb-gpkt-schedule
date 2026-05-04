/**
 * useDateFilter - Date filtering and preset handling
 * Extracted from useMyTasks.ts for reusability
 */

import { useState, useCallback } from 'react';
import {
    startOfDay, endOfDay, startOfWeek, endOfWeek,
    startOfMonth, endOfMonth, startOfYear, endOfYear,
    subDays, subWeeks, addWeeks, subMonths, addMonths,
    addDays, subYears, addYears
} from 'date-fns';

export type DatePreset =
    | 'today' | 'yesterday' | 'tomorrow'
    | 'thisWeek' | 'lastWeek' | 'nextWeek'
    | 'thisMonth' | 'lastMonth' | 'nextMonth'
    | 'thisYear' | 'lastYear' | 'nextYear'
    | 'custom';

interface UseDateFilterOptions {
    initialPreset?: DatePreset;
    initialFromDate?: Date;
    initialToDate?: Date;
}

export const useDateFilter = (options: UseDateFilterOptions = {}) => {
    const {
        initialPreset = 'today',
        initialFromDate = new Date(),
        initialToDate = new Date()
    } = options;

    const [fromDate, setFromDate] = useState(initialFromDate);
    const [toDate, setToDate] = useState(initialToDate);
    const [datePreset, setDatePreset] = useState<DatePreset>(initialPreset);

    const handlePresetChange = useCallback((preset: DatePreset) => {
        setDatePreset(preset);
        const today = new Date();

        switch (preset) {
            case 'today':
                setFromDate(today);
                setToDate(today);
                break;
            case 'yesterday':
                const yesterday = subDays(today, 1);
                setFromDate(yesterday);
                setToDate(yesterday);
                break;
            case 'tomorrow':
                const tomorrow = addDays(today, 1);
                setFromDate(tomorrow);
                setToDate(tomorrow);
                break;
            case 'thisWeek':
                setFromDate(startOfWeek(today, { weekStartsOn: 1 }));
                setToDate(endOfWeek(today, { weekStartsOn: 1 }));
                break;
            case 'lastWeek':
                const lastWeek = subWeeks(today, 1);
                setFromDate(startOfWeek(lastWeek, { weekStartsOn: 1 }));
                setToDate(endOfWeek(lastWeek, { weekStartsOn: 1 }));
                break;
            case 'nextWeek':
                const nextWeek = addWeeks(today, 1);
                setFromDate(startOfWeek(nextWeek, { weekStartsOn: 1 }));
                setToDate(endOfWeek(nextWeek, { weekStartsOn: 1 }));
                break;
            case 'thisMonth':
                setFromDate(startOfMonth(today));
                setToDate(endOfMonth(today));
                break;
            case 'lastMonth':
                const lastMonth = subMonths(today, 1);
                setFromDate(startOfMonth(lastMonth));
                setToDate(endOfMonth(lastMonth));
                break;
            case 'nextMonth':
                const nextMonth = addMonths(today, 1);
                setFromDate(startOfMonth(nextMonth));
                setToDate(endOfMonth(nextMonth));
                break;
            case 'thisYear':
                setFromDate(startOfYear(today));
                setToDate(endOfYear(today));
                break;
            case 'lastYear':
                const lastYear = subYears(today, 1);
                setFromDate(startOfYear(lastYear));
                setToDate(endOfYear(lastYear));
                break;
            case 'nextYear':
                const nextYear = addYears(today, 1);
                setFromDate(startOfYear(nextYear));
                setToDate(endOfYear(nextYear));
                break;
            case 'custom':
                // Keep current dates
                break;
        }
    }, []);

    const isDateInRange = useCallback((dateStr: string) => {
        const d = new Date(dateStr);
        const start = startOfDay(fromDate).getTime();
        const end = endOfDay(toDate).getTime();
        const time = d.getTime();
        return time >= start && time <= end;
    }, [fromDate, toDate]);

    return {
        fromDate,
        setFromDate,
        toDate,
        setToDate,
        datePreset,
        setDatePreset,
        handlePresetChange,
        isDateInRange,
    };
};
