import React, { useMemo, useCallback } from 'react';
import { format, isSameDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Employee, Holiday, Job, ScheduleItem, LeaveRequest, JobGroup } from '../../types';
import ScheduleRow from './ScheduleRow';

interface Props {
    activeEmployees: Employee[];
    weekDays: Date[];
    shifts: string[];
    holidays: Holiday[];
    jobs: Job[];
    isWeekEditable: boolean;
    selectedCell: { empId: string, day: Date, shift: string } | null;
    scheduleMap: Map<string, ScheduleItem[]>;
    leaveMap: Map<string, LeaveRequest>;
    onCellClick: (day: Date, shift: string, empId: string) => void;
    onCellSelect: (day: Date, shift: string, empId: string) => void;
    getJobStyle: (group: JobGroup | null | undefined) => string;
}

const ScheduleMatrix: React.FC<Props> = ({
    activeEmployees, weekDays, shifts, holidays, jobs,
    isWeekEditable, selectedCell, scheduleMap, leaveMap,
    onCellClick, onCellSelect, getJobStyle
}) => {
    // Current day for highlighting
    const today = new Date();

    // Optimized accessor: O(1)
    // Wrap with useCallback so it doesn't change on every render if dependencies haven't changed
    const getCellData = useCallback((dateKey: string, shift: string, employeeId: string) => {
        return scheduleMap.get(`${dateKey}_${shift}_${employeeId}`) || [];
    }, [scheduleMap]);

    const getLeaveData = useCallback((dateKey: string, shift: string, employeeId: string) => {
        return leaveMap.get(`${dateKey}_${shift}_${employeeId}`);
    }, [leaveMap]);

    return (
        <div className="flex-1 overflow-auto">
            <table className="w-full border-collapse min-w-max">
                <thead className="bg-gray-100 sticky top-0 z-20 shadow-sm">
                    <tr>
                        <th rowSpan={2} className="p-2 border border-gray-300 min-w-[150px] text-left bg-white z-30 sticky left-0 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                            Nhân viên
                        </th>
                        {weekDays.map(day => {
                            const isSunday = day.getDay() === 0;
                            const isHolidayDay = holidays.some(h => isSameDay(new Date(h.date), day));
                            const isToday = isSameDay(day, today);

                            return (
                                <th key={day.toISOString()} colSpan={3} className={`p-1 border border-gray-300 text-center 
                                    ${isToday ? 'bg-green-200 text-green-900 border-green-400 shadow-inner' : (isSunday || isHolidayDay ? 'bg-red-100 text-red-700' : '')}
                                `}>
                                    <div className="font-bold text-sm uppercase">{format(day, 'EEEE', { locale: vi })}</div>
                                    <div className="text-[10px] font-normal">{format(day, 'dd/MM')} {isToday && '(Hôm nay)'}</div>
                                </th>
                            );
                        })}
                    </tr>
                    <tr>
                        {weekDays.map(day => {
                            const isToday = isSameDay(day, today);
                            return shifts.map((shift, idx) => (
                                <th key={`${day.toISOString()}-${shift}`} className={`p-1 border border-gray-300 text-[10px] uppercase w-[90px] 
                                    ${isToday ? 'bg-green-100 text-green-800 font-bold border-green-300' : 'bg-gray-50'}
                                `}>{shift}</th>
                            ));
                        })}
                    </tr>
                </thead>
                <tbody>
                    {activeEmployees.map(emp => (
                        <ScheduleRow
                            key={emp.id}
                            emp={emp}
                            weekDays={weekDays}
                            shifts={shifts}
                            today={today}
                            jobs={jobs}
                            isWeekEditable={isWeekEditable}
                            selectedCell={selectedCell}
                            onCellClick={onCellClick}
                            onCellSelect={onCellSelect}
                            getJobStyle={getJobStyle}
                            getCellData={getCellData}
                            getLeaveData={getLeaveData}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ScheduleMatrix;
