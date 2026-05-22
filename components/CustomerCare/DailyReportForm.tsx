/**
 * DailyReportForm.tsx - Form nhập liệu báo cáo chăm sóc KH hàng ngày
 * 
 * Features:
 * - Date picker (mặc định hôm nay)
 * - Section 1: Chỉ tiêu chung (cuộc gọi, thời lượng, KH tiếp cận, ultraview)
 * - Section 2: Chi tiết chiến dịch (target tuần + số KH đã CS hôm nay)
 * - Auto-load existing data khi đổi ngày
 * - Auto-copy weeklyTarget từ ngày khác trong tuần nếu đã nhập
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Save, Calendar, Phone, Clock, Users, Monitor, ChevronLeft, ChevronRight, Loader2, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { CareCampaign, CareReport, CareMetric } from '../../types';
import { useCareReportQuery, useCareReportsWeekQuery, useCareReportMutation } from '../../hooks/useCareQuery';
import { getISOWeekId, isMonday, getWeekDates } from '../../services/careService';
import { formatDuration, formatShortDate, getVietnameseDayName, getMetricValue } from './useCustomerCare';

interface DailyReportFormProps {
    employeeId: string;
    employeeName: string;
    campaigns: CareCampaign[];
    metrics: CareMetric[];
}

const DailyReportForm: React.FC<DailyReportFormProps> = ({ employeeId, employeeName, campaigns, metrics }) => {
    const today = new Date().toISOString().split('T')[0];
    const [selectedDate, setSelectedDate] = useState(today);
    const weekId = useMemo(() => getISOWeekId(selectedDate), [selectedDate]);
    const isMondayDate = useMemo(() => isMonday(selectedDate), [selectedDate]);
    
    // Generate week dates (Monday to Sunday)
    const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);

    // Fetch existing report for selected date
    const { data: existingReport, isLoading: loadingReport } = useCareReportQuery(employeeId, selectedDate);

    // Fetch all reports in the same week (to get weekly targets)
    const { data: weekReportsData } = useCareReportsWeekQuery(employeeId, weekId);
    const weekReports = useMemo(() => weekReportsData || [], [weekReportsData]);

    const { saveMutation } = useCareReportMutation();

    // Form state - general metrics (Chuyển sang dạng map động)
    const [dailyMetricsData, setDailyMetricsData] = useState<{ [metricId: string]: number }>({});

    // Form state - campaign details
    const [campaignData, setCampaignData] = useState<{
        [campaignId: string]: { weeklyTarget: number; dailyCompleted: number };
    }>({});

    // Calculate cumulative data for campaigns
    const previousReports = useMemo(() => {
        return weekReports.filter(r => r.date < selectedDate);
    }, [weekReports, selectedDate]);

    const getCumulativeBefore = useCallback((campaignId: string) => {
        return previousReports.reduce((sum, r) => {
            const detail = r.campaignDetails[campaignId];
            return sum + (detail?.dailyCompleted || 0);
        }, 0);
    }, [previousReports]);

    // Initialize form from existing data
    useEffect(() => {
        if (existingReport) {
            // Map metrics with fallback for old data structure
            const dm: { [k: string]: number } = {};
            metrics.forEach(m => {
                dm[m.id] = getMetricValue(existingReport.dailyMetrics, m.id);
            });
            setDailyMetricsData(dm);

            const cd: { [k: string]: { weeklyTarget: number; dailyCompleted: number } } = {};
            campaigns.forEach(c => {
                const detail = existingReport.campaignDetails[c.id];
                let target = detail?.weeklyTarget || 0;

                // Nếu báo cáo hiện tại chưa có target (target = 0), thử lấy từ các ngày khác trong tuần
                if (!target && weekReports.length > 0) {
                    for (const wr of weekReports) {
                        if (wr.campaignDetails[c.id]?.weeklyTarget) {
                            target = wr.campaignDetails[c.id].weeklyTarget;
                            break;
                        }
                    }
                }

                cd[c.id] = {
                    weeklyTarget: target,
                    dailyCompleted: detail?.dailyCompleted ?? 0,
                };
            });
            setCampaignData(cd);
        } else {
            // New report — reset form
            const dm: { [k: string]: number } = {};
            metrics.forEach(m => {
                dm[m.id] = 0;
            });
            setDailyMetricsData(dm);

            // For non-Monday dates, try to get weekly targets from other reports in the week
            const cd: { [k: string]: { weeklyTarget: number; dailyCompleted: number } } = {};
            campaigns.forEach(c => {
                let target = 0;
                if (!isMondayDate && weekReports.length > 0) {
                    // Find any report in this week that has a target for this campaign
                    for (const wr of weekReports) {
                        if (wr.campaignDetails[c.id]?.weeklyTarget) {
                            target = wr.campaignDetails[c.id].weeklyTarget;
                            break;
                        }
                    }
                }
                cd[c.id] = { weeklyTarget: target, dailyCompleted: 0 };
            });
            setCampaignData(cd);
        }
    }, [existingReport, campaigns, metrics, isMondayDate, weekReports]);

    // Navigate date
    const navigateDate = (delta: number) => {
        const d = new Date(selectedDate + 'T00:00:00');
        d.setDate(d.getDate() + delta);
        setSelectedDate(d.toISOString().split('T')[0]);
    };

    // Update campaign field
    const updateCampaign = (campaignId: string, field: 'weeklyTarget' | 'dailyCompleted', value: number) => {
        setCampaignData(prev => ({
            ...prev,
            [campaignId]: {
                ...prev[campaignId],
                [field]: value,
            },
        }));
    };

    // Save handler
    const handleSave = useCallback(async () => {
        // Clamp all dailyCompleted to be >= 0 before saving
        const clampedCampaignData = { ...campaignData };
        Object.keys(clampedCampaignData).forEach(key => {
            if (clampedCampaignData[key].dailyCompleted < 0) {
                clampedCampaignData[key].dailyCompleted = 0;
            }
        });

        const now = new Date().toISOString();
        const report: CareReport = {
            id: `${employeeId}_${selectedDate}`,
            employeeId,
            date: selectedDate,
            weekId,
            dailyMetrics: dailyMetricsData,
            campaignDetails: clampedCampaignData,
            createdAt: existingReport?.createdAt || now,
            updatedAt: now,
        };

        try {
            await saveMutation.mutateAsync(report);
            toast.success('Đã lưu báo cáo thành công!');
        } catch (error) {
            toast.error('Lỗi khi lưu báo cáo. Vui lòng thử lại.');
            console.error('Save care report error:', error);
        }
    }, [employeeId, selectedDate, weekId, dailyMetricsData, campaignData, existingReport, saveMutation]);

    // Check which dates in the week have reports
    const weekReportDates = useMemo(() => {
        return new Set(weekReports.map(r => r.date));
    }, [weekReports]);

    const isToday = selectedDate === today;

    return (
        <div className="space-y-6">
            {/* Header: Date Navigation */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => navigateDate(-1)}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5 text-slate-600" />
                    </button>

                    <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-blue-600" />
                        <div className="text-center">
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={e => setSelectedDate(e.target.value)}
                                className="text-lg font-bold text-slate-800 border-none bg-transparent text-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2"
                            />
                            <div className="text-xs text-slate-500 mt-0.5">
                                {getVietnameseDayName(selectedDate)} • Tuần {weekId.split('-W')[1]}
                                {isToday && <span className="ml-1 text-blue-600 font-medium">(Hôm nay)</span>}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => navigateDate(1)}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <ChevronRight className="w-5 h-5 text-slate-600" />
                    </button>
                </div>

                {/* Week dates mini nav */}
                <div className="flex gap-1 mt-3 justify-center">
                    {weekDates.map(d => {
                        const isSelected = d === selectedDate;
                        const hasReport = weekReportDates.has(d);
                        const dayName = getVietnameseDayName(d);
                        return (
                            <button
                                key={d}
                                onClick={() => setSelectedDate(d)}
                                className={`flex flex-col items-center px-2 py-1.5 rounded-lg text-xs transition-all min-w-[40px]
                                    ${isSelected
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : hasReport
                                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                            : 'text-slate-500 hover:bg-slate-100'
                                    }`}
                            >
                                <span className="font-medium">{dayName}</span>
                                <span className={`text-[10px] ${isSelected ? 'text-blue-100' : ''}`}>{formatShortDate(d)}</span>
                                {hasReport && !isSelected && <CheckCircle2 className="w-3 h-3 mt-0.5 text-emerald-500" />}
                            </button>
                        );
                    })}
                </div>
            </div>

            {loadingReport ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
                    <span className="text-slate-500">Đang tải dữ liệu...</span>
                </div>
            ) : (
                <>
                    {/* Section 1: Chỉ tiêu chung */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                        <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
                            Chỉ tiêu lũy kế chung
                        </h3>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {metrics.map(metric => {
                                const Icon = metric.id === 'call_count' ? Phone :
                                             metric.id === 'duration' ? Clock :
                                             metric.id === 'reached' ? Users :
                                             metric.id === 'ultraview' ? Monitor : Users; // Default icon
                                
                                return (
                                    <div key={metric.id} className="space-y-1.5">
                                        <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                                            <Icon className={`w-3.5 h-3.5 ${
                                                metric.id === 'call_count' ? 'text-blue-500' :
                                                metric.id === 'duration' ? 'text-amber-500' :
                                                metric.id === 'reached' ? 'text-emerald-500' :
                                                metric.id === 'ultraview' ? 'text-purple-500' :
                                                'text-indigo-500'
                                            }`} />
                                            {metric.name} {metric.unit ? `(${metric.unit})` : ''}
                                        </label>
                                        <input
                                            type="number"
                                            min={0}
                                            value={dailyMetricsData[metric.id] || ''}
                                            onChange={e => setDailyMetricsData(prev => ({
                                                ...prev,
                                                [metric.id]: parseInt(e.target.value) || 0
                                            }))}
                                            placeholder="0"
                                            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all tabular-nums"
                                        />
                                        {metric.id === 'duration' && dailyMetricsData[metric.id] > 0 && (
                                            <span className="text-[11px] text-slate-400 pl-1">≈ {formatDuration(dailyMetricsData[metric.id])}</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Section 2: Chi tiết chiến dịch */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                        <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <div className="w-1.5 h-6 bg-emerald-600 rounded-full" />
                            Chi tiết theo chiến dịch
                            {isMondayDate && (
                                <span className="ml-auto text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">
                                    📌 Thứ 2 — Nhập target tuần mới
                                </span>
                            )}
                        </h3>

                        <div className="overflow-x-auto -mx-5 px-5">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200">
                                        <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Chiến dịch</th>
                                        <th className="text-center py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-24">Target tuần</th>
                                        <th className="text-center py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-28">Lũy kế đầu ngày</th>
                                        <th className="text-center py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-28">Số lượng trong ngày</th>
                                        <th className="text-center py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-28">Lũy kế cuối ngày</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {campaigns.map((campaign, idx) => {
                                        const cd = campaignData[campaign.id] || { weeklyTarget: 0, dailyCompleted: 0 };
                                        // Determine if target is editable: only on Monday or if no target set yet in the week
                                        const hasWeekTarget = weekReports.some(wr =>
                                            wr.date !== selectedDate && wr.campaignDetails[campaign.id]?.weeklyTarget
                                        );
                                        const targetEditable = isMondayDate || !hasWeekTarget;
                                        
                                        const cumulativeBefore = getCumulativeBefore(campaign.id);
                                        const cumulativeAfter = cumulativeBefore + cd.dailyCompleted;

                                        return (
                                            <tr key={campaign.id} className={`border-b border-slate-100 ${idx % 2 === 1 ? 'bg-slate-50/50' : ''} hover:bg-blue-50/30 transition-colors`}>
                                                <td className="py-2.5 px-3">
                                                    <div className="font-medium text-slate-700">{campaign.name}</div>
                                                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{campaign.code}</div>
                                                </td>
                                                <td className="py-2.5 px-3 text-center">
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        value={cd.weeklyTarget || ''}
                                                        onChange={e => updateCampaign(campaign.id, 'weeklyTarget', parseInt(e.target.value) || 0)}
                                                        disabled={!targetEditable}
                                                        placeholder="0"
                                                        className={`w-full max-w-[80px] mx-auto px-2 py-1.5 border rounded-lg text-sm text-center font-medium tabular-nums transition-all
                                                            ${targetEditable
                                                                ? 'border-amber-300 bg-amber-50 focus:ring-2 focus:ring-amber-400 focus:border-amber-400'
                                                                : 'border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed'
                                                            }`}
                                                    />
                                                </td>
                                                <td className="py-2.5 px-3 text-center text-slate-600 font-medium tabular-nums">
                                                    {cumulativeBefore.toLocaleString()}
                                                </td>
                                                <td className="py-2.5 px-3 text-center text-slate-600 font-medium tabular-nums">
                                                    {Math.max(0, cd.dailyCompleted).toLocaleString()}
                                                </td>
                                                <td className="py-2.5 px-3 text-center">
                                                    <input
                                                        type="number"
                                                        min={cumulativeBefore}
                                                        value={cumulativeAfter || ''}
                                                        onChange={e => {
                                                            const rawVal = e.target.value;
                                                            const enteredVal = rawVal === '' ? 0 : parseInt(rawVal) || 0;
                                                            const daily = enteredVal - cumulativeBefore;
                                                            updateCampaign(campaign.id, 'dailyCompleted', daily);
                                                        }}
                                                        onBlur={() => {
                                                            if (cd.dailyCompleted < 0) {
                                                                updateCampaign(campaign.id, 'dailyCompleted', 0);
                                                            }
                                                        }}
                                                        placeholder="0"
                                                        className="w-full max-w-[80px] mx-auto px-2 py-1.5 border border-emerald-300 bg-emerald-50 rounded-lg text-sm text-center font-medium tabular-nums focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-all"
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {/* Total row */}
                                    <tr className="bg-blue-50/50 font-bold border-t border-blue-200">
                                        <td className="py-3 px-3 text-blue-700">Σ Tổng cộng các chiến dịch</td>
                                        <td className="py-3 px-3 text-center tabular-nums text-blue-700">
                                            {campaigns.reduce((sum, c) => sum + (campaignData[c.id]?.weeklyTarget || 0), 0).toLocaleString()}
                                        </td>
                                        <td className="py-3 px-3 text-center tabular-nums text-blue-700">
                                            {campaigns.reduce((sum, c) => sum + getCumulativeBefore(c.id), 0).toLocaleString()}
                                        </td>
                                        <td className="py-3 px-3 text-center tabular-nums text-blue-700">
                                            {campaigns.reduce((sum, c) => sum + Math.max(0, campaignData[c.id]?.dailyCompleted || 0), 0).toLocaleString()}
                                        </td>
                                        <td className="py-3 px-3 text-center tabular-nums text-blue-800">
                                            {campaigns.reduce((sum, c) => {
                                                const cd = campaignData[c.id] || { dailyCompleted: 0 };
                                                return sum + getCumulativeBefore(c.id) + Math.max(0, cd.dailyCompleted);
                                            }, 0).toLocaleString()}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end">
                        <button
                            onClick={handleSave}
                            disabled={saveMutation.isPending}
                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-medium shadow-lg shadow-blue-200 hover:shadow-xl hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saveMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            {existingReport ? 'Cập nhật báo cáo' : 'Lưu báo cáo'}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default DailyReportForm;
