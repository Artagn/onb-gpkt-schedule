
import React, { useState, useEffect, useCallback } from 'react';

// Global Error Boundary
import { GlobalErrorBoundary } from './components/common/GlobalErrorBoundary';

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from './routes';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';

// --- Chunk Load Retry Helper ---
// When a new version is deployed, old cached index.html may reference stale chunk filenames.
// Firebase SPA rewrite returns index.html (text/html) instead of 404 → MIME type error.
// This helper catches the error and reloads once to get fresh index.html with correct chunks.
function lazyWithRetry(importFn: () => Promise<{ default: React.ComponentType<any> }>) {
    return React.lazy(() =>
        importFn().catch((error) => {
            const hasReloaded = sessionStorage.getItem('chunk_reload');
            if (!hasReloaded) {
                sessionStorage.setItem('chunk_reload', '1');
                window.location.reload();
                // Return a never-resolving promise to prevent rendering stale content
                return new Promise(() => {});
            }
            // Already reloaded once — clear flag and let error propagate
            sessionStorage.removeItem('chunk_reload');
            throw error;
        })
    );
}
// Clear reload flag on successful app load
sessionStorage.removeItem('chunk_reload');

// Lazy Imports (with auto-retry on chunk load failure)
const Dashboard = lazyWithRetry(() => import('./components/Dashboard/index'));
const EmployeeManager = lazyWithRetry(() => import('./components/Employees'));
const CoordinationManager = lazyWithRetry(() => import('./components/CoordinationManager'));
const DailyAllocationView = lazyWithRetry(() => import('./components/DailyAllocation'));
const MyTasks = lazyWithRetry(() => import('./components/MyTasks'));
import Login from './components/Login';
const Reports = lazyWithRetry(() => import('./components/Reports/index'));
const AdminDashboard = lazyWithRetry(() => import('./components/Admin/AdminDashboard'));
const ScheduleViewer = lazyWithRetry(() => import('./components/ScheduleViewer'));
const Config = lazyWithRetry(() => import('./components/Config'));
const Evaluation = lazyWithRetry(() => import('./components/Evaluation/index'));
const CustomerCare = lazyWithRetry(() => import('./components/CustomerCare/index'));
const PublicScheduleContainer = lazyWithRetry(() => import('./components/PublicShare/PublicScheduleContainer'));
import PublicLayout from './components/PublicShare/PublicLayout';
import { User, Role, Status } from './types';
import { auth } from './services/firebaseConfig';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Menu, RefreshCw, Loader2 } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { DataProvider, useConfigData, useSession } from './context/DataContext';
import { usePermissions } from './hooks/usePermissions';
import { DashboardSkeleton } from './components/ui/Skeleton';

function AppContent() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    // 1. Config Context (strictly static master data)
    const { employees } = useConfigData();

    // 2. Session Context (strictly authentication/metadata)
    const { user, authLoading, dataLoaded } = useSession();

    // --- PERMISSIONS HOOK ---
    const { role: effectiveRole, isSuperAdmin } = usePermissions(user);

    const handleLogout = () => {
        signOut(auth).catch(err => console.error("Firebase signout error", err));
    };

    // --- SECURITY CHECK ---
    useEffect(() => {
        if (user && dataLoaded && employees.length > 0) {
            // SUPER ADMIN BYPASS
            if (isSuperAdmin) return;

            const emp = employees.find(e => e.email.toLowerCase() === user.email?.toLowerCase());

            // Case 1: Not found in list
            if (!emp) {
                console.error(`Security Block: ${user.email} is not in employee list.`);
                toast.error("Truy cập bị từ chối! Email của bạn không tồn tại trong danh sách nhân sự.", {
                    duration: 5000,
                    icon: '🔒'
                });
                signOut(auth);
                return;
            }

            // Case 2: Found but Deactivated (Stopped)
            if (emp.status === Status.Deactivated) {
                console.error(`Security Block: ${user.email} is deactivated.`);
                toast.error("Tài khoản của bạn đã bị DỪNG KÍCH HOẠT. Vui lòng liên hệ quản trị viên.", {
                    duration: 5000,
                    icon: '🚫'
                });
                signOut(auth);
            }

            // Note: Status.Inactive ("Ngưng hoạt động") is still ALLOWED to login.
        }
    }, [user, dataLoaded, employees]);

    // --- DATA MANAGEMENT HANDLERS ---
    // (Moved to Config.tsx and DataContext)

    // -- HANDLE PUBLIC ROUTES --
    const isPublicRoute = window.location.pathname.startsWith('/shared/training');
    
    if (isPublicRoute) {
        return (
            <React.Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>}>
                <Routes>
                    <Route path="/shared/training" element={<PublicLayout><PublicScheduleContainer /></PublicLayout>} />
                </Routes>
            </React.Suspense>
        );
    }

    if (authLoading) return <div className="h-screen flex items-center justify-center">Đang tải...</div>;

    if (!user) {
        return <Login onLoginSuccess={() => {}} />;
    }

    // Show loading while data is being fetched
    if (!dataLoaded) {
        return (
            <div className="h-screen flex flex-col items-center justify-center gap-4">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
                <p className="text-gray-600">Đang tải dữ liệu từ Cloud...</p>
            </div>
        );
    }

    return (
            <div className="flex h-screen bg-slate-100">
                <Sidebar
                    currentUserRole={effectiveRole}
                    isOpen={isMobileMenuOpen}
                    onClose={() => setIsMobileMenuOpen(false)}
                    isCollapsed={isSidebarCollapsed}
                    setIsCollapsed={setIsSidebarCollapsed}
                    onLogout={handleLogout}
                />

                <main className={`flex-1 flex flex-col h-screen overflow-hidden w-full transition-all duration-300 ${isSidebarCollapsed ? 'md:ml-20' : 'md:ml-52'}`}>
                    {/* Mobile Only Header for Menu Toggle */}
                    <div className="md:hidden h-14 bg-white border-b flex items-center px-4 custom-mobile-header">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <span className="ml-3 font-bold text-slate-700">ONB Schedule</span>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 overflow-auto p-4 md:p-6 pb-20 md:pb-6">
                        <React.Suspense fallback={<DashboardSkeleton />}>
                            <Routes>
                                <Route path={ROUTES.DASHBOARD} element={
                                    <Dashboard user={user} />
                                } />

                                <Route path={ROUTES.EMPLOYEES} element={
                                    <EmployeeManager currentUserRole={effectiveRole} />
                                } />

                                <Route path={ROUTES.COORDINATION} element={
                                    <CoordinationManager
                                        currentUserRole={effectiveRole}
                                        user={user}
                                    />
                                } />

                                <Route path={ROUTES.DAILY_ALLOCATION} element={
                                    <DailyAllocationView
                                        currentUserRole={effectiveRole}
                                    />
                                } />

                                <Route path={`${ROUTES.MY_TASKS}/*`} element={
                                    <MyTasks
                                        user={user}
                                        initialTab="overview"
                                    />
                                } />

                                <Route path={ROUTES.REPORTS} element={
                                    <Reports
                                        currentUserRole={effectiveRole}
                                        user={user}
                                    />
                                } />

                                <Route path={ROUTES.ADMIN} element={
                                    (effectiveRole === Role.Admin || effectiveRole === Role.Coordinator) ? (
                                        <AdminDashboard currentUserRole={effectiveRole} />
                                    ) : (
                                        <Navigate to={ROUTES.DASHBOARD} replace />
                                    )
                                } />

                                <Route path={ROUTES.VIEW_SCHEDULE} element={<ScheduleViewer />} />

                                <Route path={ROUTES.CONFIG} element={
                                    (effectiveRole === Role.Admin || effectiveRole === Role.Coordinator) ? (
                                        <Config />
                                    ) : (
                                        <Navigate to={ROUTES.DASHBOARD} replace />
                                    )
                                } />

                                <Route path={ROUTES.EVALUATION} element={<Evaluation />} />

                                <Route path={ROUTES.CUSTOMER_CARE} element={<CustomerCare />} />

                                {/* Fallback */}
                                <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
                            </Routes>
                        </React.Suspense>
                    </div>
                </main>

                {/* Mobile Bottom Navigation */}
                <BottomNav
                    currentUserRole={effectiveRole}
                    isMobileMenuOpen={isMobileMenuOpen}
                    setIsMobileMenuOpen={setIsMobileMenuOpen}
                />

                {/* Toast Notifications */}
                <Toaster
                    position="top-right"
                    toastOptions={{
                        duration: 3000,
                        style: {
                            background: '#1e293b',
                            color: '#fff',
                            borderRadius: '8px',
                        },
                        success: {
                            iconTheme: { primary: '#10b981', secondary: '#fff' },
                        },
                        error: {
                            iconTheme: { primary: '#ef4444', secondary: '#fff' },
                        },
                    }}
                />


            </div>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <DataProvider>
                <GlobalErrorBoundary>
                    <AppContent />
                </GlobalErrorBoundary>
            </DataProvider>
        </BrowserRouter>
    );
}

