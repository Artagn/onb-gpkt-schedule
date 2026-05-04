import { useData } from '../context/DataContext';
import { Role, User } from '../types';
import { isSuperAdminEmail, determineUserRole } from '../utils/permissions';

export const usePermissions = (user: User | null) => {
    const { employees, viewRole } = useData();

    const realRole = determineUserRole(user?.email, employees);
    const isSuperAdmin = isSuperAdminEmail(user?.email);

    // Effective role (considering View Mode)
    const effectiveRole = viewRole || realRole;

    return {
        role: effectiveRole,
        realRole, // The actual role without View Mode override
        isSuperAdmin,
        canManageData: effectiveRole === Role.Admin,
        canCoordinate: effectiveRole === Role.Admin || effectiveRole === Role.Coordinator,
        isStaff: effectiveRole === Role.Staff
    };
};
