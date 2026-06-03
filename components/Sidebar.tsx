import React from 'react';
import { LayoutDashboard, Users, Briefcase, Calendar, CheckSquare, BarChart2, CalendarDays, HelpCircle, CalendarSearch, X, UserCheck, ChevronLeft, ChevronRight, CalendarRange, Sliders, LogOut, ClipboardList, Headphones } from 'lucide-react';
import { Role } from '../types';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSmoothNavigate } from '../hooks/useSmoothNavigate';
import { ROUTES } from '../routes';
import { useSession, useSyncStatus } from '../context/DataContext';

interface SidebarProps {
    currentUserRole: Role;
    isOpen: boolean; // Mobile state
    onClose: () => void; // Mobile close handler
    isCollapsed: boolean;
    setIsCollapsed: (v: boolean) => void;
    onLogout?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentUserRole, isOpen, onClose, isCollapsed, setIsCollapsed, onLogout }) => {
    const { user, viewRole, setViewRole } = useSession();
    const { isOnline, lastSynced } = useSyncStatus();
    // const navigate = useNavigate(); // OLD
    const navigate = useSmoothNavigate(); // NEW: View Transitions
    const location = useLocation();

    const menuItems = [
        { id: ROUTES.DASHBOARD, label: 'Tổng quan', icon: LayoutDashboard },
        { id: ROUTES.COORDINATION, label: 'Điều phối', icon: Sliders },
        { id: ROUTES.MY_TASKS, label: 'Lịch cá nhân', icon: UserCheck },
        { id: ROUTES.REPORTS, label: 'Báo cáo & KPI', icon: BarChart2 },
        { id: ROUTES.VIEW_SCHEDULE, label: 'Xem Lịch', icon: CalendarRange },
        { id: ROUTES.EVALUATION, label: 'Đánh giá tháng', icon: ClipboardList },
        { id: ROUTES.CUSTOMER_CARE, label: 'Chăm sóc KH', icon: Headphones },
        { id: ROUTES.ADMIN, label: 'Quản trị hệ thống', icon: LayoutDashboard, adminOnly: true },

    ];

    const visibleMenuItems = menuItems.filter(item => {
        if (item.adminOnly) {
            return currentUserRole === Role.Admin;
        }
        return true;
    });

    const handleItemClick = (path: string) => {
        navigate(path);
        onClose(); // Close sidebar on selection (mobile)
    };

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 md:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar Container */}
            <div className={`
                bg-slate-900 text-white flex flex-col h-full fixed left-0 top-0 overflow-y-auto z-40
                transition-all duration-300 ease-in-out border-r border-slate-700
                ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
                md:translate-x-0
                ${isCollapsed ? 'w-20' : 'w-52'}
            `}>
                <div className={`p-4 border-b border-slate-700 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                    {!isCollapsed && (
                        <div className="overflow-hidden whitespace-nowrap">
                            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">
                                ONB GPKT
                            </h1>
                            <p className="text-xs text-slate-400 mt-1">Schedule Manager v4.4.8</p>
                        </div>
                    )}
                    {isCollapsed && (
                        <div className="font-bold text-blue-400">ONB</div>
                    )}

                    {/* Close Button (Mobile Only) */}
                    <button onClick={onClose} className="md:hidden text-slate-400 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <nav className="flex-1 p-2 space-y-1">
                    {visibleMenuItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => handleItemClick(item.id)}
                            className={`flex items-center w-full px-3 py-3 text-sm font-medium rounded-lg transition-colors group relative
                                ${location.pathname === item.id ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}
                                ${isCollapsed ? 'justify-center' : ''}
                            `}
                            title={isCollapsed ? item.label : ''}
                        >
                            <item.icon className={`w-5 h-5 ${isCollapsed ? '' : 'mr-3'} flex-shrink-0`} />
                            {!isCollapsed && <span className="truncate">{item.label}</span>}

                            {/* Tooltip for collapsed mode */}
                            {isCollapsed && (
                                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 bg-slate-800 text-white text-xs px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none z-50 whitespace-nowrap">
                                    {item.label}
                                </div>
                            )}
                        </button>
                    ))}
                </nav>

                {/* Footer: User Info & Controls */}
                <div className="p-3 border-t border-slate-700 flex flex-col gap-3">
                    {/* User Profile */}
                    {!isCollapsed ? (
                        <div className="bg-slate-800/50 rounded-lg p-3">
                            <div className="flex items-center gap-3 mb-3">
                                {user?.photoURL ? (
                                    <img src={user.photoURL} alt="Avatar" className="w-8 h-8 rounded-full border border-slate-600" />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                                        {user?.displayName?.charAt(0) || 'U'}
                                    </div>
                                )}
                                <div className="overflow-hidden">
                                    <div className="text-sm font-bold text-slate-200 truncate">{user?.displayName}</div>
                                    <div className="text-[10px] text-slate-400 uppercase">{currentUserRole}</div>
                                </div>
                            </div>

                            {/* Sync Status */}
                            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-2 px-1">
                                <span className="flex items-center gap-1">
                                    {isOnline ? (
                                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                    ) : (
                                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                    )}
                                    {isOnline ? 'Cloud Sync' : 'Offline'}
                                </span>
                                {lastSynced && <span>{new Date(lastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                            </div>

                            {/* Actions */}
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={onLogout}
                                    className="flex items-center justify-center px-2 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs transition-colors"
                                    title="Đăng xuất"
                                >
                                    <LogOut className="w-3.5 h-3.5 mr-1.5" />
                                    Logout
                                </button>
                                <a
                                    href="https://share.misa.vn/helponb"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center px-2 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs transition-colors"
                                    title="Hỗ trợ"
                                >
                                    <HelpCircle className="w-3.5 h-3.5 mr-1.5" />
                                    Help
                                </a>
                            </div>
                        </div>
                    ) : (
                        // Collapsed Mode Footer
                        <div className="flex flex-col items-center gap-4">
                            {user?.photoURL ? (
                                <img src={user.photoURL} alt="Avatar" className="w-8 h-8 rounded-full border border-slate-600" title={user.displayName} />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs" title={user?.displayName}>
                                    {user?.displayName?.charAt(0) || 'U'}
                                </div>
                            )}

                            <button
                                onClick={onLogout}
                                className="text-slate-400 hover:text-white"
                                title="Đăng xuất"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    )}

                    {/* View As Toggle (For Admin/Coordinator) */}
                    {(currentUserRole === Role.Admin || currentUserRole === Role.Coordinator) && !isCollapsed && (
                        <div className="border-t border-slate-700 pt-2">
                            <button
                                onClick={() => {
                                    if (viewRole === Role.Staff) setViewRole(null);
                                    else setViewRole(Role.Staff);
                                    // Navigate to Dashboard to avoid being stuck in an Admin route
                                    navigate(ROUTES.DASHBOARD);
                                }}
                                className={`w-full flex items-center justify-center px-3 py-2 rounded-lg text-xs font-bold transition-all
                                    ${viewRole === Role.Staff
                                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50 hover:bg-amber-500/30'
                                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-transparent'}
                                `}
                            >
                                {viewRole === Role.Staff ? (
                                    <>
                                        <Users className="w-3.5 h-3.5 mr-2" />
                                        Exit Staff View
                                    </>
                                ) : (
                                    <>
                                        <UserCheck className="w-3.5 h-3.5 mr-2" />
                                        View as Staff
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Collapse Toggle */}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="flex items-center justify-center w-full py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors border-t border-slate-800/50 mt-1"
                    >
                        {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                    </button>
                </div>
            </div>
        </>
    );
};

export default Sidebar;
