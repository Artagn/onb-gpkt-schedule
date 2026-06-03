/**
 * JobManager - Main component (Modularized)
 * Refactored from 712-line monolithic file to modular architecture
 */

import React from 'react';
import { Edit2, Trash2, Plus, Filter, FileSpreadsheet, Search } from 'lucide-react';

// Modular imports
import { useJobManager } from './useJobManager';
import { MultiSelect } from './MultiSelect';
import { DeleteModal, JobEditModal, SubJobEditModal, ImportModal, JobGroupEditModal } from './Modals';
import EmptyState from '../common/EmptyState';

const JobManager: React.FC = () => {
    const {
        // Data
        jobGroups,
        jobs,
        filteredJobs,
        filteredSubJobs,

        // UI State
        activeTab,
        setActiveTab,
        importMode,
        setImportMode,
        deleteConfirm,
        setDeleteConfirm,

        // JobGroup Edit
        isEditingGroup,
        editGroupForm,
        setEditGroupForm,
        handleEditJobGroup,
        handleAddJobGroup,
        handleDeleteJobGroupClick,
        handleSaveJobGroup,
        handleCancelEditJobGroup,

        // Job Edit
        isEditing,
        editForm,
        setEditForm,
        handleEditJob,
        handleAddJob,
        handleDeleteJobClick,
        handleSaveJob,
        handleCancelEditJob,

        // SubJob Edit
        isEditingSub,
        editSubForm,
        setEditSubForm,
        handleEditSub,
        handleAddSub,
        handleDeleteSubClick,
        handleSaveSub,
        handleCancelEditSub,

        // Delete
        confirmDelete,

        // Excel
        handleFileUpload,
        downloadTemplate,

        // Filters - Jobs
        searchQuery,
        setSearchQuery,
        filterGroup,
        setFilterGroup,

        // Filters - SubJobs
        searchSubQuery,
        setSearchSubQuery,
        filterParentJob,
        setFilterParentJob,
        filterProduct,
        setFilterProduct,
        filterDay,
        setFilterDay,
        filterShift,
        setFilterShift,
        clearSubJobFilters,
        subJobs,
    } = useJobManager();

    return (
        <div className="bg-white rounded-lg shadow flex flex-col h-full">
            {/* TABS HEADER */}
            <div className="flex border-b">
                <button
                    onClick={() => setActiveTab('jobGroups')}
                    className={`px-6 py-4 font-bold text-sm transition-colors ${activeTab === 'jobGroups' ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    Nhóm Công việc
                </button>
                <button
                    onClick={() => setActiveTab('jobs')}
                    className={`px-6 py-4 font-bold text-sm transition-colors ${activeTab === 'jobs' ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    Danh sách Công việc (Cha)
                </button>
                <button
                    onClick={() => setActiveTab('subJobs')}
                    className={`px-6 py-4 font-bold text-sm transition-colors ${activeTab === 'subJobs' ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    Khai báo Hạng mục chi tiết
                </button>
            </div>

            <div className="p-6 flex-1 overflow-auto">
                {/* JOB GROUPS TAB */}
                {activeTab === 'jobGroups' && (
                    <>
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">Quản lý Nhóm Công việc</h2>
                                <p className="text-sm text-gray-500">Khai báo các nhóm công việc và màu sắc hiển thị trên Lịch điều phối.</p>
                            </div>
                            <button
                                type="button"
                                onClick={handleAddJobGroup}
                                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 shadow-sm"
                            >
                                <Plus className="w-4 h-4 mr-2" /> Thêm Nhóm
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-3 py-2 text-left text-[11px] font-bold text-gray-500 uppercase">Thứ tự</th>
                                        <th className="px-3 py-2 text-left text-[11px] font-bold text-gray-500 uppercase">Tên Nhóm</th>
                                        <th className="px-3 py-2 text-left text-[11px] font-bold text-gray-500 uppercase">Màu sắc</th>
                                        <th className="px-3 py-2 text-left text-[11px] font-bold text-gray-500 uppercase">Trạng thái</th>
                                        <th className="px-3 py-2 text-right text-[11px] font-bold text-gray-500 uppercase">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {jobGroups.length === 0 ? (
                                        <tr>
                                            <EmptyState colSpan={5} size="sm" title="Không tìm thấy nhóm công việc nào." />
                                        </tr>
                                    ) : (
                                        [...jobGroups].sort((a, b) => a.order - b.order).map(g => (
                                            <tr key={g.id} className={!g.isActive ? 'bg-gray-50 opacity-60' : ''}>
                                                <td className="px-3 py-2 text-xs font-medium text-gray-500">{g.order}</td>
                                                <td className="px-3 py-2 text-xs font-bold text-gray-800">{g.name}</td>
                                                <td className="px-3 py-2 text-xs">
                                                    <span className={`px-2 py-1 rounded-md text-[11px] font-medium ${g.colorClass}`}>
                                                        Demo Hiển thị
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 text-xs text-gray-500">
                                                    {g.isActive ? <span className="text-green-600 font-medium">Sử dụng</span> : <span className="text-red-600">Ngưng</span>}
                                                </td>
                                                <td className="px-3 py-2 text-right text-xs font-medium">
                                                    <button onClick={() => handleEditJobGroup(g)} className="text-indigo-600 hover:text-indigo-900 mr-3" title="Sửa"><Edit2 className="w-3.5 h-3.5" /></button>
                                                    <button type="button" onClick={() => handleDeleteJobGroupClick(g)} className="text-red-600 hover:text-red-900" title="Xóa"><Trash2 className="w-3.5 h-3.5" /></button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {/* JOBS TAB */}
                {activeTab === 'jobs' && (
                    <>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-800">Quản lý Công việc</h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setImportMode('jobs')}
                                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 shadow-sm"
                                >
                                    <FileSpreadsheet className="w-4 h-4 mr-2" /> Nhập Excel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleAddJob}
                                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 shadow-sm"
                                >
                                    <Plus className="w-4 h-4 mr-2" /> Thêm công việc
                                </button>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="mb-4 flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Filter className="w-4 h-4 text-slate-500" />
                                <select className="border rounded p-1.5 text-sm" value={filterGroup} onChange={(e) => setFilterGroup(e.target.value)}>
                                    <option value="All">Tất cả nhóm</option>
                                    {jobGroups.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                                </select>
                            </div>
                            <div className="relative flex-1 max-w-xs">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Tìm kiếm công việc..."
                                    className="w-full pl-9 pr-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">✕</button>
                                )}
                            </div>
                            {(searchQuery || filterGroup !== 'All') && (
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                    {filteredJobs.length} / {jobs.length} kết quả
                                </span>
                            )}
                        </div>

                        {/* Jobs Table */}
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-3 py-2 text-left text-[11px] font-bold text-gray-500 uppercase">Tên công việc</th>
                                        <th className="px-3 py-2 text-left text-[11px] font-bold text-gray-500 uppercase">Nhóm</th>
                                        <th className="px-3 py-2 text-left text-[11px] font-bold text-gray-500 uppercase">Phân loại</th>
                                        <th className="px-3 py-2 text-left text-[11px] font-bold text-gray-500 uppercase">Điểm chuẩn</th>
                                        <th className="px-3 py-2 text-left text-[11px] font-bold text-gray-500 uppercase">Thời lượng (p)</th>
                                        <th className="px-3 py-2 text-left text-[11px] font-bold text-gray-500 uppercase">Độ khó</th>
                                        <th className="px-3 py-2 text-left text-[11px] font-bold text-gray-500 uppercase">Trạng thái</th>
                                        <th className="px-3 py-2 text-right text-[11px] font-bold text-gray-500 uppercase">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredJobs.length === 0 ? (
                                        <tr>
                                            <EmptyState colSpan={8} size="sm" title="Không tìm thấy công việc nào phù hợp." />
                                        </tr>
                                    ) : (
                                        filteredJobs.map(j => (
                                            <tr key={j.id} className={!j.isActive ? 'bg-gray-50 opacity-60' : ''}>
                                                <td className="px-3 py-2 text-xs font-medium">{j.name}</td>
                                                <td className="px-3 py-2 text-xs text-gray-500">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] ${jobGroups.find(gr => gr.name === j.group)?.colorClass || 'bg-gray-100 text-gray-800'}`}>{j.group}</span>
                                                </td>
                                                <td className="px-3 py-2 text-xs text-gray-500">
                                                    {j.classification ? <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px]">{j.classification}</span> : <span className="text-gray-300">—</span>}
                                                </td>
                                                <td className="px-3 py-2 text-xs text-gray-500">{j.standardPoint}</td>
                                                <td className="px-3 py-2 text-xs text-gray-500">{j.durationMinutes}</td>
                                                <td className="px-3 py-2 text-xs text-gray-500">{j.difficulty}</td>
                                                <td className="px-3 py-2 text-xs text-gray-500">
                                                    {j.isActive ? <span className="text-green-600 font-medium">Sử dụng</span> : <span className="text-red-600">Ngưng</span>}
                                                </td>
                                                <td className="px-3 py-2 text-right text-xs font-medium">
                                                    <button onClick={() => handleEditJob(j)} className="text-indigo-600 hover:text-indigo-900 mr-3" title="Sửa"><Edit2 className="w-3.5 h-3.5" /></button>
                                                    <button type="button" onClick={() => handleDeleteJobClick(j)} className="text-red-600 hover:text-red-900" title="Xóa"><Trash2 className="w-3.5 h-3.5" /></button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {/* SUBJOBS TAB */}
                {activeTab === 'subJobs' && (
                    <>
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">Khai báo Hạng mục (Sub-Jobs)</h2>
                                <p className="text-sm text-gray-500">Các phiên làm việc cụ thể theo Thứ/Buổi của Công việc cha.</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setImportMode('subJobs')}
                                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 shadow-sm"
                                >
                                    <FileSpreadsheet className="w-4 h-4 mr-2" /> Nhập Excel
                                </button>
                                <button
                                    onClick={handleAddSub}
                                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 shadow-sm"
                                >
                                    <Plus className="w-4 h-4 mr-2" /> Thêm hạng mục
                                </button>
                            </div>
                        </div>

                        {/* SubJob Filters */}
                        <div className="mb-4 flex flex-col gap-3">
                            <div className="flex flex-wrap gap-2 items-center">
                                <Filter className="w-4 h-4 text-slate-500" />
                                <MultiSelect label="Công việc (Cha)" options={jobs.map(j => j.name)} selected={filterParentJob} onChange={setFilterParentJob} />
                                <div className="relative w-48">
                                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Tên hạng mục..."
                                        className="w-full pl-8 pr-2 py-1.5 border rounded text-xs"
                                        value={searchSubQuery}
                                        onChange={e => setSearchSubQuery(e.target.value)}
                                    />
                                </div>
                                <MultiSelect label="Sản phẩm" options={Array.from(new Set(subJobs.map(s => s.product).filter(p => !!p) as string[])).sort()} selected={filterProduct} onChange={setFilterProduct} />
                                <MultiSelect label="Thứ" options={['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật']} selected={filterDay} onChange={setFilterDay} />
                                <MultiSelect label="Buổi" options={['Sáng', 'Chiều', 'Tối']} selected={filterShift} onChange={setFilterShift} />
                                <button onClick={clearSubJobFilters} className="text-xs text-red-600 hover:underline ml-auto">Xóa bộ lọc</button>
                            </div>
                            <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded inline-block w-fit">
                                Hiển thị {filteredSubJobs.length} / {subJobs.length} hạng mục
                            </div>
                        </div>

                        {/* SubJobs Table */}
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-3 py-2 text-left font-bold text-[11px] text-gray-500 uppercase">Công việc (Cha)</th>
                                        <th className="px-3 py-2 text-left font-bold text-[11px] text-gray-500 uppercase">Tên hạng mục</th>
                                        <th className="px-3 py-2 text-left font-bold text-[11px] text-gray-500 uppercase">Sản phẩm</th>
                                        <th className="px-3 py-2 text-left font-bold text-[11px] text-gray-500 uppercase">Thời gian</th>
                                        <th className="px-3 py-2 text-left font-bold text-[11px] text-gray-500 uppercase">Thời lượng</th>
                                        <th className="px-3 py-2 text-left font-bold text-[11px] text-gray-500 uppercase">Link Meet</th>
                                        <th className="px-3 py-2 text-left font-bold text-[11px] text-gray-500 uppercase">Link Tài liệu</th>
                                        <th className="px-3 py-2 text-center font-bold text-[11px] text-gray-500 uppercase">Trạng thái</th>
                                        <th className="px-3 py-2 text-right font-bold text-[11px] text-gray-500 uppercase">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredSubJobs.length === 0 ? (
                                        <tr>
                                            <EmptyState colSpan={9} size="sm" title="Không tìm thấy hạng mục nào phù hợp." />
                                        </tr>
                                    ) : (
                                        filteredSubJobs.map(sub => {
                                            const parent = jobs.find(j => j.id === sub.jobId);
                                            return (
                                                <tr key={sub.id} className={!sub.isActive ? 'bg-gray-50 opacity-60' : ''}>
                                                    <td className="px-3 py-2 font-bold text-blue-800 text-xs">{parent?.name || '---'}</td>
                                                    <td className="px-3 py-2 text-xs">{sub.name}</td>
                                                    <td className="px-3 py-2 text-gray-600 text-xs">{sub.product}</td>
                                                    <td className="px-3 py-2">
                                                        <div className="font-medium text-xs">{sub.day} - {sub.shift}</div>
                                                        <div className="text-[10px] text-gray-500">{sub.startTime} - {sub.endTime}</div>
                                                    </td>
                                                    <td className="px-3 py-2 text-xs">{sub.duration}p</td>
                                                    <td className="px-3 py-2 max-w-[150px] truncate">
                                                        {sub.link ? (
                                                            <a href={sub.link} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline text-xs">{sub.link}</a>
                                                        ) : (
                                                            <span className="text-gray-300 text-xs">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2 max-w-[150px] truncate">
                                                        {sub.documentLink ? (
                                                            <a href={sub.documentLink} target="_blank" rel="noreferrer" className="text-emerald-500 hover:underline text-xs">{sub.documentLink}</a>
                                                        ) : (
                                                            <span className="text-gray-300 text-xs">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2 text-center">
                                                        {sub.isActive ? <span className="text-green-600 text-[10px] font-bold">Hiện</span> : <span className="text-red-600 text-[10px]">Ẩn</span>}
                                                    </td>
                                                    <td className="px-3 py-2 text-right font-medium">
                                                        <button onClick={() => handleEditSub(sub)} className="text-indigo-600 hover:text-indigo-900 mr-2"><Edit2 className="w-3.5 h-3.5" /></button>
                                                        <button onClick={() => handleDeleteSubClick(sub)} className="text-red-600 hover:text-red-900"><Trash2 className="w-3.5 h-3.5" /></button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            {/* MODALS */}
            <DeleteModal deleteConfirm={deleteConfirm} onCancel={() => setDeleteConfirm(null)} onConfirm={confirmDelete} />
            <JobGroupEditModal isEditingGroup={isEditingGroup} editGroupForm={editGroupForm} setEditGroupForm={setEditGroupForm} onSave={handleSaveJobGroup} onCancel={handleCancelEditJobGroup} />
            <JobEditModal isEditing={isEditing} editForm={editForm} setEditForm={setEditForm} jobGroups={jobGroups} onSave={handleSaveJob} onCancel={handleCancelEditJob} />
            <SubJobEditModal isEditingSub={isEditingSub} editSubForm={editSubForm} setEditSubForm={setEditSubForm} jobs={jobs} onSave={handleSaveSub} onCancel={handleCancelEditSub} />
            <ImportModal importMode={importMode} onClose={() => setImportMode('none')} onFileUpload={handleFileUpload} onDownloadTemplate={downloadTemplate} />
        </div>
    );
};

export default JobManager;
