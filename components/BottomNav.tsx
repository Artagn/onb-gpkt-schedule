
import React from 'react';
import { LayoutGrid, CalendarRange, ListTodo, Palmtree, Menu, BarChart, Users, Type } from 'lucide-react';
import { Role } from '../types';

import { useNavigate, useLocation } from 'react-router-dom';
import { ROUTES } from '../routes';

interface Props {
    currentUserRole: Role | undefined;
    isMobileMenuOpen: boolean;
    setIsMobileMenuOpen: (open: boolean) => void;
}

const BottomNav: React.FC<Props> = ({ currentUserRole, isMobileMenuOpen, setIsMobileMenuOpen }) => {
    const navigate = useNavigate();
    const location = useLocation();

    // Helper to determine active state


    const navItemClass = (active: boolean) =>
        `flex flex-col items-center justify-center w-full h-full py-1 ${active ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`;

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 md:hidden h-16 safe-area-bottom">
            <div className="flex justify-around items-center h-full">
                {/* 1. DASHBOARD (Home) */}
                <button
                    onClick={() => navigate(ROUTES.DASHBOARD)}
                    className={navItemClass(location.pathname === ROUTES.DASHBOARD)}
                >
                    <LayoutGrid className="w-6 h-6 mb-0.5" />
                    <span className="text-[10px] font-medium">Tổng quan</span>
                </button>

                {/* 2. SPECIFIC TAB BASED ON ROLE */}
                {currentUserRole === Role.Staff ? (
                    <button
                        onClick={() => navigate(ROUTES.MY_TASKS)}
                        className={navItemClass(location.pathname.startsWith(ROUTES.MY_TASKS))}
                    >
                        <CalendarRange className="w-6 h-6 mb-0.5" />
                        <span className="text-[10px] font-medium">Lịch tôi</span>
                    </button>
                ) : (
                    <button
                        onClick={() => navigate(ROUTES.DAILY_ALLOCATION)}
                        className={navItemClass(location.pathname === ROUTES.DAILY_ALLOCATION)}
                    >
                        <ListTodo className="w-6 h-6 mb-0.5" />
                        <span className="text-[10px] font-medium">Phân công</span>
                    </button>
                )}

                {/* 3. REPORTS (Accessible to all usually, or Coord/Admin) */}
                <button
                    onClick={() => navigate(ROUTES.REPORTS)}
                    className={navItemClass(location.pathname === ROUTES.REPORTS)}
                >
                    <BarChart className="w-6 h-6 mb-0.5" />
                    <span className="text-[10px] font-medium">Báo cáo</span>
                </button>


                {/* 4. MORE / MENU - Triggers the existing mobile sidebar logic or a simple drawer */}
                {/* For now, we reuse the existing Sidebar logic by toggling the menu state. 
                    However, Sidebar overlays everything. Let's try use that first. */}
                <button
                    onClick={() => setIsMobileMenuOpen(true)}
                    className={navItemClass(false)}
                >
                    <Menu className="w-6 h-6 mb-0.5" />
                    <span className="text-[10px] font-medium">Menu</span>
                </button>
            </div>
        </div>
    );
};

export default BottomNav;
