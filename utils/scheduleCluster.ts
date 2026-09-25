import { SubJob } from '../types';

/**
 * Convert "HH:mm" time string to minutes from midnight
 */
export const timeToMinutes = (timeStr?: string): number => {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    if (parts.length < 2) return 0;
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    return h * 60 + m;
};

/**
 * Cluster subjobs into groups where consecutive subjobs have a gap <= maxGapMinutes (default 180 min / 3h).
 * If the gap between the end of a session and the start of the next session is > 3h,
 * they belong to separate clusters (e.g. Sáng 08:30-12:00 vs Tối 19:30-22:30).
 */
export function clusterSubJobs<T extends Partial<SubJob>>(subs: T[], maxGapMinutes = 180): T[][] {
    if (!subs || subs.length === 0) return [];

    // Sort by startTime ascending
    const sorted = [...subs].sort((a, b) =>
        (a.startTime || '').localeCompare(b.startTime || '')
    );

    const clusters: T[][] = [[sorted[0]]];

    for (let idx = 1; idx < sorted.length; idx++) {
        const current = sorted[idx];
        const currentCluster = clusters[clusters.length - 1];

        // Find the latest endTime in currentCluster
        const clusterEndTimes = currentCluster.map(s => timeToMinutes(s.endTime));
        const maxClusterEnd = Math.max(...clusterEndTimes);
        const currentStart = timeToMinutes(current.startTime);

        // Gap in minutes between cluster end and current start
        const gapMinutes = currentStart - maxClusterEnd;

        // If gap is more than maxGapMinutes (e.g. > 3 hours), start a new cluster
        if (gapMinutes > maxGapMinutes) {
            clusters.push([current]);
        } else {
            currentCluster.push(current);
        }
    }

    return clusters;
}

/**
 * Compute the summary information (shift label, formatted time range, start, end) for a cluster of subjobs.
 */
export function getClusterSummary<T extends Partial<SubJob>>(cluster: T[]): {
    shift: 'Sáng' | 'Chiều' | 'Tối' | 'Cả ngày';
    startTime: string;
    endTime: string;
    timeRange: string;
} {
    const hasMorning = cluster.some(s => s.shift === 'Sáng');
    const hasAfternoon = cluster.some(s => s.shift === 'Chiều');
    const hasEvening = cluster.some(s => s.shift === 'Tối');

    let shift: 'Sáng' | 'Chiều' | 'Tối' | 'Cả ngày';
    if ((hasMorning && hasAfternoon) || (hasMorning && hasEvening) || (hasAfternoon && hasEvening)) {
        shift = 'Cả ngày';
    } else if (hasMorning) {
        shift = 'Sáng';
    } else if (hasAfternoon) {
        shift = 'Chiều';
    } else {
        shift = 'Tối';
    }

    const startTimes = cluster.map(s => s.startTime || '').sort();
    const endTimes = cluster.map(s => s.endTime || '').sort();

    const startTime = startTimes[0] || '';
    const endTime = endTimes[endTimes.length - 1] || '';

    return {
        shift,
        startTime,
        endTime,
        timeRange: `${startTime} - ${endTime}`
    };
}
