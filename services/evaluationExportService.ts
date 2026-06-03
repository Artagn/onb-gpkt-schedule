/**
 * evaluationExportService.ts - Excel Export for Monthly Evaluation Data
 * Exports multi-sheet workbook with: Tổng kết, KPI, Điểm CV
 */

import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { sanitizeExcelValue } from '../utils/evaluationHelpers';

interface SummaryRow {
    employeeName: string;
    kpiPlanRate: number;
    kpiActualRate: number;
    kpiCompletionRate: number;
    workPlanPoints: number;
    workActualPoints: number;
    workCompletionRate: number;
    overallRate: number;
    rating: string;
}

interface KpiRow {
    employeeName: string;
    received: number;
    notUsedExcluded: number;
    stoppedExcluded: number;
    active: number;
    excluded: number;
    calculated: number;
    actualRate: number;
    planRate: number;
    completionRate: number;
}

interface WorkPointsRow {
    employeeName: string;
    trainingPoints: number;
    livechatPoints: number;
    totalCrmPoints: number;
    totalOtherPoints: number;
    totalViolationPoints: number;
    totalWorkPoints: number;
    kpiTarget: number;
    completionRate: number;
}

interface ExportData {
    month: number;
    year: number;
    summaryRows: SummaryRow[];
    kpiRows: KpiRow[];
    workPointsRows: WorkPointsRow[];
}

export const exportEvaluationData = (data: ExportData) => {
    const { month, year, summaryRows, kpiRows, workPointsRows } = data;
    const wb = XLSX.utils.book_new();

    // ========== SHEET 1: Tổng kết ==========
    const summaryHeaders = [
        'Nhân viên',
        'TL SD - KH (%)',
        'TL SD - TT (%)',
        'TL SD - HT (%)',
        'CV - KH (đ)',
        'CV - TT (đ)',
        'CV - HT (%)',
        'TL HT chung (%)',
        'Xếp hạng'
    ];
    const summaryData = summaryRows.map(r => [
        sanitizeExcelValue(r.employeeName),
        r.kpiPlanRate.toFixed(0),
        r.kpiActualRate.toFixed(1),
        r.kpiCompletionRate.toFixed(1),
        r.workPlanPoints,
        r.workActualPoints.toFixed(1),
        r.workCompletionRate.toFixed(1),
        r.overallRate.toFixed(1),
        sanitizeExcelValue(r.rating)
    ]);
    const ws1 = XLSX.utils.aoa_to_sheet([summaryHeaders, ...summaryData]);
    ws1['!cols'] = [
        { wch: 25 }, // Nhân viên
        { wch: 12 }, { wch: 12 }, { wch: 12 }, // TL SD
        { wch: 10 }, { wch: 10 }, { wch: 10 }, // CV
        { wch: 14 }, // TL HT chung
        { wch: 15 }  // Xếp hạng
    ];
    XLSX.utils.book_append_sheet(wb, ws1, 'Tổng kết');

    // ========== SHEET 2: KPI ==========
    const kpiHeaders = [
        'Nhân viên',
        'SLKH Tiếp nhận',
        'Chưa SD LT',
        'Ngưng SD LT',
        'Đang SD',
        'Loại trừ',
        'Tính toán',
        'TL Thực tế (%)',
        'TL KH (%)',
        'TL Hoàn thành (%)'
    ];
    const kpiData = kpiRows.map(r => [
        sanitizeExcelValue(r.employeeName),
        r.received,
        r.notUsedExcluded,
        r.stoppedExcluded,
        r.active,
        r.excluded,
        r.calculated,
        r.actualRate.toFixed(1),
        r.planRate,
        r.completionRate.toFixed(1)
    ]);
    const ws2 = XLSX.utils.aoa_to_sheet([kpiHeaders, ...kpiData]);
    ws2['!cols'] = [
        { wch: 25 }, // Nhân viên
        { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, // Inputs
        { wch: 10 }, { wch: 10 }, // Calculated
        { wch: 14 }, { wch: 10 }, { wch: 16 } // Rates
    ];
    XLSX.utils.book_append_sheet(wb, ws2, 'KPI');

    // ========== SHEET 3: Điểm CV ==========
    const workHeaders = [
        'Nhân viên',
        'Đào tạo',
        'Livechat',
        'Thẻ CRM',
        'CV Khác',
        'Vi phạm',
        'TỔNG',
        'KPI',
        'TL HT (%)'
    ];
    const workData = workPointsRows.map(r => [
        sanitizeExcelValue(r.employeeName),
        r.trainingPoints.toFixed(1),
        r.livechatPoints.toFixed(1),
        r.totalCrmPoints.toFixed(1),
        r.totalOtherPoints.toFixed(1),
        r.totalViolationPoints.toFixed(1),
        r.totalWorkPoints.toFixed(1),
        r.kpiTarget,
        r.completionRate.toFixed(1)
    ]);
    const ws3 = XLSX.utils.aoa_to_sheet([workHeaders, ...workData]);
    ws3['!cols'] = [
        { wch: 25 }, // Nhân viên
        { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, // Points
        { wch: 10 }, { wch: 8 }, { wch: 12 } // Total, KPI, Rate
    ];
    XLSX.utils.book_append_sheet(wb, ws3, 'Điểm CV');

    // ========== SAVE FILE ==========
    const fileName = `Danh_gia_thang_${month.toString().padStart(2, '0')}_${year}.xlsx`;
    XLSX.writeFile(wb, fileName);
};

// ========== MULTI-PERIOD EXPORT ==========

interface MultiPeriodExportData {
    periods: Array<{ id: string; month: number; year: number; name?: string }>;
    evaluations: Array<{
        periodId: string;
        employeeId: string;
        summary?: { overallRate?: number; result?: string; totalWorkPoints?: number };
        dtKpiData?: { actualRate?: number; completionRate?: number };
    }>;
    employees: Array<{ id: string; fullName: string }>;
}

export const exportMultiPeriodEvaluations = (data: MultiPeriodExportData) => {
    const { periods, evaluations, employees } = data;
    if (!periods || periods.length === 0 || !employees || employees.length === 0) {
        return; // Guard against empty datasets
    }
    const wb = XLSX.utils.book_new();

    // Sort periods chronologically
    const sortedPeriods = [...periods].sort((a, b) => (a.year * 12 + a.month) - (b.year * 12 + b.month));

    // ========== SHEET 1: Comparison Overview ==========
    const compHeaders = [
        'Nhân viên',
        ...sortedPeriods.map(p => `T${p.month}/${p.year}`),
        'Trung bình',
        'Xu hướng'
    ];

    // Build employee data
    const employeeDataMap = new Map<string, { name: string; rates: Map<string, number> }>();

    evaluations.forEach(ev => {
        const emp = employees.find(e => e.id === ev.employeeId);
        if (!emp) return;

        if (!employeeDataMap.has(ev.employeeId)) {
            employeeDataMap.set(ev.employeeId, { name: emp.fullName, rates: new Map() });
        }

        const rate = ev.summary?.overallRate || 0;
        employeeDataMap.get(ev.employeeId)!.rates.set(ev.periodId, rate);
    });

    interface CompItem {
        name: string;
        rates: string[];
        avg: number;
        trend: string;
    }

    const compItems: CompItem[] = [];
    employeeDataMap.forEach(empData => {
        const rates: number[] = [];
        const formattedRates: string[] = [];

        sortedPeriods.forEach(period => {
            const rate = empData.rates.get(period.id);
            if (rate !== undefined) {
                formattedRates.push(rate.toFixed(1) + '%');
                rates.push(rate);
            } else {
                formattedRates.push('-');
            }
        });

        // Average
        const avg = rates.length > 0 ? rates.reduce((s, r) => s + r, 0) / rates.length : 0;

        // Trend
        let trend = '-';
        if (rates.length >= 2) {
            const diff = rates[rates.length - 1] - rates[rates.length - 2];
            trend = diff > 0 ? `↑ +${diff.toFixed(1)}%` : diff < 0 ? `↓ ${diff.toFixed(1)}%` : '→ 0%';
        }

        compItems.push({
            name: empData.name,
            rates: formattedRates,
            avg,
            trend
        });
    });

    // Sort by average (descending) using the raw numeric average
    compItems.sort((a, b) => b.avg - a.avg);

    // Convert sorted items to the flat array-of-arrays format
    const compData = compItems.map(item => [
        sanitizeExcelValue(item.name),
        ...item.rates.map(sanitizeExcelValue),
        sanitizeExcelValue(item.avg.toFixed(1) + '%'),
        sanitizeExcelValue(item.trend)
    ]);

    const ws1 = XLSX.utils.aoa_to_sheet([compHeaders, ...compData]);
    ws1['!cols'] = [
        { wch: 25 },
        ...sortedPeriods.map(() => ({ wch: 12 })),
        { wch: 12 },
        { wch: 14 }
    ];
    XLSX.utils.book_append_sheet(wb, ws1, 'So sánh');

    // ========== INDIVIDUAL PERIOD SHEETS ==========
    sortedPeriods.forEach(period => {
        const periodEvals = evaluations.filter(ev => ev.periodId === period.id);

        const headers = ['Nhân viên', 'TL Hoàn thành (%)', 'Xếp hạng', 'Điểm CV'];
        const sheetData = periodEvals.map(ev => {
            const emp = employees.find(e => e.id === ev.employeeId);
            return [
                sanitizeExcelValue(emp?.fullName || 'Unknown'),
                (ev.summary?.overallRate || 0).toFixed(1),
                sanitizeExcelValue(ev.summary?.result || '-'),
                (ev.summary?.totalWorkPoints || 0).toFixed(1)
            ];
        });

        // Sort by completion rate descending
        sheetData.sort((a, b) => parseFloat(b[1] as string) - parseFloat(a[1] as string));

        const ws = XLSX.utils.aoa_to_sheet([headers, ...sheetData]);
        ws['!cols'] = [{ wch: 25 }, { wch: 16 }, { wch: 15 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(wb, ws, `T${period.month}_${period.year}`);
    });

    // ========== SAVE FILE ==========
    const startPeriod = sortedPeriods[0];
    const endPeriod = sortedPeriods[sortedPeriods.length - 1];
    const fileName = `Danh_gia_${startPeriod.month}_${startPeriod.year}_den_${endPeriod.month}_${endPeriod.year}.xlsx`;
    XLSX.writeFile(wb, fileName);
};
