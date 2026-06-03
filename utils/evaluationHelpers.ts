/**
 * Evaluation Helpers - Shared utilities for evaluation module
 * Centralizes livechat difficulty config for backward compatibility
 */

import { EvaluationPeriod } from '../types';

// Default hardcoded difficulty config (for periods without livechatDifficultyConfig)
export const DEFAULT_DIFFICULTY_CONFIG = [
    { id: 'easy', name: 'Tổng số mã DỄ', multiplier: 1 },
    { id: 'medium', name: 'Tổng số mã TRUNG BÌNH', multiplier: 1.2 },
    { id: 'hard', name: 'Tổng số mã KHÓ', multiplier: 1.5 },
];

/**
 * Get the difficulty config for a period.
 * Falls back to DEFAULT_DIFFICULTY_CONFIG if the period has no config.
 */
export function getDifficultyConfig(period?: EvaluationPeriod | null) {
    return period?.dtConfig?.livechatDifficultyConfig?.length
        ? period.dtConfig.livechatDifficultyConfig
        : DEFAULT_DIFFICULTY_CONFIG;
}

/**
 * Calculate total converted points from difficulty stats using the given config.
 * Works with both old format { easy, medium, hard } and new dynamic { [id]: number }.
 */
export function calcDifficultyConverted(
    difficultyStats: { [key: string]: number } | undefined,
    config: typeof DEFAULT_DIFFICULTY_CONFIG
): number {
    if (!difficultyStats) return 0;
    return config.reduce((sum, item) => {
        return sum + (difficultyStats[item.id] || 0) * item.multiplier;
    }, 0);
}

/**
 * Get the default target standard (TC/buổi) for a Livechat job based on its name.
 * Uses a highly robust normalization to ignore casing, diacritics (accents), spacing, and punctuation.
 */
export function getLivechatJobDefaultStandard(jobName: string): number {
    const clean = (jobName || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // remove accents/diacritics
        .replace(/[^a-z0-9]/g, '');      // remove spaces, symbols, punctuation

    // Tier 1: Exact normalized match for the 4 core production jobs (0% false-positive risk)
    if (clean === 'livechatngoaigio') return 10;
    if (clean === 'tvkdol') return 15;
    if (clean === 'truclivechat' || clean === 'truc') return 20;
    if (clean === 'tiepnhanlivechat' || clean === 'tiepnhan') return 10;

    // Tier 2: Flexible substring fallback for slight variations
    if (clean.includes('ngoaigio')) return 10;
    if (clean.includes('kdol')) return 15;
    if (clean.includes('truclive') || clean.includes('truclc')) return 20;
    if (clean.includes('tiepnhan')) return 10;

    // Tier 3: Default fallback for custom or unmapped jobs
    return 35; 
}

/**
 * Safely sanitizes cell values before exporting to Excel to neutralize potential Excel Formula Injection attacks.
 * If the value is a string and starts with '=', '+', '-', or '@', it prepends a single quote (').
 */
export function sanitizeExcelValue(value: any): any {
    if (typeof value === 'string' && /^[=\+\-\@]/.test(value)) {
        return `'${value}`;
    }
    return value;
}
