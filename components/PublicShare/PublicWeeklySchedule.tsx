import React, { useMemo } from 'react';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Calendar, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { Job, SubJob } from '../../types';

import { clusterSubJobs, getClusterSummary } from '../../utils/scheduleCluster';

interface ScheduleSlot {
    time: string;
    type: 'Sáng' | 'Chiều' | 'Tối' | 'Cả ngày';
}

interface WeeklyEntry {
    name: string;
    link: string;
    // Map of dayIndex (0=Mon, 6=Sun) to array of ScheduleSlot
    schedule: Record<number, ScheduleSlot[]>;
}

interface Props {
    selectedDate: Date;
    setSelectedDate: React.Dispatch<React.SetStateAction<Date>>;
    jobs: Partial<Job>[];
    subJobs: Partial<SubJob>[];
    getHolidayName: (date: Date) => string | null;
    selectedProducts: string[];
}

const PublicWeeklySchedule: React.FC<Props> = ({ selectedDate, setSelectedDate, jobs, subJobs, getHolidayName, selectedProducts }) => {
    
    // Get start of the week (Monday)
    const weekStart = useMemo(() => startOfWeek(selectedDate, { weekStartsOn: 1 }), [selectedDate]);

    // Generate dates for the week headers
    const weekDates = useMemo(() => {
        return Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
    }, [weekStart]);

    // Helper: Get day name from date (e.g., "Thứ 2") matches SubJob.day format
    const getSubJobDayName = (dayIndex: number): string => {
        const map: Record<number, string> = {
            0: 'Thứ 2', 1: 'Thứ 3', 2: 'Thứ 4', 3: 'Thứ 5',
            4: 'Thứ 6', 5: 'Thứ 7', 6: 'Chủ nhật'
        };
        return map[dayIndex];
    };

    // 1. Filter and Map Jobs
    const trainingJobsMap = useMemo(() => {
        const map = new Map<string, string>();
        jobs.filter(j => j.group === 'Đào tạo' && j.classification)
            .forEach(j => map.set(j.id!, j.classification!));
        return map;
    }, [jobs]);

    // 2. Process Data into Weekly Entries
    const weeklyData = useMemo(() => {
        // Filter relevant subjobs (Only Training! Livechat is excluded for public weekly view per user request)
        const activeSubJobs = subJobs.filter(sub => {
            if (!sub.isActive || !sub.jobId) return false;
            // Check Training only
            return trainingJobsMap.has(sub.jobId);
        });

        // Processor function
        const processSection = (classification: string, product: string): WeeklyEntry[] => {
            const grouped = new Map<string, Partial<SubJob>[]>();

            activeSubJobs.forEach(sub => {
                const cls = trainingJobsMap.get(sub.jobId!);
                if (cls !== classification || sub.product !== product) return;

                const key = (sub.name || '').trim();
                if (!grouped.has(key)) grouped.set(key, []);
                grouped.get(key)!.push(sub);
            });

            const entries: WeeklyEntry[] = [];
            grouped.forEach((subs, key) => {
                const template = subs[0];
                const entry: WeeklyEntry = {
                    name: template.name || '',
                    link: template.link || '',
                    schedule: {}
                };

                for (let i = 0; i < 7; i++) {
                    // Check if this date is a holiday
                    const date = weekDates[i];
                    if (getHolidayName(date)) {
                        continue; // Skip rendering subjobs for holidays
                    }

                    const dayName = getSubJobDayName(i);
                    const daySubs = subs.filter(s => s.day === dayName);

                    if (daySubs.length > 0) {
                        const clusters = clusterSubJobs(daySubs);
                        const slots: ScheduleSlot[] = clusters.map(cluster => {
                            const summary = getClusterSummary(cluster);
                            return {
                                time: summary.timeRange,
                                type: summary.shift
                            };
                        });

                        entry.schedule[i] = slots;
                    }
                }

                if (Object.keys(entry.schedule).length > 0) {
                    entries.push(entry);
                }
            });

            return entries.sort((a, b) => a.name.localeCompare(b.name));
        };

        return {
            linhVucAmis: processSection('Lĩnh vực', 'AMIS Kế toán'),
            nghiepVuAmis: processSection('Nghiệp vụ', 'AMIS Kế toán'),
            linhVucSme: processSection('Lĩnh vực', 'MISA SME'),
            nghiepVuSme: processSection('Nghiệp vụ', 'MISA SME'),
        };

    }, [subJobs, trainingJobsMap, weekDates, getHolidayName]);

    // Render Table Helper
    const renderTable = (title: string, entries: WeeklyEntry[], colorClass: string) => {
        return (
            <div className={`rounded-xl border shadow-sm bg-white mb-6 flex flex-col overflow-hidden`}>
                <div className={`${colorClass} px-3 py-2 flex items-center flex-none`}>
                    <h3 className="font-bold text-white text-sm md:text-base">{title}</h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-[11px] md:text-xs border-collapse">
                        <thead className="bg-gray-50 sticky top-0 z-20">
                            <tr className="bg-gray-50 text-gray-700 shadow-sm border-b">
                                <th className="px-3 py-2 text-left min-w-[200px] sticky left-0 bg-gray-50 z-30 shadow-[1px_0_3px_-1px_rgba(0,0,0,0.1)]">
                                    NỘI DUNG
                                </th>
                                {weekDates.map((date, i) => {
                                    const holiday = getHolidayName(date);
                                    return (
                                        <th key={i} className={`px-1 py-2 border-l text-center min-w-[90px] ${holiday ? 'bg-amber-50' : ''}`}>
                                            <div className="font-semibold uppercase text-[10px] md:text-xs text-gray-600">{format(date, 'EEE', { locale: vi })}</div>
                                            <div className="text-[10px] text-gray-400">{format(date, 'dd/MM')}</div>
                                            {holiday && <div className="text-[9px] text-amber-600 mt-0.5 truncate" title={holiday}>{holiday}</div>}
                                        </th>
                                    );
                                })}
                                <th className="px-3 py-2 border-l text-center min-w-[80px]">Link Meet</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.length > 0 ? (
                                entries.map((entry, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 border-b border-gray-100 last:border-0">
                                        <td className="px-3 py-2 font-medium text-gray-800 sticky left-0 bg-white shadow-[1px_0_3px_-1px_rgba(0,0,0,0.1)] whitespace-normal break-words max-w-[250px]" title={entry.name}>
                                            <div className="line-clamp-2">{entry.name}</div>
                                        </td>
                                        {Array.from({ length: 7 }).map((_, i) => {
                                            const isHoliday = getHolidayName(weekDates[i]);
                                            const slots = entry.schedule[i];
                                            return (
                                                <td key={i} className={`px-1 py-2 text-center border-l border-gray-100 align-top ${isHoliday ? 'bg-amber-50/30' : ''}`}>
                                                    {isHoliday ? (
                                                        <span className="text-amber-500/50 text-[10px] italic">Nghỉ lễ</span>
                                                    ) : slots && slots.length > 0 ? (
                                                        <div className="flex flex-col items-center gap-1">
                                                            {slots.map((slot, sIdx) => (
                                                                <div
                                                                    key={sIdx}
                                                                    className={`inline-block px-1.5 py-0.5 rounded font-semibold whitespace-nowrap text-[10px] md:text-xs ${
                                                                        slot.type === 'Cả ngày' ? 'bg-purple-100 text-purple-700' :
                                                                        slot.type === 'Sáng' ? 'bg-amber-100 text-amber-700' :
                                                                        slot.type === 'Chiều' ? 'bg-blue-100 text-blue-700' :
                                                                        'bg-indigo-100 text-indigo-700'
                                                                    }`}
                                                                >
                                                                    {slot.time}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-200 text-[10px]">-</span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                        <td className="px-3 py-2 text-center border-l border-gray-100">
                                            {entry.link ? (
                                                <a href={entry.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md transition-colors">
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                </a>
                                            ) : (
                                                <span className="text-gray-200 text-[10px]">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={9} className="px-4 py-8 text-center text-gray-400 italic bg-gray-50/50">
                                        Không có lớp học nào trong tuần này.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col animate-in fade-in duration-300">
            {/* Header / Controls */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl shadow-md p-3 text-white flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
                <div>
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        Lịch Đào Tạo Tuần
                    </h2>
                    <p className="text-blue-100 text-xs mt-0.5">Tổng hợp lịch đào tạo theo tuần.</p>
                </div>

                <div className="flex items-center bg-white/10 rounded-lg p-1 backdrop-blur-sm border border-white/20">
                    <button
                        onClick={() => setSelectedDate(d => addDays(d, -7))}
                        className="p-1.5 hover:bg-white/20 rounded-md transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="px-3 font-medium text-sm whitespace-nowrap min-w-[140px] text-center">
                        Tuần {format(weekStart, 'dd/MM')} - {format(addDays(weekStart, 6), 'dd/MM')}
                    </div>
                    <button
                        onClick={() => setSelectedDate(d => addDays(d, 7))}
                        className="p-1.5 hover:bg-white/20 rounded-md transition-colors"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="pb-10">
                {selectedProducts.includes('AMIS Kế toán') && (
                    <>
                        {renderTable('1. AMIS Kế toán - Lĩnh vực', weeklyData.linhVucAmis, 'bg-blue-600')}
                        {renderTable('2. AMIS Kế toán - Nghiệp vụ', weeklyData.nghiepVuAmis, 'bg-indigo-600')}
                    </>
                )}
                {selectedProducts.includes('MISA SME') && (
                    <>
                        {renderTable('3. MISA SME - Lĩnh vực', weeklyData.linhVucSme, 'bg-cyan-600')}
                        {renderTable('4. MISA SME - Nghiệp vụ', weeklyData.nghiepVuSme, 'bg-teal-600')}
                    </>
                )}
            </div>
        </div>
    );
};

export default PublicWeeklySchedule;
