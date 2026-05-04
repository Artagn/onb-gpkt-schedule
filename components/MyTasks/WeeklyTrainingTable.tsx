
import React from 'react';
import { ChevronLeft, ChevronRight, CalendarRange, ChevronDown, ChevronUp } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, subWeeks, addWeeks } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ScheduleItem, Job, JobGroup } from '../../types';

interface Props {
    weeklyViewDate: Date;
    setWeeklyViewDate: (date: Date) => void;
    showWeeklyTable: boolean;
    setShowWeeklyTable: (show: boolean) => void;
    schedule: ScheduleItem[];
    currentEmployeeId: string;
    jobs: Job[];
    setViewingDetailItem: (item: ScheduleItem | null) => void;
}

const WeeklyTrainingTable: React.FC<Props> = ({
    weeklyViewDate, setWeeklyViewDate,
    showWeeklyTable, setShowWeeklyTable,
    schedule, currentEmployeeId, jobs, setViewingDetailItem
}) => {
    const weekStart = startOfWeek(weeklyViewDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(weeklyViewDate, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
    const shifts = ['Sáng', 'Chiều', 'Tối'];

    const getJob = (id: string) => jobs.find(j => j.id === id);

    return (
        <div className="bg-white rounded-lg shadow-sm mb-4 border overflow-hidden flex-none">
            <div className="p-3 bg-indigo-50 border-b flex justify-between items-center">
                <h3 className="font-bold text-indigo-900 flex items-center cursor-pointer select-none" onClick={() => setShowWeeklyTable(!showWeeklyTable)}>
                    <CalendarRange className="w-4 h-4 mr-2" /> Lịch tuần chi tiết
                    {showWeeklyTable ? <ChevronUp className="w-4 h-4 ml-2 text-indigo-400" /> : <ChevronDown className="w-4 h-4 ml-2 text-indigo-400" />}
                </h3>
                <div className="flex items-center gap-2">
                    <button onClick={() => setWeeklyViewDate(subWeeks(weeklyViewDate, 1))} className="p-1 hover:bg-white rounded shadow-sm">
                        <ChevronLeft className="w-4 h-4 text-indigo-600" />
                    </button>
                    <span className="text-sm font-bold text-indigo-700 bg-white px-3 py-1 rounded border capitalize shadow-sm min-w-[150px] text-center">
                        {format(weekStart, 'dd/MM', { locale: vi })} - {format(weekEnd, 'dd/MM', { locale: vi })}
                    </span>
                    <button onClick={() => setWeeklyViewDate(addWeeks(weeklyViewDate, 1))} className="p-1 hover:bg-white rounded shadow-sm">
                        <ChevronRight className="w-4 h-4 text-indigo-600" />
                    </button>
                </div>
            </div>
            {showWeeklyTable && (
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-xs">
                        <thead>
                            <tr className="bg-gray-100 text-gray-700">
                                <th className="border p-2 min-w-[80px] text-center font-bold bg-gray-200">NỘI DUNG</th>
                                {weekDays.map(d => (
                                    <th key={d.toISOString()} className={`border p-2 min-w-[100px] capitalize text-center ${isSameDay(d, new Date()) ? 'bg-green-200 text-green-900 border-green-400' : ''}`}>
                                        <div className="font-bold">{format(d, 'EEEE', { locale: vi })}</div>
                                        <div className="text-gray-500 font-normal">{format(d, 'dd/MM')}</div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {shifts.map(shift => {
                                return (
                                    <tr key={shift} className="hover:bg-gray-50">
                                        <td className="border p-2 font-bold text-center bg-gray-50 text-indigo-700 align-middle">{shift}</td>
                                        {weekDays.map(day => {
                                            const dayItems = schedule.filter(s => {
                                                if (!isSameDay(new Date(s.date), day)) return false;
                                                if (s.shift !== shift) return false;
                                                if (currentEmployeeId !== 'all' && !s.employeeIds.includes(currentEmployeeId)) return false;
                                                if (s.jobId === 'JOB_NGHI_BU') return false;

                                                // Check Job Group: Training OR Livechat
                                                const job = jobs.find(j => j.id === s.jobId);
                                                return job?.group === JobGroup.Training || job?.group === JobGroup.Livechat;
                                            });

                                            return (
                                                <td key={day.toISOString()} className={`border p-1 align-top h-12 relative transition-colors ${isSameDay(day, new Date()) ? 'bg-green-100/30' : ''}`}>
                                                    {dayItems.length === 0 ? (
                                                        <div className="h-full w-full"></div>
                                                    ) : (
                                                        <div className="space-y-1">
                                                            {dayItems.map(item => {
                                                                const job = getJob(item.jobId);
                                                                return (
                                                                    <div
                                                                        key={item.id}
                                                                        onClick={() => setViewingDetailItem(item)}
                                                                        className={`cursor-pointer p-1.5 rounded border shadow-sm text-[10px] leading-tight group hover:scale-[1.02] transition-transform
                                                                        ${item.status === 'Completed' ? 'bg-green-50 border-green-200 text-green-800' :
                                                                                item.status === 'Cancelled' ? 'bg-red-50 border-red-200 text-red-800' :
                                                                                    'bg-white border-indigo-200 text-indigo-800 shadow-sm'}
                                                                    `}
                                                                    >
                                                                        <div className="font-bold line-clamp-2 mb-0.5" title={job?.name}>{job?.name}</div>
                                                                        <div className="flex justify-between items-center text-[9px] text-gray-500">
                                                                            <span>{job?.standardPoint}đ</span>
                                                                            {item.status && item.status !== 'Pending' && (
                                                                                <span className={`capitalize ${item.status === 'Completed' ? 'text-green-600' : 'text-red-600'}`}>{item.status === 'Completed' ? 'HT' : 'Hủy'}</span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default WeeklyTrainingTable;
