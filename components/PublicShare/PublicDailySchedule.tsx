import React, { useMemo } from 'react';
import { format, getDay, isValid, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ExternalLink, CalendarDays } from 'lucide-react';
import { Job, SubJob } from '../../types';

import { clusterSubJobs, getClusterSummary } from '../../utils/scheduleCluster';

interface ProcessedEntry {
    name: string;
    day: string;
    link: string;
    shift: string;
    startTime: string;
    endTime: string;
}

interface Props {
    selectedDate: Date;
    setSelectedDate: (date: Date) => void;
    jobs: Partial<Job>[];
    subJobs: Partial<SubJob>[];
    getHolidayName: (date: Date) => string | null;
    selectedProducts: string[];
}

const PublicDailySchedule: React.FC<Props> = ({ selectedDate, setSelectedDate, jobs, subJobs, getHolidayName, selectedProducts }) => {

    const holidayName = getHolidayName(selectedDate);

    // Map date to Vietnamese day name
    const getDayName = (date: Date): string => {
        if (!isValid(date)) return '';
        const dayIndex = getDay(date); // 0 = Sunday, 1 = Monday, ...
        const dayNames: Record<number, string> = {
            0: 'Chủ nhật', 1: 'Thứ 2', 2: 'Thứ 3', 3: 'Thứ 4',
            4: 'Thứ 5', 5: 'Thứ 6', 6: 'Thứ 7'
        };
        return dayNames[dayIndex];
    };

    // Get training jobs map: jobId -> classification
    const trainingJobsMap = useMemo(() => {
        const map = new Map<string, string>();
        jobs.forEach(j => {
            if (j.id && j.classification) {
                map.set(j.id, j.classification);
            }
        });
        return map;
    }, [jobs]);

    // Process data for 2x2 grid
    const gridData = useMemo(() => {
        if (holidayName) {
            return { linhVucAmis: [], linhVucSme: [], nghiepVuAmis: [], nghiepVuSme: [] };
        }

        const dayName = getDayName(selectedDate);

        // Filter subJobs by day and only training jobs
        const filteredSubs = subJobs.filter(sub =>
            sub.day === dayName &&
            sub.isActive &&
            sub.jobId &&
            trainingJobsMap.has(sub.jobId)
        );

        // Group by (classification, product, jobId) then merge shifts
        const grouped = new Map<string, Partial<SubJob>[]>();
        filteredSubs.forEach(sub => {
            const classification = trainingJobsMap.get(sub.jobId!)!;
            const key = `${classification}|${sub.product}|${sub.jobId}|${sub.name}`;
            if (!grouped.has(key)) grouped.set(key, []);
            grouped.get(key)!.push(sub);
        });

        // Process and merge
        const processEntries = (classification: string, product: string): ProcessedEntry[] => {
            const entries: ProcessedEntry[] = [];

            grouped.forEach((subs, key) => {
                const [cls, prod] = key.split('|');
                if (cls !== classification || prod !== product) return;

                const clusters = clusterSubJobs(subs);
                clusters.forEach(cluster => {
                    const summary = getClusterSummary(cluster);

                    entries.push({
                        name: cluster[0].name || '',
                        day: cluster[0].day || '',
                        link: cluster[0].link || '',
                        shift: summary.shift,
                        startTime: summary.startTime,
                        endTime: summary.endTime
                    });
                });
            });

            // Sort by start time
            return entries.sort((a, b) => a.startTime.localeCompare(b.startTime));
        };

        return {
            linhVucAmis: processEntries('Lĩnh vực', 'AMIS Kế toán'),
            linhVucSme: processEntries('Lĩnh vực', 'MISA SME'),
            nghiepVuAmis: processEntries('Nghiệp vụ', 'AMIS Kế toán'),
            nghiepVuSme: processEntries('Nghiệp vụ', 'MISA SME')
        };
    }, [selectedDate, subJobs, trainingJobsMap, holidayName]);

    // Render table for a section
    const renderTable = (title: string, entries: ProcessedEntry[], bgClass: string, borderClass: string) => (
        <div className={`rounded-xl border-2 ${borderClass} overflow-hidden shadow-sm flex flex-col bg-white`}>
            {/* Header */}
            <div className={`${bgClass} px-3 py-2 flex items-center flex-none`}>
                <h3 className="font-bold text-white text-sm md:text-base">{title}</h3>
            </div>

            {/* Table */}
            {entries.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="w-full text-xs md:text-sm">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-3 py-2 text-left font-semibold text-gray-700 w-1/2">Tên lớp</th>
                                <th className="px-2 py-2 text-center font-semibold text-gray-700 w-[10%]">Buổi</th>
                                <th className="px-2 py-2 text-center font-semibold text-gray-700 w-[12%]">Bắt đầu</th>
                                <th className="px-2 py-2 text-center font-semibold text-gray-700 w-[12%]">Kết thúc</th>
                                <th className="px-3 py-2 text-right font-semibold text-gray-700 w-[16%]">Link</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map((entry, idx) => (
                                <tr key={idx} className="hover:bg-gray-50 border-b border-gray-100 last:border-0">
                                    <td className="px-3 py-2 text-gray-800 font-medium">
                                        <div className="line-clamp-2" title={entry.name}>{entry.name}</div>
                                    </td>
                                    <td className="px-2 py-2 text-center">
                                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] md:text-xs font-medium ${
                                            entry.shift === 'Cả ngày' ? 'bg-purple-100 text-purple-700' :
                                            entry.shift === 'Sáng' ? 'bg-amber-100 text-amber-700' :
                                            entry.shift === 'Chiều' ? 'bg-blue-100 text-blue-700' :
                                            'bg-indigo-100 text-indigo-700'
                                        }`}>
                                            {entry.shift}
                                        </span>
                                    </td>
                                    <td className="px-2 py-2 text-center text-gray-600 font-mono text-[11px] md:text-xs">
                                        {entry.startTime}
                                    </td>
                                    <td className="px-2 py-2 text-center text-gray-600 font-mono text-[11px] md:text-xs">
                                        {entry.endTime}
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        {entry.link ? (
                                            <a
                                                href={entry.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-xs font-medium transition-colors"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                                <span>Vào học</span>
                                            </a>
                                        ) : (
                                            <span className="text-gray-400 text-[10px]">-</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="px-4 py-6 text-center text-gray-400 bg-gray-50/50">
                    <p className="text-sm">Không có lịch học</p>
                </div>
            )}
        </div>
    );

    const formattedDate = format(selectedDate, 'yyyy-MM-dd');

    return (
        <div className="flex flex-col animate-in fade-in duration-300">
            {/* Header controls */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl shadow-md p-3 text-white flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
                <div>
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <CalendarDays className="w-5 h-5" />
                        Lịch Đào Tạo Hàng Ngày
                    </h2>
                    <p className="text-emerald-100 text-xs mt-0.5">Lịch học chi tiết trong ngày, vui lòng truy cập đúng giờ.</p>
                </div>

                <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-lg border border-white/20">
                    <input
                        type="date"
                        className="bg-transparent border-none text-white font-medium text-sm focus:ring-0 cursor-pointer outline-none [color-scheme:dark]"
                        value={formattedDate}
                        onChange={(e) => setSelectedDate(parseISO(e.target.value))}
                    />
                    <div className="bg-white/20 px-3 py-1 rounded text-sm font-semibold text-white border border-white/20 min-w-[90px] text-center">
                        {getDayName(selectedDate)}
                    </div>
                </div>
            </div>

            {/* Holiday Notice */}
            {holidayName ? (
                <div className="bg-amber-50 border-2 border-amber-200 text-amber-700 rounded-xl p-8 text-center my-8 shadow-sm">
                    <h3 className="text-xl font-bold mb-2">🎉 Hôm nay là Ngày nghỉ lễ</h3>
                    <p className="text-lg font-medium">{holidayName}</p>
                    <p className="text-amber-600 mt-2 text-sm">Hệ thống tạm ngưng các lớp đào tạo trong thời gian này.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-10">
                    {selectedProducts.includes('AMIS Kế toán') && (
                        <>
                            {renderTable('1. AMIS Kế toán - Lĩnh vực', gridData.linhVucAmis, 'bg-blue-600', 'border-blue-100')}
                            {renderTable('2. AMIS Kế toán - Nghiệp vụ', gridData.nghiepVuAmis, 'bg-indigo-600', 'border-indigo-100')}
                        </>
                    )}
                    {selectedProducts.includes('MISA SME') && (
                        <>
                            {renderTable('3. MISA SME - Lĩnh vực', gridData.linhVucSme, 'bg-cyan-600', 'border-cyan-100')}
                            {renderTable('4. MISA SME - Nghiệp vụ', gridData.nghiepVuSme, 'bg-teal-600', 'border-teal-100')}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default PublicDailySchedule;
