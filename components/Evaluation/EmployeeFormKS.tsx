/**
 * EmployeeFormKS.tsx - Evaluation form for Kiểm soát (Controller) group
 * Shows: Customer usage rates for current year and previous year
 * Single table format with all employees
 */

import React, { useMemo, useState, useEffect } from 'react';
import { Save, Loader2, Calculator } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useEvaluationsQuery, useEvaluationMutation, useOpenPeriodQuery } from '../../hooks/useEvaluationQuery';
import { EmployeeEvaluation, Role } from '../../types';
import { auth } from '../../services/firebaseConfig';
import { isKSGroup, isDTGroup } from '../../utils/permissions';
import toast from 'react-hot-toast';

interface KsKpiData {
    // Khách hàng năm nay
    currentYear: {
        active: number;           // SLKH đang sử dụng
        stoppedExcluded: number; // SLKH ngưng SD được loại trừ
        received: number;        // Tổng SLKH tiếp nhận
        calculated: number;      // Tổng SLKH tính KPIs (auto: received - stoppedExcluded)
        usageRate: number;       // Tỷ lệ sử dụng (auto: active / calculated)
        completionRate: number;  // Tỷ lệ hoàn thành (auto: usageRate / planRate)
    };
    // Khách hàng năm trước
    previousYear: {
        returnedBonus: number;   // KH quay lại dùng được cộng thêm
        active: number;          // SLKH đang sử dụng
        stoppedExcluded: number; // SLKH ngưng SD được loại trừ
        received: number;        // Tổng SLKH tiếp nhận
        calculated: number;      // Tổng SLKH tính KPIs (auto)
        usageRate: number;       // Tỷ lệ sử dụng (auto)
        completionRate: number;  // Tỷ lệ hoàn thành (auto)
    };
    // Overall
    overallCompletionRate: number; // Tỷ lệ hoàn thành chung (auto: avg of both completion rates)
}

interface RowData {
    employeeId: string;
    employeeName: string;
    kpiData: KsKpiData;
    isDirty: boolean;
    existingEval?: EmployeeEvaluation;
}

const DEFAULT_KPI_DATA: KsKpiData = {
    currentYear: { active: 0, stoppedExcluded: 0, received: 0, calculated: 0, usageRate: 0, completionRate: 0 },
    previousYear: { returnedBonus: 0, active: 0, stoppedExcluded: 0, received: 0, calculated: 0, usageRate: 0, completionRate: 0 },
    overallCompletionRate: 0,
};

interface Props {
    readOnly?: boolean;
}

const EmployeeFormKS: React.FC<Props> = ({ readOnly = false }) => {
    const { employees } = useData();
    const { data: openPeriod, isLoading: loadingPeriod } = useOpenPeriodQuery();
    const { data: allEvaluations = [], isLoading: loadingEvals } = useEvaluationsQuery(openPeriod?.id);
    const { saveMutation } = useEvaluationMutation();

    const currentUser = auth.currentUser;
    const currentEmployee = useMemo(() =>
        employees.find(e => e.email?.toLowerCase() === currentUser?.email?.toLowerCase()),
        [employees, currentUser]
    );

    const isCoordinator = currentEmployee?.role === Role.Coordinator || currentEmployee?.role === Role.Admin;
    const planRate = openPeriod?.ksConfig?.kpiPlanRate || 95; // Plan rate for current year
    const planRatePrevYear = openPeriod?.ksConfig?.kpiPlanRatePrevYear || 93; // Plan rate for previous year
    const currentYearWeight = openPeriod?.ksConfig?.currentYearWeight || 70; // 70%
    const previousYearWeight = openPeriod?.ksConfig?.previousYearWeight || 30; // 30%

    // Filter employees in KS group (both KS and ONB_KS)
    const ksEmployees = useMemo(() => {
        const filtered = employees.filter(e => isKSGroup(e.evaluationGroup));
        if (isCoordinator) {
            return filtered;
        }
        return filtered.filter(e => e.id === currentEmployee?.id);
    }, [employees, isCoordinator, currentEmployee]);

    // Build row data
    const [rowData, setRowData] = useState<RowData[]>([]);

    useEffect(() => {
        if (!openPeriod) return;

        setRowData(prevRowData => {
            const rows: RowData[] = ksEmployees.map(emp => {
                const existingEval = allEvaluations.find(ev => ev.employeeId === emp.id && isKSGroup(ev.evaluationGroup));
                const prevRow = prevRowData.find(r => r.employeeId === emp.id);

                // Preserve dirty state and unsaved data if user was editing
                if (prevRow?.isDirty) {
                    return {
                        ...prevRow,
                        existingEval, // Update existingEval but keep dirty data
                    };
                }

                const kpiData = existingEval?.ksKpiData || { ...DEFAULT_KPI_DATA };

                return {
                    employeeId: emp.id,
                    employeeName: emp.fullName,
                    kpiData,
                    isDirty: false,
                    existingEval,
                };
            });
            return rows;
        });
    }, [ksEmployees, allEvaluations, openPeriod]);

    // Recalculate auto fields
    const recalculate = (data: KsKpiData): KsKpiData => {
        const updated = { ...data };

        // Current year
        updated.currentYear.calculated = updated.currentYear.received - updated.currentYear.stoppedExcluded;
        updated.currentYear.usageRate = updated.currentYear.calculated > 0
            ? (updated.currentYear.active / updated.currentYear.calculated) * 100
            : 0;
        updated.currentYear.completionRate = planRate > 0
            ? (updated.currentYear.usageRate / planRate) * 100
            : 0;

        // Previous year - returnedBonus được cộng vào tử số (không cộng vào mẫu số)
        updated.previousYear.calculated = updated.previousYear.received - updated.previousYear.stoppedExcluded;
        updated.previousYear.usageRate = updated.previousYear.calculated > 0
            ? ((updated.previousYear.active + updated.previousYear.returnedBonus) / updated.previousYear.calculated) * 100
            : 0;
        updated.previousYear.completionRate = planRatePrevYear > 0
            ? (updated.previousYear.usageRate / planRatePrevYear) * 100
            : 0;

        // Overall = (Current Year * 70%) + (Previous Year * 30%)
        updated.overallCompletionRate =
            (updated.currentYear.completionRate * (currentYearWeight / 100)) +
            (updated.previousYear.completionRate * (previousYearWeight / 100));

        return updated;
    };

    // Update field
    const updateField = (employeeId: string, year: 'currentYear' | 'previousYear', field: string, value: number) => {
        setRowData(prev => prev.map(row => {
            if (row.employeeId !== employeeId) return row;

            const updatedKpi = {
                ...row.kpiData,
                [year]: { ...row.kpiData[year], [field]: value }
            };

            return {
                ...row,
                kpiData: recalculate(updatedKpi),
                isDirty: true,
            };
        }));
    };

    // Save row
    const saveRow = async (row: RowData, submit: boolean = false) => {
        if (!openPeriod) return;

        const evaluation: EmployeeEvaluation = {
            id: `${openPeriod.id}_${row.employeeId}`,
            periodId: openPeriod.id,
            employeeId: row.employeeId,
            evaluationGroup: 'KS',
            status: submit ? 'submitted' : (row.existingEval?.status || 'pending'),
            ksKpiData: row.kpiData,
            metricData: {},
            summary: {
                totalWorkPoints: 0,
                kpiCompletionRate: row.kpiData.overallCompletionRate,
                workCompletionRate: 0,
                overallRate: row.kpiData.overallCompletionRate,
                result: row.kpiData.overallCompletionRate >= 105 ? 'Vượt mong đợi' : row.kpiData.overallCompletionRate >= 100 ? 'Đạt' : 'Cần cố gắng',
            },
            ...(submit ? { submittedAt: new Date().toISOString() } : {}),
        };

        try {
            await saveMutation.mutateAsync(evaluation);
            setRowData(prev => prev.map(r => r.employeeId === row.employeeId ? { ...r, isDirty: false, existingEval: evaluation } : r));
            toast.success(submit ? 'Đã gửi đánh giá!' : `Đã lưu KPI cho ${row.employeeName}`);
        } catch (e) {
            console.error('Save error:', e);
            toast.error('Lỗi khi lưu');
        }
    };

    // Save all dirty
    const saveAllDirty = async () => {
        const dirtyRows = rowData.filter(r => r.isDirty);
        for (const row of dirtyRows) {
            await saveRow(row);
        }
    };

    // Calculate totals
    const totals = useMemo(() => {
        const t: KsKpiData = {
            currentYear: { active: 0, stoppedExcluded: 0, received: 0, calculated: 0, usageRate: 0, completionRate: 0 },
            previousYear: { returnedBonus: 0, active: 0, stoppedExcluded: 0, received: 0, calculated: 0, usageRate: 0, completionRate: 0 },
            overallCompletionRate: 0,
        };

        rowData.forEach(row => {
            t.currentYear.active += row.kpiData.currentYear.active;
            t.currentYear.stoppedExcluded += row.kpiData.currentYear.stoppedExcluded;
            t.currentYear.received += row.kpiData.currentYear.received;
            t.previousYear.returnedBonus += row.kpiData.previousYear.returnedBonus;
            t.previousYear.active += row.kpiData.previousYear.active;
            t.previousYear.stoppedExcluded += row.kpiData.previousYear.stoppedExcluded;
            t.previousYear.received += row.kpiData.previousYear.received;
        });

        return recalculate(t);
    }, [rowData, planRate]);

    // ========== RATING STATISTICS ==========
    const ratingStats = useMemo(() => {
        const excellent = openPeriod?.ratingThresholds?.excellent || 105;
        const good = openPeriod?.ratingThresholds?.good || 100;

        let notEvaluated = 0;
        let needsImprovement = 0;
        let achieved = 0;
        let exceeded = 0;

        rowData.forEach(row => {
            // Check if evaluation exists (has any data entered)
            if (!row.existingEval) {
                notEvaluated++;
            } else {
                const rate = row.kpiData.overallCompletionRate;
                if (rate >= excellent) {
                    exceeded++;
                } else if (rate >= good) {
                    achieved++;
                } else {
                    needsImprovement++;
                }
            }
        });

        return {
            total: ksEmployees.length,
            notEvaluated,
            needsImprovement,
            achieved,
            exceeded,
        };
    }, [rowData, ksEmployees, openPeriod]);

    // ========== TOP PERFORMER (ALL ROLES CAN SEE) ==========
    const topPerformer = useMemo(() => {
        // Get all APPROVED evaluations (both DT and KS)
        const approvedEvals = allEvaluations.filter(e => e.status === 'approved');
        if (approvedEvals.length === 0) return null;

        // Find the one with highest overallRate
        let best = approvedEvals[0];
        approvedEvals.forEach(evaluation => {
            if ((evaluation.summary?.overallRate || 0) > (best.summary?.overallRate || 0)) {
                best = evaluation;
            }
        });

        const employee = employees.find(e => e.id === best.employeeId);
        return {
            name: employee?.fullName || 'Unknown',
            rate: best.summary?.overallRate || 0,
            result: best.summary?.result || '-',
            group: isDTGroup(best.evaluationGroup) ? 'Chuyển giao' : 'Kiểm soát'
        };
    }, [allEvaluations, employees]);

    const hasDirtyRows = rowData.some(r => r.isDirty);

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
            <div className="text-center p-8 text-gray-500">
                Chưa có kỳ đánh giá đang mở
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-100 to-cyan-100 p-4 rounded-lg">
                <h3 className="text-xl font-bold text-teal-800">ONB KS Tự đánh giá - {openPeriod.name}</h3>
                <div className="flex flex-wrap gap-4 mt-2 text-sm">
                    <span className="text-teal-600">📋 Nhóm: <strong>Kiểm soát (ONB_KS)</strong></span>
                    <span className="text-teal-600">🎯 Tỷ lệ sử dụng kế hoạch năm nay: <strong>{planRate}%</strong></span>
                    <span className="text-teal-600">🎯 Tỷ lệ sử dụng kế hoạch năm trước: <strong>{planRatePrevYear}%</strong></span>
                    <span className="text-teal-600">⚖️ Trọng số: <strong>Năm nay {currentYearWeight}% / Năm trước {previousYearWeight}%</strong></span>
                </div>
            </div>

            {/* Table */}
            <div className="border rounded-lg overflow-hidden">
                <div className="max-h-96 overflow-y-auto overflow-x-auto">
                    <table className="text-xs border-collapse min-w-max">
                        <thead className="sticky top-0 z-20">
                            {/* Group Headers */}
                            <tr className="bg-teal-100">
                                <th rowSpan={2} className="border p-2 text-left font-bold text-teal-800 sticky left-0 bg-teal-100 z-30 min-w-[140px]">THEO NHÂN SỰ</th>
                                <th colSpan={6} className="border p-1 text-center font-bold text-blue-800 bg-blue-100">KH NĂM NAY</th>
                                <th colSpan={7} className="border p-1 text-center font-bold text-orange-800 bg-orange-100">KHÁCH HÀNG NĂM TRƯỚC</th>
                                <th rowSpan={2} className="border p-1 text-center font-bold text-teal-800 bg-teal-200 w-[60px]">
                                    <div className="whitespace-normal text-[10px] leading-tight">TỶ LỆ HOÀN THÀNH CHUNG</div>
                                </th>
                                <th rowSpan={2} className="border p-1 text-center font-bold text-purple-800 bg-purple-100 w-[112px]">
                                    <div className="whitespace-normal text-[10px] leading-tight">XẾP HẠNG</div>
                                </th>
                            </tr>
                            {/* Sub Headers */}
                            <tr className="bg-gray-50">
                                {/* Current Year */}
                                <th className="border p-1 text-center font-medium text-blue-700 bg-blue-50 w-[55px]">
                                    <div className="whitespace-normal text-[10px] leading-tight">SLKH đang sử dụng</div>
                                </th>
                                <th className="border p-1 text-center font-medium text-blue-700 bg-blue-50 w-[65px]">
                                    <div className="whitespace-normal text-[10px] leading-tight">SLKH ngưng SD được loại trừ</div>
                                </th>
                                <th className="border p-1 text-center font-medium text-blue-700 bg-blue-50 w-[55px]">
                                    <div className="whitespace-normal text-[10px] leading-tight">Tổng SLKH tiếp nhận</div>
                                </th>
                                <th className="border p-1 text-center font-medium text-gray-600 w-[55px]">
                                    <div className="whitespace-normal text-[10px] leading-tight">Tổng SLKH tính KPIs</div>
                                </th>
                                <th className="border p-1 text-center font-medium text-gray-600 w-[50px]">
                                    <div className="whitespace-normal text-[10px] leading-tight">Tỷ lệ sử dụng</div>
                                </th>
                                <th className="border p-1 text-center font-medium text-blue-800 bg-blue-100 w-[55px]">
                                    <div className="whitespace-normal text-[10px] leading-tight">Tỷ lệ hoàn thành</div>
                                </th>

                                {/* Previous Year */}
                                <th className="border p-1 text-center font-medium text-orange-700 bg-orange-50 w-[65px]">
                                    <div className="whitespace-normal text-[10px] leading-tight">KH quay lại dùng được cộng thêm</div>
                                </th>
                                <th className="border p-1 text-center font-medium text-orange-700 bg-orange-50 w-[55px]">
                                    <div className="whitespace-normal text-[10px] leading-tight">SLKH đang sử dụng</div>
                                </th>
                                <th className="border p-1 text-center font-medium text-orange-700 bg-orange-50 w-[65px]">
                                    <div className="whitespace-normal text-[10px] leading-tight">SLKH ngưng SD được loại trừ</div>
                                </th>
                                <th className="border p-1 text-center font-medium text-orange-700 bg-orange-50 w-[55px]">
                                    <div className="whitespace-normal text-[10px] leading-tight">Tổng SLKH tiếp nhận</div>
                                </th>
                                <th className="border p-1 text-center font-medium text-gray-600 w-[55px]">
                                    <div className="whitespace-normal text-[10px] leading-tight">Tổng SLKH tính KPIs</div>
                                </th>
                                <th className="border p-1 text-center font-medium text-gray-600 w-[50px]">
                                    <div className="whitespace-normal text-[10px] leading-tight">Tỷ lệ sử dụng</div>
                                </th>
                                <th className="border p-1 text-center font-medium text-orange-800 bg-orange-100 w-[55px]">
                                    <div className="whitespace-normal text-[10px] leading-tight">Tỷ lệ hoàn thành</div>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Employee Rows */}
                            {rowData.map(row => {
                                const isMe = currentEmployee?.id === row.employeeId;
                                const canEdit = isMe || isCoordinator;

                                return (
                                    <tr key={row.employeeId} className={`hover:bg-gray-50 ${isMe ? 'bg-teal-50' : ''} ${row.isDirty ? 'bg-yellow-50' : ''}`}>
                                        <td className={`border p-2 font-medium sticky left-0 z-10 ${isMe ? 'bg-teal-50' : 'bg-white'} ${row.isDirty ? 'bg-yellow-50' : ''}`}>
                                            {row.employeeName}
                                            {isMe && <span className="ml-1 text-[10px] text-teal-600">(Bạn)</span>}
                                        </td>

                                        {/* Current Year - Input fields */}
                                        <td className="border p-0.5 text-center bg-blue-50">
                                            <input type="number" value={row.kpiData.currentYear.active}
                                                onChange={e => updateField(row.employeeId, 'currentYear', 'active', parseInt(e.target.value) || 0)}
                                                disabled={!canEdit} className="w-14 px-0.5 py-0.5 border rounded text-center text-xs disabled:bg-gray-100" />
                                        </td>
                                        <td className="border p-0.5 text-center bg-blue-50">
                                            <input type="number" value={row.kpiData.currentYear.stoppedExcluded}
                                                onChange={e => updateField(row.employeeId, 'currentYear', 'stoppedExcluded', parseInt(e.target.value) || 0)}
                                                disabled={!canEdit} className="w-14 px-0.5 py-0.5 border rounded text-center text-xs disabled:bg-gray-100" />
                                        </td>
                                        <td className="border p-0.5 text-center bg-blue-50">
                                            <input type="number" value={row.kpiData.currentYear.received}
                                                onChange={e => updateField(row.employeeId, 'currentYear', 'received', parseInt(e.target.value) || 0)}
                                                disabled={!canEdit} className="w-14 px-0.5 py-0.5 border rounded text-center text-xs disabled:bg-gray-100" />
                                        </td>
                                        <td className="border p-1 text-center text-gray-600">{row.kpiData.currentYear.calculated.toLocaleString()}</td>
                                        <td className="border p-1 text-center text-gray-600">{row.kpiData.currentYear.usageRate.toFixed(2)}%</td>
                                        <td className="border p-1 text-center text-blue-700 bg-blue-50 font-medium">{row.kpiData.currentYear.completionRate.toFixed(2)}%</td>

                                        {/* Previous Year - Input fields */}
                                        <td className="border p-0.5 text-center bg-orange-50">
                                            <input type="number" value={row.kpiData.previousYear.returnedBonus}
                                                onChange={e => updateField(row.employeeId, 'previousYear', 'returnedBonus', parseInt(e.target.value) || 0)}
                                                disabled={!canEdit} className="w-14 px-0.5 py-0.5 border rounded text-center text-xs disabled:bg-gray-100" />
                                        </td>
                                        <td className="border p-0.5 text-center bg-orange-50">
                                            <input type="number" value={row.kpiData.previousYear.active}
                                                onChange={e => updateField(row.employeeId, 'previousYear', 'active', parseInt(e.target.value) || 0)}
                                                disabled={!canEdit} className="w-14 px-0.5 py-0.5 border rounded text-center text-xs disabled:bg-gray-100" />
                                        </td>
                                        <td className="border p-0.5 text-center bg-orange-50">
                                            <input type="number" value={row.kpiData.previousYear.stoppedExcluded}
                                                onChange={e => updateField(row.employeeId, 'previousYear', 'stoppedExcluded', parseInt(e.target.value) || 0)}
                                                disabled={!canEdit} className="w-14 px-0.5 py-0.5 border rounded text-center text-xs disabled:bg-gray-100" />
                                        </td>
                                        <td className="border p-0.5 text-center bg-orange-50">
                                            <input type="number" value={row.kpiData.previousYear.received}
                                                onChange={e => updateField(row.employeeId, 'previousYear', 'received', parseInt(e.target.value) || 0)}
                                                disabled={!canEdit} className="w-14 px-0.5 py-0.5 border rounded text-center text-xs disabled:bg-gray-100" />
                                        </td>
                                        <td className="border p-1 text-center text-gray-600">{row.kpiData.previousYear.calculated.toLocaleString()}</td>
                                        <td className="border p-1 text-center text-gray-600">{row.kpiData.previousYear.usageRate.toFixed(2)}%</td>
                                        <td className="border p-1 text-center text-orange-700 bg-orange-50 font-medium">{row.kpiData.previousYear.completionRate.toFixed(2)}%</td>

                                        {/* Overall */}
                                        <td className={`border p-1 text-center font-bold ${row.kpiData.overallCompletionRate >= 100 ? 'text-green-700 bg-green-100' : 'text-teal-700 bg-teal-100'}`}>
                                            {row.kpiData.overallCompletionRate.toFixed(2)}%
                                        </td>
                                        {/* Xếp hạng */}
                                        <td className={`border p-1 text-center font-bold text-[10px] ${row.kpiData.overallCompletionRate >= 105 ? 'text-green-700 bg-green-100' :
                                            row.kpiData.overallCompletionRate >= 100 ? 'text-blue-700 bg-blue-100' :
                                                'text-red-600 bg-red-50'
                                            }`}>
                                            {row.kpiData.overallCompletionRate >= 105 ? 'Vượt mong đợi' :
                                                row.kpiData.overallCompletionRate >= 100 ? 'Đạt' : 'Cần cố gắng'}
                                        </td>
                                    </tr>
                                );
                            })}

                            {/* Summary Row - Only for Coordinators, at bottom */}
                            {isCoordinator && (
                                <tr className="bg-teal-50 font-bold">
                                    <td className="border p-2 sticky left-0 bg-teal-50 z-10">TỔNG</td>
                                    <td className="border p-1 text-center">{totals.currentYear.active.toLocaleString()}</td>
                                    <td className="border p-1 text-center">{totals.currentYear.stoppedExcluded.toLocaleString()}</td>
                                    <td className="border p-1 text-center">{totals.currentYear.received.toLocaleString()}</td>
                                    <td className="border p-1 text-center text-gray-600">{totals.currentYear.calculated.toLocaleString()}</td>
                                    <td className="border p-1 text-center text-gray-600">{totals.currentYear.usageRate.toFixed(2)}%</td>
                                    <td className="border p-1 text-center text-blue-700 bg-blue-50">{totals.currentYear.completionRate.toFixed(2)}%</td>
                                    <td className="border p-1 text-center">{totals.previousYear.returnedBonus.toLocaleString()}</td>
                                    <td className="border p-1 text-center">{totals.previousYear.active.toLocaleString()}</td>
                                    <td className="border p-1 text-center">{totals.previousYear.stoppedExcluded.toLocaleString()}</td>
                                    <td className="border p-1 text-center">{totals.previousYear.received.toLocaleString()}</td>
                                    <td className="border p-1 text-center text-gray-600">{totals.previousYear.calculated.toLocaleString()}</td>
                                    <td className="border p-1 text-center text-gray-600">{totals.previousYear.usageRate.toFixed(2)}%</td>
                                    <td className="border p-1 text-center text-orange-700 bg-orange-50">{totals.previousYear.completionRate.toFixed(2)}%</td>
                                    <td className={`border p-1 text-center font-bold ${totals.overallCompletionRate >= 100 ? 'text-green-700 bg-green-100' : 'text-teal-700 bg-teal-100'}`}>
                                        {totals.overallCompletionRate.toFixed(2)}%
                                    </td>
                                    <td className={`border p-1 text-center font-bold text-[10px] ${totals.overallCompletionRate >= 105 ? 'text-green-700 bg-green-100' :
                                        totals.overallCompletionRate >= 100 ? 'text-blue-700 bg-blue-100' :
                                            'text-red-600 bg-red-50'
                                        }`}>
                                        {totals.overallCompletionRate >= 105 ? 'Vượt mong đợi' :
                                            totals.overallCompletionRate >= 100 ? 'Đạt' : 'Cần cố gắng'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Summary - Role-based display */}
            <div className={`rounded-lg p-4 ${isCoordinator ? 'bg-gradient-to-r from-teal-100 to-cyan-100 border-teal-300' : 'bg-gradient-to-r from-blue-100 to-indigo-100 border-blue-300'} border-2`}>
                <h4 className="font-bold text-lg mb-4">📊 Tổng kết</h4>

                {isCoordinator ? (
                    // Coordinator view: Rating statistics with 5 columns
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                        <div className="bg-white/50 p-3 rounded">
                            <div className="text-gray-600 text-xs">Tổng nhân viên</div>
                            <div className="font-bold text-2xl text-teal-700">{ratingStats.total}</div>
                        </div>
                        <div className="bg-gray-50 p-3 rounded border border-gray-200">
                            <div className="text-gray-600 text-xs font-medium">Chưa đánh giá</div>
                            <div className="font-bold text-2xl text-gray-500">{ratingStats.notEvaluated}</div>
                        </div>
                        <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                            <div className="text-yellow-700 text-xs font-medium">Cần cố gắng</div>
                            <div className="font-bold text-2xl text-yellow-700">{ratingStats.needsImprovement}</div>
                        </div>
                        <div className="bg-blue-50 p-3 rounded border border-blue-200">
                            <div className="text-blue-700 text-xs font-medium">Đạt</div>
                            <div className="font-bold text-2xl text-blue-700">{ratingStats.achieved}</div>
                        </div>
                        <div className="bg-green-50 p-3 rounded border border-green-200">
                            <div className="text-green-700 text-xs font-medium">Vượt mong đợi</div>
                            <div className="font-bold text-2xl text-green-700">{ratingStats.exceeded}</div>
                        </div>
                    </div>
                ) : (
                    // Staff view: Personal summary
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                        <div className="bg-white/50 p-3 rounded">
                            <div className="text-gray-600 text-xs">TL HT Năm nay</div>
                            <div className="font-bold text-lg text-blue-700">{rowData[0]?.kpiData.currentYear.completionRate.toFixed(1)}%</div>
                        </div>
                        <div className="bg-white/50 p-3 rounded">
                            <div className="text-gray-600 text-xs">TL HT Năm trước</div>
                            <div className="font-bold text-lg text-orange-700">{rowData[0]?.kpiData.previousYear.completionRate.toFixed(1)}%</div>
                        </div>
                        <div className="bg-white p-3 rounded border-2">
                            <div className="text-gray-600 text-xs">TL HT Chung</div>
                            <div className={`font-bold text-lg ${rowData[0]?.kpiData.overallCompletionRate >= 105 ? 'text-green-700' : rowData[0]?.kpiData.overallCompletionRate >= 100 ? 'text-blue-700' : 'text-yellow-700'}`}>
                                {rowData[0]?.kpiData.overallCompletionRate.toFixed(1)}%
                            </div>
                            <div className={`text-xs font-semibold ${rowData[0]?.kpiData.overallCompletionRate >= 105 ? 'text-green-600' : rowData[0]?.kpiData.overallCompletionRate >= 100 ? 'text-blue-600' : 'text-yellow-600'}`}>
                                {rowData[0]?.kpiData.overallCompletionRate >= 105 ? 'Vượt mong đợi' : rowData[0]?.kpiData.overallCompletionRate >= 100 ? 'Đạt' : 'Cần cố gắng'}
                            </div>
                        </div>
                    </div>
                )}

                {/* Top Performer - Visible to ALL roles */}
                {topPerformer && (
                    <div className="mt-4 p-3 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-lg">
                        <div className="flex items-center gap-2 text-amber-700 text-sm">
                            <span className="text-lg">🏆</span>
                            <span className="font-medium">Top hoàn thành (đã duyệt):</span>
                            <span className="font-bold">{topPerformer.name}</span>
                            <span className="text-xs bg-amber-200 px-2 py-0.5 rounded">{topPerformer.group}</span>
                            <span className="ml-auto font-bold text-lg text-amber-800">{topPerformer.rate.toFixed(1)}%</span>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${topPerformer.result === 'Vượt mong đợi' ? 'bg-green-100 text-green-700' : topPerformer.result === 'Đạt' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {topPerformer.result}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Legend */}
            <div className="text-xs text-gray-500 space-y-1">
                <p>💡 <strong>Ô màu</strong> = nhập liệu, <strong>Ô xám</strong> = tự động tính</p>
                <p>💡 <strong>Tổng SLKH tính KPIs</strong> = Tổng SLKH tiếp nhận - SLKH ngưng SD được loại trừ</p>
                <p>💡 <strong>Tỷ lệ sử dụng (Năm nay)</strong> = SLKH đang SD / Tổng SLKH tính KPIs × 100%</p>
                <p>💡 <strong>Tỷ lệ sử dụng (Năm trước)</strong> = (SLKH đang SD + KH quay lại) / Tổng SLKH tính KPIs × 100%</p>
                <p>💡 <strong>Tỷ lệ hoàn thành</strong> = Tỷ lệ sử dụng / Tỷ lệ kế hoạch ({planRate}% năm nay, {planRatePrevYear}% năm trước) × 100%</p>
                <p>💡 <strong>TL HT Chung</strong> = (TL HT Năm nay × {currentYearWeight}%) + (TL HT Năm trước × {previousYearWeight}%)</p>
                <p>💡 <strong>Xếp hạng:</strong> ≥105% = Vượt mong đợi | ≥100% = Đạt | &lt;100% = Cần cố gắng</p>
            </div>

            {/* Action Buttons - Always visible at bottom */}
            <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                    onClick={saveAllDirty}
                    disabled={saveMutation.isPending || !hasDirtyRows}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${hasDirtyRows
                        ? 'bg-teal-600 text-white hover:bg-teal-700'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        } disabled:opacity-50`}
                >
                    {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Lưu thay đổi
                </button>
                {/* Submit button - only visible when not submitted yet (for Staff only) */}
                {!isCoordinator && rowData.length === 1 && rowData[0].existingEval?.status !== 'submitted' && rowData[0].existingEval?.status !== 'approved' && (
                    <button
                        onClick={() => {
                            if (confirm('Bạn có chắc chắn muốn gửi đánh giá? Sau khi gửi sẽ không thể chỉnh sửa.')) {
                                saveRow(rowData[0], true);
                            }
                        }}
                        disabled={saveMutation.isPending}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" /> Gửi đánh giá
                    </button>
                )}
                {/* Show submitted status */}
                {!isCoordinator && rowData.length === 1 && (rowData[0].existingEval?.status === 'submitted' || rowData[0].existingEval?.status === 'approved') && (
                    <span className="flex items-center gap-2 px-4 py-2 text-green-700 bg-green-100 rounded-lg font-medium">
                        ✅ Đã gửi đánh giá
                    </span>
                )}
            </div>
        </div>
    );
};

export default EmployeeFormKS;
