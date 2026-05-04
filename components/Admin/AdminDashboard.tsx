import React, { useState } from 'react';
import { Role } from '../../types';
import AuditLogViewer from './AuditLogViewer';

import EmployeeManager from '../Employees';
import Config from '../Config';
import WorkCalendarConfig from '../WorkCalendarConfig';
import JobManager from '../JobManager';
import { LayoutDashboard, ShieldAlert, BarChart2, Users, Settings, CalendarDays, Briefcase } from 'lucide-react';

interface Props {
    currentUserRole: Role;
}

// Internal Imports
import CleanupManager from './CleanupManager';
import DataIntegrityChecker from './DataIntegrityChecker';
import ScheduleExportTool from './ScheduleExportTool';

const AdminDashboard: React.FC<Props> = ({ currentUserRole }) => {
    const [activeTab, setActiveTab] = useState<'audit' | 'users' | 'config' | 'work-calendar' | 'jobs' | 'tools'>('audit');

    // Security Check: Only Admin
    if (currentUserRole !== Role.Admin && currentUserRole !== Role.Coordinator) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <ShieldAlert className="w-16 h-16 mb-4 text-red-500" />
                <h2 className="text-xl font-bold">Truy cập bị từ chối</h2>
                <p>Bạn không có quyền truy cập vào trang quản trị.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Admin Header / Tab Navigation */}
            <div className="bg-white border-b px-4 py-1 flex items-center space-x-2 sticky top-0 z-10 shadow-sm">
                <div className="flex items-center text-indigo-800 font-bold text-base mr-2 px-2 py-2">
                    <LayoutDashboard className="w-5 h-5 mr-2" />
                    Quản trị
                </div>

                <div className="flex overflow-x-auto space-x-1">
                    <button
                        onClick={() => setActiveTab('audit')}
                        className={`flex items-center px-3 py-2 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'audit'
                            ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        <ShieldAlert className="w-3.5 h-3.5 mr-1.5" /> Audit Logs
                    </button>

                    <button
                        onClick={() => setActiveTab('users')}
                        className={`flex items-center px-3 py-2 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'users'
                            ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        <Users className="w-3.5 h-3.5 mr-1.5" /> Nhân sự (Master)
                    </button>

                    <button
                        onClick={() => setActiveTab('jobs')}
                        className={`flex items-center px-3 py-2 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'jobs'
                            ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        <Briefcase className="w-3.5 h-3.5 mr-1.5" /> Quản lý Công việc
                    </button>

                    <button
                        onClick={() => setActiveTab('config')}
                        className={`flex items-center px-3 py-2 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'config'
                            ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        <Settings className="w-3.5 h-3.5 mr-1.5" /> Cấu hình
                    </button>

                    <button
                        onClick={() => setActiveTab('work-calendar')}
                        className={`flex items-center px-3 py-2 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'work-calendar'
                            ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        <CalendarDays className="w-3.5 h-3.5 mr-1.5" /> Lịch làm việc
                    </button>

                    <button
                        onClick={() => setActiveTab('tools')}
                        className={`flex items-center px-3 py-2 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'tools'
                            ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        <ShieldAlert className="w-3.5 h-3.5 mr-1.5" /> Công cụ
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden p-4">
                {activeTab === 'audit' && (
                    <AuditLogViewer />
                )}

                {activeTab === 'users' && (
                    <EmployeeManager
                        currentUserRole={currentUserRole}
                    />
                )}

                {activeTab === 'jobs' && (
                    <JobManager />
                )}

                {activeTab === 'config' && (
                    <Config />
                )}

                {activeTab === 'work-calendar' && (
                    <WorkCalendarConfig />
                )}

                {activeTab === 'tools' && (
                    <div className="space-y-6 overflow-auto h-full">
                        <ScheduleExportTool />
                        <DataIntegrityChecker />
                        <CleanupManager currentUserRole={currentUserRole} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
