import React, { useState } from 'react';
import { Employee, Job, ScheduleItem, SchedulePattern, DailyAllocation, WorkPeriod, Holiday, LeaveRequest, Role } from '../types';
import FixedSchedule from './FixedSchedule';
import DailyAllocationView from './DailyAllocation';
import { CalendarRange, ListTodo } from 'lucide-react';

import { useData } from '../context/DataContext';

interface Props {
    currentUserRole: Role;
    user: any;
}

const CoordinationManager: React.FC<Props> = ({ currentUserRole, user }) => {
    const [activeTab, setActiveTab] = useState<'schedule' | 'daily'>('schedule');

    // v3.16.0+: All data from DataContext (real-time via onSnapshot)
    const {
        employees, setEmployees,
        jobs,
        schedule, setSchedule,
        leaves, setLeaves,
        dailyAllocations: allocations,
        patterns, setPatterns,
        workPeriods,
        holidays
    } = useData();

    return (
        <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
            {/* Slim Header Tab Bar */}
            <div className="bg-white border-b px-4 py-1 flex items-center shadow-sm z-10">
                <div className="flex space-x-1">
                    <button
                        onClick={() => setActiveTab('schedule')}
                        className={`flex items-center px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'schedule'
                            ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        <CalendarRange className="w-4 h-4 mr-2" />
                        Lịch Cố định & Điều phối
                    </button>
                    <button
                        onClick={() => setActiveTab('daily')}
                        className={`flex items-center px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'daily'
                            ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        <ListTodo className="w-4 h-4 mr-2" />
                        Phân công Hàng ngày
                    </button>
                </div>

                <div className="flex-1"></div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden p-2">
                {activeTab === 'schedule' && (
                    <FixedSchedule
                        employees={employees}
                        setEmployees={setEmployees}
                        jobs={jobs}
                        schedule={schedule}
                        setSchedule={setSchedule}
                        patterns={patterns}
                        setPatterns={setPatterns}
                        workPeriods={workPeriods}
                        holidays={holidays}
                        leaves={leaves}
                        setLeaves={setLeaves}
                        currentUserRole={currentUserRole}
                        user={user}
                    />
                )}

                {activeTab === 'daily' && (
                    <DailyAllocationView
                        employees={employees}
                        jobs={jobs}
                        schedule={schedule}
                        allocations={allocations}
                        leaves={leaves}
                        currentUserRole={currentUserRole}
                    />
                )}
            </div>
        </div>
    );
};

export default CoordinationManager;
