import React, { useState } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ChevronDown, ChevronUp, Calendar, Loader2 } from 'lucide-react';
import { useLeaveBalanceHistory } from '../../hooks/useLeaveBalanceHistory';
import { Job } from '../../types';

interface Props {
    employeeId: string;
    jobs: Job[];
}

const LeaveBalanceHistory: React.FC<Props> = ({ employeeId, jobs }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const { data: historyItems, isLoading, error } = useLeaveBalanceHistory(employeeId);

    const getDayLabel = (item: any) => {
        if (item.isHoliday) return 'Lễ';
        return item.dayOfWeek === 0 ? 'CN' : 'T7';
    };

    const getJobName = (jobId: string) => {
        const job = jobs.find(j => j.id === jobId);
        return job?.name || jobId;
    };

    if (isLoading) {
        return (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mt-3">
                <div className="flex items-center gap-2 text-purple-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Đang tải lịch sử...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3">
                <span className="text-sm text-red-600">Không thể tải lịch sử nghỉ bù</span>
            </div>
        );
    }

    const items = historyItems || [];
    const balance = items.length;

    return (
        <div className="bg-purple-50 border border-purple-200 rounded-lg mt-3 overflow-hidden">
            {/* Header - Always visible */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-3 hover:bg-purple-100 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-bold text-purple-800">Lịch sử nghỉ bù</span>
                    <span className="bg-purple-200 text-purple-700 text-xs font-bold px-2 py-0.5 rounded-full">
                        {balance} ngày
                    </span>
                </div>
                {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-purple-600" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-purple-600" />
                )}
            </button>

            {/* Expandable content */}
            {isExpanded && (
                <div className="border-t border-purple-200 max-h-64 overflow-y-auto">
                    {items.length === 0 ? (
                        <div className="p-3 text-center text-sm text-purple-500 italic">
                            Chưa có ca T7/CN/Lễ nào được hoàn thành
                        </div>
                    ) : (
                        <table className="w-full text-xs">
                            <thead className="bg-purple-100 sticky top-0">
                                <tr>
                                    <th className="text-left p-2 font-bold text-purple-700">Ngày</th>
                                    <th className="text-left p-2 font-bold text-purple-700">Buổi</th>
                                    <th className="text-left p-2 font-bold text-purple-700">Công việc</th>
                                    <th className="text-center p-2 font-bold text-green-700">+</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, idx) => (
                                    <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-purple-50/50'}>
                                        <td className="p-2">
                                            <div className="flex items-center gap-1">
                                                <span className={`text-[10px] font-bold px-1 rounded ${item.isHoliday ? 'bg-orange-100 text-orange-600' :
                                                        item.dayOfWeek === 0 ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                                                    }`}>
                                                    {getDayLabel(item)}
                                                </span>
                                                <span>{format(new Date(item.date), 'dd/MM/yy', { locale: vi })}</span>
                                            </div>
                                        </td>
                                        <td className="p-2">{item.shift}</td>
                                        <td className="p-2 truncate max-w-[120px]" title={getJobName(item.jobId)}>
                                            {getJobName(item.jobId)}
                                        </td>
                                        <td className="p-2 text-center">
                                            <span className="bg-green-100 text-green-700 font-bold px-1.5 py-0.5 rounded">+1</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
};

export default LeaveBalanceHistory;
