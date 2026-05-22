
import React, { useState, useMemo } from 'react';
import { Job, SubJob } from '../types';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Calendar, Copy, Check, ExternalLink, ChevronLeft, ChevronRight, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import html2canvas from 'html2canvas';

import { useData } from '../context/DataContext';

interface Props {
    // No props
}

interface WeeklyEntry {
    name: string;
    link: string;
    // Map of dayIndex (0=Mon, 6=Sun) to { time: string, type: 'Sáng' | 'Chiều' | 'Tối' | 'Cả ngày' }
    schedule: Record<number, { time: string; type: 'Sáng' | 'Chiều' | 'Tối' | 'Cả ngày' }>;
}

const WeeklyScheduleView: React.FC<Props> = () => {
    const { jobs, subJobs } = useData();
    // State for selected week (default to current week)
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [copiedSection, setCopiedSection] = useState<string | null>(null);

    // Get start of the week (Monday)
    const weekStart = useMemo(() => startOfWeek(selectedDate, { weekStartsOn: 1 }), [selectedDate]);

    // Generate dates for the week headers
    const weekDates = useMemo(() => {
        return Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
    }, [weekStart]);

    // Helper: Get day name from date (e.g., "Thứ 2") matches SubJob.day format
    // Note: SubJob.day is stored as "Thứ 2", "Thứ 3"... "Chủ nhật"
    const getSubJobDayName = (dayIndex: number): string => {
        const map: Record<number, string> = {
            0: 'Thứ 2',
            1: 'Thứ 3',
            2: 'Thứ 4',
            3: 'Thứ 5',
            4: 'Thứ 6',
            5: 'Thứ 7',
            6: 'Chủ nhật'
        };
        return map[dayIndex];
    };

    // 1. Filter and Map Jobs
    const trainingJobsMap = useMemo(() => {
        const map = new Map<string, string>();
        jobs.filter(j => j.group === 'Đào tạo' && j.classification)
            .forEach(j => map.set(j.id, j.classification!));
        return map;
    }, [jobs]);

    // 2. Process Data into Weekly Entries
    const weeklyData = useMemo(() => {
        // Filter relevant subjobs (Training OR Livechat)
        const activeSubJobs = subJobs.filter(sub => {
            if (!sub.isActive) return false;
            // Check Training
            if (trainingJobsMap.has(sub.jobId)) return true;

            // Check Livechat
            const job = jobs.find(j => j.id === sub.jobId);
            return job?.group === 'Livechat';
        });

        // Processor function
        const processSection = (classification: string, product: string): WeeklyEntry[] => {
            // Group by unique class identifier (JobId + Product is usually enough, but we use name to be safe)
            // Actually, requirements say: "Danh sách các lớp...". A "Class" is defined by the Job.
            // We group by JobId to aggregate shifts across the week.

            const grouped = new Map<string, SubJob[]>();

            activeSubJobs.forEach(sub => {
                const cls = trainingJobsMap.get(sub.jobId);
                // Filter by section criteria
                if (cls !== classification || sub.product !== product) return;

                // Group by SubJob Name ONLY to merge duplications across days
                // User requirement: "gộp lại chung 1 dòng với nhiều khung thời gian"
                const key = sub.name.trim();
                if (!grouped.has(key)) grouped.set(key, []);
                grouped.get(key)!.push(sub);
            });

            return processGroupedData(grouped);
        };

        // NEW: Process Livechat
        const processLivechat = (): WeeklyEntry[] => {
            const grouped = new Map<string, SubJob[]>();
            // Filter all subjobs that belong to 'Livechat' group
            activeSubJobs.forEach(sub => {
                // Check if job is Livechat. We need to access the job object.
                const job = jobs.find(j => j.id === sub.jobId);
                if (job?.group === 'Livechat') {
                    const key = sub.name.trim();
                    if (!grouped.has(key)) grouped.set(key, []);
                    grouped.get(key)!.push(sub);
                }
            });
            return processGroupedData(grouped);
        };

        // Common helper to transform Grouped Map -> Entries
        const processGroupedData = (grouped: Map<string, SubJob[]>): WeeklyEntry[] => {
            const entries: WeeklyEntry[] = [];
            grouped.forEach((subs, key) => {
                // Determine Name and Link (take from first subjob, they should be consistent for the same Job)
                const template = subs[0];
                const entry: WeeklyEntry = {
                    name: template.name, // "Tên hạng mục"
                    link: template.link, // "Link Meet"
                    schedule: {}
                };

                // Fill schedule for each day of the week
                for (let i = 0; i < 7; i++) {
                    const dayName = getSubJobDayName(i);
                    // Find subjobs for this day
                    const daySubs = subs.filter(s => s.day === dayName);

                    if (daySubs.length > 0) {
                        // Calculate earliest start and latest end
                        const startTimes = daySubs.map(s => s.startTime).sort();
                        const endTimes = daySubs.map(s => s.endTime).sort();

                        const minStart = startTimes[0];
                        const maxEnd = endTimes[endTimes.length - 1];

                        // Determine Shift Type
                        const hasMorning = daySubs.some(s => s.shift === 'Sáng');
                        const hasAfternoon = daySubs.some(s => s.shift === 'Chiều');
                        const hasEvening = daySubs.some(s => s.shift === 'Tối');

                        let type: 'Sáng' | 'Chiều' | 'Tối' | 'Cả ngày';
                        if ((hasMorning && hasAfternoon) || (hasMorning && hasEvening) || (hasAfternoon && hasEvening)) {
                            type = 'Cả ngày';
                        } else if (hasMorning) {
                            type = 'Sáng';
                        } else if (hasAfternoon) {
                            type = 'Chiều';
                        } else {
                            type = 'Tối';
                        }

                        entry.schedule[i] = {
                            time: `${minStart} - ${maxEnd}`,
                            type
                        };
                    }
                }

                // Only add if there's at least one session
                if (Object.keys(entry.schedule).length > 0) {
                    entries.push(entry);
                }
            });

            // Sort by Name for consistency
            return entries.sort((a, b) => a.name.localeCompare(b.name));
        }

        return {
            linhVucAmis: processSection('Lĩnh vực', 'AMIS Kế toán'),
            nghiepVuAmis: processSection('Nghiệp vụ', 'AMIS Kế toán'),
            linhVucSme: processSection('Lĩnh vực', 'MISA SME'),
            nghiepVuSme: processSection('Nghiệp vụ', 'MISA SME'),
            livechat: processLivechat(), // New
        };

    }, [subJobs, trainingJobsMap, jobs]);

    // Handle Copy
    const handleCopy = (sectionKey: string, entries: WeeklyEntry[]) => {
        // ... existing logic ...
        if (entries.length === 0) {
            toast.error('Không có dữ liệu để copy');
            return;
        }

        // Header: NỘI DUNG | THỨ 2 | ... | CN | Link Meet
        const header = ['NỘI DUNG', 'THỨ 2', 'THỨ 3', 'THỨ 4', 'THỨ 5', 'THỨ 6', 'THỨ 7', 'CHỦ NHẬT', 'LINK MEET'].join('\t');

        const rows = entries.map(e => {
            const days = Array.from({ length: 7 }).map((_, i) => e.schedule[i]?.time || ''); // Empty string if no schedule
            return [e.name, ...days, e.link].join('\t');
        });

        const content = [header, ...rows].join('\n');

        navigator.clipboard.writeText(content).then(() => {
            setCopiedSection(sectionKey);
            toast.success('Đã copy lưới lịch!');
            setTimeout(() => setCopiedSection(null), 2000);
        }).catch(() => toast.error('Lỗi khi copy'));
    };

    // Capture as Image
    const handleCapture = async (sectionKey: string, containerId: string) => {
        const element = document.getElementById(containerId);
        if (!element) {
            toast.error("Không tìm thấy bảng để chụp ảnh");
            return;
        }

        try {
            const canvas = await html2canvas(element, {
                scale: 2, // High resolution
                useCORS: true,
                backgroundColor: '#ffffff'
            });

            canvas.toBlob(blob => {
                if (blob) {
                    navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': blob })
                    ])
                        .then(() => toast.success("Đã chụp & lưu ảnh vào Clipboard!"))
                        .catch(() => toast.error("Không thể lưu vào Clipboard."));
                }
            });
        } catch (error) {
            console.error(error);
            toast.error("Lỗi khi chụp ảnh");
        }
    };

    // Render Table Helper
    const renderTable = (title: string, sectionKey: string, entries: WeeklyEntry[], colorClass: string) => {
        return (
            <div id={`table-${sectionKey}`} className={`rounded-xl border shadow-sm bg-white mb-6 flex flex-col`}>
                <div className={`${colorClass} px-3 py-2 flex justify-between items-center flex-none`}>
                    <h3 className="font-bold text-white text-base">{title}</h3>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleCapture(sectionKey, `table-${sectionKey}`)}
                            className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/20 text-white hover:bg-white/30 text-xs font-medium transition-colors"
                            title="Chụp ảnh bảng này"
                        >
                            <Camera className="w-3.5 h-3.5" /> Ảnh
                        </button>
                        <button
                            onClick={() => handleCopy(sectionKey, entries)}
                            className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/20 text-white hover:bg-white/30 text-xs font-medium transition-colors"
                        >
                            {copiedSection === sectionKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            {copiedSection === sectionKey ? 'Đã copy' : 'Text'}
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                        <thead className="bg-gray-50 sticky top-0 z-20">
                            <tr className="bg-gray-50 text-gray-700 shadow-sm">
                                <th className="px-3 py-2 border-b text-left min-w-[180px] sticky left-0 bg-gray-50 z-30 shadow-[1px_0_3px_-1px_rgba(0,0,0,0.1)]">NỘI DUNG</th>
                                {weekDates.map((date, i) => (
                                    <th key={i} className="px-1 py-2 border-b text-center min-w-[80px]">
                                        <div className="font-semibold text-[10px] text-gray-500 uppercase">{format(date, 'EEE', { locale: vi })}</div>
                                        <div className="text-[10px] text-gray-400">{format(date, 'dd/MM')}</div>
                                    </th>
                                ))}
                                <th className="px-3 py-2 border-b text-center min-w-[80px]">Link Meet</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.length > 0 ? (
                                entries.map((entry, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 border-b border-gray-100 last:border-0">
                                        <td className="px-3 py-2 font-medium text-gray-800 sticky left-0 bg-white shadow-[1px_0_3px_-1px_rgba(0,0,0,0.1)] whitespace-normal break-words max-w-[200px]" title={entry.name}>
                                            {entry.name}
                                        </td>
                                        {Array.from({ length: 7 }).map((_, i) => (
                                            <td key={i} className="px-1 py-2 text-center border-l border-gray-100 align-top">
                                                {entry.schedule[i] ? (
                                                    <div className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap ${entry.schedule[i].type === 'Cả ngày' ? 'bg-purple-100 text-purple-700' :
                                                        entry.schedule[i].type === 'Sáng' ? 'bg-amber-100 text-amber-700' :
                                                            entry.schedule[i].type === 'Chiều' ? 'bg-blue-100 text-blue-700' :
                                                                'bg-indigo-100 text-indigo-700'
                                                        }`}>
                                                        {entry.schedule[i].time}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-200 text-[10px]">-</span>
                                                )}
                                            </td>
                                        ))}
                                        <td className="px-3 py-2 text-center border-l border-gray-100">
                                            {entry.link ? (
                                                <a href={entry.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 flex justify-center">
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
                                    <td colSpan={9} className="px-4 py-8 text-center text-gray-400 italic">
                                        Chưa có bài giảng nào trong danh mục này.
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
        <div className="space-y-4">
            {/* Header / Controls */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl shadow-lg p-3 text-white flex flex-col md:flex-row justify-between items-center gap-2">
                <div>
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        Xem lịch tuần
                    </h2>
                    <p className="text-blue-100 text-xs mt-0.5">Tổng hợp lịch đào tạo theo tuần - Hỗ trợ xuất Excel</p>
                </div>

                <div className="flex items-center bg-white/10 rounded-lg p-1 backdrop-blur-sm border border-white/20">
                    <button
                        onClick={() => setSelectedDate(d => addDays(d, -7))}
                        className="p-1 hover:bg-white/20 rounded-md transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="px-3 font-medium text-sm whitespace-nowrap min-w-[140px] text-center">
                        Tuần {format(weekStart, 'dd/MM')} - {format(addDays(weekStart, 6), 'dd/MM')}
                    </div>
                    <button
                        onClick={() => setSelectedDate(d => addDays(d, 7))}
                        className="p-1 hover:bg-white/20 rounded-md transition-colors"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Content ... */}
            <div className="space-y-4">
                {renderTable('1. AMIS Kế toán - Lĩnh vực', 'amis-linhvuc', weeklyData.linhVucAmis, 'bg-blue-600')}
                {renderTable('2. AMIS Kế toán - Nghiệp vụ', 'amis-nghiepvu', weeklyData.nghiepVuAmis, 'bg-indigo-600')}
                {renderTable('3. MISA SME - Lĩnh vực', 'sme-linhvuc', weeklyData.linhVucSme, 'bg-cyan-600')}
                {renderTable('4. MISA SME - Nghiệp vụ', 'sme-nghiepvu', weeklyData.nghiepVuSme, 'bg-teal-600')}
                {renderTable('5. Trực Livechat', 'livechat', weeklyData.livechat, 'bg-pink-600')}
            </div>
        </div>
    );
};

export default WeeklyScheduleView;
