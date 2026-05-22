import React, { memo } from 'react';
import { format, isSameDay } from 'date-fns';
import { Employee, Job, ScheduleItem, LeaveRequest } from '../../types';
import ScheduleCell from './ScheduleCell';

interface ScheduleRowProps {
    emp: Employee;
    weekDays: Date[];
    shifts: string[];
    today: Date;
    jobs: Job[];
    isWeekEditable: boolean;
    selectedCell: { empId: string, day: Date, shift: string } | null;
    onCellClick: (day: Date, shift: string, empId: string) => void;
    onCellSelect: (day: Date, shift: string, empId: string) => void;
    getJobStyle: (group: string | null | undefined) => string;
    // Optimized accessors passed down
    getCellData: (dateKey: string, shift: string, employeeId: string) => ScheduleItem[];
    getLeaveData: (dateKey: string, shift: string, employeeId: string) => LeaveRequest | undefined;
}

const ScheduleRow: React.FC<ScheduleRowProps> = ({
    emp, weekDays, shifts, today, jobs,
    isWeekEditable, selectedCell, onCellClick, onCellSelect, getJobStyle,
    getCellData, getLeaveData
}) => {
    return (
        <tr className="bg-white hover:bg-slate-50 transition-colors">
            <td className="p-1 border-r border-b border-gray-300 align-middle bg-white sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                <div className="font-bold text-slate-800 text-sm leading-tight">{emp.fullName}</div>
                <div className="flex items-center gap-2 text-[10px] mt-1 text-gray-500">
                    <span title="Điểm được giao Tuần" className={`${emp.weeklyScore > 0 ? 'text-blue-600 font-bold' : ''}`}>T: {emp.weeklyScore}</span>
                    <span>|</span>
                    <span title="Điểm được giao Tháng" className={`${emp.monthlyScore > 0 ? 'text-green-600 font-bold' : ''}`}>Th: {emp.monthlyScore}</span>
                </div>
            </td>
            {weekDays.map(day => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const isToday = isSameDay(day, today);

                return shifts.map((shift) => {
                    const items = getCellData(dateKey, shift, emp.id);
                    const leaveRequest = getLeaveData(dateKey, shift, emp.id);

                    const isSelected = selectedCell &&
                        selectedCell.empId === emp.id &&
                        isSameDay(selectedCell.day, day) &&
                        selectedCell.shift === shift;

                    return (
                        <ScheduleCell
                            key={`${day.toISOString()}-${shift}`}
                            day={day}
                            shift={shift}
                            empId={emp.id}
                            items={items}
                            leaveRequest={leaveRequest}
                            isToday={isToday}
                            isWeekEditable={isWeekEditable}
                            isSelected={isSelected}
                            onCellClick={onCellClick}
                            onCellSelect={onCellSelect}
                            getJobStyle={getJobStyle}
                            jobs={jobs}
                        />
                    );
                });
            })}
        </tr>
    );
};

export default memo(ScheduleRow);
