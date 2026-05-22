/**
 * ReviewManager - Coordinator approval tab for Monthly Evaluation
 * Features: List submitted evaluations, view details in drawer, approve/reject with reasons
 */

import React, { useState, useMemo } from 'react';
import { Check, X, Eye, Loader2, Filter, Users, CheckCircle, XCircle, Clock, FileSpreadsheet, Lock } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useEvaluationsQuery, useOpenPeriodQuery } from '../../hooks/useEvaluationQuery';
import { evaluationsService } from '../../services/evaluationService';
import { EmployeeEvaluation, EvaluationGroup, Role } from '../../types';
import { auth } from '../../services/firebaseConfig';
import { isDTGroup, isKSGroup } from '../../utils/permissions';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import EmployeeFormDT from './EmployeeFormDT';
import EmployeeFormKS from './EmployeeFormKS';
import { exportEvaluationData } from '../../services/evaluationExportService';
import { startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';

type StatusFilter = 'all' | 'submitted' | 'approved' | 'rejected';
type GroupFilter = 'all' | 'ONB_DT' | 'ONB_KS';

const STATUS_CONFIG = {
    pending: { label: 'Nháp', color: 'bg-gray-100 text-gray-600', icon: Clock },
    submitted: { label: 'Chờ duyệt', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
    approved: { label: 'Đã duyệt', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    rejected: { label: 'Từ chối', color: 'bg-red-100 text-red-700', icon: XCircle },
};

export default function ReviewManager() {
    const { employees } = useData();
    const { data: openPeriod, isLoading: loadingPeriod } = useOpenPeriodQuery();
    const { data: allEvaluations = [], isLoading: loadingEvals } = useEvaluationsQuery(openPeriod?.id);
    const queryClient = useQueryClient();

    const currentUser = auth.currentUser;
    const currentEmployee = employees.find(e => e.email?.toLowerCase() === currentUser?.email?.toLowerCase());

    // State
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('submitted');
    const [groupFilter, setGroupFilter] = useState<GroupFilter>('all');
    const [selectedEval, setSelectedEval] = useState<EmployeeEvaluation | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isProcessing, setIsProcessing] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [evalToReject, setEvalToReject] = useState<EmployeeEvaluation | null>(null);

    // Cross-check: build set of employee IDs that currently have an evaluation group
    const employeesWithGroup = useMemo(() => {
        return new Set(employees.filter(e => e.evaluationGroup).map(e => e.id));
    }, [employees]);

    // Valid evaluations: only those whose employee still has a group in Employee Manager
    const validEvaluations = useMemo(() => {
        return allEvaluations.filter(e => e.evaluationGroup && employeesWithGroup.has(e.employeeId));
    }, [allEvaluations, employeesWithGroup]);

    // Stale evaluations: employee no longer has a group
    const staleEvaluations = useMemo(() => {
        return allEvaluations.filter(e => e.evaluationGroup && !employeesWithGroup.has(e.employeeId));
    }, [allEvaluations, employeesWithGroup]);

    // Filtered evaluations
    const filteredEvaluations = useMemo(() => {
        return validEvaluations.filter(evaluation => {
            // Status filter
            if (statusFilter !== 'all' && evaluation.status !== statusFilter) return false;

            // Group filter - use defensive check
            if (groupFilter === 'ONB_DT' && !isDTGroup(evaluation.evaluationGroup)) return false;
            if (groupFilter === 'ONB_KS' && !isKSGroup(evaluation.evaluationGroup)) return false;

            return true;
        });
    }, [validEvaluations, statusFilter, groupFilter]);

    // Check if ALL valid evaluations are approved (for lock button)
    const allApproved = useMemo(() => {
        return validEvaluations.length > 0 && validEvaluations.every(e => e.status === 'approved');
    }, [validEvaluations]);

    // Check if period is already locked
    const isPeriodLocked = !!openPeriod?.lockedAt;

    // Top 3 performers by completion rate
    const top3Performers = useMemo(() => {
        return validEvaluations
            .filter(e => e.evaluationGroup && e.summary?.overallRate !== undefined && e.summary.overallRate > 0)
            .sort((a, b) => (b.summary?.overallRate || 0) - (a.summary?.overallRate || 0))
            .slice(0, 3)
            .map((ev, index) => ({
                rank: index + 1,
                employeeId: ev.employeeId,
                employeeName: employees.find(e => e.id === ev.employeeId)?.fullName || 'Unknown',
                overallRate: ev.summary?.overallRate || 0,
                group: ev.evaluationGroup,
                result: ev.summary?.result || '-'
            }));
    }, [validEvaluations, employees]);

    // Get employee name
    const getEmployeeName = (employeeId: string) => {
        return employees.find(e => e.id === employeeId)?.fullName || 'Unknown';
    };

    // Handle approve single
    const handleApprove = async (evaluation: EmployeeEvaluation) => {
        if (!currentEmployee) return;
        setIsProcessing(true);
        try {
            await evaluationsService.approve(evaluation.id, currentEmployee.id);
            queryClient.invalidateQueries({ queryKey: ['evaluations', openPeriod?.id] });
            toast.success(`Đã duyệt đánh giá của ${getEmployeeName(evaluation.employeeId)}`);
            setSelectedEval(null);
        } catch (error) {
            console.error('Approve error:', error);
            toast.error('Lỗi khi duyệt đánh giá');
        } finally {
            setIsProcessing(false);
        }
    };

    // Handle reject
    const handleReject = async () => {
        if (!evalToReject || !rejectReason.trim()) {
            toast.error('Vui lòng nhập lý do từ chối');
            return;
        }
        setIsProcessing(true);
        try {
            await evaluationsService.reject(evalToReject.id, rejectReason);
            queryClient.invalidateQueries({ queryKey: ['evaluations', openPeriod?.id] });
            toast.success(`Đã từ chối đánh giá của ${getEmployeeName(evalToReject.employeeId)}`);
            setShowRejectModal(false);
            setRejectReason('');
            setEvalToReject(null);
            setSelectedEval(null);
        } catch (error) {
            console.error('Reject error:', error);
            toast.error('Lỗi khi từ chối đánh giá');
        } finally {
            setIsProcessing(false);
        }
    };

    // Handle bulk approve
    const handleBulkApprove = async () => {
        if (selectedIds.size === 0 || !currentEmployee) return;
        if (!confirm(`Bạn có chắc muốn duyệt ${selectedIds.size} đánh giá?`)) return;

        setIsProcessing(true);
        try {
            await evaluationsService.bulkApprove(Array.from(selectedIds), currentEmployee.id);
            queryClient.invalidateQueries({ queryKey: ['evaluations', openPeriod?.id] });
            toast.success(`Đã duyệt ${selectedIds.size} đánh giá`);
            setSelectedIds(new Set());
        } catch (error) {
            console.error('Bulk approve error:', error);
            toast.error('Lỗi khi duyệt hàng loạt');
        } finally {
            setIsProcessing(false);
        }
    };

    // Handle lock period
    const handleLockPeriod = async () => {
        if (!openPeriod || !currentEmployee) return;
        if (!confirm('🔒 Khóa đợt đánh giá này?\n\nSau khi khóa, toàn bộ config sẽ được snapshot và không thể thay đổi.\nDữ liệu đánh giá sẽ được bảo toàn vĩnh viễn.')) return;

        setIsProcessing(true);
        try {
            await evaluationsService.lockPeriod(openPeriod.id, currentEmployee.id);
            queryClient.invalidateQueries({ queryKey: ['evaluations', openPeriod?.id] });
            queryClient.invalidateQueries({ queryKey: ['evaluation-periods'] });
            queryClient.invalidateQueries({ queryKey: ['open-period'] });
            toast.success('🔒 Đã khóa đợt đánh giá thành công!');
        } catch (error: any) {
            console.error('Lock period error:', error);
            toast.error(error.message || 'Lỗi khi khóa đợt đánh giá');
        } finally {
            setIsProcessing(false);
        }
    };

    // Handle cleanup stale evaluations
    const handleCleanupStale = async () => {
        if (staleEvaluations.length === 0) return;
        const names = staleEvaluations.map(e => employees.find(emp => emp.id === e.employeeId)?.fullName || e.employeeId).join(', ');
        if (!confirm(`Xóa ${staleEvaluations.length} đánh giá cũ của nhân viên không còn nhóm:\n${names}`)) return;

        setIsProcessing(true);
        try {
            await evaluationsService.deleteMany(staleEvaluations.map(e => e.id));
            queryClient.invalidateQueries({ queryKey: ['evaluations', openPeriod?.id] });
            toast.success(`Đã xóa ${staleEvaluations.length} đánh giá cũ`);
        } catch (error) {
            console.error('Cleanup error:', error);
            toast.error('Lỗi khi xóa đánh giá cũ');
        } finally {
            setIsProcessing(false);
        }
    };

    // Toggle selection
    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    // Select all submitted
    const toggleSelectAll = () => {
        const submittedIds = filteredEvaluations
            .filter(e => e.status === 'submitted')
            .map(e => e.id);

        if (selectedIds.size === submittedIds.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(submittedIds));
        }
    };

    // ========== EXCEL EXPORT LOGIC ==========
    const handleExport = () => {
        if (!openPeriod) return;

        const periodStart = startOfMonth(new Date(openPeriod.year, openPeriod.month - 1));
        const periodEnd = endOfMonth(periodStart);
        const planRate = openPeriod.dtConfig?.kpiPlanRate || 95;

        // Filter DT employees and their evaluations
        const dtEmployees = employees.filter(e => isDTGroup(e.evaluationGroup));
        const dtEvaluations = allEvaluations.filter(ev => isDTGroup(ev.evaluationGroup));

        // Build summary rows
        const summaryRows = dtEvaluations.map(ev => {
            const emp = employees.find(e => e.id === ev.employeeId);
            const kpi = ev.dtKpiData;
            const summary = ev.summary;
            return {
                employeeName: emp?.fullName || 'Unknown',
                kpiPlanRate: planRate,
                kpiActualRate: kpi?.actualRate || 0,
                kpiCompletionRate: kpi?.completionRate || 0,
                workPlanPoints: emp?.monthlyKpiTarget || 100,
                workActualPoints: summary?.totalWorkPoints || 0,
                workCompletionRate: summary?.workCompletionRate || 0,
                overallRate: summary?.overallRate || 0,
                rating: summary?.result || 'Cần cố gắng'
            };
        });

        // Build KPI rows
        const kpiRows = dtEvaluations.map(ev => {
            const emp = employees.find(e => e.id === ev.employeeId);
            const kpi = ev.dtKpiData;
            return {
                employeeName: emp?.fullName || 'Unknown',
                received: kpi?.received || 0,
                notUsedExcluded: kpi?.notUsedExcluded || 0,
                stoppedExcluded: kpi?.stoppedExcluded || 0,
                active: kpi?.active || 0,
                excluded: kpi?.excluded || 0,
                calculated: kpi?.calculated || 0,
                actualRate: kpi?.actualRate || 0,
                planRate: planRate,
                completionRate: kpi?.completionRate || 0
            };
        });

        // Build work points rows
        const workPointsRows = dtEvaluations.map(ev => {
            const emp = employees.find(e => e.id === ev.employeeId);
            const summary = ev.summary;

            // Calculate individual point categories from metricData
            let totalCrmPoints = 0, totalOtherPoints = 0, totalViolationPoints = 0;
            if (ev.metricData) {
                Object.entries(ev.metricData).forEach(([key, m]: [string, any]) => {
                    const pts = m.points || 0;
                    if (key.startsWith('the_') && key !== 'the_chua_cham_soc') totalCrmPoints += pts;
                    else if (key === 'lam_tai_lieu' || key === 'cong_viec_khac') totalOtherPoints += pts;
                    else if (key === 'the_chua_cham_soc' || key === 'di_muon') totalViolationPoints += pts;
                });
            }

            // Training points from livechatData (if available) or estimate
            let trainingPoints = 0, livechatPoints = 0;
            if (ev.livechatData) {
                // Sum up session points
                Object.values(ev.livechatData).forEach((data: any) => {
                    trainingPoints += data.points || 0;
                });
            }

            // Get livechat points from difficulty
            if (ev.livechatDifficulty) {
                const diff = ev.livechatDifficulty;
                const converted = (diff.easy || 0) * 1.0 + (diff.medium || 0) * 1.2 + (diff.hard || 0) * 1.5;
                livechatPoints = converted; // Simplified
            }

            const totalWorkPoints = summary?.totalWorkPoints || (trainingPoints + livechatPoints + totalCrmPoints + totalOtherPoints + totalViolationPoints);
            const kpiTarget = emp?.monthlyKpiTarget || 100;
            const completionRate = kpiTarget > 0 ? (totalWorkPoints / kpiTarget) * 100 : 0;

            return {
                employeeName: emp?.fullName || 'Unknown',
                trainingPoints,
                livechatPoints,
                totalCrmPoints,
                totalOtherPoints,
                totalViolationPoints,
                totalWorkPoints,
                kpiTarget,
                completionRate
            };
        });

        exportEvaluationData({
            month: openPeriod.month,
            year: openPeriod.year,
            summaryRows,
            kpiRows,
            workPointsRows
        });

        toast.success('Đã xuất file Excel!');
    };

    // Loading state
    if (loadingPeriod || loadingEvals) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <span className="ml-2">Đang tải...</span>
            </div>
        );
    }

    if (!openPeriod) {
        return (
            <div className="text-center py-8 text-gray-500">
                <p className="text-lg font-medium">Chưa có đợt đánh giá nào đang mở</p>
            </div>
        );
    }

    // Stats
    const stats = {
        total: validEvaluations.length,
        submitted: validEvaluations.filter(e => e.status === 'submitted').length,
        approved: validEvaluations.filter(e => e.status === 'approved').length,
        rejected: validEvaluations.filter(e => e.status === 'rejected').length,
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Duyệt Đánh Giá - {openPeriod.name}
                </h3>

                <div className="flex items-center gap-3">
                    {/* Lock Period Button */}
                    {allApproved && !isPeriodLocked && (
                        <button
                            onClick={handleLockPeriod}
                            disabled={isProcessing}
                            className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium disabled:opacity-50"
                            title="Khóa đợt đánh giá - snapshot config vĩnh viễn"
                        >
                            <Lock className="w-4 h-4" />
                            Khóa đợt ĐG
                        </button>
                    )}

                    {/* Locked Badge */}
                    {isPeriodLocked && (
                        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-800 rounded-lg text-sm font-medium border border-amber-300">
                            <Lock className="w-4 h-4" />
                            Đã khóa
                        </span>
                    )}

                    {/* Excel Export Button */}
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                        title="Xuất báo cáo đánh giá ra Excel"
                    >
                        <FileSpreadsheet className="w-4 h-4" />
                        Xuất Excel
                    </button>

                    {/* Stats */}
                    <div className="flex gap-2 text-sm">
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded">
                            Chờ duyệt: {stats.submitted}
                        </span>
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                            Đã duyệt: {stats.approved}
                        </span>
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded">
                            Từ chối: {stats.rejected}
                        </span>
                    </div>
                </div>
            </div>

            {/* Stale Evaluations Warning */}
            {staleEvaluations.length > 0 && (
                <div className="flex items-center justify-between px-4 py-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-sm text-orange-700">
                        ⚠️ Có <strong>{staleEvaluations.length}</strong> đánh giá cũ của nhân viên không còn nhóm đánh giá
                    </p>
                    <button
                        onClick={handleCleanupStale}
                        disabled={isProcessing}
                        className="px-3 py-1.5 bg-orange-600 text-white text-xs font-medium rounded hover:bg-orange-700 transition-colors disabled:opacity-50"
                    >
                        Xóa dữ liệu cũ
                    </button>
                </div>
            )}

            {/* Top 3 Performers */}
            {top3Performers.length > 0 && (
                <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-lg p-4">
                    <h4 className="text-sm font-bold text-amber-800 mb-3 flex items-center gap-2">
                        🏆 Top 3 Tỷ Lệ Hoàn Thành
                    </h4>
                    <div className="flex flex-wrap gap-4">
                        {top3Performers.map(p => (
                            <div
                                key={p.employeeId}
                                className={`flex items-center gap-3 bg-white rounded-lg px-4 py-2 shadow-sm border ${p.rank === 1 ? 'border-yellow-400' :
                                    p.rank === 2 ? 'border-gray-300' : 'border-amber-600'
                                    }`}
                            >
                                <span className="text-2xl">
                                    {p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : '🥉'}
                                </span>
                                <div>
                                    <div className="font-semibold text-gray-800">{p.employeeName}</div>
                                    <div className="text-sm text-gray-500 flex items-center gap-2">
                                        <span className="font-bold text-green-600">{p.overallRate.toFixed(1)}%</span>
                                        <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100">
                                            {isDTGroup(p.group) ? 'DT' : 'KS'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-4 bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                        className="text-sm border rounded px-2 py-1"
                        aria-label="Lọc theo trạng thái"
                    >
                        <option value="all">Tất cả trạng thái</option>
                        <option value="submitted">Chờ duyệt</option>
                        <option value="approved">Đã duyệt</option>
                        <option value="rejected">Từ chối</option>
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={groupFilter}
                        onChange={(e) => setGroupFilter(e.target.value as GroupFilter)}
                        className="text-sm border rounded px-2 py-1"
                        aria-label="Lọc theo nhóm"
                    >
                        <option value="all">Tất cả nhóm</option>
                        <option value="ONB_DT">ONB_DT (Chuyển giao)</option>
                        <option value="ONB_KS">ONB_KS (Kiểm soát)</option>
                    </select>
                </div>

                {/* Bulk actions */}
                {selectedIds.size > 0 && (
                    <button
                        onClick={handleBulkApprove}
                        disabled={isProcessing}
                        className="ml-auto px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                    >
                        <Check className="w-4 h-4" />
                        Duyệt {selectedIds.size} đánh giá
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-2 w-10">
                                <input
                                    type="checkbox"
                                    checked={selectedIds.size > 0 && selectedIds.size === filteredEvaluations.filter(e => e.status === 'submitted').length}
                                    onChange={toggleSelectAll}
                                    className="rounded"
                                    aria-label="Chọn tất cả"
                                />
                            </th>
                            <th className="p-2 text-left">Nhân viên</th>
                            <th className="p-2 text-center">Nhóm</th>
                            <th className="p-2 text-center">Tỷ lệ HT</th>
                            <th className="p-2 text-center">Xếp hạng</th>
                            <th className="p-2 text-center">Trạng thái</th>
                            <th className="p-2 text-center">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredEvaluations.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="p-8 text-center text-gray-500">
                                    Không có đánh giá nào phù hợp với bộ lọc
                                </td>
                            </tr>
                        ) : (
                            filteredEvaluations.map(evaluation => {
                                const employee = employees.find(e => e.id === evaluation.employeeId);
                                const status = STATUS_CONFIG[evaluation.status] || STATUS_CONFIG.pending;
                                const StatusIcon = status.icon;
                                const overallRate = evaluation.summary?.overallRate || 0;
                                const result = evaluation.summary?.result || '-';

                                return (
                                    <tr key={evaluation.id} className="border-t hover:bg-gray-50">
                                        <td className="p-2 text-center">
                                            {evaluation.status === 'submitted' && (
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(evaluation.id)}
                                                    onChange={() => toggleSelect(evaluation.id)}
                                                    className="rounded"
                                                />
                                            )}
                                        </td>
                                        <td className="p-2 font-medium">{employee?.fullName || 'Unknown'}</td>
                                        <td className="p-2 text-center">
                                            <span className={`px-2 py-1 rounded text-xs ${isDTGroup(evaluation.evaluationGroup)
                                                ? 'bg-blue-100 text-blue-700'
                                                : 'bg-purple-100 text-purple-700'
                                                }`}>
                                                {isDTGroup(evaluation.evaluationGroup) ? 'Chuyển giao' : 'Kiểm soát'}
                                            </span>
                                        </td>
                                        <td className="p-2 text-center font-bold">{overallRate.toFixed(1)}%</td>
                                        <td className="p-2 text-center">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${result === 'Vượt mong đợi' ? 'bg-green-100 text-green-700' :
                                                result === 'Đạt' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                {result}
                                            </span>
                                        </td>
                                        <td className="p-2 text-center">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${status.color}`}>
                                                <StatusIcon className="w-3 h-3" />
                                                {status.label}
                                            </span>
                                        </td>
                                        <td className="p-2 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    onClick={() => setSelectedEval(evaluation)}
                                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                                    title="Xem chi tiết"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                {evaluation.status === 'submitted' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleApprove(evaluation)}
                                                            disabled={isProcessing}
                                                            className="p-1 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
                                                            title="Duyệt"
                                                        >
                                                            <Check className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setEvalToReject(evaluation);
                                                                setShowRejectModal(true);
                                                            }}
                                                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                            title="Từ chối"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Detail Drawer */}
            {selectedEval && (
                <div className="fixed inset-0 z-50 flex">
                    {/* Backdrop */}
                    <div
                        className="flex-1 bg-black/30"
                        onClick={() => setSelectedEval(null)}
                    />
                    {/* Drawer */}
                    <div className="w-full max-w-4xl bg-white shadow-xl overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between z-10">
                            <h4 className="font-bold text-lg">
                                Chi tiết đánh giá: {getEmployeeName(selectedEval.employeeId)}
                            </h4>
                            <div className="flex items-center gap-2">
                                {selectedEval.status === 'submitted' && (
                                    <>
                                        <button
                                            onClick={() => handleApprove(selectedEval)}
                                            disabled={isProcessing}
                                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                                        >
                                            <Check className="w-4 h-4" /> Duyệt
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEvalToReject(selectedEval);
                                                setShowRejectModal(true);
                                            }}
                                            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-1"
                                        >
                                            <X className="w-4 h-4" /> Từ chối
                                        </button>
                                    </>
                                )}
                                <button
                                    onClick={() => setSelectedEval(null)}
                                    className="p-1 hover:bg-gray-100 rounded"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className="p-4">
                            {isDTGroup(selectedEval.evaluationGroup) ? (
                                <EmployeeFormDT readOnly employeeId={selectedEval.employeeId} periodId={selectedEval.periodId} />
                            ) : (
                                <EmployeeFormKS readOnly />
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && evalToReject && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                        <div className="p-4 border-b">
                            <h4 className="font-bold text-lg text-red-700">
                                Từ chối đánh giá
                            </h4>
                            <p className="text-sm text-gray-600">
                                Nhân viên: {getEmployeeName(evalToReject.employeeId)}
                            </p>
                        </div>
                        <div className="p-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Lý do từ chối <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Nhập lý do từ chối (bắt buộc)..."
                                className="w-full border rounded-lg p-2 text-sm min-h-[100px]"
                                required
                            />
                        </div>
                        <div className="flex gap-2 p-4 bg-gray-50 justify-end">
                            <button
                                onClick={() => {
                                    setShowRejectModal(false);
                                    setRejectReason('');
                                    setEvalToReject(null);
                                }}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={isProcessing || !rejectReason.trim()}
                                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                            >
                                Xác nhận từ chối
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
