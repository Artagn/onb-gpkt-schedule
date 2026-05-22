/**
 * ReportDashboard.tsx - Thống kê lũy kế báo cáo chăm sóc KH
 * 
 * Features:
 * - Toggle: Ngày / Tuần / Tháng
 * - View Ngày: Bảng chi tiết từng ngày trong tuần
 * - View Tuần: Summary + Progress bars chiến dịch
 * - View Tháng: Aggregate toàn tháng, grouped by tuần
 * - Coordinator/Admin: Dropdown chọn nhân viên KS
 */

import React, { useState, useMemo } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Calendar, ChevronLeft, ChevronRight, Loader2, Phone, Clock, Users, Monitor, Target, Trophy, Medal } from 'lucide-react';
import { CareCampaign, CareReport, Employee, CareMetric } from '../../types';
import { useCareReportsWeekQuery, useCareReportsAllWeekQuery, useCareReportsMonthQuery, useCareReportsAllMonthQuery } from '../../hooks/useCareQuery';
import { getISOWeekId, getWeekDates, getWeekStart } from '../../services/careService';
import { aggregateReports, formatDuration, formatShortDate, getVietnameseDayName, AggregatedMetrics, getMetricValue } from './useCustomerCare';

type ViewMode = 'day' | 'week' | 'month';

interface ReportDashboardProps {
    employeeId: string;
    campaigns: CareCampaign[];
    metrics: CareMetric[];
    ksEmployees: Employee[];
    canViewAll: boolean;
}

const ReportDashboard: React.FC<ReportDashboardProps> = ({ employeeId, campaigns, metrics, ksEmployees, canViewAll }) => {
    const today = new Date().toISOString().split('T')[0];
    const [viewMode, setViewMode] = useState<ViewMode>('week');
    const [selectedDate, setSelectedDate] = useState(today);
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return { year: now.getFullYear(), month: now.getMonth() + 1 };
    });
    const [viewEmployeeId, setViewEmployeeId] = useState(employeeId);

    const effectiveEmployeeId = canViewAll ? viewEmployeeId : employeeId;
    const weekId = useMemo(() => getISOWeekId(selectedDate), [selectedDate]);
    const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);

    // Previous period calculations (for trend comparison)
    const prevWeekId = useMemo(() => {
        const d = new Date(selectedDate + 'T00:00:00');
        d.setDate(d.getDate() - 7);
        return getISOWeekId(d.toISOString().split('T')[0]);
    }, [selectedDate]);
    const prevMonth = useMemo(() => {
        let m = selectedMonth.month - 1;
        let y = selectedMonth.year;
        if (m < 1) { m = 12; y--; }
        return { year: y, month: m };
    }, [selectedMonth]);

    // ===== Current period queries =====
    const { data: weekReports = [], isLoading: loadingWeek } = useCareReportsWeekQuery(
        effectiveEmployeeId === 'all' ? '' : effectiveEmployeeId,
        weekId
    );
    const { data: allWeekReports = [], isLoading: loadingAllWeek } = useCareReportsAllWeekQuery(
        effectiveEmployeeId === 'all' ? weekId : ''
    );
    const { data: monthReports = [], isLoading: loadingMonth } = useCareReportsMonthQuery(
        effectiveEmployeeId === 'all' ? '' : effectiveEmployeeId,
        selectedMonth.year,
        selectedMonth.month
    );
    const { data: allMonthReports = [], isLoading: loadingAllMonth } = useCareReportsAllMonthQuery(
        effectiveEmployeeId === 'all' ? selectedMonth.year : 0,
        effectiveEmployeeId === 'all' ? selectedMonth.month : 0
    );

    // ===== Previous period queries (for trend) =====
    const { data: prevWeekReports = [] } = useCareReportsWeekQuery(
        effectiveEmployeeId === 'all' ? '' : effectiveEmployeeId,
        viewMode !== 'month' ? prevWeekId : ''
    );
    const { data: prevAllWeekReports = [] } = useCareReportsAllWeekQuery(
        effectiveEmployeeId === 'all' && viewMode !== 'month' ? prevWeekId : ''
    );
    const { data: prevMonthReports = [] } = useCareReportsMonthQuery(
        effectiveEmployeeId === 'all' ? '' : effectiveEmployeeId,
        viewMode === 'month' ? prevMonth.year : 0,
        viewMode === 'month' ? prevMonth.month : 0
    );
    const { data: prevAllMonthReports = [] } = useCareReportsAllMonthQuery(
        effectiveEmployeeId === 'all' && viewMode === 'month' ? prevMonth.year : 0,
        effectiveEmployeeId === 'all' && viewMode === 'month' ? prevMonth.month : 0
    );

    // Active employee IDs for filtering (excludes "Ngưng hoạt động")
    const activeEmployeeIds = useMemo(() => new Set(ksEmployees.map(e => e.id)), [ksEmployees]);

    // Resolve the effective reports list (filter out inactive employees when viewing all)
    const effectiveWeekReports = effectiveEmployeeId === 'all'
        ? allWeekReports.filter(r => activeEmployeeIds.has(r.employeeId))
        : weekReports;
    const effectiveMonthReports = effectiveEmployeeId === 'all'
        ? allMonthReports.filter(r => activeEmployeeIds.has(r.employeeId))
        : monthReports;
    const effectivePrevWeekReports = effectiveEmployeeId === 'all'
        ? prevAllWeekReports.filter(r => activeEmployeeIds.has(r.employeeId))
        : prevWeekReports;
    const effectivePrevMonthReports = effectiveEmployeeId === 'all'
        ? prevAllMonthReports.filter(r => activeEmployeeIds.has(r.employeeId))
        : prevMonthReports;

    // Current period aggregates
    const weekAggregate = useMemo(() => aggregateReports(effectiveWeekReports, campaigns, metrics), [effectiveWeekReports, campaigns, metrics]);
    const monthAggregate = useMemo(() => aggregateReports(effectiveMonthReports, campaigns, metrics), [effectiveMonthReports, campaigns, metrics]);
    const dayAggregate = useMemo(() => {
        const dayReports = effectiveWeekReports.filter(r => r.date === selectedDate);
        return aggregateReports(dayReports, campaigns, metrics);
    }, [effectiveWeekReports, selectedDate, campaigns, metrics]);

    // Previous period aggregates (for trend)
    const prevWeekAggregate = useMemo(() => aggregateReports(effectivePrevWeekReports, campaigns, metrics), [effectivePrevWeekReports, campaigns, metrics]);
    const prevMonthAggregate = useMemo(() => aggregateReports(effectivePrevMonthReports, campaigns, metrics), [effectivePrevMonthReports, campaigns, metrics]);
    const prevDayAggregate = useMemo(() => {
        // Compare with yesterday (or same weekday last week if Monday)
        const d = new Date(selectedDate + 'T00:00:00');
        d.setDate(d.getDate() - 1);
        const yesterday = d.toISOString().split('T')[0];
        const source = d.getDay() === 0 ? effectivePrevWeekReports : effectiveWeekReports; // Sunday → prev week
        const yReports = source.filter(r => r.date === yesterday);
        return aggregateReports(yReports, campaigns, metrics);
    }, [effectiveWeekReports, effectivePrevWeekReports, selectedDate, campaigns, metrics]);

    const isLoading = (viewMode === 'week' || viewMode === 'day') ? (loadingWeek || loadingAllWeek) : (loadingMonth || loadingAllMonth);

    // Navigate week
    const navigateWeek = (delta: number) => {
        const d = new Date(selectedDate + 'T00:00:00');
        d.setDate(d.getDate() + (delta * 7));
        setSelectedDate(d.toISOString().split('T')[0]);
    };

    // Navigate month
    const navigateMonth = (delta: number) => {
        setSelectedMonth(prev => {
            let m = prev.month + delta;
            let y = prev.year;
            if (m > 12) { m = 1; y++; }
            if (m < 1) { m = 12; y--; }
            return { year: y, month: m };
        });
    };

    return (
        <div className="space-y-5">
            {/* Controls */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                    {/* View Mode Tabs */}
                    <div className="flex bg-slate-100 rounded-lg p-0.5">
                        {[
                            { id: 'day' as ViewMode, label: 'Ngày' },
                            { id: 'week' as ViewMode, label: 'Tuần' },
                            { id: 'month' as ViewMode, label: 'Tháng' },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setViewMode(tab.id)}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all
                                    ${viewMode === tab.id
                                        ? 'bg-white text-blue-700 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Date/Month Navigator */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => viewMode === 'month' ? navigateMonth(-1) : navigateWeek(-1)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4 text-slate-600" />
                        </button>
                        <span className="text-sm font-bold text-slate-700 min-w-[120px] text-center">
                            {viewMode === 'month'
                                ? `Tháng ${String(selectedMonth.month).padStart(2, '0')}/${selectedMonth.year}`
                                : `Tuần ${weekId.split('-W')[1]} (${formatShortDate(weekDates[0])} - ${formatShortDate(weekDates[6])})`
                            }
                        </span>
                        <button
                            onClick={() => viewMode === 'month' ? navigateMonth(1) : navigateWeek(1)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <ChevronRight className="w-4 h-4 text-slate-600" />
                        </button>
                    </div>

                    {/* Employee Selector (Coordinator/Admin) */}
                    {canViewAll && (
                        <select
                            value={viewEmployeeId}
                            onChange={e => setViewEmployeeId(e.target.value)}
                            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 min-w-[180px]"
                        >
                            <option value={employeeId}>Của tôi</option>
                            <option value="all">📊 Tất cả NV KS</option>
                            {ksEmployees.filter(e => e.id !== employeeId).map(e => (
                                <option key={e.id} value={e.id}>{e.fullName}</option>
                            ))}
                        </select>
                    )}
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
                    <span className="text-slate-500">Đang tải thống kê...</span>
                </div>
            ) : (
                <>
                    {/* Summary Cards — All view modes */}
                    <SummaryCards
                        aggregate={viewMode === 'day' ? dayAggregate : viewMode === 'week' ? weekAggregate : monthAggregate}
                        prevAggregate={viewMode === 'day' ? prevDayAggregate : viewMode === 'week' ? prevWeekAggregate : prevMonthAggregate}
                        metrics={metrics}
                        periodLabel={viewMode === 'day' ? 'hôm qua' : viewMode === 'week' ? 'tuần trước' : 'tháng trước'}
                    />

                    {/* Daily View — Table of all days in the week */}
                    {viewMode === 'day' && (
                        <DailyTable reports={effectiveWeekReports} campaigns={campaigns} metrics={metrics} weekDates={weekDates} />
                    )}

                    {/* Week/Month View — Campaign Progress */}
                    {(viewMode === 'week' || viewMode === 'month') && (
                        <CampaignProgress
                            aggregate={viewMode === 'week' ? weekAggregate : monthAggregate}
                            campaigns={campaigns}
                            label={viewMode === 'week' ? 'Tuần' : 'Tháng'}
                        />
                    )}

                    {/* Employee Breakdown Table — All view modes when 'all' is selected */}
                    {effectiveEmployeeId === 'all' && (
                        <EmployeeBreakdownTable
                            reports={viewMode === 'day'
                                ? effectiveWeekReports.filter(r => r.date === selectedDate)
                                : viewMode === 'week' ? effectiveWeekReports : effectiveMonthReports}
                            employees={ksEmployees}
                            campaigns={campaigns}
                            metrics={metrics}
                            label={viewMode === 'day' ? formatShortDate(selectedDate) : viewMode === 'week' ? 'Tuần' : 'Tháng'}
                        />
                    )}
                </>
            )}
        </div>
    );
};

// ========== SUBCOMPONENTS ==========

const SummaryCards: React.FC<{ aggregate: AggregatedMetrics; prevAggregate: AggregatedMetrics; metrics: CareMetric[]; periodLabel: string }> = ({ aggregate, prevAggregate, metrics, periodLabel }) => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map(metric => {
            const Icon = metric.id === 'call_count' ? Phone :
                         metric.id === 'duration' ? Clock :
                         metric.id === 'reached' ? Users :
                         metric.id === 'ultraview' ? Monitor : BarChart3;
            
            const value = aggregate.metricTotals[metric.id] || 0;
            const prevValue = prevAggregate.metricTotals[metric.id] || 0;
            const formattedValue = metric.id === 'duration' ? formatDuration(value) : value.toLocaleString();
            
            return (
                <StatCard
                    key={metric.id}
                    icon={<Icon className="w-5 h-5" />}
                    label={metric.name}
                    value={formattedValue}
                    currentRaw={value}
                    prevRaw={prevValue}
                    periodLabel={periodLabel}
                    color={
                        metric.id === 'call_count' ? 'blue' :
                        metric.id === 'duration' ? 'amber' :
                        metric.id === 'reached' ? 'emerald' :
                        metric.id === 'ultraview' ? 'purple' : 'slate'
                    }
                />
            );
        })}
    </div>
);

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string; currentRaw: number; prevRaw: number; periodLabel: string; color: string }> = ({ icon, label, value, currentRaw, prevRaw, periodLabel, color }) => {
    const colorMap: Record<string, string> = {
        blue: 'bg-blue-50 text-blue-600 border-blue-200',
        amber: 'bg-amber-50 text-amber-600 border-amber-200',
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
        purple: 'bg-purple-50 text-purple-600 border-purple-200',
    };
    // Trend calculation
    const delta = prevRaw > 0 ? Math.round(((currentRaw - prevRaw) / prevRaw) * 100) : 0;
    const hasTrend = prevRaw > 0;

    return (
        <div className={`rounded-xl border p-4 ${colorMap[color] || colorMap.blue}`}>
            <div className="flex items-center gap-2 mb-2 opacity-70">{icon}<span className="text-xs font-medium">{label}</span></div>
            <div className="text-2xl font-bold tabular-nums">{value}</div>
            {hasTrend && (
                <div className={`flex items-center gap-1 mt-1.5 text-[11px] font-medium ${delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                    {delta > 0 ? <TrendingUp className="w-3 h-3" /> : delta < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                    <span>{delta > 0 ? '+' : ''}{delta}% vs {periodLabel}</span>
                </div>
            )}
        </div>
    );
};

const DailyTable: React.FC<{ reports: CareReport[]; campaigns: CareCampaign[]; metrics: CareMetric[]; weekDates: string[] }> = ({ reports, campaigns, metrics, weekDates }) => {
    const reportsByDate = useMemo(() => {
        const map: Record<string, CareReport> = {};
        reports.forEach(r => { map[r.date] = r; });
        return map;
    }, [reports]);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200">
                <h3 className="text-sm font-bold text-slate-700">Chi tiết từng ngày trong tuần</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500">Chỉ tiêu</th>
                            {weekDates.map(d => (
                                <th key={d} className="text-center py-2.5 px-2 text-xs font-semibold text-slate-500 min-w-[65px]">
                                    <div>{getVietnameseDayName(d)}</div>
                                    <div className="text-[10px] font-normal text-slate-400">{formatShortDate(d)}</div>
                                </th>
                            ))}
                            <th className="text-center py-2.5 px-3 text-xs font-bold text-blue-600 bg-blue-50/50">Tổng</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* General Metrics */}
                        {metrics.map((metric, idx) => {
                            const total = weekDates.reduce((sum, d) => {
                                const r = reportsByDate[d];
                                return sum + (r ? getMetricValue(r.dailyMetrics, metric.id) : 0);
                            }, 0);
                            
                            const Icon = metric.id === 'call_count' ? '📞' :
                                         metric.id === 'duration' ? '⏱️' :
                                         metric.id === 'reached' ? '👥' :
                                         metric.id === 'ultraview' ? '🖥️' : '📊';
                                         
                            return (
                                <tr key={metric.id} className={`border-b border-slate-100 ${idx % 2 === 1 ? 'bg-slate-50/30' : ''}`}>
                                    <td className="py-2 px-3 text-xs font-medium text-slate-700 whitespace-nowrap">
                                        {Icon} {metric.name}
                                    </td>
                                    {weekDates.map(d => {
                                        const r = reportsByDate[d];
                                        const finalVal = r ? getMetricValue(r.dailyMetrics, metric.id) : 0;
                                        
                                        return (
                                            <td key={d} className="text-center py-2 px-2 text-xs tabular-nums text-slate-600">
                                                {finalVal > 0 ? (metric.id === 'duration' ? formatDuration(finalVal) : finalVal.toLocaleString()) : <span className="text-slate-300">-</span>}
                                            </td>
                                        );
                                    })}
                                    <td className="text-center py-2 px-3 text-xs font-bold text-blue-700 bg-blue-50/50 tabular-nums">
                                        {metric.id === 'duration' ? formatDuration(total) : total.toLocaleString()}
                                    </td>
                                </tr>
                            );
                        })}

                        {/* Separator */}
                        <tr><td colSpan={weekDates.length + 2} className="py-1 bg-slate-100"><div className="text-[10px] text-slate-400 text-center font-medium uppercase tracking-wider">Chiến dịch</div></td></tr>

                        {/* Campaign details */}
                        {campaigns.map((campaign, idx) => {
                            const total = weekDates.reduce((sum, d) => {
                                const r = reportsByDate[d];
                                return sum + (r?.campaignDetails[campaign.id]?.dailyCompleted || 0);
                            }, 0);
                            // Get target
                            const target = reports.reduce((t, r) => {
                                const ct = r.campaignDetails[campaign.id]?.weeklyTarget;
                                return ct && ct > t ? ct : t;
                            }, 0);

                            return (
                                <tr key={campaign.id} className={`border-b border-slate-100 ${idx % 2 === 1 ? 'bg-slate-50/30' : ''}`}>
                                    <td className="py-2 px-3 text-xs font-medium text-slate-700">
                                        <div className="truncate max-w-[140px]" title={campaign.code}>{campaign.name}</div>
                                        {target > 0 && <div className="text-[10px] text-amber-600">Target: {target}</div>}
                                    </td>
                                    {weekDates.map(d => {
                                        const r = reportsByDate[d];
                                        const val = r?.campaignDetails[campaign.id]?.dailyCompleted || 0;
                                        return (
                                            <td key={d} className="text-center py-2 px-2 text-xs tabular-nums text-slate-600">
                                                {val > 0 ? val : <span className="text-slate-300">-</span>}
                                            </td>
                                        );
                                    })}
                                    <td className="text-center py-2 px-3 text-xs font-bold tabular-nums bg-blue-50/50">
                                        <span className={target > 0 && total >= target ? 'text-emerald-600' : 'text-blue-700'}>
                                            {total}
                                        </span>
                                        {target > 0 && (
                                            <span className="text-[10px] text-slate-400 ml-0.5">/{target}</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}

                        {/* Total campaigns row */}
                        <tr className="bg-blue-50/30 font-bold border-t border-blue-100">
                            <td className="py-2.5 px-3 text-xs text-blue-700">
                                Σ Tổng số các chiến dịch
                            </td>
                            {weekDates.map(d => {
                                const dayTotal = campaigns.reduce((sum, campaign) => {
                                    const r = reportsByDate[d];
                                    return sum + (r?.campaignDetails[campaign.id]?.dailyCompleted || 0);
                                }, 0);
                                return (
                                    <td key={d} className="text-center py-2 px-2 text-xs tabular-nums text-blue-700">
                                        {dayTotal > 0 ? dayTotal.toLocaleString() : <span className="text-slate-300">-</span>}
                                    </td>
                                );
                            })}
                            <td className="text-center py-2.5 px-3 text-xs font-bold text-blue-800 bg-blue-100/50 tabular-nums">
                                {campaigns.reduce((sum, campaign) => {
                                    return sum + weekDates.reduce((s, d) => s + (reportsByDate[d]?.campaignDetails[campaign.id]?.dailyCompleted || 0), 0);
                                }, 0).toLocaleString()}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const CampaignProgress: React.FC<{ aggregate: AggregatedMetrics; campaigns: CareCampaign[]; label: string }> = ({ aggregate, campaigns, label }) => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-600" />
            Tiến độ chiến dịch ({label})
        </h3>

        <div className="space-y-4">
            {campaigns.map(campaign => {
                const ct = aggregate.campaignTotals[campaign.id];
                if (!ct) return null;
                const pct = ct.progressPercent;
                const barColor = pct >= 100 ? 'bg-emerald-500' : pct >= 70 ? 'bg-blue-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-400';

                return (
                    <div key={campaign.id}>
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-medium text-slate-700">{campaign.name}</span>
                            <div className="flex items-center gap-2 text-xs tabular-nums">
                                <span className="font-bold text-slate-800">{ct.totalCompleted}</span>
                                {ct.weeklyTarget > 0 && (
                                    <>
                                        <span className="text-slate-400">/ {ct.weeklyTarget}</span>
                                        <span className={`font-bold ${pct >= 100 ? 'text-emerald-600' : 'text-slate-600'}`}>
                                            ({pct}%)
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                        {ct.weeklyTarget > 0 ? (
                            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                                    style={{ width: `${Math.min(pct, 100)}%` }}
                                />
                            </div>
                        ) : (
                            <div className="h-2.5 bg-slate-50 rounded-full flex items-center justify-center">
                                <span className="text-[9px] text-slate-400">Chưa có target</span>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    </div>
);

const EmployeeBreakdownTable: React.FC<{
    reports: CareReport[];
    employees: Employee[];
    campaigns: CareCampaign[];
    metrics: CareMetric[];
    label: string;
}> = ({ reports, employees, campaigns, metrics, label }) => {
    const reportsByEmployee = useMemo(() => {
        const map: Record<string, CareReport[]> = {};
        reports.forEach(r => {
            if (!map[r.employeeId]) map[r.employeeId] = [];
            map[r.employeeId].push(r);
        });
        return map;
    }, [reports]);

    const employeeAggregates = useMemo(() => {
        const map: Record<string, AggregatedMetrics> = {};
        employees.forEach(emp => {
            const empReports = reportsByEmployee[emp.id] || [];
            map[emp.id] = aggregateReports(empReports, campaigns, metrics);
        });
        return map;
    }, [employees, reportsByEmployee, campaigns, metrics]);

    const totalAggregate = useMemo(() => aggregateReports(reports, campaigns, metrics), [reports, campaigns, metrics]);

    // Sort employees by total campaign completed (descending) for ranking
    const rankedEmployees = useMemo(() => {
        return [...employees].sort((a, b) => {
            const aggA = employeeAggregates[a.id];
            const aggB = employeeAggregates[b.id];
            const totalA = aggA ? campaigns.reduce((sum, c) => sum + (aggA.campaignTotals[c.id]?.totalCompleted || 0), 0) : 0;
            const totalB = aggB ? campaigns.reduce((sum, c) => sum + (aggB.campaignTotals[c.id]?.totalCompleted || 0), 0) : 0;
            const hasDataA = (reportsByEmployee[a.id]?.length || 0) > 0;
            const hasDataB = (reportsByEmployee[b.id]?.length || 0) > 0;
            // Employees with no data go to bottom
            if (hasDataA && !hasDataB) return -1;
            if (!hasDataA && hasDataB) return 1;
            return totalB - totalA;
        });
    }, [employees, employeeAggregates, campaigns, reportsByEmployee]);

    const rankBadge = (rank: number) => {
        if (rank === 1) return <Trophy className="w-3.5 h-3.5 text-amber-500 inline" />;
        if (rank === 2) return <Medal className="w-3.5 h-3.5 text-slate-400 inline" />;
        if (rank === 3) return <Medal className="w-3.5 h-3.5 text-amber-700 inline" />;
        return <span className="text-slate-400">{rank}</span>;
    };

    // Sticky column widths
    const stickyRankW = 40; // px width for # column
    const stickyNameW = 140; // px width for name column

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-5">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
                <h3 className="text-sm font-bold text-slate-700">Chi tiết theo nhân viên ({label})</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="text-sm border-collapse" style={{ minWidth: '100%' }}>
                    <thead>
                        {/* Group header row */}
                        <tr className="border-b border-slate-100">
                            <th
                                className="bg-slate-50"
                                style={{ position: 'sticky', left: 0, zIndex: 20, minWidth: stickyRankW, width: stickyRankW }}
                                rowSpan={2}
                            ></th>
                            <th
                                className="text-left py-2 px-3 text-xs font-semibold text-slate-500 bg-slate-50"
                                style={{ position: 'sticky', left: stickyRankW, zIndex: 20, minWidth: stickyNameW }}
                                rowSpan={2}
                            >
                                <div className="flex items-center">
                                    Nhân viên
                                    <div className="absolute right-0 top-0 bottom-0 w-[3px] bg-gradient-to-r from-slate-200/60 to-transparent" />
                                </div>
                            </th>
                            {metrics.length > 0 && (
                                <th
                                    colSpan={metrics.length}
                                    className="text-center py-1.5 px-2 text-[10px] font-bold text-blue-600 bg-blue-50/60 uppercase tracking-wider border-l border-blue-100"
                                >
                                    📊 Chỉ tiêu
                                </th>
                            )}
                            {campaigns.length > 0 && (
                                <th
                                    colSpan={campaigns.length}
                                    className="text-center py-1.5 px-2 text-[10px] font-bold text-amber-600 bg-amber-50/60 uppercase tracking-wider border-l border-amber-100"
                                >
                                    🎯 Chiến dịch
                                </th>
                            )}
                            <th
                                className="text-center py-1.5 px-2 text-[10px] font-bold text-emerald-600 bg-emerald-50/60 uppercase tracking-wider border-l border-emerald-100"
                                rowSpan={1}
                            >
                                ✅ Tổng hợp
                            </th>
                        </tr>
                        {/* Column name row */}
                        <tr className="bg-slate-50 border-b border-slate-200">
                            {metrics.map((m, i) => (
                                <th key={m.id} className={`text-center py-2 px-2 text-xs font-semibold text-blue-700 bg-blue-50/30 whitespace-nowrap ${i === 0 ? 'border-l border-blue-100' : ''}`} style={{ minWidth: 80 }}>
                                    {m.name}
                                </th>
                            ))}
                            {campaigns.map((c, i) => (
                                <th key={c.id} className={`text-center py-2 px-2 text-xs font-semibold text-amber-700 bg-amber-50/30 whitespace-nowrap ${i === 0 ? 'border-l border-amber-100' : ''}`} style={{ minWidth: 100 }}>
                                    {c.name}
                                </th>
                            ))}
                            <th className="text-center py-2 px-2 text-xs font-bold text-emerald-700 bg-emerald-50/30 whitespace-nowrap border-l border-emerald-100" style={{ minWidth: 120 }}>
                                Tổng cộng (% HT)
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {rankedEmployees.map((emp, idx) => {
                            const agg = employeeAggregates[emp.id];
                            if (!agg) return null;
                            const hasData = reportsByEmployee[emp.id]?.length > 0;
                            
                            // Calculate grand totals for this employee
                            const grandTotalCompleted = campaigns.reduce((sum, c) => sum + (agg.campaignTotals[c.id]?.totalCompleted || 0), 0);
                            const grandTotalTarget = campaigns.reduce((sum, c) => sum + (agg.campaignTotals[c.id]?.weeklyTarget || 0), 0);
                            const grandPct = grandTotalTarget > 0 ? Math.round((grandTotalCompleted / grandTotalTarget) * 100) : 0;
                            const rowBg = !hasData ? 'bg-white opacity-50' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30';

                            return (
                                <tr key={emp.id} className={`border-b border-slate-100 hover:bg-slate-50/60 transition-colors ${!hasData ? 'opacity-50' : ''}`}>
                                    <td
                                        className={`text-center py-2.5 px-2 text-xs font-bold ${rowBg}`}
                                        style={{ position: 'sticky', left: 0, zIndex: 10 }}
                                    >{hasData ? rankBadge(idx + 1) : '-'}</td>
                                    <td
                                        className={`py-2.5 px-3 font-medium text-slate-700 whitespace-nowrap ${rowBg}`}
                                        style={{ position: 'sticky', left: stickyRankW, zIndex: 10 }}
                                    >{emp.fullName}</td>
                                    {metrics.map((m, i) => {
                                        const val = agg.metricTotals[m.id] || 0;
                                        return (
                                            <td key={m.id} className={`text-center py-2.5 px-2 tabular-nums bg-blue-50/10 ${i === 0 ? 'border-l border-blue-50' : ''}`}>
                                                {val > 0 ? (m.id === 'duration' ? formatDuration(val) : val.toLocaleString()) : <span className="text-slate-300">-</span>}
                                            </td>
                                        );
                                    })}
                                    {campaigns.map((c, i) => {
                                        const ct = agg.campaignTotals[c.id];
                                        return (
                                            <td key={c.id} className={`text-center py-2.5 px-2 tabular-nums whitespace-nowrap bg-amber-50/10 ${i === 0 ? 'border-l border-amber-50' : ''}`}>
                                                {ct?.totalCompleted || <span className="text-slate-300">-</span>}
                                                {ct?.weeklyTarget > 0 && (
                                                    <span className="text-[10px] text-slate-400">/{ct.weeklyTarget}</span>
                                                )}
                                            </td>
                                        );
                                    })}
                                    <td className="text-center py-2.5 px-2 tabular-nums font-bold bg-emerald-50/20 text-emerald-700 whitespace-nowrap border-l border-emerald-100">
                                        {grandTotalCompleted.toLocaleString()}
                                        {grandTotalTarget > 0 && (
                                            <div className="text-[10px] text-slate-500 font-normal">
                                                / {grandTotalTarget.toLocaleString()} ({grandPct}%)
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                        {/* Total Row */}
                        <tr className="font-bold border-t-2 border-slate-300">
                            <td
                                className="py-2.5 px-2 bg-slate-100"
                                style={{ position: 'sticky', left: 0, zIndex: 10 }}
                            ></td>
                            <td
                                className="py-2.5 px-3 text-slate-700 whitespace-nowrap bg-slate-100"
                                style={{ position: 'sticky', left: stickyRankW, zIndex: 10 }}
                            >Tổng cộng toàn phòng</td>
                            {metrics.map((m, i) => {
                                const val = totalAggregate.metricTotals[m.id] || 0;
                                return (
                                    <td key={m.id} className={`text-center py-2.5 px-2 tabular-nums text-blue-700 bg-blue-50/40 ${i === 0 ? 'border-l border-blue-100' : ''}`}>
                                        {m.id === 'duration' ? formatDuration(val) : val.toLocaleString()}
                                    </td>
                                );
                            })}
                            {campaigns.map((c, i) => {
                                const ct = totalAggregate.campaignTotals[c.id];
                                return (
                                    <td key={c.id} className={`text-center py-2.5 px-2 tabular-nums text-amber-700 whitespace-nowrap bg-amber-50/40 ${i === 0 ? 'border-l border-amber-100' : ''}`}>
                                        {ct?.totalCompleted || 0}
                                        {ct?.weeklyTarget > 0 && (
                                            <span className="text-[10px] text-amber-500">/{ct.weeklyTarget}</span>
                                        )}
                                    </td>
                                );
                            })}
                            {/* Grand total of all campaigns */}
                            <td className="text-center py-2.5 px-2 tabular-nums text-emerald-800 bg-emerald-50/50 whitespace-nowrap border-l border-emerald-100">
                                {campaigns.reduce((sum, c) => sum + (totalAggregate.campaignTotals[c.id]?.totalCompleted || 0), 0).toLocaleString()}
                                {(() => {
                                    const totalComp = campaigns.reduce((sum, c) => sum + (totalAggregate.campaignTotals[c.id]?.totalCompleted || 0), 0);
                                    const totalTarget = campaigns.reduce((sum, c) => sum + (totalAggregate.campaignTotals[c.id]?.weeklyTarget || 0), 0);
                                    const totalPct = totalTarget > 0 ? Math.round((totalComp / totalTarget) * 100) : 0;
                                    return totalTarget > 0 ? (
                                        <div className="text-[10px] text-emerald-600">
                                            / {totalTarget.toLocaleString()} ({totalPct}%)
                                        </div>
                                    ) : null;
                                })()}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ReportDashboard;

