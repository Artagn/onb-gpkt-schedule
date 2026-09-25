
import React, { useEffect, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Wand2, Settings, Loader2, Unlock, Trash2, Download } from 'lucide-react';
import { format, addDays } from 'date-fns';
import toast from 'react-hot-toast';
import { Employee, Job, ScheduleItem, SchedulePattern, WorkPeriod, Holiday, LeaveRequest, Role } from '../../types';
import { useFixedSchedule } from './useFixedSchedule';
import ScheduleMatrix from './ScheduleMatrix';
import ConfigPatternManager from './ConfigPatternManager';
import { AssignModal, SecurityModal, ExportFreeScheduleModal } from './Modals';
import PreviewModal from './PreviewModal';
import { exportFreeEmployeesByDate } from '../../services/excelExportService';

interface Props {
    employees: Employee[];
    setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
    jobs: Job[];
    schedule: ScheduleItem[];
    setSchedule: React.Dispatch<React.SetStateAction<ScheduleItem[]>>;
    patterns: SchedulePattern[];
    setPatterns: React.Dispatch<React.SetStateAction<SchedulePattern[]>>;
    workPeriods: WorkPeriod[];
    holidays: Holiday[];
    leaves: LeaveRequest[];
    setLeaves: React.Dispatch<React.SetStateAction<LeaveRequest[]>>;
    currentUserRole: Role;
    user: any;
}

const FixedSchedule: React.FC<Props> = ({
    employees, setEmployees, jobs, schedule, setSchedule, patterns, setPatterns,
    workPeriods, holidays, leaves, setLeaves, currentUserRole, user
}) => {
    const {
        // State
        jobGroups,
        selectedDate, setSelectedDate,
        isConfigMode, setIsConfigMode,
        showAssignModal, setShowAssignModal,
        isScheduling,
        editingPattern, setEditingPattern,
        showImport, setShowImport,
        importText, setImportText,
        configFilterDay, setConfigFilterDay,
        configFilterShift, setConfigFilterShift,
        patternSearchQuery, setPatternSearchQuery,
        selectedPatternIds, setSelectedPatternIds,
        deleteConfirmation, setDeleteConfirmation,
        showSecurityModal, setShowSecurityModal,
        securityCodeInput, setSecurityCodeInput,
        securityError, setSecurityError,
        // Preview Mode State
        showPreviewModal, setShowPreviewModal,
        previewResult,
        // Computed
        startOfCurrentWeek, weekDays, activeEmployees, canEdit,
        isPastWeek, isWeekUnlocked, isWeekEditable,
        scheduleMap, leaveMap,
        // Helpers
        getJobStyle, isWorkShiftActive, createRestItem,
        // Handlers
        toggleWeekLock, clearWeekSchedule,
        runPreview, applySchedule, confirmAutoSchedule, confirmDelete,
        handleSavePattern, handleImportPatterns,
        // Copy-Paste
        selectedCell, setSelectedCell, clipboard, copyCell, pasteCell
    } = useFixedSchedule(
        employees, setEmployees, jobs, schedule, setSchedule, patterns, setPatterns,
        workPeriods, holidays, leaves, setLeaves, currentUserRole, user
    );

    const shifts = ['Sáng', 'Chiều', 'Tối'];

    const [showExportFreeModal, setShowExportFreeModal] = useState(false);

    const handleExportFreeSchedule = (dateStr: string) => {
        const rowCount = exportFreeEmployeesByDate(activeEmployees, jobs, schedule, leaves, dateStr);
        setShowExportFreeModal(false);
        if (rowCount === 0) {
            toast.error('Không có nhân viên nào trống lịch trong ngày đã chọn.');
        } else {
            toast.success(`Đã xuất danh sách ${rowCount} nhân viên trống lịch.`);
        }
    };

    // Keyboard shortcuts for copy/paste
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isWeekEditable) return;
            if (e.ctrlKey && e.key === 'c') {
                e.preventDefault();
                copyCell();
            }
            if (e.ctrlKey && e.key === 'v') {
                e.preventDefault();
                pasteCell();
            }
            if (e.key === 'Escape') {
                setSelectedCell(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isWeekEditable, copyCell, pasteCell, setSelectedCell]);

    if (isConfigMode) {
        return (
            <ConfigPatternManager
                patterns={patterns}
                jobs={jobs}
                configFilterDay={configFilterDay}
                setConfigFilterDay={setConfigFilterDay}
                configFilterShift={configFilterShift}
                setConfigFilterShift={setConfigFilterShift}
                patternSearchQuery={patternSearchQuery}
                setPatternSearchQuery={setPatternSearchQuery}
                selectedPatternIds={selectedPatternIds}
                setSelectedPatternIds={setSelectedPatternIds}
                setEditingPattern={setEditingPattern}
                setIsConfigMode={setIsConfigMode}
                setShowImport={setShowImport}
                handleBulkDeleteClick={() => setDeleteConfirmation({ isOpen: true, type: 'bulk' })}
                handleDeleteClick={(e, id) => { e.stopPropagation(); setDeleteConfirmation({ isOpen: true, type: 'single', id }); }}
                deleteConfirmation={deleteConfirmation}
                setDeleteConfirmation={setDeleteConfirmation}
                confirmDelete={confirmDelete}
                editingPattern={editingPattern}
                handleSavePattern={handleSavePattern}
                showImport={showImport}
                importText={importText}
                setImportText={setImportText}
                handleImportPatterns={handleImportPatterns}
            />
        );
    }

    return (
        <div className="bg-white rounded-lg shadow flex flex-col h-full relative">
            {/* TOP BAR */}
            <div className="p-4 border-b flex flex-col lg:flex-row justify-between items-center bg-gray-50 gap-4 lg:gap-0">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-bold flex items-center"><Calendar className="mr-2" /> Điều phối Lịch</h2>
                    <div className="flex items-center bg-white border rounded px-2">
                        <button onClick={() => setSelectedDate(addDays(selectedDate, -7))} className="p-1 hover:bg-gray-100 rounded"><ChevronLeft className="w-4 h-4" /></button>
                        <span className="px-3 py-1 font-medium text-sm">Tuần {format(startOfCurrentWeek, 'dd/MM/yyyy')} - {format(addDays(startOfCurrentWeek, 6), 'dd/MM/yyyy')}</span>
                        <button onClick={() => setSelectedDate(addDays(selectedDate, 7))} className="p-1 hover:bg-gray-100 rounded"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                    <div className="hidden xl:flex gap-3 text-[10px] ml-4 border-l pl-4">
                        {jobGroups.filter(g => g.isActive).sort((a, b) => a.order - b.order).map(group => (
                            <div key={group.id} className="flex items-center">
                                <span className={`w-2.5 h-2.5 rounded mr-1 ${group.colorClass} border border-opacity-30 border-gray-400`}></span>
                                {group.name}
                            </div>
                        ))}
                    </div>
                </div>

                {/* ACTIONS */}
                {canEdit ? (
                    <div className="flex gap-2">
                        {isPastWeek && (
                            <button
                                onClick={toggleWeekLock}
                                className={`flex items-center px-3 py-1.5 rounded text-sm font-medium transition-colors shadow-sm ${isWeekUnlocked ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-300' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                                title={isWeekUnlocked ? 'Khóa lại tuần này' : 'Mở khóa để chỉnh sửa'}
                            >
                                {isWeekUnlocked ? <Unlock className="w-4 h-4 mr-2" /> : <span className="mr-2">🔒</span>}
                                {isWeekUnlocked ? 'Khóa tuần' : 'Mở khóa'}
                            </button>
                        )}
                        <button
                            disabled={!isWeekEditable}
                            onClick={clearWeekSchedule}
                            className="flex items-center bg-red-100 text-red-700 px-3 py-1.5 rounded hover:bg-red-200 text-sm font-medium transition-colors shadow-sm disabled:opacity-50 border border-red-200"
                            title={!isWeekEditable ? 'Tuần đã khóa' : 'Xóa tất cả lịch trong tuần này'}
                        >
                            <Trash2 className="w-4 h-4 mr-2" /> Xóa lịch tuần
                        </button>
                        <button onClick={() => setIsConfigMode(true)} className="flex items-center bg-gray-200 text-gray-800 px-3 py-1.5 rounded hover:bg-gray-300 text-sm font-medium transition-colors shadow-sm" title="Cấu hình Lịch mẫu cố định">
                            <Settings className="w-4 h-4 mr-2" /> Cấu hình Mẫu
                        </button>
                        <button disabled={isScheduling || !isWeekEditable} onClick={() => { setSecurityCodeInput(''); setSecurityError(''); setShowSecurityModal(true); }} className="flex items-center bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700 text-sm font-medium transition-colors shadow-sm disabled:opacity-50" title={!isWeekEditable ? 'Tuần đã khóa - Nhấn Mở khóa để chỉnh sửa' : 'Tự động xếp lịch'}>
                            {isScheduling ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />} Tự động xếp lịch
                        </button>
                        <button onClick={() => setShowExportFreeModal(true)} className="flex items-center bg-green-100 text-green-700 px-3 py-1.5 rounded hover:bg-green-200 text-sm font-medium transition-colors shadow-sm border border-green-200" title="Xuất danh sách nhân viên trống lịch theo ngày">
                            <Download className="w-4 h-4 mr-2" /> Xuất DS trống lịch
                        </button>
                    </div>
                ) : (
                    <div className="text-sm text-gray-500 italic bg-yellow-50 px-3 py-2 rounded border border-yellow-200 flex items-center gap-2">
                        <span>🔒</span>
                        <span>Bạn đang ở chế độ <strong>Xem</strong>. Chỉ Điều phối viên mới có thể chỉnh sửa lịch.</span>
                    </div>
                )}
            </div>

            {/* MATRIX */}
            <ScheduleMatrix
                activeEmployees={activeEmployees}
                weekDays={weekDays}
                shifts={shifts}
                holidays={holidays}
                jobs={jobs}
                isWeekEditable={isWeekEditable}
                selectedCell={selectedCell}
                scheduleMap={scheduleMap}
                leaveMap={leaveMap}
                onCellClick={(day, shift, empId) => setShowAssignModal({ day, shift, empId })}
                onCellSelect={(day, shift, empId) => setSelectedCell({ day, shift, empId })}
                getJobStyle={getJobStyle}
            />

            {/* MODALS */}
            <SecurityModal
                show={showSecurityModal}
                onClose={() => setShowSecurityModal(false)}
                onConfirm={confirmAutoSchedule}
                codeInput={securityCodeInput}
                setCodeInput={setSecurityCodeInput}
                error={securityError}
            />

            <AssignModal
                showModal={showAssignModal}
                onClose={() => setShowAssignModal(null)}
                activeEmployees={activeEmployees}
                schedule={schedule}
                setSchedule={setSchedule}
                leaves={leaves}
                setLeaves={setLeaves}
                jobs={jobs}
                patterns={patterns}
                canEdit={canEdit}
                getJobStyle={getJobStyle}
                isWorkShiftActive={isWorkShiftActive}
                createRestItem={createRestItem}
            />

            {/* EXPORT FREE SCHEDULE MODAL */}
            <ExportFreeScheduleModal
                show={showExportFreeModal}
                onClose={() => setShowExportFreeModal(false)}
                onExport={handleExportFreeSchedule}
            />

            {/* PREVIEW MODAL */}
            <PreviewModal
                show={showPreviewModal}
                stats={previewResult?.stats || null}
                onClose={() => setShowPreviewModal(false)}
                onApply={applySchedule}
                isApplying={isScheduling}
            />
        </div>
    );
};

export default FixedSchedule;
