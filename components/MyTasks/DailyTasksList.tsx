
import React from 'react';
import { ListTodo, Filter, ChevronUp, ChevronDown, Save, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { DailyAllocation, Job, Employee, JobGroup } from '../../types';
import EmptyState from '../common/EmptyState';

interface Props {
    myDailyAllocations: DailyAllocation[];
    jobs: Job[];
    employees: Employee[];
    fullWidth?: boolean;
    currentEmployeeId: string;
    showJobFilter: boolean;
    setShowJobFilter: (show: boolean) => void;
    handleSaveProgress: () => void;
    isDirty: boolean;
    filterJobIds: string[];
    setFilterJobIds: (update: (prev: string[]) => string[]) => void;
    handleUpdateProgress: (allocationDate: string, jobId: string, field: 'completed' | 'returnedKD' | 'returnedTP', value: number, targetEmpId?: string) => void;
}

const DailyTasksList: React.FC<Props> = ({
    myDailyAllocations, jobs, employees, fullWidth = false,
    currentEmployeeId, showJobFilter, setShowJobFilter,
    handleSaveProgress, isDirty,
    filterJobIds, setFilterJobIds, handleUpdateProgress
}) => {

    const sortedAllocations = myDailyAllocations.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const dailyJobsList = jobs.filter(j => j.group === JobGroup.Daily && j.isActive);

    const getJob = (id: string) => jobs.find(j => j.id === id);

    return (
        <div className={`bg-white rounded-lg shadow-sm flex flex-col overflow-hidden ${fullWidth ? 'h-full' : ''}`}>
            <div className="p-4 border-b bg-emerald-50 space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-emerald-900 flex items-center">
                        <ListTodo className="w-4 h-4 mr-2" /> Phân công trong ngày
                    </h3>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowJobFilter(!showJobFilter)}
                            className="flex items-center gap-1 text-xs bg-white border px-2 py-1 rounded hover:bg-gray-100 shadow-sm text-gray-600 font-medium"
                        >
                            <Filter className="w-3 h-3" />
                            Lọc Công việc {showJobFilter ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                        <button
                            onClick={handleSaveProgress}
                            disabled={!isDirty}
                            className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded shadow-sm font-bold transition-all
                                ${isDirty ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
                            `}
                        >
                            <Save className="w-3 h-3" /> Lưu tiến độ
                        </button>
                    </div>
                </div>

                {showJobFilter && (
                    <div className="p-2 bg-white border rounded shadow-inner animate-in slide-in-from-top-1">
                        <div className="text-[10px] font-bold text-gray-500 mb-1 uppercase">Chọn công việc hiển thị:</div>
                        <div className="flex flex-wrap gap-2">
                            {dailyJobsList.map(job => (
                                <label key={job.id} className="flex items-center space-x-1 text-xs cursor-pointer select-none bg-gray-50 px-2 py-1 rounded border hover:bg-gray-100">
                                    <input
                                        type="checkbox"
                                        checked={filterJobIds.includes(job.id)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setFilterJobIds(prev => [...prev, job.id]);
                                            } else {
                                                setFilterJobIds(prev => prev.filter(id => id !== job.id));
                                            }
                                        }}
                                        className="rounded text-blue-600 focus:ring-blue-500 w-3 h-3"
                                    />
                                    <span>{job.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="p-4">
                {sortedAllocations.length === 0 ? (
                    <EmptyState
                        icon={Clock}
                        title="Chưa có phân công"
                        description={`Chưa có phân công ${filterJobIds.length < dailyJobsList.length ? 'cho các công việc đã chọn ' : ''}trong khoảng thời gian này.`}
                    />
                ) : (
                    <>
                        {/* DESKTOP TABLE */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 border">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-1/3">Công việc</th>
                                        {currentEmployeeId === 'all' && (
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nhân viên</th>
                                        )}
                                        <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase">Được giao</th>
                                        <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase text-green-700">Hoàn thành</th>
                                        <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase text-orange-700">Trả KD</th>
                                        <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase text-red-700">Trả TP</th>
                                        <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase">Tồn</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {sortedAllocations.map(alloc => {
                                        const job = getJob(alloc.jobId);
                                        const emp = employees.find(e => e.id === alloc.employeeId);
                                        const totalAssigned = (alloc.assigned || 0) + (alloc.newAssigned || 0);
                                        const remaining = totalAssigned - (alloc.completed || 0) - (alloc.returnedKD || 0) - (alloc.returnedTP || 0);

                                        return (
                                            <tr key={alloc.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3">
                                                    <div className="font-bold text-sm text-gray-800">{job?.name}</div>
                                                    <div className="text-[10px] text-gray-500 bg-gray-100 inline-block px-1 rounded mt-1">
                                                        {format(new Date(alloc.date), 'dd/MM/yyyy')}
                                                    </div>
                                                </td>
                                                {currentEmployeeId === 'all' && (
                                                    <td className="px-4 py-3 text-sm text-gray-700">
                                                        {emp?.fullName}
                                                    </td>
                                                )}
                                                <td className="px-2 py-3 text-center font-bold text-blue-600 bg-blue-50">
                                                    {totalAssigned}
                                                </td>
                                                <td className="px-2 py-3">
                                                    <input
                                                        type="number" min="0"
                                                        className="w-16 border border-green-200 bg-white rounded p-1 text-center font-bold text-green-700 focus:ring-green-500"
                                                        value={alloc.completed || ''}
                                                        onChange={e => handleUpdateProgress(alloc.date, alloc.jobId, 'completed', parseInt(e.target.value) || 0, alloc.employeeId)}
                                                        placeholder="0"
                                                    />
                                                </td>
                                                <td className="px-2 py-3">
                                                    <input
                                                        type="number" min="0"
                                                        className="w-16 border border-orange-200 bg-white rounded p-1 text-center text-orange-700"
                                                        value={alloc.returnedKD || ''}
                                                        onChange={e => handleUpdateProgress(alloc.date, alloc.jobId, 'returnedKD', parseInt(e.target.value) || 0, alloc.employeeId)}
                                                        placeholder="0"
                                                    />
                                                </td>
                                                <td className="px-2 py-3">
                                                    <input
                                                        type="number" min="0"
                                                        className="w-16 border border-red-200 bg-white rounded p-1 text-center text-red-700"
                                                        value={alloc.returnedTP || ''}
                                                        onChange={e => handleUpdateProgress(alloc.date, alloc.jobId, 'returnedTP', parseInt(e.target.value) || 0, alloc.employeeId)}
                                                        placeholder="0"
                                                    />
                                                </td>
                                                <td className={`px-2 py-3 text-center font-bold text-sm ${remaining > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                                    {remaining}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* MOBILE CARDS */}
                        <div className="md:hidden space-y-4">
                            {sortedAllocations.map(alloc => {
                                const job = getJob(alloc.jobId);
                                const emp = employees.find(e => e.id === alloc.employeeId);
                                const totalAssigned = (alloc.assigned || 0) + (alloc.newAssigned || 0);
                                const remaining = totalAssigned - (alloc.completed || 0) - (alloc.returnedKD || 0) - (alloc.returnedTP || 0);

                                return (
                                    <div key={alloc.id} className="bg-white border rounded-lg p-3 shadow-sm">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <div className="font-bold text-gray-800 text-sm">{job?.name}</div>
                                                <div className="text-[10px] text-gray-500 mt-0.5">
                                                    {format(new Date(alloc.date), 'dd/MM/yyyy')}
                                                    {currentEmployeeId === 'all' && ` • ${emp?.fullName}`}
                                                </div>
                                            </div>
                                            <div className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold text-center">
                                                <div className="text-[9px] uppercase text-blue-400">Được giao</div>
                                                {totalAssigned}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-2 mb-2">
                                            <div>
                                                <label className="block text-[9px] text-green-600 font-bold mb-1 uppercase">Hoàn thành</label>
                                                <input
                                                    type="number" min="0"
                                                    className="w-full border border-green-200 bg-white rounded p-1.5 text-center font-bold text-green-700 text-sm"
                                                    value={alloc.completed || ''}
                                                    onChange={e => handleUpdateProgress(alloc.date, alloc.jobId, 'completed', parseInt(e.target.value) || 0, alloc.employeeId)}
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[9px] text-orange-600 font-bold mb-1 uppercase">Trả KD</label>
                                                <input
                                                    type="number" min="0"
                                                    className="w-full border border-orange-200 bg-white rounded p-1.5 text-center text-orange-700 text-sm"
                                                    value={alloc.returnedKD || ''}
                                                    onChange={e => handleUpdateProgress(alloc.date, alloc.jobId, 'returnedKD', parseInt(e.target.value) || 0, alloc.employeeId)}
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[9px] text-red-600 font-bold mb-1 uppercase">Trả TP</label>
                                                <input
                                                    type="number" min="0"
                                                    className="w-full border border-red-200 bg-white rounded p-1.5 text-center text-red-700 text-sm"
                                                    value={alloc.returnedTP || ''}
                                                    onChange={e => handleUpdateProgress(alloc.date, alloc.jobId, 'returnedTP', parseInt(e.target.value) || 0, alloc.employeeId)}
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex justify-end items-center pt-2 border-t border-dashed border-gray-100">
                                            <span className="text-xs text-gray-500 mr-2">Số lượng tồn:</span>
                                            <span className={`text-sm font-bold ${remaining > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                                {remaining}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default DailyTasksList;
