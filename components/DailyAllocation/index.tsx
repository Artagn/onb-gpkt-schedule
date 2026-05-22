/**
 * DailyAllocation - Main component (Modularized)
 * Refactored from 596-line monolithic file to modular architecture
 */

import React from 'react';
import { Employee, Job, DailyAllocation as DailyAllocationType, ScheduleItem, LeaveRequest, Role } from '../../types';
import { format, isSameDay } from 'date-fns';
import { Filter, ChevronDown, ChevronUp, Save, AlertCircle, Calendar } from 'lucide-react';
import { useDailyAllocation, DatePreset } from './useDailyAllocation';

interface Props {
    employees: Employee[];
    jobs: Job[];
    schedule: ScheduleItem[];
    allocations: DailyAllocationType[];
    leaves?: LeaveRequest[];
    currentUserRole: Role;
}

const DailyAllocationView: React.FC<Props> = ({
    employees,
    jobs,
    schedule,
    allocations,
    leaves = [],
    currentUserRole
}) => {
    const {
        fromDate,
        setFromDate,
        toDate,
        setToDate,
        datePreset,
        handlePresetChange,
        isSingleDay,
        shift,
        setShift,
        showFilter,
        setShowFilter,
        visibleJobIds,
        setVisibleJobIds,
        allDailyJobs,
        displayedJobs,
        availableEmployees,
        canEdit,
        isDirty,
        handleAllocationChange,
        handleSave,
        getAllocationData,
        calculatePending,
        getEmployeeRowClass,
    } = useDailyAllocation({ employees, jobs, schedule, allocations, leaves, currentUserRole });

    return (
        <div className="bg-white rounded-lg shadow h-full flex flex-col">
            {/* Header / Filter Bar */}
            <div className="p-4 border-b bg-gray-50 space-y-4">
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center">
                        <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                        Phân công hàng ngày
                    </h2>

                    <div className="flex flex-wrap gap-4 items-center w-full xl:w-auto">
                        {/* Date Preset Filter */}
                        <div className="flex items-center bg-white border rounded px-2 py-1 shadow-sm h-[34px]">
                            <span className="text-xs font-bold text-gray-500 mr-2 uppercase">Thời gian:</span>
                            <select
                                value={datePreset}
                                onChange={(e) => handlePresetChange(e.target.value as DatePreset)}
                                className="border-none text-sm font-bold text-blue-700 outline-none bg-transparent cursor-pointer"
                            >
                                <option value="today">Hôm nay</option>
                                <option value="yesterday">Hôm qua</option>
                                <option value="tomorrow">Ngày mai</option>
                                <option value="thisWeek">Tuần này</option>
                                <option value="lastWeek">Tuần trước</option>
                                <option value="nextWeek">Tuần sau</option>
                                <option value="thisMonth">Tháng này</option>
                                <option value="lastMonth">Tháng trước</option>
                                <option value="nextMonth">Tháng sau</option>
                                <option value="custom">Tùy chọn</option>
                            </select>
                        </div>

                        {/* Custom Date Range */}
                        {datePreset === 'custom' && (
                            <div className="flex items-center bg-white border rounded px-2 py-1 shadow-sm">
                                <input
                                    type="date"
                                    value={format(fromDate, 'yyyy-MM-dd')}
                                    onChange={e => { if (e.target.value) setFromDate(new Date(e.target.value)) }}
                                    className="border-none text-sm font-bold text-gray-700 outline-none w-32"
                                />
                                <span className="text-gray-400 mx-2">-</span>
                                <input
                                    type="date"
                                    value={format(toDate, 'yyyy-MM-dd')}
                                    onChange={e => { if (e.target.value) setToDate(new Date(e.target.value)) }}
                                    className="border-none text-sm font-bold text-gray-700 outline-none w-32"
                                />
                            </div>
                        )}

                        {/* Date Range Display */}
                        {datePreset !== 'custom' && !isSingleDay && (
                            <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                {format(fromDate, 'dd/MM')} - {format(toDate, 'dd/MM/yyyy')}
                            </div>
                        )}

                        {/* Shift Filter */}
                        <div className="flex items-center bg-white border rounded px-2 py-1 shadow-sm h-[34px]">
                            <span className="text-xs font-bold text-gray-500 mr-2 uppercase">Buổi:</span>
                            <select
                                value={shift}
                                onChange={(e) => setShift(e.target.value)}
                                className="border-none text-sm font-bold text-indigo-700 outline-none bg-transparent cursor-pointer"
                            >
                                <option value="All">Cả ngày</option>
                                <option value="Sáng">Sáng</option>
                                <option value="Chiều">Chiều</option>
                            </select>
                        </div>

                        {/* Color Legend */}
                        <div className="hidden xl:flex items-center gap-2 bg-gray-50 px-2 py-1 rounded border border-gray-200 text-[10px] font-medium text-gray-600">
                            <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-100 border border-blue-600"></span> Rảnh Sáng</div>
                            <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-100 border border-orange-600"></span> Rảnh Chiều</div>
                            <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-teal-100 border border-teal-600"></span> Rảnh Cả ngày</div>
                        </div>

                        <button
                            onClick={() => setShowFilter(!showFilter)}
                            className="flex items-center gap-1 text-sm bg-white border px-3 py-1.5 rounded hover:bg-gray-100 shadow-sm"
                        >
                            <Filter className="w-4 h-4 text-gray-500" />
                            Cột hiển thị {showFilter ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>

                        {/* RBAC Notice */}
                        {!canEdit && (
                            <div className="text-sm text-gray-500 italic bg-yellow-50 px-3 py-2 rounded border border-yellow-200 flex items-center gap-2">
                                <span>🔒</span>
                                <span>Chế độ <strong>Xem</strong>. Chỉ Điều phối viên mới có thể chỉnh sửa.</span>
                            </div>
                        )}

                        <button
                            onClick={handleSave}
                            disabled={!isDirty || !isSingleDay || !canEdit}
                            className={`flex items-center px-4 py-1.5 rounded shadow-sm font-bold text-sm transition-all
                                ${isDirty && isSingleDay && canEdit ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
                            `}
                        >
                            <Save className="w-4 h-4 mr-2" /> Lưu thay đổi
                        </button>
                    </div>
                </div>

                {/* Job Selection Panel */}
                {showFilter && (
                    <div className="p-3 bg-white border rounded shadow-sm animate-in slide-in-from-top-2">
                        <div className="text-xs font-bold text-gray-500 mb-2 uppercase">Chọn công việc hiển thị:</div>
                        <div className="flex flex-wrap gap-3">
                            {allDailyJobs.map(job => (
                                <label key={job.id} className="flex items-center space-x-2 text-sm cursor-pointer select-none bg-gray-50 px-2 py-1 rounded hover:bg-gray-100 border border-transparent hover:border-gray-200">
                                    <input
                                        type="checkbox"
                                        checked={visibleJobIds.includes(job.id)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setVisibleJobIds(prev => [...prev, job.id]);
                                            } else {
                                                setVisibleJobIds(prev => prev.filter(id => id !== job.id));
                                            }
                                        }}
                                        className="rounded text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>{job.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Warning if Range Mode */}
            {!isSingleDay && (
                <div className="bg-yellow-50 p-2 text-center text-xs text-yellow-800 border-b border-yellow-100 flex items-center justify-center">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Đang xem dữ liệu tổng hợp theo khoảng thời gian. Vui lòng chọn 1 ngày cụ thể để chỉnh sửa phân công.
                </div>
            )}

            {/* Main Table */}
            <div className="overflow-auto flex-1 relative">
                <table className="w-full border-collapse min-w-[1000px]">
                    <thead className="bg-blue-50 sticky top-0 z-30 shadow-sm ring-1 ring-blue-100">
                        <tr>
                            <th className="p-2 border text-left min-w-[250px] bg-blue-50 sticky left-0 z-40 border-r-2 border-r-blue-200">
                                <div className="font-bold text-blue-900">Nhân viên</div>
                                <div className="text-[10px] font-normal text-gray-500">
                                    {isSingleDay ? `Trạng thái: ${shift === 'All' ? 'Cả ngày' : shift}` : 'Tổng hợp dữ liệu'}
                                </div>
                            </th>
                            {displayedJobs.map(job => (
                                <th key={job.id} className="p-2 border text-center min-w-[320px] bg-blue-50/80 backdrop-blur-sm">
                                    <div className="font-bold text-blue-800">{job.name}</div>
                                    <div className="grid grid-cols-5 text-xs font-semibold mt-1 gap-1 text-gray-700">
                                        <span className="bg-yellow-100 font-bold text-black border rounded px-1" title="Nhập số lượng chia mới">Chia mới</span>
                                        <span title="Đã hoàn thành">HT</span>
                                        <span className="bg-orange-50 text-orange-800 border-orange-200" title="Trả Kinh Doanh">Trả KD</span>
                                        <span className="bg-red-50 text-red-800 border-red-200" title="Trả Trưởng Phòng">Trả TP</span>
                                        <span className="text-red-700 font-extrabold bg-red-50 border border-red-200 rounded" title="Tồn = Chia mới - (HT + Trả KD + Trả TP)">Tồn</span>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {/* Summary Row */}
                        <tr className="bg-yellow-50 font-bold sticky top-[62px] z-20 shadow-md border-b-2 border-yellow-200">
                            <td className="p-3 border text-yellow-900 sticky left-0 z-30 bg-yellow-100 border-r-2 border-r-yellow-300">
                                TỔNG CỘNG ({availableEmployees.length} NV)
                            </td>
                            {displayedJobs.map(job => {
                                const totalData = { newAssigned: 0, completed: 0, returnedKD: 0, returnedTP: 0, pending: 0 };
                                availableEmployees.forEach(emp => {
                                    const d = getAllocationData(emp.id, job.id);
                                    totalData.newAssigned += d.newAssigned;
                                    totalData.completed += d.completed;
                                    totalData.returnedKD += d.returnedKD;
                                    totalData.returnedTP += d.returnedTP;
                                    totalData.pending += calculatePending(d);
                                });

                                return (
                                    <td key={job.id} className="p-2 border bg-yellow-50/90 backdrop-blur-sm text-center">
                                        <div className="grid grid-cols-5 text-center text-xs items-center gap-1 font-bold">
                                            <span className="text-blue-700 text-sm bg-blue-50 rounded px-1">{totalData.newAssigned}</span>
                                            <span className="text-green-700">{totalData.completed}</span>
                                            <span className="text-orange-700">{totalData.returnedKD}</span>
                                            <span className="text-red-700">{totalData.returnedTP}</span>
                                            <span className={`text-sm px-1 rounded ${totalData.pending > 0 ? 'bg-red-100 text-red-700' : 'text-gray-400'}`}>
                                                {totalData.pending}
                                            </span>
                                        </div>
                                    </td>
                                );
                            })}
                        </tr>

                        {availableEmployees.length === 0 ? (
                            <tr>
                                <td colSpan={displayedJobs.length + 1} className="p-12 text-center text-gray-500 italic bg-white">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">?</div>
                                        <span>Không có nhân viên nhóm "Chia hàng ngày" nào trong buổi này.</span>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            availableEmployees.map(emp => {
                                const rowClass = getEmployeeRowClass(emp.id);

                                return (
                                    <tr key={emp.id} className={`${rowClass} transition-colors group`}>
                                        <td className={`p-2 border-r-2 border-r-gray-200 text-left sticky left-0 z-10 group-hover:brightness-95 transition-colors ${rowClass}`}>
                                            <div className="font-semibold text-sm text-slate-800">{emp.fullName}</div>
                                            <div className="text-[10px] text-gray-400 flex items-center gap-1">
                                                {emp.email.split('@')[0]}
                                            </div>
                                        </td>
                                        {displayedJobs.map(job => {
                                            const data = getAllocationData(emp.id, job.id);
                                            const pending = calculatePending(data);
                                            const isDisabled = !isSingleDay || !canEdit;

                                            return (
                                                <td key={job.id} className="p-1 border text-center">
                                                    <div className="grid grid-cols-5 gap-1 items-center">
                                                        {/* New Assigned */}
                                                        <input
                                                            type="number" min="0"
                                                            value={data.newAssigned === 0 ? '' : data.newAssigned}
                                                            disabled={isDisabled}
                                                            onChange={(e) => handleAllocationChange(emp.id, job.id, 'newAssigned', parseInt(e.target.value) || 0)}
                                                            className={`w-full text-center text-sm border-2 rounded py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold transition-all
                                                                ${isDisabled ? 'bg-transparent border-transparent text-gray-400' : 'bg-white border-yellow-200 hover:border-yellow-400 text-blue-700'}
                                                            `}
                                                            placeholder="0"
                                                        />

                                                        {/* Completed */}
                                                        <div className="text-xs text-green-600 font-medium">{data.completed || '-'}</div>

                                                        {/* Returned KD */}
                                                        <input
                                                            type="number" min="0"
                                                            value={data.returnedKD === 0 ? '' : data.returnedKD}
                                                            disabled={isDisabled}
                                                            onChange={(e) => handleAllocationChange(emp.id, job.id, 'returnedKD', parseInt(e.target.value) || 0)}
                                                            className={`w-full text-center text-xs border rounded py-1 focus:outline-none focus:ring-1 focus:ring-orange-500 transition-colors
                                                                ${isDisabled ? 'bg-transparent border-transparent text-gray-300' : 'bg-orange-50 border-orange-100 text-orange-800 hover:border-orange-300'}
                                                            `}
                                                            placeholder="-"
                                                        />

                                                        {/* Returned TP */}
                                                        <input
                                                            type="number" min="0"
                                                            value={data.returnedTP === 0 ? '' : data.returnedTP}
                                                            disabled={isDisabled}
                                                            onChange={(e) => handleAllocationChange(emp.id, job.id, 'returnedTP', parseInt(e.target.value) || 0)}
                                                            className={`w-full text-center text-xs border rounded py-1 text-red-800 focus:outline-none focus:ring-1 focus:ring-red-500 transition-colors
                                                                ${isDisabled ? 'bg-transparent border-transparent text-gray-300' : 'bg-red-50 border-red-100 hover:border-red-300'}
                                                            `}
                                                            placeholder="-"
                                                        />

                                                        {/* Pending */}
                                                        <div className={`w-full flex items-center justify-center text-sm font-extrabold rounded py-1.5
                                                            ${pending > 0 ? 'bg-red-100 text-red-700 shadow-sm border border-red-200' : 'text-gray-300 opacity-50'}
                                                            ${pending < 0 ? 'text-green-500' : ''}
                                                        `}>
                                                            {pending !== 0 ? pending : '-'}
                                                        </div>
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer */}
            <div className="p-3 bg-white border-t flex justify-between items-center text-xs shadow-inner">
                <div className="flex gap-4 text-gray-600">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 bg-yellow-200 border rounded-sm"></span> Ô nhập liệu (Chia mới)</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-100 border border-red-200 rounded-sm"></span> Tồn đọng (Cần xử lý)</span>
                </div>
                <span><span className="font-bold text-red-600">Lưu ý:</span> Bạn cần nhấn "Lưu thay đổi" (Góc phải trên) để ghi nhận dữ liệu.</span>
            </div>
        </div>
    );
};

export default DailyAllocationView;
