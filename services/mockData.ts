
import { Employee, EmployeeRank, Job,  Role, Status, TimeFrame, ScheduleItem, SchedulePattern, WorkPeriod, Holiday, SubJob, JobGroupDef } from "../types";
import { addDays, startOfWeek, setHours, setMinutes } from "date-fns";

// --- 1. JOB GROUPS ---
export const initialJobGroups: JobGroupDef[] = [
    { id: 'Đào tạo', name: 'Đào tạo', colorClass: 'bg-blue-100 text-blue-800', isActive: true, order: 1 },
    { id: 'Livechat', name: 'Livechat', colorClass: 'bg-green-100 text-green-800', isActive: true, order: 2 },
    { id: 'Chia hàng ngày', name: 'Chia hàng ngày', colorClass: 'bg-purple-100 text-purple-800', isActive: true, order: 3 },
    { id: 'Khác', name: 'Khác', colorClass: 'bg-gray-100 text-gray-800', isActive: true, order: 4 },
];

// --- 2. EMPLOYEES ---
export const initialEmployees: Employee[] = [
    {
        id: 'emp_1', stt: 1,
        fullName: 'Nguyễn Thị Huyền',
        email: 'nthuyen.misa@gmail.com',
        rank: EmployeeRank.A,
        jobGroups: ['Đào tạo', 'Livechat', 'Chia hàng ngày'],
        timeFrames: [TimeFrame.Morning, TimeFrame.Afternoon, TimeFrame.Evening, TimeFrame.Weekend],
        role: Role.Staff,
        status: Status.Active,
        kpiStandard: 110,
        weeklyScore: 0, monthlyScore: 0
    },
    {
        id: 'emp_2', stt: 2,
        fullName: 'Nguyễn Thị Ngân',
        email: 'ngan10072@gmail.com',
        rank: EmployeeRank.A,
        jobGroups: ['Đào tạo', 'Livechat', 'Chia hàng ngày'],
        timeFrames: [TimeFrame.Morning, TimeFrame.Afternoon, TimeFrame.Evening, TimeFrame.Weekend],
        role: Role.Staff,
        status: Status.Active,
        kpiStandard: 100,
        weeklyScore: 0, monthlyScore: 0
    },
    {
        id: 'emp_3', stt: 3,
        fullName: 'Thân Thị Oanh',
        email: 'oanhthan2000ht@gmail.com',
        rank: EmployeeRank.A,
        jobGroups: ['Đào tạo', 'Livechat', 'Chia hàng ngày'],
        timeFrames: [TimeFrame.Morning, TimeFrame.Afternoon, TimeFrame.Evening, TimeFrame.Weekend],
        role: Role.Staff,
        status: Status.Active,
        kpiStandard: 105,
        weeklyScore: 0, monthlyScore: 0
    },
    {
        id: 'emp_4', stt: 4,
        fullName: 'Nguyễn Hương Thảo',
        email: 'nguyenhuongthao12a4@gmail.com',
        rank: EmployeeRank.A,
        jobGroups: ['Đào tạo', 'Livechat', 'Chia hàng ngày'],
        timeFrames: [TimeFrame.Morning, TimeFrame.Afternoon, TimeFrame.Evening, TimeFrame.Weekend],
        role: Role.Staff,
        status: Status.Active,
        kpiStandard: 105,
        weeklyScore: 0, monthlyScore: 0
    },
    {
        id: 'emp_5', stt: 5,
        fullName: 'Hồ Đặng Anh Thư',
        email: 'thumuon1997@gmail.com',
        rank: EmployeeRank.A,
        jobGroups: ['Đào tạo', 'Livechat', 'Chia hàng ngày'],
        timeFrames: [TimeFrame.Morning, TimeFrame.Afternoon, TimeFrame.Evening, TimeFrame.Weekend],
        role: Role.Staff,
        status: Status.Active,
        kpiStandard: 105,
        weeklyScore: 0, monthlyScore: 0
    },
    {
        id: 'emp_6', stt: 6,
        fullName: 'Nguyễn Thị Quỳnh Trang',
        email: 'nguyenthiquynhtrang97dhtm@gmail.com',
        rank: EmployeeRank.A,
        jobGroups: ['Đào tạo', 'Livechat', 'Chia hàng ngày'],
        timeFrames: [TimeFrame.Morning, TimeFrame.Afternoon, TimeFrame.Evening, TimeFrame.Weekend],
        role: Role.Staff,
        status: Status.Active,
        kpiStandard: 105,
        weeklyScore: 0, monthlyScore: 0
    },
    {
        id: 'emp_7', stt: 7,
        fullName: 'Phùng Thị Thanh Thúy',
        email: 'thanhthuy15800@gmail.com',
        rank: EmployeeRank.A,
        jobGroups: ['Đào tạo', 'Livechat', 'Chia hàng ngày'],
        timeFrames: [TimeFrame.Morning, TimeFrame.Afternoon, TimeFrame.Evening, TimeFrame.Weekend],
        role: Role.Staff,
        status: Status.Active,
        kpiStandard: 105,
        weeklyScore: 0, monthlyScore: 0
    },
    {
        id: 'emp_8', stt: 8,
        fullName: 'Vũ Thị Nhi',
        email: 'vuthithaonhi24012000@gmail.com',
        rank: EmployeeRank.A,
        jobGroups: ['Đào tạo', 'Livechat', 'Chia hàng ngày'],
        timeFrames: [TimeFrame.Morning, TimeFrame.Afternoon, TimeFrame.Evening, TimeFrame.Weekend],
        role: Role.Staff,
        status: Status.Active,
        kpiStandard: 105,
        weeklyScore: 0, monthlyScore: 0
    },
    {
        id: 'emp_9', stt: 9,
        fullName: 'Trần Thị Thanh Huyền',
        email: 'huyentt.ptit@gmail.com',
        rank: EmployeeRank.A,
        jobGroups: ['Đào tạo', 'Livechat', 'Chia hàng ngày'],
        timeFrames: [TimeFrame.Morning, TimeFrame.Afternoon, TimeFrame.Evening, TimeFrame.Weekend],
        role: Role.Staff,
        status: Status.Active,
        kpiStandard: 110,
        weeklyScore: 0, monthlyScore: 0
    },
    {
        id: 'emp_10', stt: 10,
        fullName: 'Lê Thị Linh',
        email: 'lelinh8895@gmail.com',
        rank: EmployeeRank.A,
        jobGroups: ['Đào tạo', 'Livechat', 'Chia hàng ngày'],
        timeFrames: [TimeFrame.Morning, TimeFrame.Afternoon, TimeFrame.Evening, TimeFrame.Weekend],
        role: Role.Staff,
        status: Status.Active,
        kpiStandard: 110,
        weeklyScore: 0, monthlyScore: 0
    },
    {
        id: 'emp_11', stt: 11,
        fullName: 'Nguyễn Thị Mỹ Ngọc',
        email: 'nguyenthimyngocmisa@gmail.com',
        rank: EmployeeRank.A,
        jobGroups: ['Đào tạo', 'Livechat', 'Chia hàng ngày'],
        timeFrames: [TimeFrame.Morning, TimeFrame.Afternoon, TimeFrame.Evening, TimeFrame.Weekend],
        role: Role.Staff,
        status: Status.Active,
        kpiStandard: 110,
        weeklyScore: 0, monthlyScore: 0
    },
    {
        id: 'emp_12', stt: 12,
        fullName: 'Hồ Thị Kim Vàng',
        email: 'hothikimvang1999@gmail.com',
        rank: EmployeeRank.A,
        jobGroups: ['Đào tạo', 'Livechat', 'Chia hàng ngày'],
        timeFrames: [TimeFrame.Morning, TimeFrame.Afternoon, TimeFrame.Evening, TimeFrame.Weekend],
        role: Role.Staff,
        status: Status.Active,
        kpiStandard: 105,
        weeklyScore: 0, monthlyScore: 0
    },
    {
        id: 'emp_13', stt: 13,
        fullName: 'Nguyễn Thị Phương Thanh',
        email: 'nguyenthanh312cv@gmail.com',
        rank: EmployeeRank.B,
        jobGroups: ['Đào tạo', 'Livechat', 'Chia hàng ngày'],
        timeFrames: [TimeFrame.Morning, TimeFrame.Afternoon, TimeFrame.Evening, TimeFrame.Weekend],
        role: Role.Staff,
        status: Status.Active,
        kpiStandard: 105,
        weeklyScore: 0, monthlyScore: 0
    },
    {
        id: 'emp_14', stt: 14,
        fullName: 'Trần Thị Phương Uyên',
        email: 'uyentran8624@gmail.com',
        rank: EmployeeRank.B,
        jobGroups: ['Đào tạo', 'Livechat', 'Chia hàng ngày'],
        timeFrames: [TimeFrame.Morning, TimeFrame.Afternoon, TimeFrame.Evening, TimeFrame.Weekend],
        role: Role.Staff,
        status: Status.Active,
        kpiStandard: 110,
        weeklyScore: 0, monthlyScore: 0
    },
    {
        id: 'emp_15', stt: 15,
        fullName: 'Hoàng Thị Tố Như',
        email: 'nhuhoang934@gmail.com',
        rank: EmployeeRank.B,
        jobGroups: ['Đào tạo', 'Livechat', 'Chia hàng ngày'],
        timeFrames: [TimeFrame.Morning, TimeFrame.Afternoon, TimeFrame.Evening, TimeFrame.Weekend],
        role: Role.Staff,
        status: Status.Active,
        kpiStandard: 100,
        weeklyScore: 0, monthlyScore: 0
    },
    {
        id: 'emp_16', stt: 16,
        fullName: 'Trần Tường Duy',
        email: 'trantuongduy789@gmail.com',
        rank: EmployeeRank.A,
        jobGroups: ['Đào tạo', 'Livechat', 'Chia hàng ngày'],
        timeFrames: [TimeFrame.Morning, TimeFrame.Afternoon, TimeFrame.Evening, TimeFrame.Weekend],
        role: Role.Staff,
        status: Status.Active,
        kpiStandard: 100,
        weeklyScore: 0, monthlyScore: 0
    },
    {
        id: 'emp_17', stt: 17,
        fullName: 'Nguyễn Hồng Tú Muội',
        email: 'nguyenhongtumuoi@gmail.com',
        rank: EmployeeRank.B,
        jobGroups: ['Đào tạo', 'Livechat', 'Chia hàng ngày'],
        timeFrames: [TimeFrame.Morning, TimeFrame.Afternoon, TimeFrame.Evening, TimeFrame.Weekend],
        role: Role.Staff,
        status: Status.Active,
        kpiStandard: 100,
        weeklyScore: 0, monthlyScore: 0
    },
    {
        id: 'emp_18', stt: 18,
        fullName: 'Đồng Thị Hồng Phượng',
        email: 'dongthihongphuong2002@gmail.com',
        rank: EmployeeRank.B,
        jobGroups: ['Livechat'],
        timeFrames: [],
        role: Role.Staff,
        status: Status.Active,
        kpiStandard: 95,
        weeklyScore: 0, monthlyScore: 0
    },
    {
        id: 'emp_19', stt: 19,
        fullName: 'Nguyễn Thị Linh Phương',
        email: 'Nguyenlinhphuong91@gmail.com',
        rank: EmployeeRank.A,
        jobGroups: ['Đào tạo', 'Livechat', 'Chia hàng ngày'],
        timeFrames: [TimeFrame.Morning, TimeFrame.Afternoon, TimeFrame.Evening, TimeFrame.Weekend],
        role: Role.Staff,
        status: Status.Active,
        kpiStandard: 100,
        weeklyScore: 0, monthlyScore: 0
    },
    {
        id: 'emp_20', stt: 20,
        fullName: 'Đào Thanh Duyên',
        email: 'dtduyen20122000@gmail.com',
        rank: EmployeeRank.B,
        jobGroups: ['Livechat'],
        timeFrames: [TimeFrame.Morning, TimeFrame.Afternoon, TimeFrame.Evening, TimeFrame.Weekend],
        role: Role.Staff,
        status: Status.Active,
        kpiStandard: 40,
        weeklyScore: 0, monthlyScore: 0
    },
    {
        id: 'emp_21', stt: 21,
        fullName: 'Lê Thu Hà',
        email: 'lethuha.hs.95@gmail.com',
        rank: EmployeeRank.B,
        jobGroups: ['Livechat'],
        timeFrames: [TimeFrame.Morning, TimeFrame.Afternoon, TimeFrame.Evening, TimeFrame.Weekend],
        role: Role.Staff,
        status: Status.Active,
        kpiStandard: 40,
        weeklyScore: 0, monthlyScore: 0
    },
    {
        id: 'emp_22', stt: 22,
        fullName: 'Nguyễn Khánh Chi',
        email: 'khanhchi10d1@gmail.com',
        rank: EmployeeRank.B,
        jobGroups: ['Livechat'],
        timeFrames: [],
        role: Role.Staff,
        status: Status.Active,
        kpiStandard: 40,
        weeklyScore: 0, monthlyScore: 0
    },
    {
        id: 'emp_23', stt: 23,
        fullName: 'Lê Ngọc Yến Nhi',
        email: 'lengocyennhi59.it@gmail.com',
        rank: EmployeeRank.B,
        jobGroups: ['Livechat'],
        timeFrames: [],
        role: Role.Staff,
        status: Status.Active,
        kpiStandard: 40,
        weeklyScore: 0, monthlyScore: 0
    },
    {
        id: 'emp_24', stt: 24,
        fullName: 'Nguyễn Bình An',
        email: 'nguyenbinhansao@gmail.com',
        rank: EmployeeRank.B,
        jobGroups: ['Livechat'],
        timeFrames: [],
        role: Role.Staff,
        status: Status.Active,
        kpiStandard: 40,
        weeklyScore: 0, monthlyScore: 0
    },
    {
        id: 'emp_25', stt: 25,
        fullName: 'Nguyễn Hà Phương',
        email: 'nghaphuong12@gmail.com',
        rank: EmployeeRank.B,
        jobGroups: ['Livechat'],
        timeFrames: [],
        role: Role.Staff,
        status: Status.Active,
        kpiStandard: 40,
        weeklyScore: 0, monthlyScore: 0
    },
    {
        id: 'emp_26', stt: 26,
        fullName: 'Khuất Doãn Thanh Lam',
        email: 'khuatthanhlam97@gmail.com',
        rank: EmployeeRank.A,
        jobGroups: [],
        timeFrames: [TimeFrame.Morning, TimeFrame.Afternoon, TimeFrame.Evening, TimeFrame.Weekend],
        role: Role.Coordinator,
        status: Status.Active,
        kpiStandard: 100,
        weeklyScore: 0, monthlyScore: 0
    },
    {
        id: 'emp_27', stt: 27,
        fullName: 'Nguyễn Văn Khải',
        email: 'khainguyendang@gmail.com',
        rank: EmployeeRank.A,
        jobGroups: [],
        timeFrames: [],
        role: Role.Admin,
        status: Status.Active,
        kpiStandard: 40,
        weeklyScore: 0, monthlyScore: 0
    },
    {
        id: 'emp_28', stt: 28,
        fullName: 'Đinh Thị Ngọc Ánh',
        email: 'ngocanhnd.hvtc@gmail.com',
        rank: EmployeeRank.A,
        jobGroups: [],
        timeFrames: [],
        role: Role.Coordinator,
        status: Status.Inactive,
        kpiStandard: 100,
        weeklyScore: 0, monthlyScore: 0
    },
    {
        id: 'emp_29', stt: 29,
        fullName: 'MISA Đào tạo',
        email: 'misadaotao@gmail.com',
        rank: EmployeeRank.A,
        jobGroups: [],
        timeFrames: [],
        role: Role.Coordinator,
        status: Status.Inactive,
        kpiStandard: 100,
        weeklyScore: 0, monthlyScore: 0
    }
];

// --- 2. JOBS ---
export const initialJobs: Job[] = [
    { id: 'job_1', name: 'A', group: 'Đào tạo', standardPoint: 1.5, durationMinutes: 180, difficulty: 1, isActive: true },
    { id: 'job_2', name: 'B', group: 'Đào tạo', standardPoint: 1.5, durationMinutes: 180, difficulty: 1, isActive: true },
    { id: 'job_3', name: 'C', group: 'Đào tạo', standardPoint: 1.5, durationMinutes: 180, difficulty: 1, isActive: false }, // Ngưng
    { id: 'job_4', name: 'D', group: 'Đào tạo', standardPoint: 1.5, durationMinutes: 180, difficulty: 1, isActive: false }, // Ngưng
    { id: 'job_5', name: 'AMIS XD', group: 'Đào tạo', standardPoint: 1.75, durationMinutes: 210, difficulty: 1, isActive: true },
    { id: 'job_6', name: 'AMIS CB', group: 'Đào tạo', standardPoint: 2, durationMinutes: 210, difficulty: 1, isActive: true },
    { id: 'job_7', name: 'AMIS SX', group: 'Đào tạo', standardPoint: 1.9, durationMinutes: 210, difficulty: 2, isActive: true },
    { id: 'job_8', name: 'AMIS TM', group: 'Đào tạo', standardPoint: 1.8, durationMinutes: 210, difficulty: 1, isActive: true },
    { id: 'job_9', name: 'SME DV', group: 'Đào tạo', standardPoint: 1.75, durationMinutes: 210, difficulty: 1, isActive: true },
    { id: 'job_10', name: 'AMIS CB - TOI', group: 'Đào tạo', standardPoint: 3, durationMinutes: 180, difficulty: 1, isActive: true },
    { id: 'job_11', name: 'AMIS DV', group: 'Đào tạo', standardPoint: 1.75, durationMinutes: 180, difficulty: 1, isActive: true },
    { id: 'job_12', name: 'SME CB - TOI', group: 'Đào tạo', standardPoint: 3, durationMinutes: 180, difficulty: 1, isActive: true },
    { id: 'job_13', name: 'AMIS CĐ', group: 'Đào tạo', standardPoint: 0.8, durationMinutes: 120, difficulty: 1, isActive: true },
    { id: 'job_14', name: 'SME TM', group: 'Đào tạo', standardPoint: 1.8, durationMinutes: 180, difficulty: 1, isActive: true },
    { id: 'job_15', name: 'SME XD', group: 'Đào tạo', standardPoint: 1.75, durationMinutes: 180, difficulty: 1, isActive: true },
    { id: 'job_16', name: 'SME SX', group: 'Đào tạo', standardPoint: 1.9, durationMinutes: 180, difficulty: 1, isActive: true },
    { id: 'job_17', name: 'SME GT - TOI', group: 'Đào tạo', standardPoint: 3.6, durationMinutes: 180, difficulty: 2, isActive: true },
    { id: 'job_18', name: 'AMIS SX - TOI', group: 'Đào tạo', standardPoint: 3.3, durationMinutes: 180, difficulty: 2, isActive: true },
    { id: 'job_19', name: 'AMIS CT - TOI', group: 'Đào tạo', standardPoint: 1.8, durationMinutes: 180, difficulty: 2, isActive: true },
    { id: 'job_20', name: 'HTX', group: 'Đào tạo', standardPoint: 1.8, durationMinutes: 180, difficulty: 1, isActive: true },
    { id: 'job_21', name: 'TRUC_LIVECHAT', group: 'Livechat', standardPoint: 2, durationMinutes: 240, difficulty: 1, isActive: true },
    { id: 'job_22', name: 'TN_LIVECHAT', group: 'Livechat', standardPoint: 2, durationMinutes: 240, difficulty: 1, isActive: true },
    { id: 'job_23', name: 'ĐT TRUC TIEP', group: 'Khác', standardPoint: 8, durationMinutes: 0, difficulty: 1, isActive: true },
    { id: 'job_24', name: 'ĐT_NOIBO', group: 'Khác', standardPoint: 8, durationMinutes: 0, difficulty: 1, isActive: false },
    { id: 'job_25', name: 'AMIS_SME TV', group: 'Đào tạo', standardPoint: 1, durationMinutes: 180, difficulty: 1, isActive: true },
    { id: 'job_26', name: '1-1', group: 'Chia hàng ngày', standardPoint: 0, durationMinutes: 0, difficulty: 1, isActive: true },
    { id: 'job_27', name: 'Chuyển đổi', group: 'Chia hàng ngày', standardPoint: 0, durationMinutes: 0, difficulty: 1, isActive: true },
    // Add missing job from new requirement
    { id: 'job_28', name: 'AMIS_KETNOI', group: 'Đào tạo', standardPoint: 1, durationMinutes: 90, difficulty: 1, isActive: true },
];

// --- 3. PATTERNS (The Template) ---
const getJobIdByName = (name: string) => initialJobs.find(j => j.name === name)?.id;

interface RawPattern { day: string, shift: string, job: string, count?: number }

// Updated Schedule Pattern (New User Request)
const rawPatterns: RawPattern[] = [
    { day: 'Thứ 2', shift: 'Sáng', job: 'AMIS XD', count: 1 },
    { day: 'Thứ 2', shift: 'Sáng', job: 'A', count: 1 },
    { day: 'Thứ 2', shift: 'Chiều', job: 'AMIS XD', count: 1 },
    { day: 'Thứ 2', shift: 'Chiều', job: 'AMIS_SME TV', count: 1 },
    { day: 'Thứ 2', shift: 'Chiều', job: 'AMIS CB', count: 1 },
    { day: 'Thứ 2', shift: 'Chiều', job: 'A', count: 1 },
    { day: 'Thứ 3', shift: 'Sáng', job: 'B', count: 1 },
    { day: 'Thứ 3', shift: 'Sáng', job: 'SME XD', count: 1 },
    { day: 'Thứ 3', shift: 'Sáng', job: 'AMIS SX', count: 1 },
    { day: 'Thứ 3', shift: 'Sáng', job: 'A', count: 1 },
    { day: 'Thứ 3', shift: 'Sáng', job: 'AMIS TM', count: 1 },
    { day: 'Thứ 3', shift: 'Chiều', job: 'B', count: 1 },
    { day: 'Thứ 3', shift: 'Chiều', job: 'AMIS_SME TV', count: 1 },
    { day: 'Thứ 3', shift: 'Chiều', job: 'SME XD', count: 1 },
    { day: 'Thứ 3', shift: 'Chiều', job: 'AMIS SX', count: 1 },
    { day: 'Thứ 3', shift: 'Chiều', job: 'A', count: 1 },
    { day: 'Thứ 3', shift: 'Chiều', job: 'AMIS TM', count: 1 },
    { day: 'Thứ 3', shift: 'Tối', job: 'SME CB - TOI', count: 1 },
    { day: 'Thứ 3', shift: 'Tối', job: 'AMIS CB - TOI', count: 1 },
    { day: 'Thứ 4', shift: 'Sáng', job: 'A', count: 1 },
    { day: 'Thứ 4', shift: 'Sáng', job: 'SME SX', count: 1 },
    { day: 'Thứ 4', shift: 'Sáng', job: 'B', count: 1 },
    { day: 'Thứ 4', shift: 'Sáng', job: 'SME TM', count: 1 },
    { day: 'Thứ 4', shift: 'Sáng', job: 'AMIS CB', count: 1 },
    { day: 'Thứ 4', shift: 'Sáng', job: 'AMIS DV', count: 1 },
    { day: 'Thứ 4', shift: 'Chiều', job: 'A', count: 1 },
    { day: 'Thứ 4', shift: 'Chiều', job: 'SME SX', count: 1 },
    { day: 'Thứ 4', shift: 'Chiều', job: 'B', count: 1 },
    { day: 'Thứ 4', shift: 'Chiều', job: 'SME TM', count: 1 },
    { day: 'Thứ 4', shift: 'Chiều', job: 'AMIS_SME TV', count: 1 },
    { day: 'Thứ 4', shift: 'Chiều', job: 'AMIS DV', count: 1 },
    { day: 'Thứ 4', shift: 'Tối', job: 'SME CB - TOI', count: 1 },
    { day: 'Thứ 5', shift: 'Sáng', job: 'AMIS XD', count: 1 },
    { day: 'Thứ 5', shift: 'Sáng', job: 'A', count: 1 },
    { day: 'Thứ 5', shift: 'Sáng', job: 'AMIS SX', count: 1 },
    { day: 'Thứ 5', shift: 'Chiều', job: 'AMIS CĐ', count: 1 },
    { day: 'Thứ 5', shift: 'Chiều', job: 'AMIS XD', count: 1 },
    { day: 'Thứ 5', shift: 'Chiều', job: 'A', count: 1 },
    { day: 'Thứ 5', shift: 'Chiều', job: 'B', count: 1 },
    { day: 'Thứ 5', shift: 'Chiều', job: 'AMIS_SME TV', count: 1 },
    { day: 'Thứ 5', shift: 'Chiều', job: 'AMIS SX', count: 1 },
    { day: 'Thứ 5', shift: 'Tối', job: 'AMIS CT - TOI', count: 1 },
    { day: 'Thứ 5', shift: 'Tối', job: 'AMIS SX - TOI', count: 1 },
    { day: 'Thứ 5', shift: 'Tối', job: 'SME GT - TOI', count: 1 },
    { day: 'Thứ 6', shift: 'Sáng', job: 'B', count: 1 },
    { day: 'Thứ 6', shift: 'Sáng', job: 'A', count: 1 },
    { day: 'Thứ 6', shift: 'Sáng', job: 'AMIS DV', count: 1 },
    { day: 'Thứ 6', shift: 'Sáng', job: 'AMIS TM', count: 1 },
    { day: 'Thứ 6', shift: 'Chiều', job: 'HTX', count: 1 },
    { day: 'Thứ 6', shift: 'Chiều', job: 'AMIS_SME TV', count: 1 },
    { day: 'Thứ 6', shift: 'Chiều', job: 'A', count: 1 },
    { day: 'Thứ 6', shift: 'Chiều', job: 'AMIS DV', count: 1 },
    { day: 'Thứ 6', shift: 'Chiều', job: 'AMIS TM', count: 1 },
    { day: 'Thứ 2', shift: 'Sáng', job: 'TRUC_LIVECHAT', count: 4 },
    { day: 'Thứ 2', shift: 'Chiều', job: 'TRUC_LIVECHAT', count: 4 },
    { day: 'Thứ 2', shift: 'Sáng', job: 'TN_LIVECHAT', count: 1 },
    { day: 'Thứ 2', shift: 'Chiều', job: 'TN_LIVECHAT', count: 1 },
    { day: 'Thứ 3', shift: 'Sáng', job: 'TRUC_LIVECHAT', count: 4 },
    { day: 'Thứ 3', shift: 'Chiều', job: 'TRUC_LIVECHAT', count: 4 },
    { day: 'Thứ 3', shift: 'Sáng', job: 'TN_LIVECHAT', count: 1 },
    { day: 'Thứ 3', shift: 'Chiều', job: 'TN_LIVECHAT', count: 1 },
    { day: 'Thứ 4', shift: 'Sáng', job: 'TRUC_LIVECHAT', count: 4 },
    { day: 'Thứ 4', shift: 'Chiều', job: 'TRUC_LIVECHAT', count: 4 },
    { day: 'Thứ 4', shift: 'Sáng', job: 'TN_LIVECHAT', count: 1 },
    { day: 'Thứ 4', shift: 'Chiều', job: 'TN_LIVECHAT', count: 1 },
    { day: 'Thứ 5', shift: 'Sáng', job: 'TRUC_LIVECHAT', count: 4 },
    { day: 'Thứ 5', shift: 'Chiều', job: 'TRUC_LIVECHAT', count: 4 },
    { day: 'Thứ 5', shift: 'Sáng', job: 'TN_LIVECHAT', count: 1 },
    { day: 'Thứ 5', shift: 'Chiều', job: 'TN_LIVECHAT', count: 1 },
    { day: 'Thứ 6', shift: 'Sáng', job: 'TRUC_LIVECHAT', count: 4 },
    { day: 'Thứ 6', shift: 'Chiều', job: 'TRUC_LIVECHAT', count: 4 },
    { day: 'Thứ 6', shift: 'Sáng', job: 'TN_LIVECHAT', count: 1 },
    { day: 'Thứ 6', shift: 'Chiều', job: 'TN_LIVECHAT', count: 1 },
    { day: 'Thứ 7', shift: 'Sáng', job: 'TRUC_LIVECHAT', count: 4 },
    { day: 'Thứ 7', shift: 'Chiều', job: 'TRUC_LIVECHAT', count: 2 },
    { day: 'Thứ 7', shift: 'Sáng', job: 'TN_LIVECHAT', count: 1 },
];

const dayMap: Record<string, number> = {
    'Thứ 2': 0, 'Thứ 3': 1, 'Thứ 4': 2, 'Thứ 5': 3, 'Thứ 6': 4, 'Thứ 7': 5, 'Chủ nhật': 6
};

export const initialPatterns: SchedulePattern[] = rawPatterns.map((p, idx) => {
    const jobId = getJobIdByName(p.job);
    if (!jobId) return null;
    return {
        id: `pat_${idx}`,
        dayIndex: dayMap[p.day],
        shift: p.shift as any,
        jobId: jobId,
        requiredCount: p.count || 1
    };
}).filter(Boolean) as SchedulePattern[];

export const initialSchedule: ScheduleItem[] = []; // Empty initially, generated from patterns

// --- 4. HOLIDAYS & WORK PERIODS ---
export const initialHolidays: Holiday[] = [
    // 2026 Holidays
    { id: 'h2026_1', date: '2026-01-01', name: 'Tết Dương lịch' },
    { id: 'h2026_2', date: '2026-01-02', name: 'Nghỉ Tết Dương lịch (Hoán đổi)' },
    { id: 'h2026_3', date: '2026-01-03', name: 'Nghỉ Tết Dương lịch' },
    { id: 'h2026_4', date: '2026-01-04', name: 'Nghỉ Tết Dương lịch' },
    { id: 'h2026_5', date: '2026-02-14', name: 'Nghỉ Tết Nguyên Đán' },
    { id: 'h2026_6', date: '2026-02-15', name: 'Nghỉ Tết Nguyên Đán' },
    { id: 'h2026_7', date: '2026-02-16', name: 'Nghỉ Tết Nguyên Đán (29 Tết)' },
    { id: 'h2026_8', date: '2026-02-17', name: 'Tết Nguyên Đán (Mùng 1)' },
    { id: 'h2026_9', date: '2026-02-18', name: 'Tết Nguyên Đán (Mùng 2)' },
    { id: 'h2026_10', date: '2026-02-19', name: 'Tết Nguyên Đán (Mùng 3)' },
    { id: 'h2026_11', date: '2026-02-20', name: 'Nghỉ Tết Nguyên Đán' },
    { id: 'h2026_12', date: '2026-02-21', name: 'Nghỉ Tết Nguyên Đán' },
    { id: 'h2026_13', date: '2026-02-22', name: 'Nghỉ Tết Nguyên Đán' },
    { id: 'h2026_14', date: '2026-04-25', name: 'Nghỉ Giỗ Tổ Hùng Vương' },
    { id: 'h2026_15', date: '2026-04-26', name: 'Giỗ Tổ Hùng Vương (10/3 Âm lịch)' },
    { id: 'h2026_16', date: '2026-04-27', name: 'Nghỉ bù Giỗ Tổ Hùng Vương' },
    { id: 'h2026_17', date: '2026-04-30', name: 'Ngày Chiến thắng' },
    { id: 'h2026_18', date: '2026-05-01', name: 'Quốc tế Lao động' },
    { id: 'h2026_19', date: '2026-05-02', name: 'Nghỉ lễ 30/4 & 1/5' },
    { id: 'h2026_20', date: '2026-05-03', name: 'Nghỉ lễ 30/4 & 1/5' },
    { id: 'h2026_21', date: '2026-08-29', name: 'Nghỉ Lễ Quốc Khánh' },
    { id: 'h2026_22', date: '2026-08-30', name: 'Nghỉ Lễ Quốc Khánh' },
    { id: 'h2026_23', date: '2026-08-31', name: 'Nghỉ Lễ Quốc Khánh (Hoán đổi)' },
    { id: 'h2026_24', date: '2026-09-01', name: 'Nghỉ Lễ Quốc Khánh' },
    { id: 'h2026_25', date: '2026-09-02', name: 'Quốc Khánh' },
    { id: 'h2026_26', date: '2026-11-24', name: 'Ngày Văn hóa Việt Nam' },
];

const fullWorkDay = { morning: true, afternoon: true, evening: true };
const noWorkDay = { morning: false, afternoon: false, evening: false };
const satMorningOnly = { morning: true, afternoon: true, evening: false }; // Updated for user request

// Helper to create period
const createPeriod = (id: string, name: string, start: string, end: string, isWinter: boolean) => ({
    id, name, startDate: start, endDate: end,
    days: {
        0: fullWorkDay, 1: fullWorkDay, 2: fullWorkDay, 3: fullWorkDay,
        4: fullWorkDay, // Fri
        5: isWinter ? satMorningOnly : noWorkDay, // Sat
        6: noWorkDay
    }
});

export const initialWorkPeriods: WorkPeriod[] = [
    // 2023-2024
    createPeriod('p_winter_2024', 'Mùa Cao Điểm 2024 (01/12/23 - 30/04/24)', '2023-12-01', '2024-04-30', true),
    createPeriod('p_summer_2024', 'Mùa Thấp Điểm 2024 (01/05/24 - 30/11/24)', '2024-05-01', '2024-11-30', false),
    
    // 2024-2025
    createPeriod('p_winter_2025', 'Mùa Cao Điểm 2025 (01/12/24 - 30/04/25)', '2024-12-01', '2025-04-30', true),
    createPeriod('p_summer_2025', 'Mùa Thấp Điểm 2025 (01/05/25 - 30/11/25)', '2025-05-01', '2025-11-30', false),

    // 2025-2026
    createPeriod('p_winter_2026', 'Mùa Cao Điểm 2026 (01/12/25 - 30/04/26)', '2025-12-01', '2026-04-30', true),
    createPeriod('p_summer_2026', 'Mùa Thấp Điểm 2026 (01/05/26 - 30/11/26)', '2026-05-01', '2026-11-30', false),

     // 2026-2027 (Start)
    createPeriod('p_winter_2027', 'Mùa Cao Điểm 2027 (01/12/26 - 30/04/27)', '2026-12-01', '2027-04-30', true),
];

// --- 5. SUB JOBS ---
const subJobDataRaw = [
    { job: 'AMIS TM', name: 'HƯỚNG DẪN TẤT CẢ NGHIỆP VỤ TẠI DOANH NGHIỆP THƯƠNG MẠI', product: 'AMIS Kế toán', day: 'Thứ 3', duration: 180, shift: 'Sáng', start: '08:30', end: '11:30', link: 'http://meet.google.com/xbj-sbgr-qgi' },
    { job: 'AMIS DV', name: 'HƯỚNG DẪN TẤT CẢ NGHIỆP VỤ TẠI DOANH NGHIỆP DỊCH VỤ', product: 'AMIS Kế toán', day: 'Thứ 4', duration: 150, shift: 'Sáng', start: '08:30', end: '11:30', link: 'http://meet.google.com/qdv-swem-ktb' },
    { job: 'AMIS SX', name: 'HƯỚNG DẪN TẤT CẢ NGHIỆP VỤ TẠI DOANH NGHIỆP SẢN XUẤT', product: 'AMIS Kế toán', day: 'Thứ 3', duration: 180, shift: 'Sáng', start: '08:30', end: '11:30', link: 'http://meet.google.com/fkq-hgwg-bgf' },
    { job: 'AMIS XD', name: 'HƯỚNG DẪN TẤT CẢ NGHIỆP VỤ TẠI DOANH NGHIỆP XÂY DỰNG', product: 'AMIS Kế toán', day: 'Thứ 2', duration: 150, shift: 'Sáng', start: '08:30', end: '11:30', link: 'http://meet.google.com/kqx-dzvz-omb' },
    { job: 'AMIS TM', name: 'HƯỚNG DẪN TẤT CẢ NGHIỆP VỤ TẠI DOANH NGHIỆP THƯƠNG MẠI', product: 'AMIS Kế toán', day: 'Thứ 6', duration: 180, shift: 'Sáng', start: '08:30', end: '11:30', link: 'http://meet.google.com/xbj-sbgr-qgi' },
    { job: 'AMIS DV', name: 'HƯỚNG DẪN TẤT CẢ NGHIỆP VỤ TẠI DOANH NGHIỆP DỊCH VỤ', product: 'AMIS Kế toán', day: 'Thứ 6', duration: 150, shift: 'Sáng', start: '08:30', end: '11:30', link: 'http://meet.google.com/qdv-swem-ktb' },
    { job: 'AMIS SX', name: 'HƯỚNG DẪN TẤT CẢ NGHIỆP VỤ TẠI DOANH NGHIỆP SẢN XUẤT', product: 'AMIS Kế toán', day: 'Thứ 5', duration: 210, shift: 'Sáng', start: '08:30', end: '11:30', link: 'http://meet.google.com/fkq-hgwg-bgf' },
    { job: 'AMIS XD', name: 'HƯỚNG DẪN TẤT CẢ NGHIỆP VỤ TẠI DOANH NGHIỆP XÂY DỰNG', product: 'AMIS Kế toán', day: 'Thứ 5', duration: 150, shift: 'Sáng', start: '08:30', end: '11:30', link: 'http://meet.google.com/kqx-dzvz-omb' },
    { job: 'SME TM', name: 'Hướng dẫn sử dụng phần mềm MISA SME cho Lĩnh vực Thương mại', product: 'MISA SME', day: 'Thứ 4', duration: 180, shift: 'Sáng', start: '08:30', end: '11:30', link: 'http://meet.google.com/bsr-sbus-ypb' },
    { job: 'SME DV', name: 'Hướng dẫn sử dụng phần mềm MISA SME cho Lĩnh vực Xây dựng và Dịch vụ', product: 'MISA SME', day: 'Thứ 3', duration: 165, shift: 'Sáng', start: '08:30', end: '11:30', link: 'http://meet.google.com/wcg-gohn-yzq' },
    { job: 'SME SX', name: 'Hướng dẫn sử dụng phần mềm MISA SME cho Lĩnh vực Sản xuất', product: 'MISA SME', day: 'Thứ 4', duration: 180, shift: 'Sáng', start: '08:30', end: '11:30', link: 'http://meet.google.com/wqp-mosw-kfk' },
    
    // ADDED: AMIS_SME TV Morning Sessions (Missing)
    { job: 'AMIS_SME TV', name: 'TƯ VẤN SỬ DỤNG HIỆU QUẢ', product: 'AMIS Kế toán', day: 'Thứ 2', duration: 180, shift: 'Sáng', start: '08:30', end: '11:30', link: 'http://meet.google.com/wkx-zzot-bzv' },
    { job: 'AMIS_SME TV', name: 'TƯ VẤN SỬ DỤNG HIỆU QUẢ', product: 'AMIS Kế toán', day: 'Thứ 3', duration: 180, shift: 'Sáng', start: '08:30', end: '11:30', link: 'http://meet.google.com/wkx-zzot-bzv' },
    { job: 'AMIS_SME TV', name: 'TƯ VẤN SỬ DỤNG HIỆU QUẢ', product: 'AMIS Kế toán', day: 'Thứ 4', duration: 180, shift: 'Sáng', start: '08:30', end: '11:30', link: 'http://meet.google.com/wkx-zzot-bzv' },
    { job: 'AMIS_SME TV', name: 'TƯ VẤN SỬ DỤNG HIỆU QUẢ', product: 'AMIS Kế toán', day: 'Thứ 5', duration: 180, shift: 'Sáng', start: '08:30', end: '11:30', link: 'http://meet.google.com/wkx-zzot-bzv' },
    { job: 'AMIS_SME TV', name: 'TƯ VẤN SỬ DỤNG HIỆU QUẢ', product: 'AMIS Kế toán', day: 'Thứ 6', duration: 180, shift: 'Sáng', start: '08:30', end: '11:30', link: 'http://meet.google.com/wkx-zzot-bzv' },

    { job: 'AMIS_SME TV', name: 'TƯ VẤN SỬ DỤNG HIỆU QUẢ', product: 'AMIS Kế toán', day: 'Thứ 2', duration: 120, shift: 'Chiều', start: '15:30', end: '17:00', link: 'http://meet.google.com/wkx-zzot-bzv' },
    { job: 'AMIS_SME TV', name: 'TƯ VẤN SỬ DỤNG HIỆU QUẢ', product: 'AMIS Kế toán', day: 'Thứ 3', duration: 120, shift: 'Chiều', start: '15:30', end: '17:00', link: 'http://meet.google.com/wkx-zzot-bzv' },
    { job: 'AMIS_SME TV', name: 'TƯ VẤN SỬ DỤNG HIỆU QUẢ', product: 'AMIS Kế toán', day: 'Thứ 4', duration: 120, shift: 'Chiều', start: '15:30', end: '17:00', link: 'http://meet.google.com/wkx-zzot-bzv' },
    { job: 'AMIS_SME TV', name: 'TƯ VẤN SỬ DỤNG HIỆU QUẢ', product: 'AMIS Kế toán', day: 'Thứ 5', duration: 120, shift: 'Chiều', start: '15:30', end: '17:00', link: 'http://meet.google.com/wkx-zzot-bzv' },
    { job: 'AMIS_SME TV', name: 'TƯ VẤN SỬ DỤNG HIỆU QUẢ', product: 'AMIS Kế toán', day: 'Thứ 6', duration: 120, shift: 'Chiều', start: '15:30', end: '17:00', link: 'http://meet.google.com/wkx-zzot-bzv' },
    { job: 'AMIS CB', name: 'TẠO DỮ LIỆU BAN ĐẦU VÀ NGHIỆP VỤ MUA HÀNG, BÁN HÀNG', product: 'AMIS Kế toán', day: 'Thứ 2', duration: 210, shift: 'Chiều', start: '14:00', end: '17:30', link: 'http://meet.google.com/hmz-uomu-sbt' },
    { job: 'AMIS CĐ', name: 'SO SÁNH GIỮA AMIS KẾ TOÁN VỚI MISA SME', product: 'AMIS Kế toán', day: 'Thứ 5', duration: 120, shift: 'Chiều', start: '14:00', end: '16:00', link: 'http://meet.google.com/npr-hogh-xyc' },
    { job: 'A', name: 'HƯỚNG DẪN NHẬP SỐ DƯ ĐẦU KỲ', product: 'AMIS Kế toán', day: 'Thứ 2', duration: 50, shift: 'Chiều', start: '16:30', end: '17:20', link: 'http://meet.google.com/dom-edhn-qwg' },
    { job: 'A', name: 'HƯỚNG DẪN NGHIỆP VỤ MUA HÀNG', product: 'AMIS Kế toán', day: 'Thứ 2', duration: 75, shift: 'Chiều', start: '14:00', end: '15:15', link: 'http://meet.google.com/kpq-nnpm-kaf' },
    { job: 'B', name: 'HƯỚNG DẪN CÁC NGHIỆP VỤ QUẢN LÝ HÓA ĐƠN', product: 'AMIS Kế toán', day: 'Thứ 3', duration: 40, shift: 'Chiều', start: '16:30', end: '17:10', link: 'http://meet.google.com/rkv-psvu-skh' },
    { job: 'A', name: 'HƯỚNG DẪN CÁC NGHIỆP VỤ QUẢN LÝ TIỀN MẶT VÀ TIỀN GỬI, NGÂN HÀNG ĐIỆN TỬ', product: 'AMIS Kế toán', day: 'Thứ 3', duration: 70, shift: 'Chiều', start: '15:45', end: '16:55', link: 'http://meet.google.com/hvx-unos-htw' },
    { job: 'B', name: 'HƯỚNG DẪN CÁC NGHIỆP VỤ TỔNG HỢP', product: 'AMIS Kế toán', day: 'Thứ 3', duration: 60, shift: 'Chiều', start: '14:00', end: '15:00', link: 'http://meet.google.com/nuq-nbzf-nqq' },
    { job: 'B', name: 'HƯỚNG DẪN CÁC NGHIỆP VỤ QUẢN LÝ KHO', product: 'AMIS Kế toán', day: 'Thứ 3', duration: 50, shift: 'Chiều', start: '15:15', end: '16:05', link: 'http://meet.google.com/aeg-ezrt-cfe' },
    { job: 'A', name: 'HƯỚNG DẪN NGHIỆP VỤ TÍNH GIÁ THÀNH SẢN XUẤT SẢN PHẨM', product: 'AMIS Kế toán', day: 'Thứ 3', duration: 90, shift: 'Chiều', start: '14:00', end: '15:30', link: 'http://meet.google.com/ouc-qeom-rmn' },
    { job: 'B', name: 'HƯỚNG DẪN NGHIỆP VỤ MUA HÀNG', product: 'AMIS Kế toán', day: 'Thứ 4', duration: 75, shift: 'Chiều', start: '14:00', end: '15:15', link: 'http://meet.google.com/kpq-nnpm-kaf' },
    { job: 'A', name: 'HƯỚNG DẪN NGHIỆP VỤ BÁN HÀNG', product: 'AMIS Kế toán', day: 'Thứ 4', duration: 60, shift: 'Chiều', start: '15:45', end: '16:45', link: 'http://meet.google.com/bff-twsn-vye' },
    { job: 'B', name: 'HƯỚNG DẪN NGHIỆP VỤ TÍNH GIÁ THÀNH CÔNG TRÌNH, ĐƠN ĐẶT HÀNG, HỢP ĐỒNG DỊCH VỤ', product: 'AMIS Kế toán', day: 'Thứ 4', duration: 90, shift: 'Chiều', start: '15:30', end: '17:00', link: 'http://meet.google.com/acs-pkiq-ezr' },
    { job: 'A', name: 'HƯỚNG DẪN NGHIỆP VỤ TÍNH GIÁ THÀNH SẢN XUẤT SẢN PHẨM', product: 'AMIS Kế toán', day: 'Thứ 4', duration: 90, shift: 'Chiều', start: '14:00', end: '15:30', link: 'http://meet.google.com/ouc-qeom-rmn' },
    { job: 'B', name: 'HƯỚNG DẪN CÁC TIỆN ÍCH VÀ TÙY CHỌN CHO DỮ LIỆU KẾ TOÁN', product: 'AMIS Kế toán', day: 'Thứ 5', duration: 60, shift: 'Chiều', start: '14:00', end: '15:00', link: 'http://meet.google.com/xjk-fimf-wsy' },
    { job: 'B', name: 'HƯỚNG DẪN CÁC NGHIỆP VỤ QUẢN LÝ HÓA ĐƠN', product: 'AMIS Kế toán', day: 'Thứ 5', duration: 40, shift: 'Chiều', start: '16:30', end: '17:10', link: 'http://meet.google.com/rkv-psvu-skh' },
    { job: 'A', name: 'HƯỚNG DẪN CÁC NGHIỆP VỤ QUẢN LÝ TIỀN MẶT VÀ TIỀN GỬI, NGÂN HÀNG ĐIỆN TỬ', product: 'AMIS Kế toán', day: 'Thứ 5', duration: 70, shift: 'Chiều', start: '14:00', end: '15:10', link: 'http://meet.google.com/hvx-unos-htw' },
    { job: 'A', name: 'HƯỚNG DẪN NGHIỆP VỤ TÍNH GIÁ THÀNH SẢN XUẤT SẢN PHẨM', product: 'AMIS Kế toán', day: 'Thứ 5', duration: 90, shift: 'Chiều', start: '15:30', end: '17:00', link: 'http://meet.google.com/ouc-qeom-rmn' },
    { job: 'B', name: 'HƯỚNG DẪN CÁC NGHIỆP VỤ QUẢN LÝ TÀI SẢN CỐ ĐỊNH', product: 'AMIS Kế toán', day: 'Thứ 5', duration: 60, shift: 'Chiều', start: '15:15', end: '16:15', link: 'http://meet.google.com/owt-huud-jzc' },
    { job: 'A', name: 'HƯỚNG DẪN NGHIỆP VỤ MUA HÀNG', product: 'AMIS Kế toán', day: 'Thứ 6', duration: 75, shift: 'Chiều', start: '16:15', end: '17:30', link: 'http://meet.google.com/kpq-nnpm-kaf' },
    { job: 'A', name: 'HƯỚNG DẪN KHAI BÁO DANH MỤC', product: 'AMIS Kế toán', day: 'Thứ 6', duration: 60, shift: 'Chiều', start: '14:00', end: '15:00', link: 'http://meet.google.com/wri-wfqz-vfv' },
    { job: 'A', name: 'HƯỚNG DẪN NHẬP SỐ DƯ ĐẦU KỲ', product: 'AMIS Kế toán', day: 'Thứ 6', duration: 50, shift: 'Chiều', start: '15:15', end: '16:05', link: 'http://meet.google.com/dom-edhn-qwg' },
    { job: 'AMIS_SME TV', name: 'SME_TƯ VẤN CÁCH THỨC SỬ DỤNG HIỆU QUẢ', product: 'MISA SME', day: 'Thứ 2', duration: 90, shift: 'Chiều', start: '14:00', end: '15:30', link: 'http://meet.google.com/kku-weaw-gtf' },
    { job: 'AMIS_SME TV', name: 'SME_TƯ VẤN CÁCH THỨC SỬ DỤNG HIỆU QUẢ', product: 'MISA SME', day: 'Thứ 3', duration: 90, shift: 'Chiều', start: '14:00', end: '15:30', link: 'http://meet.google.com/kku-weaw-gtf' },
    { job: 'AMIS_SME TV', name: 'SME_TƯ VẤN CÁCH THỨC SỬ DỤNG HIỆU QUẢ', product: 'MISA SME', day: 'Thứ 4', duration: 90, shift: 'Chiều', start: '14:00', end: '15:30', link: 'http://meet.google.com/kku-weaw-gtf' },
    { job: 'AMIS_SME TV', name: 'SME_TƯ VẤN CÁCH THỨC SỬ DỤNG HIỆU QUẢ', product: 'MISA SME', day: 'Thứ 5', duration: 90, shift: 'Chiều', start: '14:00', end: '15:30', link: 'http://meet.google.com/kku-weaw-gtf' },
    { job: 'AMIS_SME TV', name: 'SME_TƯ VẤN CÁCH THỨC SỬ DỤNG HIỆU QUẢ', product: 'MISA SME', day: 'Thứ 6', duration: 90, shift: 'Chiều', start: '14:00', end: '15:30', link: 'http://meet.google.com/kku-weaw-gtf' },
    { job: 'AMIS CB', name: 'TẠO DỮ LIỆU BAN ĐẦU VÀ NGHIỆP VỤ MUA HÀNG, BÁN HÀNG', product: 'AMIS Kế toán', day: 'Thứ 4', duration: 210, shift: 'Sáng', start: '08:30', end: '12:00', link: 'http://meet.google.com/hmz-uomu-sbt' },
    { job: 'A', name: 'HƯỚNG DẪN CÁC NGHIỆP VỤ QUẢN LÝ CÔNG CỤ DỤNG CỤ, CHI PHÍ TRẢ TRƯỚC', product: 'AMIS Kế toán', day: 'Thứ 2', duration: 60, shift: 'Sáng', start: '08:30', end: '09:30', link: 'http://meet.google.com/ers-ttju-ebv' },
    { job: 'A', name: 'HƯỚNG DẪN CÁC NGHIỆP VỤ VỀ THUẾ', product: 'AMIS Kế toán', day: 'Thứ 2', duration: 50, shift: 'Sáng', start: '09:45', end: '10:35', link: 'http://meet.google.com/egu-hirq-oid' },
    { job: 'A', name: 'HƯỚNG DẪN CÁC NGHIỆP VỤ QUẢN LÝ KHO', product: 'AMIS Kế toán', day: 'Thứ 2', duration: 50, shift: 'Chiều', start: '15:30', end: '16:20', link: 'http://meet.google.com/aeg-ezrt-cfe' },
    { job: 'A', name: 'HƯỚNG DẪN CÁC NGHIỆP VỤ QUẢN LÝ TIỀN MẶT VÀ TIỀN GỬI, NGÂN HÀNG ĐIỆN TỬ', product: 'AMIS Kế toán', day: 'Thứ 2', duration: 70, shift: 'Sáng', start: '10:45', end: '11:55', link: 'http://meet.google.com/hvx-unos-htw' },
    { job: 'B', name: 'GIỚI THIỆU TỔNG QUAN PHẦN MỀM, THÊM NGƯỜI DÙNG VÀ PHÂN QUYỀN', product: 'AMIS Kế toán', day: 'Thứ 3', duration: 50, shift: 'Sáng', start: '08:30', end: '09:20', link: 'http://meet.google.com/hup-gcjy-ozv' },
    { job: 'B', name: 'HƯỚNG DẪN NGHIỆP VỤ BÁN HÀNG', product: 'AMIS Kế toán', day: 'Thứ 3', duration: 60, shift: 'Sáng', start: '09:30', end: '10:30', link: 'http://meet.google.com/bff-twsn-vye' },
    { job: 'B', name: 'HƯỚNG DẪN CÁC TIỆN ÍCH VÀ TÙY CHỌN CHO DỮ LIỆU KẾ TOÁN', product: 'AMIS Kế toán', day: 'Thứ 3', duration: 60, shift: 'Sáng', start: '10:45', end: '11:45', link: 'http://meet.google.com/xjk-fimf-wsy' },
    { job: 'A', name: 'HƯỚNG DẪN CÁC NGHIỆP VỤ QUẢN LÝ TÀI SẢN CỐ ĐỊNH', product: 'AMIS Kế toán', day: 'Thứ 3', duration: 60, shift: 'Sáng', start: '08:30', end: '09:30', link: 'http://meet.google.com/owt-huud-jzc' },
    { job: 'A', name: 'HƯỚNG DẪN KHAI BÁO DANH MỤC', product: 'AMIS Kế toán', day: 'Thứ 3', duration: 60, shift: 'Sáng', start: '09:45', end: '10:45', link: 'http://meet.google.com/wri-wfqz-vfv' },
    { job: 'A', name: 'HƯỚNG DẪN NHẬP SỐ DƯ ĐẦU KỲ', product: 'AMIS Kế toán', day: 'Thứ 3', duration: 50, shift: 'Sáng', start: '11:00', end: '11:50', link: 'http://meet.google.com/dom-edhn-qwg' },
    { job: 'A', name: 'HƯỚNG DẪN CÁC NGHIỆP VỤ QUẢN LÝ TIỀN MẶT VÀ TIỀN GỬI, NGÂN HÀNG ĐIỆN TỬ', product: 'AMIS Kế toán', day: 'Thứ 4', duration: 70, shift: 'Sáng', start: '08:30', end: '09:40', link: 'http://meet.google.com/hvx-unos-htw' },
    { job: 'A', name: 'HƯỚNG DẪN CÁC NGHIỆP VỤ QUẢN LÝ TÀI SẢN CỐ ĐỊNH', product: 'AMIS Kế toán', day: 'Thứ 4', duration: 60, shift: 'Sáng', start: '10:00', end: '11:00', link: 'http://meet.google.com/owt-huud-jzc' },
    { job: 'B', name: 'HƯỚNG DẪN CÁC NGHIỆP VỤ QUẢN LÝ CÔNG CỤ DỤNG CỤ, CHI PHÍ TRẢ TRƯỚC', product: 'AMIS Kế toán', day: 'Thứ 4', duration: 60, shift: 'Sáng', start: '08:30', end: '09:30', link: 'http://meet.google.com/ers-ttju-ebv' },
    { job: 'B', name: 'HƯỚNG DẪN CÁC NGHIỆP VỤ TỔNG HỢP', product: 'AMIS Kế toán', day: 'Thứ 4', duration: 60, shift: 'Sáng', start: '09:45', end: '10:45', link: 'http://meet.google.com/nuq-nbzf-nqq' },
    { job: 'B', name: 'HƯỚNG DẪN CÁC NGHIỆP VỤ QUẢN LÝ HÓA ĐƠN', product: 'AMIS Kế toán', day: 'Thứ 4', duration: 40, shift: 'Sáng', start: '11:00', end: '11:40', link: 'http://meet.google.com/rkv-psvu-skh' },
    { job: 'A', name: 'GIỚI THIỆU TỔNG QUAN PHẦN MỀM, THÊM NGƯỜI DÙNG VÀ PHÂN QUYỀN', product: 'AMIS Kế toán', day: 'Thứ 5', duration: 50, shift: 'Sáng', start: '08:30', end: '09:20', link: 'http://meet.google.com/hup-gcjy-ozv' },
    { job: 'A', name: 'HƯỚNG DẪN NHẬP SỐ DƯ ĐẦU KỲ', product: 'AMIS Kế toán', day: 'Thứ 5', duration: 50, shift: 'Sáng', start: '09:30', end: '10:20', link: 'http://meet.google.com/dom-edhn-qwg' },
    { job: 'A', name: 'HƯỚNG DẪN NGHIỆP VỤ BÁN HÀNG', product: 'AMIS Kế toán', day: 'Thứ 5', duration: 60, shift: 'Sáng', start: '10:30', end: '11:30', link: 'http://meet.google.com/bff-twsn-vye' },
    { job: 'A', name: 'HƯỚNG DẪN NGHIỆP VỤ TÍNH GIÁ THÀNH CÔNG TRÌNH, ĐƠN ĐẶT HÀNG, HỢP ĐỒNG DỊCH VỤ', product: 'AMIS Kế toán', day: 'Thứ 6', duration: 90, shift: 'Sáng', start: '10:00', end: '11:30', link: 'http://meet.google.com/acs-pkiq-ezr' },
    { job: 'B', name: 'HƯỚNG DẪN NGHIỆP VỤ TIỀN LƯƠNG', product: 'AMIS Kế toán', day: 'Thứ 6', duration: 65, shift: 'Sáng', start: '10:45', end: '11:50', link: 'http://meet.google.com/fgg-zoxr-ieo' },
    { job: 'B', name: 'HƯỚNG DẪN CÁC NGHIỆP VỤ QUẢN LÝ KHO', product: 'AMIS Kế toán', day: 'Thứ 6', duration: 50, shift: 'Sáng', start: '08:30', end: '09:20', link: 'http://meet.google.com/aeg-ezrt-cfe' },
    { job: 'A', name: 'HƯỚNG DẪN CÁC NGHIỆP VỤ TỔNG HỢP', product: 'AMIS Kế toán', day: 'Thứ 6', duration: 60, shift: 'Sáng', start: '08:30', end: '09:30', link: 'http://meet.google.com/nuq-nbzf-nqq' },
    { job: 'B', name: 'HƯỚNG DẪN CÁC NGHIỆP VỤ VỀ THUẾ', product: 'AMIS Kế toán', day: 'Thứ 6', duration: 50, shift: 'Sáng', start: '09:45', end: '10:35', link: 'http://meet.google.com/egu-hirq-oid' },
    { job: 'AMIS CB - TOI', name: 'HƯỚNG DẪN CÁC NGHIỆP VỤ CƠ BẢN (BUỔI TỐI)', product: 'AMIS Kế toán', day: 'Thứ 3', duration: 210, shift: 'Tối', start: '19:30', end: '22:30', link: 'http://meet.google.com/yqv-ytmm-vcb' },
    { job: 'AMIS CB - TOI', name: 'HƯỚNG DẪN CÁC NGHIỆP VỤ CƠ BẢN (BUỔI TỐI)', product: 'AMIS Kế toán', day: 'Thứ 4', duration: 210, shift: 'Tối', start: '19:30', end: '22:30', link: 'http://meet.google.com/yqv-ytmm-vcb' },
    { job: 'AMIS CT - TOI', name: 'HƯỚNG DẪN NGHIỆP VỤ TÍNH GIÁ THÀNH CÔNG TRÌNH - ĐƠN HÀNG - HỢP ĐỒNG (BUỔI TỐI)', product: 'AMIS Kế toán', day: 'Thứ 5', duration: 210, shift: 'Tối', start: '19:30', end: '22:30', link: 'http://meet.google.com/moi-biog-uoj' },
    { job: 'AMIS SX - TOI', name: 'HƯỚNG DẪN NGHIỆP VỤ TÍNH GIÁ THÀNH THÀNH PHẨM SẢN XUẤT (BUỔI TỐI)', product: 'AMIS Kế toán', day: 'Thứ 5', duration: 210, shift: 'Tối', start: '19:30', end: '22:30', link: 'http://meet.google.com/uqv-gjeq-vno' },
    { job: 'AMIS_KETNOI', name: 'HƯỚNG DẪN KẾT NỐI AMIS KẾ TOÁN VỚI CÁC ỨNG DỤNG KHÁC', product: 'AMIS Kế toán', day: 'Thứ 6', duration: 90, shift: 'Chiều', start: '14:00', end: '15:30', link: 'http://meet.google.com/prx-xiyz-fau' },
    { job: 'SME CB - TOI', name: 'Buổi tối - Hướng dẫn sử dụng phần mềm MISA SME các nghiệp vụ cơ bản về Thương mại', product: 'MISA SME', day: 'Thứ 3', duration: 210, shift: 'Tối', start: '19:30', end: '22:30', link: 'http://meet.google.com/fbh-vnor-pmg' },
    { job: 'SME CB - TOI', name: 'Buổi tối - Hướng dẫn sử dụng phần mềm MISA SME các nghiệp vụ cơ bản về Thương mại', product: 'MISA SME', day: 'Thứ 4', duration: 210, shift: 'Tối', start: '19:30', end: '22:30', link: 'http://meet.google.com/fbh-vnor-pmg' },
    { job: 'SME GT - TOI', name: 'Buổi tối - Hướng dẫn sử dụng phần mềm MISA SME các nghiệp vụ tính giá thành', product: 'MISA SME', day: 'Thứ 5', duration: 210, shift: 'Tối', start: '19:30', end: '22:30', link: 'http://meet.google.com/fbh-vnor-pmg' },
    { job: 'AMIS TM', name: 'HƯỚNG DẪN TẤT CẢ NGHIỆP VỤ TẠI DOANH NGHIỆP THƯƠNG MẠI', product: 'AMIS Kế toán', day: 'Thứ 3', duration: 180, shift: 'Chiều', start: '14:00', end: '17:30', link: 'http://meet.google.com/xbj-sbgr-qgi' },
    { job: 'AMIS DV', name: 'HƯỚNG DẪN TẤT CẢ NGHIỆP VỤ TẠI DOANH NGHIỆP DỊCH VỤ', product: 'AMIS Kế toán', day: 'Thứ 4', duration: 150, shift: 'Chiều', start: '14:00', end: '16:30', link: 'http://meet.google.com/qdv-swem-ktb' },
    { job: 'AMIS SX', name: 'HƯỚNG DẪN TẤT CẢ NGHIỆP VỤ TẠI DOANH NGHIỆP SẢN XUẤT', product: 'AMIS Kế toán', day: 'Thứ 3', duration: 180, shift: 'Chiều', start: '14:00', end: '17:30', link: 'http://meet.google.com/fkq-hgwg-bgf' },
    { job: 'AMIS XD', name: 'HƯỚNG DẪN TẤT CẢ NGHIỆP VỤ TẠI DOANH NGHIỆP XÂY DỰNG', product: 'AMIS Kế toán', day: 'Thứ 2', duration: 150, shift: 'Chiều', start: '14:00', end: '16:30', link: 'http://meet.google.com/kqx-dzvz-omb' },
    { job: 'AMIS TM', name: 'HƯỚNG DẪN TẤT CẢ NGHIỆP VỤ TẠI DOANH NGHIỆP THƯƠNG MẠI', product: 'AMIS Kế toán', day: 'Thứ 6', duration: 180, shift: 'Chiều', start: '14:00', end: '17:30', link: 'http://meet.google.com/xbj-sbgr-qgi' },
    { job: 'AMIS DV', name: 'HƯỚNG DẪN TẤT CẢ NGHIỆP VỤ TẠI DOANH NGHIỆP DỊCH VỤ', product: 'AMIS Kế toán', day: 'Thứ 6', duration: 150, shift: 'Chiều', start: '14:00', end: '16:30', link: 'http://meet.google.com/qdv-swem-ktb' },
    { job: 'AMIS SX', name: 'HƯỚNG DẪN TẤT CẢ NGHIỆP VỤ TẠI DOANH NGHIỆP SẢN XUẤT', product: 'AMIS Kế toán', day: 'Thứ 5', duration: 210, shift: 'Chiều', start: '14:00', end: '17:30', link: 'http://meet.google.com/fkq-hgwg-bgf' },
    { job: 'AMIS XD', name: 'HƯỚNG DẪN TẤT CẢ NGHIỆP VỤ TẠI DOANH NGHIỆP XÂY DỰNG', product: 'AMIS Kế toán', day: 'Thứ 5', duration: 150, shift: 'Chiều', start: '14:00', end: '16:30', link: 'http://meet.google.com/kqx-dzvz-omb' },
    { job: 'SME TM', name: 'Hướng dẫn sử dụng phần mềm MISA SME cho Lĩnh vực Thương mại', product: 'MISA SME', day: 'Thứ 4', duration: 180, shift: 'Chiều', start: '14:00', end: '17:30', link: 'http://meet.google.com/bsr-sbus-ypb' },
    { job: 'SME DV', name: 'Hướng dẫn sử dụng phần mềm MISA SME cho Lĩnh vực Xây dựng và Dịch vụ', product: 'MISA SME', day: 'Thứ 3', duration: 165, shift: 'Chiều', start: '14:00', end: '17:00', link: 'http://meet.google.com/wcg-gohn-yzq' },
    { job: 'SME SX', name: 'Hướng dẫn sử dụng phần mềm MISA SME cho Lĩnh vực Sản xuất', product: 'MISA SME', day: 'Thứ 4', duration: 180, shift: 'Chiều', start: '14:00', end: '17:30', link: 'http://meet.google.com/wqp-mosw-kfk' },
    { job: 'HTX', name: 'Đào tạo AMIS Kế toán HTX', product: 'AMIS Kế toán HTX', day: 'Thứ 6', duration: 210, shift: 'Chiều', start: '14:00', end: '17:30', link: 'http://meet.google.com/iaq-bexs-yp' }
];

export const initialSubJobs: SubJob[] = subJobDataRaw.map((raw, idx) => {
    // Try to find the job ID
    const jobId = initialJobs.find(j => j.name === raw.job)?.id || 'unknown';
    
    return {
        id: `sub_${idx}`,
        jobId: jobId,
        name: raw.name,
        product: raw.product,
        day: raw.day,
        shift: raw.shift as any,
        duration: raw.duration,
        startTime: raw.start,
        endTime: raw.end,
        link: raw.link,
        documentLink: '',
        isActive: true
    };
}).filter(s => s.jobId !== 'unknown');
