
import React from 'react';
import { Trash2, FileSpreadsheet, Plus, X, Search, Filter, Edit2, AlertCircle } from 'lucide-react';
import { SchedulePattern, Job } from '../../types';

interface Props {
    patterns: SchedulePattern[];
    jobs: Job[];
    configFilterDay: string;
    setConfigFilterDay: (val: string) => void;
    configFilterShift: string;
    setConfigFilterShift: (val: string) => void;
    patternSearchQuery: string;
    setPatternSearchQuery: (val: string) => void;
    selectedPatternIds: string[];
    setSelectedPatternIds: (update: (prev: string[]) => string[]) => void;
    setEditingPattern: (val: Partial<SchedulePattern> | null) => void;
    setIsConfigMode: (val: boolean) => void;
    setShowImport: (val: boolean) => void;
    handleBulkDeleteClick: () => void;
    handleDeleteClick: (e: React.MouseEvent, id: string) => void;
    deleteConfirmation: any;
    setDeleteConfirmation: (val: any) => void;
    confirmDelete: () => void;
    editingPattern: Partial<SchedulePattern> | null;
    handleSavePattern: () => void;
    showImport: boolean;
    importText: string;
    setImportText: (val: string) => void;
    handleImportPatterns: () => void;
}

const ConfigPatternManager: React.FC<Props> = ({
    patterns, jobs,
    configFilterDay, setConfigFilterDay,
    configFilterShift, setConfigFilterShift,
    patternSearchQuery, setPatternSearchQuery,
    selectedPatternIds, setSelectedPatternIds,
    setEditingPattern, setIsConfigMode, setShowImport,
    handleBulkDeleteClick, handleDeleteClick,
    deleteConfirmation, setDeleteConfirmation, confirmDelete,
    editingPattern, handleSavePattern,
    showImport, importText, setImportText, handleImportPatterns
}) => {
    const dayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
    const shifts = ['Sáng', 'Chiều', 'Tối'];

    // Filter Logic
    const filteredPatterns = patterns.filter(p => {
        const pDayName = dayNames[p.dayIndex];
        if (configFilterDay !== 'All' && pDayName !== configFilterDay) return false;
        if (configFilterShift !== 'All' && p.shift !== configFilterShift) return false;

        // Search Logic
        if (patternSearchQuery) {
            const job = jobs.find(j => j.id === p.jobId);
            const q = patternSearchQuery.toLowerCase();
            const matchJob = job?.name.toLowerCase().includes(q);
            if (!matchJob) return false;
        }

        return true;
    });

    const sortedPatterns = [...filteredPatterns].sort((a, b) => {
        if (a.dayIndex !== b.dayIndex) return a.dayIndex - b.dayIndex;
        const shiftOrder = { 'Sáng': 0, 'Chiều': 1, 'Tối': 2 } as any;
        return shiftOrder[a.shift] - shiftOrder[b.shift];
    });

    const isAllSelected = sortedPatterns.length > 0 && sortedPatterns.every(p => selectedPatternIds.includes(p.id));

    const handleSelectAll = () => {
        if (isAllSelected) {
            setSelectedPatternIds(prev => prev.filter(id => !sortedPatterns.find(p => p.id === id)));
        } else {
            const newIds = sortedPatterns.map(p => p.id);
            setSelectedPatternIds(prev => Array.from(new Set([...prev, ...newIds])));
        }
    };

    const toggleSelectPattern = (id: string) => {
        setSelectedPatternIds(prev => prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]);
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 rounded-lg shadow">
            <div className="p-4 bg-white border-b rounded-t-lg">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">Cấu hình Lịch mẫu (Cố định)</h3>
                        <p className="text-sm text-gray-500">Quản lý các slot làm việc cố định hàng tuần.</p>
                    </div>
                    <div className="flex gap-2">
                        {selectedPatternIds.length > 0 && (
                            <button onClick={handleBulkDeleteClick} className="flex items-center px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 shadow-sm animate-in fade-in">
                                <Trash2 className="w-4 h-4 mr-2" /> Xóa ({selectedPatternIds.length})
                            </button>
                        )}
                        <button onClick={() => setShowImport(true)} className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 shadow-sm">
                            <FileSpreadsheet className="w-4 h-4 mr-2" /> Nhập Excel
                        </button>
                        <button onClick={() => setEditingPattern({ dayIndex: 0, shift: 'Sáng', requiredCount: 1 })} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 shadow-sm">
                            <Plus className="w-4 h-4 mr-2" /> Thêm mẫu
                        </button>
                        <button onClick={() => setIsConfigMode(false)} className="flex items-center px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 shadow-sm">
                            <X className="w-4 h-4 mr-2" /> Đóng
                        </button>
                    </div>
                </div>

                <div className="flex gap-4 items-center bg-gray-50 p-2 rounded border flex-wrap">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Tìm nhanh mẫu..."
                            className="w-full pl-9 pr-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            value={patternSearchQuery}
                            onChange={(e) => setPatternSearchQuery(e.target.value)}
                        />
                        {patternSearchQuery && (
                            <button onClick={() => setPatternSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">✕</button>
                        )}
                    </div>
                    <div className="flex items-center gap-2"><Filter className="w-4 h-4 text-gray-500" /><span className="text-sm font-medium text-gray-700">Bộ lọc:</span></div>
                    <select className="border rounded px-2 py-1.5 text-sm outline-none" value={configFilterDay} onChange={e => setConfigFilterDay(e.target.value)}><option value="All">Tất cả các Thứ</option>{dayNames.map(d => <option key={d} value={d}>{d}</option>)}</select>
                    <select className="border rounded px-2 py-1.5 text-sm outline-none" value={configFilterShift} onChange={e => setConfigFilterShift(e.target.value)}><option value="All">Tất cả các Buổi</option>{shifts.map(s => <option key={s} value={s}>{s}</option>)}</select>
                    <div className="flex-1"></div><div className="text-sm text-gray-500">Hiển thị {sortedPatterns.length} mẫu</div>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-4 pb-24">
                <div className="bg-white rounded shadow border overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100 sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-3 text-center w-12 border-b"><input type="checkbox" className="w-4 h-4 rounded border-gray-300" checked={isAllSelected} onChange={handleSelectAll} /></th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase border-b">Thứ</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase border-b">Buổi</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase border-b">Công việc</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase border-b">Số lượng</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase border-b w-32">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {sortedPatterns.map(p => {
                                const job = jobs.find(j => j.id === p.jobId);
                                const isSelected = selectedPatternIds.includes(p.id);
                                return (
                                    <tr key={p.id} className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}>
                                        <td className="px-4 py-4 text-center"><input type="checkbox" className="w-4 h-4 rounded border-gray-300" checked={isSelected} onChange={() => toggleSelectPattern(p.id)} /></td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{dayNames[p.dayIndex]}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{p.shift}</td>
                                        <td className="px-6 py-4 text-sm text-blue-600 font-bold">{job?.name || 'Unknown Job'}</td>
                                        <td className="px-6 py-4 text-sm text-center">{p.requiredCount}</td>
                                        <td className="px-6 py-4 text-right text-sm font-medium relative z-0">
                                            <button onClick={() => setEditingPattern(p)} className="text-indigo-600 hover:text-indigo-900 mr-2 inline-flex p-1 rounded hover:bg-indigo-50" type="button" title="Sửa"><Edit2 className="w-4 h-4" /></button>
                                            <button onClick={(e) => handleDeleteClick(e, p.id)} className="text-red-600 hover:text-red-900 bg-red-50 p-1.5 rounded-full hover:bg-red-100 transition-colors inline-flex cursor-pointer relative z-10 items-center justify-center" title="Xóa mẫu này" type="button"><Trash2 className="w-4 h-4 pointer-events-none" /></button>
                                        </td>
                                    </tr>
                                )
                            })}
                            {sortedPatterns.length === 0 && (<tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500 italic">Không tìm thấy mẫu lịch nào phù hợp với bộ lọc.</td></tr>)}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* DELETE CONFIRMATION MODAL */}
            {deleteConfirmation && deleteConfirmation.isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 w-full max-w-sm m-4 shadow-xl transform transition-all scale-100">
                        <div className="flex items-center justify-center mb-4 text-red-600">
                            <AlertCircle className="w-12 h-12" />
                        </div>
                        <h3 className="text-lg font-bold text-center mb-2 text-gray-800">Xác nhận xóa</h3>
                        <p className="text-center text-gray-600 mb-6">
                            {deleteConfirmation.type === 'single'
                                ? 'Bạn có chắc chắn muốn xóa mẫu lịch này không?'
                                : `Bạn có chắc chắn muốn xóa ${selectedPatternIds.length} mẫu lịch đã chọn?`
                            }
                        </p>
                        <div className="flex justify-center gap-3">
                            <button
                                onClick={() => setDeleteConfirmation(null)}
                                className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-100 font-medium"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium shadow-md"
                            >
                                Đồng ý Xóa
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Pattern Edit Modal */}
            {editingPattern && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 w-full max-w-lg m-4 shadow-xl">
                        <h3 className="text-lg font-bold mb-4">{editingPattern.id ? 'Sửa' : 'Thêm'} Mẫu Lịch</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-sm font-medium mb-1">Thứ</label><select className="w-full border rounded p-2" value={editingPattern.dayIndex} onChange={e => setEditingPattern({ ...editingPattern, dayIndex: parseInt(e.target.value) })}>{dayNames.map((d, i) => <option key={i} value={i}>{d}</option>)}</select></div>
                            <div><label className="block text-sm font-medium mb-1">Buổi</label><select className="w-full border rounded p-2" value={editingPattern.shift} onChange={e => setEditingPattern({ ...editingPattern, shift: e.target.value as any })}>{shifts.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                            <div className="col-span-2"><label className="block text-sm font-medium mb-1">Công việc</label><select className="w-full border rounded p-2" value={editingPattern.jobId || ''} onChange={e => setEditingPattern({ ...editingPattern, jobId: e.target.value })}><option value="">-- Chọn công việc --</option>{jobs.filter(j => j.isActive).map(j => <option key={j.id} value={j.id}>{j.name}</option>)}</select></div>
                            <div><label className="block text-sm font-medium mb-1">Số lượng nhân sự</label><input type="number" min="1" className="w-full border rounded p-2" value={editingPattern.requiredCount || 1} onChange={e => setEditingPattern({ ...editingPattern, requiredCount: parseInt(e.target.value) })} /></div>
                        </div>
                        <div className="mt-6 flex justify-end gap-2">
                            <button onClick={() => setEditingPattern(null)} className="px-4 py-2 border rounded">Hủy</button>
                            <button onClick={handleSavePattern} className="px-4 py-2 bg-blue-600 text-white rounded">Lưu</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Import Modal */}
            {showImport && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 w-full max-w-xl m-4 shadow-xl">
                        <h3 className="text-lg font-bold mb-2">Nhập mẫu từ Excel</h3>
                        <p className="text-sm text-gray-500 mb-4">Định dạng cột: <strong>Thứ | Buổi | Tên công việc | Số lượng</strong> (ngăn cách bởi Tab hoặc dấu phẩy)<br />VD: <code>Thứ 2   Sáng    AMIS XD    1</code></p>
                        <textarea className="w-full h-64 border rounded p-2 font-mono text-sm" value={importText} onChange={e => setImportText(e.target.value)} placeholder="Dán dữ liệu Excel vào đây..." />
                        <div className="mt-4 flex justify-end gap-2"><button onClick={() => setShowImport(false)} className="px-4 py-2 border rounded">Hủy</button><button onClick={handleImportPatterns} className="px-4 py-2 bg-green-600 text-white rounded">Nhập dữ liệu</button></div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ConfigPatternManager;
