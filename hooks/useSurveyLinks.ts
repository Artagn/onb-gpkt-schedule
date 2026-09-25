import { useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../services/firebaseConfig';
import { ScheduleItem, Job, SubJob } from '../types';

/**
 * Hook lấy link khảo sát rút gọn cho các lớp đào tạo đang hiển thị.
 *
 * Flow:
 *   1. Lọc ScheduleItem nhóm "Đào tạo" → tìm SubJob tương ứng (jobId + thứ + buổi)
 *   2. Thu thập unique (className, date) pairs
 *   3. Gọi Cloud Function `batchSurveyShortLinks` 1 lần (batch)
 *   4. TanStack Query cache 24h → chỉ gọi API 1 lần/ngày
 *
 * @returns getSurveyLink(className, date) → shortUrl | undefined
 */

const DAY_MAP: Record<number, string> = {
  0: 'Chủ nhật', 1: 'Thứ 2', 2: 'Thứ 3', 3: 'Thứ 4',
  4: 'Thứ 5', 5: 'Thứ 6', 6: 'Thứ 7',
};

interface SurveyEntry {
  className: string;
  date: string;
}

export function useSurveyLinks(
  scheduleItems: ScheduleItem[],
  jobs: Job[],
  subJobs: SubJob[]
) {
  // 1. Tính danh sách unique (className, date) cần lấy link
  const entries = useMemo(() => {
    const jobMap = new Map(jobs.map(j => [j.id, j]));
    const seen = new Set<string>();
    const result: SurveyEntry[] = [];

    for (const item of scheduleItems) {
      const job = jobMap.get(item.jobId);
      if (!job || job.group !== 'Đào tạo') continue;

      const dayIndex = new Date(item.date + 'T00:00:00').getDay();
      const dayName = DAY_MAP[dayIndex];

      const matchingSubs = subJobs.filter(
        s => s.jobId === item.jobId && s.day === dayName && s.shift === item.shift && s.isActive
      );

      for (const sub of matchingSubs) {
        const key = `${sub.name}|${item.date}`;
        if (!seen.has(key)) {
          seen.add(key);
          result.push({ className: sub.name, date: item.date });
        }
      }
    }

    return result;
  }, [scheduleItems, jobs, subJobs]);

  // 2. Stable query key (sorted để tránh refetch thừa)
  const entriesKey = useMemo(() => {
    return entries
      .map(e => `${e.date}_${e.className}`)
      .sort()
      .join(',');
  }, [entries]);

  // 3. Gọi Cloud Function 1 lần, cache 24h
  const { data: linksMap = {} } = useQuery({
    queryKey: ['surveyShortLinks', entriesKey],
    queryFn: async (): Promise<Record<string, string>> => {
      if (entries.length === 0) return {};
      const fn = httpsCallable<
        { entries: SurveyEntry[] },
        { links: Record<string, string> }
      >(functions, 'batchSurveyShortLinks');
      const result = await fn({ entries });
      return result.data.links;
    },
    enabled: entries.length > 0,
    staleTime: 24 * 60 * 60 * 1000, // 24 giờ
    gcTime: 24 * 60 * 60 * 1000,
  });

  // 4. Lookup function: className + date → shortUrl
  const getSurveyLink = useCallback(
    (className: string, date: string): string | undefined => {
      return linksMap[`${className}|${date}`];
    },
    [linksMap]
  );

  return { getSurveyLink };
}
