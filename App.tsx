
import React, { useState, useEffect, useCallback } from 'react';

// Global Error Boundary
import { GlobalErrorBoundary } from './components/common/GlobalErrorBoundary';

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from './routes';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
// Lazy Imports
const Dashboard = React.lazy(() => import('./components/Dashboard/index'));
const EmployeeManager = React.lazy(() => import('./components/Employees'));
const CoordinationManager = React.lazy(() => import('./components/CoordinationManager'));
const DailyAllocationView = React.lazy(() => import('./components/DailyAllocation'));
const MyTasks = React.lazy(() => import('./components/MyTasks'));
import Login from './components/Login';
const Reports = React.lazy(() => import('./components/Reports/index'));
const AdminDashboard = React.lazy(() => import('./components/Admin/AdminDashboard'));
const ScheduleViewer = React.lazy(() => import('./components/ScheduleViewer'));
const Config = React.lazy(() => import('./components/Config'));
const Evaluation = React.lazy(() => import('./components/Evaluation/index'));
import { User, Role, Status } from './types';
import { auth } from './services/firebaseConfig';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Menu, RefreshCw } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { DataProvider, useData } from './context/DataContext';
import { usePermissions } from './hooks/usePermissions';
import { DashboardSkeleton } from './components/ui/Skeleton';

function AppContent() {
    // --- AUTH STATE ---
    const [user, setUser] = useState<User | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    // const [currentUserRole, setCurrentUserRole] = useState<Role>(Role.Staff); // Removed: Handled by usePermissions
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const {
        employees, // employees from TanStack Query (read-only)
        jobs, schedule, dailyAllocations, leaves,
        dataLoaded, isOnline, lastSynced,
        viewRole, setViewRole
    } = useData();

    // --- PERMISSIONS HOOK ---
    // Replaces effectiveRole calculation and Auth Role setting
    const { role: effectiveRole, isSuperAdmin } = usePermissions(user);

    // --- AUTH LISTENER ---
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                // Just set the user, the role is derived in usePermissions
                setUser(currentUser);
            } else {
                setUser(null);
            }
            setAuthLoading(false);
        });
        return () => unsubscribe();
    }, []); // No dependency on employees needed here anymore

    const handleLogout = () => {
        signOut(auth).catch(err => console.error("Firebase signout error", err));
        setUser(null);
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
                signOut(auth).then(() => setUser(null));
                return;
            }

            // Case 2: Found but Deactivated (Stopped)
            if (emp.status === Status.Deactivated) {
                console.error(`Security Block: ${user.email} is deactivated.`);
                toast.error("Tài khoản của bạn đã bị DỪNG KÍCH HOẠT. Vui lòng liên hệ quản trị viên.", {
                    duration: 5000,
                    icon: '🚫'
                });
                signOut(auth).then(() => setUser(null));
            }

            // Note: Status.Inactive ("Ngưng hoạt động") is still ALLOWED to login.
        }
    }, [user, dataLoaded, employees]);

    // --- DATA MANAGEMENT HANDLERS ---
    // (Moved to Config.tsx and DataContext)

    if (authLoading) return <div className="h-screen flex items-center justify-center">Đang tải...</div>;

    if (!user) {
        return <Login onLoginSuccess={setUser} />;
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
        <BrowserRouter>
            <div className="flex h-screen bg-slate-100">
                <Sidebar
                    currentUserRole={effectiveRole}
                    isOpen={isMobileMenuOpen}
                    onClose={() => setIsMobileMenuOpen(false)}
                    isCollapsed={isSidebarCollapsed}
                    setIsCollapsed={setIsSidebarCollapsed}
                    user={user}
                    isOnline={isOnline}
                    lastSynced={lastSynced}
                    onLogout={handleLogout}
                    viewRole={viewRole}
                    setViewRole={setViewRole}
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
                                        employees={employees}
                                        jobs={jobs}
                                        schedule={schedule}
                                        allocations={dailyAllocations}
                                        leaves={leaves}
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
                                    <AdminDashboard
                                        currentUserRole={effectiveRole}
                                    />
                                } />

                                <Route path={ROUTES.VIEW_SCHEDULE} element={<ScheduleViewer />} />

                                <Route path={ROUTES.CONFIG} element={<Config />} />

                                <Route path={ROUTES.EVALUATION} element={<Evaluation />} />

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
        </BrowserRouter>
    );
}

export default function App() {
    return (
        <DataProvider>
            <GlobalErrorBoundary>
                <AppContent />
            </GlobalErrorBoundary>
        </DataProvider>
    );
}

