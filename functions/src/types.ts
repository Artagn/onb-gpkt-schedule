export interface Employee {
    id: string;
    fullName: string;
    email: string;
    role: string;
    status: string;
}

export interface Job {
    id: string;
    name: string;
    group: string;
    description?: string;
    googleMeetLink?: string;
}

export interface ScheduleItem {
    id: string;
    date: string;
    shift: 'Sáng' | 'Chiều' | 'Tối';
    jobId: string;
    employeeIds: string[];
}
