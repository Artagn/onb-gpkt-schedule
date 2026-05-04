/**
 * Evaluation Module - Main Container
 * Tab navigation for: Cấu hình | Đợt đánh giá | Tự đánh giá | Duyệt
 */

import React, { useState } from 'react';
import { Settings, Calendar, ClipboardList, CheckCircle } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { auth } from '../../services/firebaseConfig';
import MetricManager from './MetricManager';
import PeriodManager from './PeriodManager';
import EmployeeFormDT from './EmployeeFormDT';
import EmployeeFormKS from './EmployeeFormKS';
import EvaluationErrorBoundary from './EvaluationErrorBoundary';
import ReviewManager from './ReviewManager';

type TabId = 'config' | 'periods' | 'self' | 'self_ks' | 'review';

interface Tab {
    id: TabId;
    label: string;
    icon: React.ElementType;
    minRole: 'Staff' | 'Coordinator' | 'Admin';
}

const TABS: Tab[] = [
    { id: 'config', label: 'Cấu hình', icon: Settings, minRole: 'Admin' },
    { id: 'periods', label: 'Đợt đánh giá', icon: Calendar, minRole: 'Coordinator' },
    { id: 'self', label: 'Tự đánh giá', icon: ClipboardList, minRole: 'Staff' }, // Dynamic label applied in component
    { id: 'self_ks', label: 'ONB KS tự đánh giá', icon: ClipboardList, minRole: 'Coordinator' },
    { id: 'review', label: 'Duyệt', icon: CheckCircle, minRole: 'Coordinator' },
];

// Helper to check if user is KS group
const isKSGroup = (group?: string) => {
    if (!group) return false;
    return group.startsWith('ONB_KS') || group === 'KS';
};

export default function Evaluation() {
    const { employees } = useData();
    const currentUser = auth.currentUser;
    const currentLoggedEmp = employees.find(e => e.email?.toLowerCase() === currentUser?.email?.toLowerCase());
    const [activeTab, setActiveTab] = useState<TabId>('self');

    // Role-based tab filtering
    const userRole = currentLoggedEmp?.role || 'Nhân viên';
    const isAdmin = userRole === 'Quản trị';
    const isCoordinator = userRole === 'Điều phối' || isAdmin;

    // Dynamic tab label based on user's group
    const selfTabLabel = isKSGroup(currentLoggedEmp?.evaluationGroup)
        ? 'ONB KS tự đánh giá'
        : 'ONB CG tự đánh giá';

    const visibleTabs = TABS.filter(tab => {
        if (tab.minRole === 'Admin') return isAdmin;
        if (tab.minRole === 'Coordinator') return isCoordinator;
        return true;
    }).map(tab => tab.id === 'self' ? { ...tab, label: selfTabLabel } : tab);


    // Set default tab based on role
    React.useEffect(() => {
        if (isAdmin && activeTab === 'self') {
            setActiveTab('config');
        } else if (isCoordinator && !isAdmin && activeTab === 'config') {
            setActiveTab('periods');
        }
    }, [isAdmin, isCoordinator]);

    const renderSelfEvaluationForm = () => {
        const group = currentLoggedEmp?.evaluationGroup;

        // Admin/Coordinator bypass: show DT form by default if no group assigned
        if (!group) {
            if (isCoordinator) {
                // Admin/Coordinator can access without group assignment
                return <EmployeeFormDT />;
            }
            return (
                <div className="text-center py-12 text-yellow-600">
                    <ClipboardList className="w-16 h-16 mx-auto mb-4 text-yellow-300" />
                    <p className="text-lg font-medium">Chưa được phân nhóm đánh giá</p>
                    <p className="text-sm">Vui lòng liên hệ Admin để được phân loại vào nhóm ONB_DT hoặc ONB_KS.</p>
                </div>
            );
        }

        // Defensive: handle both 'ONB_DT' and legacy 'ONB_DT (Chuyển giao)' formats
        if (group.startsWith('ONB_DT')) {
            return <EmployeeFormDT />;
        } else if (group.startsWith('ONB_KS') || group === 'KS') {
            return <EmployeeFormKS />;
        }

        return null;
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'config':
                return <MetricManager />;
            case 'periods':
                return <PeriodManager />;
            case 'self':
                return renderSelfEvaluationForm();
            case 'self_ks':
                return <EmployeeFormKS />;
            case 'review':
                return <ReviewManager />;
            default:
                return null;
        }
    };

    return (
        <div className="p-4 md:p-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Đánh giá tháng</h1>
                <p className="text-sm text-gray-500">Quản lý và theo dõi đánh giá nhân viên hàng tháng</p>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-4 overflow-x-auto" role="tablist" aria-label="Các tab đánh giá">
                {visibleTabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${isActive
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-600 hover:bg-gray-200 hover:text-gray-800'
                                }`}
                            role="tab"
                            aria-selected={isActive}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-lg shadow-sm border p-4" role="tabpanel" aria-label={visibleTabs.find(t => t.id === activeTab)?.label}>
                <EvaluationErrorBoundary fallbackMessage="Không thể tải nội dung đánh giá. Vui lòng thử lại.">
                    {renderContent()}
                </EvaluationErrorBoundary>
            </div>
        </div>
    );
}
