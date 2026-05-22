
import React, { useState, useMemo } from 'react';
import { Job, SubJob } from '../types';
import { format, getDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Calendar, Copy, Check, ExternalLink, Camera, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import html2canvas from 'html2canvas';

import { useData } from '../context/DataContext';

interface Props {
    // No props
}

interface ProcessedEntry {
    name: string;
    day: string;
    link: string;
    shift: string;
    startTime: string;
    endTime: string;
}

const DailyViewTab: React.FC<Props> = () => {
    const { jobs, subJobs } = useData();
    const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [copiedSection, setCopiedSection] = useState<string | null>(null);

    // Map date to Vietnamese day name
    const getDayName = (dateStr: string): string => {
        const date = new Date(dateStr);
        const dayIndex = getDay(date); // 0 = Sunday, 1 = Monday, ...
        const dayNames: Record<number, string> = {
            0: 'Chủ nhật',
            1: 'Thứ 2',
            2: 'Thứ 3',
            3: 'Thứ 4',
            4: 'Thứ 5',
            5: 'Thứ 6',
            6: 'Thứ 7'
        };
        return dayNames[dayIndex];
    };

    // Get training jobs map: jobId -> classification
    const trainingJobsMap = useMemo(() => {
        const map = new Map<string, string>();
        jobs.filter(j => j.group === 'Đào tạo' && j.classification)
            .forEach(j => map.set(j.id, j.classification!));
        return map;
    }, [jobs]);

    // Process data for 2x2 grid
    const gridData = useMemo(() => {
        const dayName = getDayName(selectedDate);

        // Filter subJobs by day and only training jobs
        const filteredSubs = subJobs.filter(sub =>
            sub.day === dayName &&
            sub.isActive &&
            trainingJobsMap.has(sub.jobId)
        );

        // Group by (classification, product, jobId) then merge shifts
        const grouped = new Map<string, SubJob[]>();
        filteredSubs.forEach(sub => {
            const classification = trainingJobsMap.get(sub.jobId)!;
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

                const hasMorning = subs.some(s => s.shift === 'Sáng');
                const hasAfternoon = subs.some(s => s.shift === 'Chiều');
                const hasEvening = subs.some(s => s.shift === 'Tối');

                let shift: string;
                if ((hasMorning && hasAfternoon) || (hasMorning && hasEvening) || (hasAfternoon && hasEvening)) {
                    shift = 'Cả ngày';
                } else if (hasMorning) {
                    shift = 'Sáng';
                } else if (hasAfternoon) {
                    shift = 'Chiều';
                } else {
                    shift = 'Tối';
                }

                // Get earliest start and latest end
                const startTimes = subs.map(s => s.startTime).sort();
                const endTimes = subs.map(s => s.endTime).sort();

                entries.push({
                    name: subs[0].name,
                    day: subs[0].day,
                    link: subs[0].link,
                    shift,
                    startTime: startTimes[0],
                    endTime: endTimes[endTimes.length - 1]
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
    }, [selectedDate, subJobs, trainingJobsMap]);

    // Copy to clipboard
    const handleCopy = (sectionKey: string, entries: ProcessedEntry[]) => {
        if (entries.length === 0) {
            toast.error('Không có dữ liệu để copy');
            return;
        }

        // Create tab-separated content
        const header = 'Tên lớp\tThứ\tLink Meet\tBuổi\tGiờ bắt đầu\tGiờ kết thúc';
        const rows = entries.map(e =>
            `${e.name}\t${e.day}\t${e.link}\t${e.shift}\t${e.startTime}\t${e.endTime}`
        );
        const content = [header, ...rows].join('\n');

        navigator.clipboard.writeText(content).then(() => {
            setCopiedSection(sectionKey);
            toast.success('Đã copy vào clipboard');
            setTimeout(() => setCopiedSection(null), 2000);
        }).catch(() => {
            toast.error('Không thể copy');
        });
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

    const handleShareLink = () => {
        const url = `${window.location.origin}/shared/training`;
        navigator.clipboard.writeText(url)
            .then(() => toast.success('Đã copy link chia sẻ công khai!'))
            .catch(() => toast.error('Không thể copy link'));
    };

    // Render table for a section
    const renderTable = (title: string, sectionKey: string, entries: ProcessedEntry[], bgClass: string, borderClass: string) => (
        <div id={`table-${sectionKey}`} className={`rounded-xl border-2 ${borderClass} overflow-hidden shadow-lg flex flex-col bg-white`}>
            {/* Header */}
            <div className={`${bgClass} px-3 py-2 flex justify-between items-center flex-none`}>
                <h3 className="font-bold text-white text-base">{title}</h3>
                <div className="flex gap-2">
                    <button
                        onClick={() => handleCapture(sectionKey, `table-${sectionKey}`)}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/20 text-white hover:bg-white/30 text-xs font-medium transition-all"
                        title="Chụp ảnh bảng này"
                    >
                        <Camera className="w-3.5 h-3.5" /> Ảnh
                    </button>
                    <button
                        onClick={() => handleCopy(sectionKey, entries)}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-all ${copiedSection === sectionKey
                            ? 'bg-green-600 text-white'
                            : 'bg-white/20 text-white hover:bg-white/30'
                            }`}
                    >
                        {copiedSection === sectionKey ? (
                            <><Check className="w-3.5 h-3.5" /> Đã copy</>
                        ) : (
                            <><Copy className="w-3.5 h-3.5" /> Text</>
                        )}
                    </button>
                </div>
            </div>

            {/* Table */}
            {entries.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                                <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b bg-gray-50">Tên lớp</th>
                                <th className="px-2 py-2 text-left font-semibold text-gray-700 border-b w-16 bg-gray-50">Thứ</th>
                                <th className="px-2 py-2 text-left font-semibold text-gray-700 border-b w-20 bg-gray-50">Link Meet</th>
                                <th className="px-2 py-2 text-center font-semibold text-gray-700 border-b w-16 bg-gray-50">Buổi</th>
                                <th className="px-2 py-2 text-center font-semibold text-gray-700 border-b w-20 bg-gray-50">Giờ BĐ</th>
                                <th className="px-2 py-2 text-center font-semibold text-gray-700 border-b w-20 bg-gray-50">Giờ KT</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map((entry, idx) => (
                                <tr key={idx} className="hover:bg-gray-50 border-b border-gray-100">
                                    <td className="px-3 py-2 text-gray-800 font-medium whitespace-normal break-words max-w-[200px]">{entry.name}</td>
                                    <td className="px-2 py-2 text-gray-600">{entry.day}</td>
                                    <td className="px-2 py-2">
                                        <a
                                            href={entry.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
                                        >
                                            <ExternalLink className="w-3 h-3" />
                                            Link
                                        </a>
                                    </td>
                                    <td className="px-2 py-2 text-center">
                                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${entry.shift === 'Cả ngày'
                                            ? 'bg-purple-100 text-purple-700'
                                            : entry.shift === 'Sáng'
                                                ? 'bg-amber-100 text-amber-700'
                                                : entry.shift === 'Chiều'
                                                    ? 'bg-blue-100 text-blue-700'
                                                    : 'bg-indigo-100 text-indigo-700'
                                            }`}>
                                            {entry.shift}
                                        </span>
                                    </td>
                                    <td className="px-2 py-2 text-center text-gray-600 font-mono text-[10px]">{entry.startTime}</td>
                                    <td className="px-2 py-2 text-center text-gray-600 font-mono text-[10px]">{entry.endTime}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="px-4 py-8 text-center text-gray-500">
                    <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Không có lớp học trong ngày này</p>
                </div>
            )}
        </div>
    );

    const dayName = getDayName(selectedDate);
    const formattedDate = format(new Date(selectedDate), 'dd/MM/yyyy', { locale: vi });

    return (
        <div className="h-full flex flex-col">
            {/* Compact Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl shadow-md p-3 text-white flex flex-col md:flex-row justify-between items-center mb-4 flex-none">
                <div>
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        Xem lịch Ngày
                    </h2>
                    <p className="text-emerald-100 text-xs mt-0.5">Lịch đào tạo theo ngày - Có thể copy để chia sẻ</p>
                </div>

                <div className="flex items-center gap-2 mt-2 md:mt-0 flex-wrap">
                    <button 
                        onClick={handleShareLink}
                        className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-sm font-medium border border-white/20 flex items-center gap-1.5 transition-colors"
                        title="Copy link chia sẻ cho Khách Hàng"
                    >
                        <Share2 className="w-4 h-4" /> Share Link
                    </button>
                    <input
                        type="date"
                        className="bg-white/10 border border-white/20 text-white placeholder-white/60 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-white/50 cursor-pointer"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                    />
                    <div className="bg-white/20 px-3 py-1.5 rounded-lg text-sm font-medium border border-white/20 min-w-[100px] text-center">
                        {getDayName(selectedDate)}
                    </div>
                </div>
            </div>

            {/* Grid Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-10">
                {renderTable('1. AMIS Kế toán - Lĩnh vực', 'amis-linhvuc', gridData.linhVucAmis, 'bg-blue-600', 'border-blue-100')}
                {renderTable('2. AMIS Kế toán - Nghiệp vụ', 'amis-nghiepvu', gridData.nghiepVuAmis, 'bg-indigo-600', 'border-indigo-100')}
                {renderTable('3. MISA SME - Lĩnh vực', 'sme-linhvuc', gridData.linhVucSme, 'bg-cyan-600', 'border-cyan-100')}
                {renderTable('4. MISA SME - Nghiệp vụ', 'sme-nghiepvu', gridData.nghiepVuSme, 'bg-teal-600', 'border-teal-100')}
            </div>
        </div>
    );
};

export default DailyViewTab;
