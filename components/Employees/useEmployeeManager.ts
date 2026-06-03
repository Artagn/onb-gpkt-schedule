import { useState, useMemo, useCallback } from 'react';
import { Employee, EmployeeRank, Role, Status, TimeFrame } from '../../types';
import { employeesService } from '../../services/firestoreService';
import { useQueryClient } from '@tanstack/react-query';
import { useAddEmployeeMutation, useUpdateEmployeeMutation, useDeleteEmployeeMutation, EMPLOYEE_KEYS } from '../../hooks/useEmployeesQuery';
import { useConfigData } from '../../context/DataContext';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

export interface FilterState {
    filterRole: string;
    filterStatus: string;
    filterRank: string;
    searchText: string;
}

export interface UseEmployeeManagerReturn {
    // Data
    employees: Employee[];
    filteredEmployees: Employee[];

    // Edit state
    isEditing: string | null;
    setIsEditing: (id: string | null) => void;
    editForm: Partial<Employee>;
    setEditForm: (form: Partial<Employee>) => void;

    // Filter state
    filters: FilterState;
    setFilters: React.Dispatch<React.SetStateAction<FilterState>>;

    // Delete state
    deleteId: string | null;
    setDeleteId: (id: string | null) => void;

    // Import state
    showImport: boolean;
    setShowImport: (show: boolean) => void;

    // Handlers
    handleEdit: (employee: Employee) => void;
    handleDeleteClick: (id: string) => void;
    confirmDelete: () => void;
    handleSave: () => void;
    handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    downloadTemplate: () => void;
    openAddNew: () => void;
}

export const useEmployeeManager = (): UseEmployeeManagerReturn => {
    const { employees } = useConfigData();
    const queryClient = useQueryClient();

    // Mutations
    const addEmployeeMutation = useAddEmployeeMutation();
    const updateEmployeeMutation = useUpdateEmployeeMutation();
    const deleteEmployeeMutation = useDeleteEmployeeMutation();

    // Edit state
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<Employee>>({});

    // Filter state
    const [filters, setFilters] = useState<FilterState>({
        filterRole: 'All',
        filterStatus: 'All',
        filterRank: 'All',
        searchText: ''
    });

    // Import state
    const [showImport, setShowImport] = useState(false);

    // Delete state
    const [deleteId, setDeleteId] = useState<string | null>(null);

    // Validation
    const validateEmployee = useCallback((emp: Partial<Employee>): string[] => {
        const errors: string[] = [];
        if (!emp.fullName?.trim()) errors.push("Họ tên không được để trống");
        if (!emp.email?.trim()) {
            errors.push("Email không được để trống");
        } else if (!emp.email.includes('@')) {
            errors.push("Email không hợp lệ (phải có @)");
        }
        if ((emp.kpiStandard ?? 0) <= 0) errors.push("KPI chuẩn phải lớn hơn 0");
        if (!emp.jobGroups || emp.jobGroups.length === 0) errors.push("Phải chọn ít nhất 1 nhóm công việc");
        if (!emp.timeFrames || emp.timeFrames.length === 0) errors.push("Phải chọn ít nhất 1 khung thời gian");
        return errors;
    }, []);

    // Handlers
    const handleEdit = useCallback((employee: Employee) => {
        setIsEditing(employee.id);
        setEditForm({ ...employee });
    }, []);

    const handleDeleteClick = useCallback((id: string) => {
        const emp = employees.find(e => e.id === id);
        if (emp?.status === Status.Active) {
            if (!window.confirm(
                `⚠️ CẢNH BÁO: ${emp.fullName} đang ở trạng thái "Đang hoạt động".\n\n` +
                `Xóa nhân viên có thể gây mất dữ liệu lịch làm việc và phân công.\n\n` +
                `💡 GỢI Ý: Chuyển sang trạng thái "Ngưng hoạt động" thay vì xóa.\n\n` +
                `Bạn có chắc chắn muốn XÓA VĨNH VIỄN?`
            )) {
                return;
            }
        }
        setDeleteId(id);
    }, [employees]);

    const confirmDelete = useCallback(() => {
        if (deleteId) {
            deleteEmployeeMutation.mutate(deleteId);
            setDeleteId(null);
        }
    }, [deleteId, deleteEmployeeMutation]);

    const handleSave = useCallback(() => {
        // Validation
        const errors = validateEmployee(editForm);
        if (errors.length > 0) {
            toast.error("Lỗi validation:\n" + errors.map((e, i) => `${i + 1}. ${e}`).join('\n'));
            return;
        }

        // Prevent removing last Admin
        if (isEditing && editForm.id) {
            const currentEmployee = employees.find(e => e.id === editForm.id);
            if (currentEmployee?.role === Role.Admin && editForm.role !== Role.Admin) {
                const adminCount = employees.filter(e => e.role === Role.Admin).length;
                if (adminCount <= 1) {
                    toast.error("Không thể thay đổi vai trò Admin cuối cùng! Hệ thống cần ít nhất 1 Admin.");
                    return;
                }
            }
        }

        if (isEditing && editForm.id) {
            const updatedEmp = { ...employees.find(e => e.id === editForm.id)!, ...editForm } as Employee;
            updateEmployeeMutation.mutate(updatedEmp);
        } else {
            const newEmployee: Employee = {
                id: `emp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                stt: editForm.stt || employees.length + 1,
                fullName: editForm.fullName || 'New Employee',
                email: editForm.email || '',
                rank: editForm.rank || EmployeeRank.None,
                jobGroups: editForm.jobGroups || [],
                timeFrames: editForm.timeFrames || [],
                role: editForm.role || Role.Staff,
                status: editForm.status || Status.Active,
                kpiStandard: editForm.kpiStandard || 100,
                weeklyScore: 0,
                monthlyScore: 0
            };
            addEmployeeMutation.mutate(newEmployee);
        }

        setIsEditing(null);
        setEditForm({});
    }, [editForm, isEditing, employees, validateEmployee, addEmployeeMutation, updateEmployeeMutation]);

    const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const MAX_FILE_SIZE = 5 * 1024 * 1024;
        if (file.size > MAX_FILE_SIZE) {
            toast.error("File quá lớn! Kích thước tối đa cho phép là 5MB.");
            e.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const bstr = event.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

            if (data.length <= 1) {
                toast.error("File không có dữ liệu hoặc sai định dạng.");
                return;
            }

            const startRow = data[0].some(cell => String(cell).toLowerCase().includes('họ') || String(cell).toLowerCase().includes('tên')) ? 1 : 0;

            const newEmployees: Employee[] = [];

            for (let i = startRow; i < data.length; i++) {
                const row = data[i];
                if (row.length >= 2 && row[1]) {
                    const stt = parseInt(row[0]) || (employees.length + i + 1);
                    const fullName = String(row[1]).trim();
                    const email = String(row[2] || '').trim();
                    const rankStr = String(row[3] || '').trim();
                    const roleStr = String(row[4] || '').trim();
                    const statusStr = String(row[5] || '').trim();
                    const jobGroupsStr = String(row[6] || '');
                    const timeFramesStr = String(row[7] || '');
                    const kpi = parseInt(row[8]) || 100;

                    const rank = Object.values(EmployeeRank).find(r => r === rankStr) || EmployeeRank.None;
                    const role = Object.values(Role).find(r => r === roleStr) || Role.Staff;
                    const status = Object.values(Status).find(s => s === statusStr) || Status.Active;

                    const jobGroups = jobGroupsStr.split(',')
                        .map(s => s.trim())
                        .filter(s => s.length > 0);

                    const timeFrames = timeFramesStr.split(',')
                        .map(s => s.trim())
                        .filter(s => Object.values(TimeFrame).includes(s as TimeFrame)) as TimeFrame[];

                    newEmployees.push({
                        id: `emp_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 3)}`,
                        stt, fullName, email, rank, role, status, jobGroups, timeFrames,
                        kpiStandard: kpi, weeklyScore: 0, monthlyScore: 0
                    });
                }
            }

            if (newEmployees.length > 0) {
                toast.promise(
                    Promise.all(newEmployees.map(emp => employeesService.save(emp))).then(() => {
                        queryClient.invalidateQueries({ queryKey: EMPLOYEE_KEYS.all });
                    }),
                    {
                        loading: `Đang lưu ${newEmployees.length} nhân viên...`,
                        success: `Đã nhập và lưu thành công ${newEmployees.length} nhân viên!`,
                        error: 'Có lỗi khi lưu dữ liệu.'
                    }
                );
                setShowImport(false);
            } else {
                toast.error('Không tìm thấy dữ liệu hợp lệ.');
            }
        };
        reader.readAsBinaryString(file);
    }, [employees, queryClient]);

    const downloadTemplate = useCallback(() => {
        const headers = ["STT", "Họ và tên", "Email", "Phân hạng (A/B)", "Vai trò", "Trạng thái", "Nhóm việc (ngăn cách phẩy)", "Ca làm việc (ngăn cách phẩy)", "KPI"];
        const example = ["1", "Nguyễn Văn A", "a@example.com", "Hạng A", "Nhân viên", "Đang hoạt động", "Đào tạo,Livechat", "Sáng,Chiều", "100"];

        const ws = XLSX.utils.aoa_to_sheet([headers, example]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Employees");
        XLSX.writeFile(wb, "Mau_Nhap_Nhan_Vien.xlsx");
    }, []);

    const openAddNew = useCallback(() => {
        setIsEditing('new');
        setEditForm({ stt: employees.length + 1 });
    }, [employees.length]);

    // Filtered employees
    const filteredEmployees = useMemo(() => {
        return employees.filter(e => {
            if (filters.filterRole !== 'All' && e.role !== filters.filterRole) return false;
            if (filters.filterStatus !== 'All' && e.status !== filters.filterStatus) return false;
            if (filters.filterRank !== 'All' && e.rank !== filters.filterRank) return false;

            if (filters.searchText) {
                const lowerSearch = filters.searchText.toLowerCase();
                const matchName = e.fullName.toLowerCase().includes(lowerSearch);
                const matchEmail = e.email.toLowerCase().includes(lowerSearch);
                if (!matchName && !matchEmail) return false;
            }
            return true;
        }).sort((a, b) => (a.stt || 9999) - (b.stt || 9999));
    }, [employees, filters]);

    return {
        employees,
        filteredEmployees,
        isEditing,
        setIsEditing,
        editForm,
        setEditForm,
        filters,
        setFilters,
        deleteId,
        setDeleteId,
        showImport,
        setShowImport,
        handleEdit,
        handleDeleteClick,
        confirmDelete,
        handleSave,
        handleFileUpload,
        downloadTemplate,
        openAddNew,
    };
};
