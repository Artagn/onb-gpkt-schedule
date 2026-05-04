import { RouteObject } from 'react-router-dom';

// Define route paths as constants to avoid magic strings
export const ROUTES = {
    DASHBOARD: '/',
    EMPLOYEES: '/employees',
    COORDINATION: '/coordination',
    DAILY_ALLOCATION: '/daily-allocation',
    MY_TASKS: '/my-tasks',
    REPORTS: '/reports',
    ADMIN: '/admin',
    VIEW_SCHEDULE: '/view-schedule',
    CONFIG: '/config',
    EVALUATION: '/evaluation'
};

// This file can later be expanded to export the actual Router configuration
// if we move to Data Router (createBrowserRouter) in the future.
