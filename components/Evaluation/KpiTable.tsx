/**
 * KpiTable.tsx - Shared KPI Table for ONB_DT Evaluation
 * Staff: sees only their row
 * Coordinator: sees all employees in ONB_DT group
 */

import React, { useMemo, useState, useEffect } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useEvaluationsQuery, useEvaluationMutation } from '../../hooks/useEvaluationQuery';
import { EvaluationPeriod, EmployeeEvaluation, Role } from '../../types';
import { auth } from '../../services/firebaseConfig';
import { isDTGroup } from '../../utils/permissions';
import toast from 'react-hot-toast';

interface KpiTableProps {
    openPeriod: EvaluationPeriod;
    employeeId?: string; // For review mode - show only this employee
}

interface KpiRowData {
    employeeId: string;
    employeeName: string;
    received: number;
    notUsedExcluded: number;
    stoppedExcluded: number;
    active: number;
    // Auto-calculated
    excluded: number;
    calculated: number;
    actualRate: number;
    planRate: number;
    completionRate: number;
    // State
    isDirty: boolean;
    existingEval?: EmployeeEvaluation;
}

const KpiTable: React.FC<KpiTableProps> = ({ openPeriod, employeeId }) => {
    const { employees } = useData();
    const { data: allEvaluations = [], isLoading } = useEvaluationsQuery(openPeriod.id);
    const { saveMutation } = useEvaluationMutation();

    const currentUser = auth.currentUser;
    const currentEmployee = useMemo(() =>
        employees.find(e => e.email?.toLowerCase() === currentUser?.email?.toLowerCase()),
        [employees, currentUser]
    );

    const isCoordinator = currentEmployee?.role === Role.Coordinator || currentEmployee?.role === Role.Admin;
    const planRate = openPeriod.dtConfig?.kpiPlanRate || 95;

    // Filter employees in ONB_DT group
    // Priority: If employeeId prop passed (review mode), show only that employee
    const dtEmployees = useMemo(() => {
        const filtered = employees.filter(e => isDTGroup(e.evaluationGroup));
        // Review mode: show only the specific employee
        if (employeeId) {
            return filtered.filter(e => e.id === employeeId);
        }
        if (isCoordinator) {
            return filtered;
        }
        // Staff only sees themselves
        return filtered.filter(e => e.id === currentEmployee?.id);
    }, [employees, isCoordinator, currentEmployee, employeeId]);

    // Build row data with existing evaluations
    const [rowData, setRowData] = useState<KpiRowData[]>([]);

    useEffect(() => {
        const rows: KpiRowData[] = dtEmployees.map(emp => {
            const existingEval = allEvaluations.find(ev => ev.employeeId === emp.id && isDTGroup(ev.evaluationGroup));
            const kpi = existingEval?.dtKpiData;

            const received = kpi?.received || 0;
            const notUsedExcluded = kpi?.notUsedExcluded || 0;
            const stoppedExcluded = kpi?.stoppedExcluded || 0;
            const active = kpi?.active || 0;

            const excluded = notUsedExcluded + stoppedExcluded;
            const calculated = received - excluded;
            const actualRate = calculated > 0 ? (active / calculated) * 100 : 0;
            const completionRate = planRate > 0 ? (actualRate / planRate) * 100 : 0;

            return {
                employeeId: emp.id,
                employeeName: emp.fullName,
                received,
                notUsedExcluded,
                stoppedExcluded,
                active,
                excluded,
                calculated,
                actualRate,
                planRate,
                completionRate,
                isDirty: false,
                existingEval,
            };
        });
        setRowData(rows);
    }, [dtEmployees, allEvaluations, planRate]);

    // Update row data
    const updateRow = (employeeId: string, field: keyof KpiRowData, value: number) => {
        setRowData(prev => prev.map(row => {
            if (row.employeeId !== employeeId) return row;

            const updated = { ...row, [field]: value, isDirty: true };
            // Recalculate
            updated.excluded = updated.notUsedExcluded + updated.stoppedExcluded;
            updated.calculated = updated.received - updated.excluded;
            updated.actualRate = updated.calculated > 0 ? (updated.active / updated.calculated) * 100 : 0;
            updated.completionRate = planRate > 0 ? (updated.actualRate / planRate) * 100 : 0;
            return updated;
        }));
    };

    // Save individual row
    const saveRow = async (row: KpiRowData) => {
        const emp = dtEmployees.find(e => e.id === row.employeeId);
        if (!emp) return;

        const evaluation: EmployeeEvaluation = {
            id: `${openPeriod.id}_${row.employeeId}`,
            periodId: openPeriod.id,
            employeeId: row.employeeId,
            evaluationGroup: 'ONB_DT',
            status: row.existingEval?.status || 'pending',
            dtKpiData: {
                received: row.received,
                calculated: row.calculated,
                excluded: row.excluded,
                active: row.active,
                notUsedExcluded: row.notUsedExcluded,
                stoppedExcluded: row.stoppedExcluded,
                actualRate: row.actualRate,
                planRate: row.planRate,
                completionRate: row.completionRate,
            },
            metricData: row.existingEval?.metricData || {},
            livechatData: row.existingEval?.livechatData || {},
            summary: row.existingEval?.summary || {
                totalWorkPoints: 0,
                kpiCompletionRate: row.completionRate,
                workCompletionRate: 0,
                overallRate: 0,
                result: 'Cần cố gắng',
            },
        };

        try {
            await saveMutation.mutateAsync(evaluation);
            setRowData(prev => prev.map(r => r.employeeId === row.employeeId ? { ...r, isDirty: false, existingEval: evaluation } : r));
            toast.success(`Đã lưu KPI cho ${emp.fullName}`);
        } catch (e) {
            console.error('Save error:', e);
            toast.error('Lỗi khi lưu');
        }
    };

    // Save all dirty rows
    const saveAllDirty = async () => {
        const dirtyRows = rowData.filter(r => r.isDirty);
        for (const row of dirtyRows) {
            await saveRow(row);
        }
    };

    const hasDirtyRows = rowData.some(r => r.isDirty);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <span className="ml-2">Đang tải...</span>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-600 italic">
                        Tiêu chí tỷ lệ KH sử dụng - Tỉ lệ KH kế hoạch: <strong>{planRate}%</strong>
                    </p>
                </div>
                {hasDirtyRows && (
                    <button
                        onClick={saveAllDirty}
                        disabled={saveMutation.isPending}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Lưu thay đổi
                    </button>
                )}
            </div>

            <div className="border rounded-lg overflow-hidden">
                <div className="max-h-64 overflow-y-auto overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                        <thead className="bg-blue-100 sticky top-0">
                            <tr>
                                <th className="border p-2 text-left font-bold text-blue-800 sticky left-0 bg-blue-100 z-10 min-w-[120px]">Nhân viên</th>
                                <th className="border p-2 text-center font-bold text-blue-800 bg-yellow-50 min-w-[80px]">
                                    <div className="whitespace-normal">SLKH Tiếp nhận</div>
                                </th>
                                <th className="border p-2 text-center font-bold text-blue-800 bg-yellow-50 min-w-[80px]">
                                    <div className="whitespace-normal">Chưa SD Loại trừ</div>
                                </th>
                                <th className="border p-2 text-center font-bold text-blue-800 bg-yellow-50 min-w-[80px]">
                                    <div className="whitespace-normal">Ngưng SD Loại trừ</div>
                                </th>
                                <th className="border p-2 text-center font-bold text-blue-800 bg-yellow-50 min-w-[80px]">
                                    <div className="whitespace-normal">Đang Sử dụng</div>
                                </th>
                                <th className="border p-2 text-center font-bold text-gray-600 min-w-[60px]">
                                    <div className="whitespace-normal">Loại trừ</div>
                                </th>
                                <th className="border p-2 text-center font-bold text-gray-600 min-w-[70px]">
                                    <div className="whitespace-normal">Tính toán</div>
                                </th>
                                <th className="border p-2 text-center font-bold text-gray-600 min-w-[70px]">
                                    <div className="whitespace-normal">Tỉ lệ thực tế</div>
                                </th>
                                <th className="border p-2 text-center font-bold text-blue-800 bg-blue-200 min-w-[80px]">
                                    <div className="whitespace-normal">Tỉ lệ Hoàn thành</div>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {rowData.map(row => {
                                const canEdit = currentEmployee?.id === row.employeeId || isCoordinator;
                                const isMe = currentEmployee?.id === row.employeeId;

                                return (
                                    <tr key={row.employeeId} className={`hover:bg-gray-50 ${isMe ? 'bg-blue-50' : ''} ${row.isDirty ? 'bg-yellow-50' : ''}`}>
                                        <td className={`border p-2 font-medium sticky left-0 z-10 ${isMe ? 'bg-blue-50' : 'bg-white'} ${row.isDirty ? 'bg-yellow-50' : ''}`}>
                                            {row.employeeName}
                                            {isMe && <span className="ml-1 text-xs text-blue-600">(Bạn)</span>}
                                        </td>
                                        <td className="border p-1 text-center bg-yellow-50">
                                            <input
                                                type="number"
                                                value={row.received}
                                                onChange={e => updateRow(row.employeeId, 'received', parseInt(e.target.value) || 0)}
                                                disabled={!canEdit}
                                                className="w-14 px-1 py-0.5 border rounded text-center text-xs disabled:bg-gray-100"
                                            />
                                        </td>
                                        <td className="border p-1 text-center bg-yellow-50">
                                            <input
                                                type="number"
                                                value={row.notUsedExcluded}
                                                onChange={e => updateRow(row.employeeId, 'notUsedExcluded', parseInt(e.target.value) || 0)}
                                                disabled={!canEdit}
                                                className="w-14 px-1 py-0.5 border rounded text-center text-xs disabled:bg-gray-100"
                                            />
                                        </td>
                                        <td className="border p-1 text-center bg-yellow-50">
                                            <input
                                                type="number"
                                                value={row.stoppedExcluded}
                                                onChange={e => updateRow(row.employeeId, 'stoppedExcluded', parseInt(e.target.value) || 0)}
                                                disabled={!canEdit}
                                                className="w-14 px-1 py-0.5 border rounded text-center text-xs disabled:bg-gray-100"
                                            />
                                        </td>
                                        <td className="border p-1 text-center bg-yellow-50">
                                            <input
                                                type="number"
                                                value={row.active}
                                                onChange={e => updateRow(row.employeeId, 'active', parseInt(e.target.value) || 0)}
                                                disabled={!canEdit}
                                                className="w-14 px-1 py-0.5 border rounded text-center text-xs disabled:bg-gray-100"
                                            />
                                        </td>
                                        <td className="border p-2 text-center text-gray-600">{row.excluded}</td>
                                        <td className="border p-2 text-center text-gray-600">{row.calculated}</td>
                                        <td className="border p-2 text-center text-gray-600">{row.actualRate.toFixed(1)}%</td>
                                        <td className={`border p-2 text-center font-bold ${row.completionRate >= 100 ? 'text-green-700 bg-green-100' : row.completionRate >= 90 ? 'text-blue-700 bg-blue-100' : 'text-red-700 bg-red-100'}`}>
                                            {row.completionRate.toFixed(1)}%
                                        </td>
                                    </tr>
                                );
                            })}
                            {rowData.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="border p-4 text-center text-gray-500">
                                        Không có nhân viên ONB_DT
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="text-xs text-gray-500 space-y-1">
                <p>💡 <strong>Ô vàng</strong> = có thể nhập, <strong>Ô xám</strong> = tự động tính</p>
                <p>💡 <strong>Loại trừ</strong> = Chưa SD LT + Ngưng SD LT</p>
                <p>💡 <strong>Tính toán</strong> = SLKH TN - Loại trừ</p>
                <p>💡 <strong>Tỉ lệ thực</strong> = Đang SD / Tính toán × 100%</p>
                <p>💡 <strong>Tỉ lệ HT</strong> = Tỉ lệ thực / Tỉ lệ KH ({planRate}%) × 100%</p>
            </div>
        </div>
    );
};

export default KpiTable;
