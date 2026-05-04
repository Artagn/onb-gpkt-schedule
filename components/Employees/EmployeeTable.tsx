import React from 'react';
import { Employee, EmployeeRank, Role, Status } from '../../types';
import { Edit2, Trash2, Filter, Search } from 'lucide-react';
import { FilterState } from './useEmployeeManager';

interface EmployeeTableProps {
    employees: Employee[];
    filters: FilterState;
    setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
    onEdit: (emp: Employee) => void;
    onDelete: (id: string) => void;
}

const EmployeeTable: React.FC<EmployeeTableProps> = ({
    employees,
    filters,
    setFilters,
    onEdit,
    onDelete,
}) => {
    return (
        <>
            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-4 items-center bg-gray-50 p-3 rounded-lg border">
                <div className="flex items-center gap-2 bg-white border rounded px-3 py-1.5 shadow-sm w-full md:w-auto">
                    <Search className="w-3.5 h-3.5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Tìm theo tên, email..."
                        className="outline-none text-xs w-full md:w-64"
                        value={filters.searchText}
                        onChange={(e) => setFilters(f => ({ ...f, searchText: e.target.value }))}
                    />
                    {filters.searchText && (
                        <button onClick={() => setFilters(f => ({ ...f, searchText: '' }))}>
                            <span className="text-gray-400 text-[10px]">✕</span>
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="w-3.5 h-3.5 text-slate-500" />
                    <select
                        className="border rounded p-1.5 text-xs"
                        value={filters.filterRole}
                        onChange={e => setFilters(f => ({ ...f, filterRole: e.target.value }))}
                    >
                        <option value="All">Tất cả vai trò</option>
                        {Object.values(Role).map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        className="border rounded p-1.5 text-xs"
                        value={filters.filterRank}
                        onChange={e => setFilters(f => ({ ...f, filterRank: e.target.value }))}
                    >
                        <option value="All">Tất cả phân hạng</option>
                        {Object.values(EmployeeRank).map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        className="border rounded p-1.5 text-xs"
                        value={filters.filterStatus}
                        onChange={e => setFilters(f => ({ ...f, filterStatus: e.target.value }))}
                    >
                        <option value="All">Tất cả trạng thái</option>
                        {Object.values(Status).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div className="ml-auto text-xs text-gray-500">
                    Hiển thị {employees.length} nhân viên
                </div>
            </div>

            {/* Table */}
            <div className="overflow-auto flex-1 border rounded-lg">
                <table className="min-w-full divide-y divide-gray-200 relative">
                    <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="px-3 py-2 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider bg-gray-50 w-12">STT</th>
                            <th className="px-3 py-2 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider bg-gray-50">Họ tên / Email</th>
                            <th className="px-3 py-2 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider bg-gray-50">Phân hạng</th>
                            <th className="px-3 py-2 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider bg-gray-50 w-48">Nhóm công việc</th>
                            <th className="px-3 py-2 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider bg-gray-50 w-48">Khung thời gian</th>
                            <th className="px-3 py-2 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider bg-gray-50">Vai trò</th>
                            <th className="px-3 py-2 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider bg-gray-50">Trạng thái</th>
                            <th className="px-3 py-2 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider bg-gray-50">KPI</th>
                            <th className="px-3 py-2 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider bg-gray-50">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {employees.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="text-center py-8 text-gray-500 italic">
                                    Không tìm thấy nhân viên nào phù hợp.
                                </td>
                            </tr>
                        ) : (
                            employees.map((emp) => (
                                <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-3 py-2 text-center text-xs text-gray-500">{emp.stt}</td>
                                    <td className="px-3 py-2">
                                        <div className="text-xs font-medium text-gray-900">{emp.fullName}</div>
                                        <div className="text-[10px] text-gray-500">{emp.email}</div>
                                    </td>
                                    <td className="px-3 py-2">
                                        <span className={`px-2 py-0.5 inline-flex text-[10px] leading-4 font-semibold rounded-full ${emp.rank === EmployeeRank.A ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                            {emp.rank}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2">
                                        <div className="flex flex-wrap gap-1">
                                            {emp.jobGroups.map(g => (
                                                <span key={g} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] border border-gray-200 whitespace-nowrap">
                                                    {g}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2">
                                        <div className="flex flex-wrap gap-1">
                                            {emp.timeFrames.map(t => (
                                                <span key={t} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] border border-blue-100 whitespace-nowrap">
                                                    {t}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2 text-xs text-gray-500">{emp.role}</td>
                                    <td className="px-3 py-2">
                                        <span className={`px-2 py-0.5 inline-flex text-[10px] leading-4 font-semibold rounded-full ${emp.status === Status.Active ? 'bg-green-100 text-green-800'
                                                : emp.status === Status.Inactive ? 'bg-gray-100 text-gray-800'
                                                    : 'bg-red-100 text-red-800'
                                            }`}>
                                            {emp.status}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2 text-xs text-gray-500">{emp.kpiStandard}</td>
                                    <td className="px-3 py-2 text-right text-xs font-medium">
                                        <button onClick={() => onEdit(emp)} className="text-indigo-600 hover:text-indigo-900 mr-3">
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => onDelete(emp.id)} className="text-red-600 hover:text-red-900">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </>
    );
};

export default EmployeeTable;
