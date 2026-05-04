import React, { useState } from 'react';
import { Job, SubJob } from '../types';
import DailyViewTab from './DailyViewTab';
import WeeklyScheduleView from './WeeklyScheduleView';
import { CalendarSearch, CalendarRange } from 'lucide-react';

import { useData } from '../context/DataContext';

interface Props {
    // No props
}

const ScheduleViewer: React.FC<Props> = () => {
    const [activeTab, setActiveTab] = useState<'daily' | 'weekly'>('weekly');
    // We don't even need to destructure jobs/subJobs if only passing them.
    // Children now grab them from Context directly.

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Header / Tab Navigation */}
            <div className="bg-white border-b px-6 py-2 flex items-center space-x-6 sticky top-0 z-10 shadow-sm">
                <div className="flex items-center text-slate-700 font-bold text-lg mr-4 px-2 py-2">
                    <CalendarRange className="w-6 h-6 mr-2" />
                    Xem Lịch
                </div>

                <button
                    onClick={() => setActiveTab('weekly')}
                    className={`flex items-center px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'weekly'
                        ? 'border-indigo-600 text-indigo-700'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <CalendarRange className="w-4 h-4 mr-2" /> Lịch Tuần
                </button>

                <button
                    onClick={() => setActiveTab('daily')}
                    className={`flex items-center px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'daily'
                        ? 'border-indigo-600 text-indigo-700'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <CalendarSearch className="w-4 h-4 mr-2" /> Lịch Ngày
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4">
                {activeTab === 'weekly' && (
                    <WeeklyScheduleView />
                )}

                {activeTab === 'daily' && (
                    <DailyViewTab />
                )}
            </div>
        </div>
    );
};

export default ScheduleViewer;
