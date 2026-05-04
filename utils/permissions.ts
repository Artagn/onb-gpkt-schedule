import { Role, Employee, EvaluationGroup } from '../types';

export const SUPER_ADMIN_EMAILS = ['khainguyendang@gmail.com'];

/**
 * Check if the email belongs to a Super Admin
 */
export const isSuperAdminEmail = (email?: string | null): boolean => {
    if (!email) return false;
    return SUPER_ADMIN_EMAILS.includes(email.toLowerCase());
};

/**
 * Determine effective role based on email and employee list
 * Includes Super Admin override
 */
export const determineUserRole = (email: string | null | undefined, employees: Employee[]): Role => {
    if (!email) return Role.Staff;

    // Super Admin Override
    if (isSuperAdminEmail(email)) {
        return Role.Admin;
    }

    const emp = employees.find(e => e.email.toLowerCase() === email.toLowerCase());
    return emp ? emp.role : Role.Staff;
};

/**
 * Check if a role has sufficient permissions
 */
export const hasPermission = (userRole: Role, requiredRole: Role): boolean => {
    const levels = {
        [Role.Admin]: 3,
        [Role.Coordinator]: 2,
        [Role.Staff]: 1
    };
    return (levels[userRole] || 0) >= (levels[requiredRole] || 0);
};

/**
 * Defensive check for ONB_DT evaluation group
 * Handles both 'ONB_DT' and legacy 'ONB_DT (Chuyển giao)' formats
 */
export const isDTGroup = (group?: EvaluationGroup | string | null): boolean => {
    if (!group) return false;
    return group.startsWith('ONB_DT');
};

/**
 * Defensive check for ONB_KS evaluation group  
 * Handles 'ONB_KS', 'KS', and legacy 'ONB_KS (Kiểm soát)' formats
 */
export const isKSGroup = (group?: EvaluationGroup | string | null): boolean => {
    if (!group) return false;
    return group.startsWith('ONB_KS') || group === 'KS';
};
