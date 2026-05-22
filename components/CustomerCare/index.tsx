/**
 * CustomerCare/index.tsx - Tab container chăm sóc KH (ONB_KS)
 * 
 * 3 Tabs:
 * 1. Nhập liệu — Form nhập báo cáo hàng ngày
 * 2. Thống kê — Dashboard lũy kế ngày/tuần/tháng
 * 3. Quản lý chiến dịch — CRUD chiến dịch (Admin/Coordinator only)
 * 
 * Access Control:
 * - ONB_KS/KS employees: Tab 1 & 2
 * - Admin/Coordinator: All tabs + xem báo cáo tất cả nhân viên KS
 */

import React, { useState, lazy, Suspense } from 'react';
import { ClipboardEdit, BarChart3, Settings, ShieldAlert, Loader2, Headphones } from 'lucide-react';
import { useCustomerCare } from './useCustomerCare';

const DailyReportForm = lazy(() => import('./DailyReportForm'));
const ReportDashboard = lazy(() => import('./ReportDashboard'));
const CampaignManager = lazy(() => import('./CampaignManager'));
const MetricManager = lazy(() => import('./MetricManager'));

type TabId = 'input' | 'stats' | 'config';

const CustomerCare: React.FC = () => {
    const {
        currentEmployee,
        ksEmployees,
        campaigns,
        activeCampaigns,
        loadingCampaigns,
        metrics,
        activeMetrics,
        loadingMetrics,
        isKSEmployee,
        canManageCampaigns,
        canViewAllReports,
    } = useCustomerCare();

    const [activeTab, setActiveTab] = useState<TabId>('input');
    const [activeConfigSubTab, setActiveConfigSubTab] = useState<'campaigns' | 'metrics'>('campaigns');

    // Access check: only KS employees or Admin/Coordinator
    if (!isKSEmployee && !canManageCampaigns) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <ShieldAlert className="w-16 h-16 text-slate-300 mb-4" />
                <h2 className="text-xl font-bold text-slate-700 mb-2">Không có quyền truy cập</h2>
                <p className="text-sm text-slate-500 max-w-md">
                    Tính năng "Chăm sóc KH" chỉ dành cho nhân viên thuộc nhóm đánh giá <strong>Kiểm soát (ONB_KS)</strong>.
                </p>
            </div>
        );
    }

    const tabs: { id: TabId; label: string; icon: React.ReactNode; show: boolean }[] = [
        { id: 'input', label: 'Nhập liệu', icon: <ClipboardEdit className="w-4 h-4" />, show: isKSEmployee || canManageCampaigns },
        { id: 'stats', label: 'Thống kê', icon: <BarChart3 className="w-4 h-4" />, show: true },
        { id: 'config', label: 'Cấu hình', icon: <Settings className="w-4 h-4" />, show: canManageCampaigns },
    ];

    const visibleTabs = tabs.filter(t => t.show);

    return (
        <div className="max-w-6xl mx-auto">
            {/* Page Header */}
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-1">
                    <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
                        <Headphones className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">Chăm sóc Khách hàng</h1>
                        <p className="text-xs text-slate-500">
                            Báo cáo công việc chăm sóc KH hàng ngày • Nhóm Kiểm soát
                            {currentEmployee && <span className="ml-1 text-blue-600 font-medium">• {currentEmployee.fullName}</span>}
                        </p>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-1 mb-6 bg-slate-100 rounded-xl p-1 w-fit">
                {visibleTabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                            ${activeTab === tab.id
                                ? 'bg-white text-blue-700 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                            }`}
                    >
                        {tab.icon}
                        <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <Suspense fallback={
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
                    <span className="text-slate-500">Đang tải...</span>
                </div>
            }>
                {activeTab === 'input' && currentEmployee && (
                    <DailyReportForm
                        employeeId={currentEmployee.id}
                        employeeName={currentEmployee.fullName}
                        campaigns={activeCampaigns}
                        metrics={activeMetrics}
                    />
                )}

                {activeTab === 'stats' && currentEmployee && (
                    <ReportDashboard
                        employeeId={currentEmployee.id}
                        campaigns={activeCampaigns}
                        metrics={activeMetrics}
                        ksEmployees={ksEmployees}
                        canViewAll={canViewAllReports}
                    />
                )}

                {activeTab === 'config' && canManageCampaigns && (
                    <div className="space-y-6">
                        {/* Sub Tabs */}
                        <div className="flex gap-2 border-b border-slate-200">
                            <button
                                onClick={() => setActiveConfigSubTab('campaigns')}
                                className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${
                                    activeConfigSubTab === 'campaigns'
                                        ? 'border-blue-600 text-blue-600'
                                        : 'border-transparent text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                Chiến dịch
                            </button>
                            <button
                                onClick={() => setActiveConfigSubTab('metrics')}
                                className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${
                                    activeConfigSubTab === 'metrics'
                                        ? 'border-blue-600 text-blue-600'
                                        : 'border-transparent text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                Chỉ tiêu
                            </button>
                        </div>

                        {/* Sub Tab Content */}
                        {activeConfigSubTab === 'campaigns' && (
                            <CampaignManager
                                campaigns={campaigns}
                                loading={loadingCampaigns}
                            />
                        )}
                        {activeConfigSubTab === 'metrics' && (
                            <MetricManager
                                metrics={metrics}
                                loading={loadingMetrics}
                            />
                        )}
                    </div>
                )}
            </Suspense>
        </div>
    );
};

export default CustomerCare;
