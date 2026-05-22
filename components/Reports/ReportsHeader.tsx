
import React, { useState } from 'react';
import { Download, Filter, FileSpreadsheet, TrendingUp, Calendar } from 'lucide-react';
import { Role } from '../../types';
import { TimeRangeOption, MainTabOption } from './useReports';

interface Props {
    hideHeader?: boolean;
    hideExportButtons?: boolean;

    // Current tab for conditional rendering
    mainTab: MainTabOption;

    // Filters
    timeRangeType: TimeRangeOption;
    handleTimeRangeChange: (type: TimeRangeOption) => void;
    fromDate: string;
    setFromDate: (date: string) => void;
    toDate: string;
    setToDate: (date: string) => void;

    // Employee Filter
    showEmpDropdown: boolean;
    setShowEmpDropdown: (show: boolean) => void;
    selectedEmployeeIds: string[];
    toggleEmployee: (id: string) => void;
    toggleAllEmployees: (select: boolean) => void;
    employees: any[];
    currentUserRole?: Role;
    fixedEmployeeId?: string;

    // Job Group Filter
    showGroupDropdown: boolean;
    setShowGroupDropdown: (show: boolean) => void;
    selectedstrings: string[];
    togglestring: (group: string) => void;
    toggleAllstrings: (select: boolean) => void;

    // Actions
    handleExportExcel: () => void;
    handleExportWeeklySchedule: () => void;
    handleFetchData: () => void;
    isLoading?: boolean;
    fetchEnabled?: boolean;
}

export const ReportsHeader: React.FC<Props> = (props) => {
    // Determine which filters to show based on mainTab
    const showstringFilter = props.mainTab === 'kpi'; // Only for KPI tab
    const showExportGrid = props.mainTab === 'kpi'; // Only for KPI tab

    // Time range button helper
    const TimeButton = ({ type, label, isCurrent }: { type: TimeRangeOption; label: string; isCurrent?: boolean }) => (
        <button
            onClick={() => props.handleTimeRangeChange(type)}
            className={`px-3 py-1.5 text-xs rounded-md transition-all duration-200 ${props.timeRangeType === type
                ? 'bg-blue-600 text-white font-semibold shadow-sm'
                : isCurrent
                    ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
        >
            {label}
        </button>
    );

    return (
        <div className="bg-white rounded-xl shadow-sm border mb-4 overflow-hidden">
            {/* Row 1: Title + Export Buttons */}
            {!props.hideHeader && (
                <div className="flex items-center justify-between px-5 py-3 border-b bg-gradient-to-r from-slate-50 to-white">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-600" />
                        Báo cáo & KPI
                    </h2>

                    {/* Export Buttons */}
                    {!props.hideExportButtons && (
                        <div className="flex gap-2">
                            {showExportGrid && (
                                <button
                                    onClick={props.handleExportWeeklySchedule}
                                    className="flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 text-xs font-medium shadow-sm transition-colors"
                                >
                                    <FileSpreadsheet className="w-3.5 h-3.5" /> Xuất Lịch Grid
                                </button>
                            )}
                            <button
                                onClick={props.handleExportExcel}
                                className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 text-xs font-medium shadow-sm transition-colors"
                            >
                                <Download className="w-3.5 h-3.5" /> Xuất Data
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Row 2: All Filters in single row */}
            <div className="flex flex-wrap items-center gap-4 px-5 py-3">
                {/* Time Presets */}
                <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg">
                    <TimeButton type="prev_week" label="Tuần trước" />
                    <TimeButton type="week" label="Tuần này" isCurrent />
                    <div className="w-px h-5 bg-gray-300 mx-1"></div>
                    <TimeButton type="prev_month" label="Tháng trước" />
                    <TimeButton type="month" label="Tháng này" isCurrent />
                </div>

                {/* Date Range Picker */}
                <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <input
                        type="date"
                        className="input-date-sm"
                        value={props.fromDate}
                        onChange={e => props.setFromDate(e.target.value)}
                    />
                    <span className="text-gray-400 text-sm">→</span>
                    <input
                        type="date"
                        className="input-date-sm"
                        value={props.toDate}
                        onChange={e => props.setToDate(e.target.value)}
                    />

                    {/* FETCH BUTTON */}
                    <button
                        onClick={props.handleFetchData}
                        disabled={props.isLoading}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold shadow-sm transition-all
                            ${props.isLoading
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : props.fetchEnabled
                                    ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                                    : 'bg-orange-500 text-white hover:bg-orange-600 animate-pulse-slow'
                            }`}
                    >
                        {props.isLoading ? (
                            <>
                                <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                Đang tải...
                            </>
                        ) : (
                            <>
                                <TrendingUp className="w-4 h-4" />
                                {props.fetchEnabled ? 'Cập nhật dữ liệu' : 'Lấy dữ liệu'}
                            </>
                        )}
                    </button>
                </div>

                {/* Spacer */}
                <div className="flex-1"></div>

                {/* Employee Filter */}
                {!props.fixedEmployeeId && (
                    <div className="relative">
                        <button
                            onClick={() => { if (props.currentUserRole !== Role.Staff) props.setShowEmpDropdown(!props.showEmpDropdown) }}
                            disabled={props.currentUserRole === Role.Staff}
                            className={`flex items-center gap-2 border rounded-lg px-3 py-1.5 text-sm bg-white transition-colors ${props.currentUserRole === Role.Staff
                                ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                                : 'hover:border-blue-400 hover:bg-blue-50'
                                }`}
                        >
                            <Filter className="w-3.5 h-3.5 text-gray-400" />
                            <span className="font-medium text-gray-700">
                                {props.selectedEmployeeIds.length === props.employees.length
                                    ? 'Tất cả NV'
                                    : `${props.selectedEmployeeIds.length} NV`}
                            </span>
                        </button>

                        {props.showEmpDropdown && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => props.setShowEmpDropdown(false)}></div>
                                <div className="absolute top-full right-0 mt-1 w-64 max-h-80 bg-white border rounded-lg shadow-xl z-50 flex flex-col p-2">
                                    <div className="text-xs font-bold text-gray-500 uppercase px-2 mb-2">Nhân viên</div>
                                    <div className="flex gap-2 mb-2 border-b pb-2">
                                        <button onClick={() => props.toggleAllEmployees(true)} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded hover:bg-blue-100 flex-1">Chọn tất cả</button>
                                        <button onClick={() => props.toggleAllEmployees(false)} className="text-xs bg-gray-50 text-gray-700 px-2 py-1 rounded hover:bg-gray-100 flex-1">Bỏ chọn</button>
                                    </div>
                                    <div className="overflow-y-auto flex-1 space-y-1">
                                        {props.employees.map(e => (
                                            <label key={e.id} className="flex items-center px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={props.selectedEmployeeIds.includes(e.id)}
                                                    onChange={() => props.toggleEmployee(e.id)}
                                                    className="rounded text-blue-600 focus:ring-blue-500 mr-2 h-4 w-4"
                                                />
                                                <div className="text-sm text-gray-700 truncate">{e.fullName}</div>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Job Group Filter - Only for KPI tab */}
                {showstringFilter && (
                    <div className="relative">
                        <button
                            onClick={() => props.setShowGroupDropdown(!props.showGroupDropdown)}
                            className="flex items-center gap-2 border rounded-lg px-3 py-1.5 text-sm bg-white hover:border-blue-400 hover:bg-blue-50 transition-colors"
                        >
                            <Filter className="w-3.5 h-3.5 text-gray-400" />
                            <span className="font-medium text-gray-700">
                                {props.selectedstrings.length === 0
                                    ? 'Tất cả nhóm'
                                    : `${props.selectedstrings.length} nhóm`}
                            </span>
                        </button>

                        {props.showGroupDropdown && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => props.setShowGroupDropdown(false)}></div>
                                <div className="absolute top-full right-0 mt-1 w-64 bg-white border rounded-lg shadow-xl z-50 flex flex-col p-2">
                                    <div className="text-xs font-bold text-gray-500 uppercase px-2 mb-2">Nhóm công việc</div>
                                    <div className="flex gap-2 mb-2 border-b pb-2">
                                        <button onClick={() => props.toggleAllstrings(true)} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded hover:bg-blue-100 flex-1">Chọn tất cả</button>
                                        <button onClick={() => props.toggleAllstrings(false)} className="text-xs bg-gray-50 text-gray-700 px-2 py-1 rounded hover:bg-gray-100 flex-1">Bỏ chọn</button>
                                    </div>
                                    <div className="space-y-1">
                                        {(props.selectedstrings || []).map(g => (
                                            <label key={g} className="flex items-center px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={props.selectedstrings.includes(g)}
                                                    onChange={() => props.togglestring(g)}
                                                    className="rounded text-blue-600 focus:ring-blue-500 mr-2 h-4 w-4"
                                                />
                                                <div className="text-sm text-gray-700">{g}</div>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
