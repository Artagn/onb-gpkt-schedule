/**
 * useJobManager - Custom hook for Job Manager business logic
 * Extracted from JobManager.tsx for better maintainability
 */

import { useState, useMemo } from 'react';
import { Job, JobGroup, SubJob } from '../../types';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { jobsService, subJobsService } from '../../services/firestoreService';
import { useQueryClient } from '@tanstack/react-query';
import { useAddJobMutation, useUpdateJobMutation, useDeleteJobMutation, JOB_KEYS } from '../../hooks/useJobsQuery';
import { useAddSubJobMutation, useUpdateSubJobMutation, useDeleteSubJobMutation, SUBJOB_KEYS } from '../../hooks/useSubJobsQuery';
import { useData } from '../../context/DataContext';

export type Tab = 'jobs' | 'subJobs';
export type ImportMode = 'none' | 'jobs' | 'subJobs';
export type DeleteConfirmState = { type: 'job' | 'subJob'; id: string; name?: string } | null;

export const useJobManager = () => {
    const { jobs, subJobs, schedule } = useData();
    const queryClient = useQueryClient();

    // Mutations
    const addJobMutation = useAddJobMutation();
    const updateJobMutation = useUpdateJobMutation();
    const deleteJobMutation = useDeleteJobMutation();
    const addSubJobMutation = useAddSubJobMutation();
    const updateSubJobMutation = useUpdateSubJobMutation();
    const deleteSubJobMutation = useDeleteSubJobMutation();

    // UI State
    const [activeTab, setActiveTab] = useState<Tab>('jobs');
    const [importMode, setImportMode] = useState<ImportMode>('none');
    const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>(null);

    // Job Edit State
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<Job>>({});

    // SubJob Edit State
    const [isEditingSub, setIsEditingSub] = useState<string | null>(null);
    const [editSubForm, setEditSubForm] = useState<Partial<SubJob>>({});

    // Search & Filter State - Jobs
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [filterGroup, setFilterGroup] = useState<string>('All');

    // Search & Filter State - SubJobs
    const [searchSubQuery, setSearchSubQuery] = useState<string>('');
    const [filterParentJob, setFilterParentJob] = useState<string[]>([]);
    const [filterProduct, setFilterProduct] = useState<string[]>([]);
    const [filterDay, setFilterDay] = useState<string[]>([]);
    const [filterShift, setFilterShift] = useState<string[]>([]);

    // ========== VALIDATION ==========
    const validateJob = (job: Partial<Job>): string[] => {
        const errors: string[] = [];
        if (!job.name?.trim()) errors.push("Tên công việc không được để trống");
        if ((job.standardPoint ?? 0) < 0) errors.push("Điểm chuẩn không được âm");
        if ((job.durationMinutes ?? 0) < 0) errors.push("Thời lượng không được âm");
        if ((job.difficulty ?? 1) <= 0) errors.push("Độ khó phải lớn hơn 0");
        if (!job.id) {
            const duplicate = jobs.find(j => j.name.toLowerCase() === job.name?.toLowerCase().trim());
            if (duplicate) errors.push("Tên công việc đã tồn tại");
        }
        return errors;
    };

    // ========== JOB HANDLERS ==========
    const handleEditJob = (job: Job) => {
        setIsEditing(job.id);
        setEditForm({ ...job });
    };

    const handleAddJob = () => {
        setIsEditing('new');
        setEditForm({ isActive: true });
    };

    const handleDeleteJobClick = (job: Job) => {
        const isInUse = schedule.some(s => s.jobId === job.id);
        if (isInUse) {
            toast.error(
                `KHÔNG THỂ XÓA!\n\n` +
                `Công việc "${job.name}" đang được sử dụng trong Lịch cố định.\n\n` +
                `Gợi ý: Gỡ khỏi lịch hoặc chuyển "Ngưng hoạt động".`
            );
            return;
        }
        setDeleteConfirm({ type: 'job', id: job.id, name: job.name });
    };

    const handleSaveJob = () => {
        const errors = validateJob(editForm);
        if (errors.length > 0) {
            toast.error("Lỗi validation:\n" + errors.map((e, i) => `${i + 1}. ${e}`).join('\n'));
            return;
        }

        if (isEditing && editForm.id) {
            const updatedJob = { ...jobs.find(j => j.id === editForm.id)!, ...editForm } as Job;
            updateJobMutation.mutate(updatedJob);
        } else {
            const newJob: Job = {
                id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                name: editForm.name || 'New Job',
                group: editForm.group || JobGroup.Other,
                classification: editForm.classification,
                standardPoint: editForm.standardPoint || 0,
                difficulty: editForm.difficulty || 1,
                durationMinutes: editForm.durationMinutes || 0,
                isActive: editForm.isActive !== undefined ? editForm.isActive : true
            };
            addJobMutation.mutate(newJob);
        }

        setIsEditing(null);
        setEditForm({});
    };

    const handleCancelEditJob = () => {
        setIsEditing(null);
        setEditForm({});
    };

    // ========== SUBJOB HANDLERS ==========
    const handleEditSub = (sub: SubJob) => {
        setIsEditingSub(sub.id);
        setEditSubForm({ ...sub });
    };

    const handleAddSub = () => {
        setIsEditingSub('new');
        setEditSubForm({ isActive: true });
    };

    const handleDeleteSubClick = (sub: SubJob) => {
        setDeleteConfirm({ type: 'subJob', id: sub.id, name: sub.name });
    };

    const handleSaveSub = () => {
        if (!editSubForm.jobId || !editSubForm.name) {
            toast.error("Công việc và Tên hạng mục là bắt buộc");
            return;
        }

        if (isEditingSub && editSubForm.id) {
            const updatedSub = { ...subJobs.find(s => s.id === editSubForm.id)!, ...editSubForm } as SubJob;
            updateSubJobMutation.mutate(updatedSub);
        } else {
            const newSub: SubJob = {
                id: `sub_${Date.now()}`,
                jobId: editSubForm.jobId || '',
                name: editSubForm.name || '',
                product: editSubForm.product || '',
                day: editSubForm.day || 'Thứ 2',
                shift: editSubForm.shift || 'Sáng',
                duration: editSubForm.duration || 0,
                startTime: editSubForm.startTime || '',
                endTime: editSubForm.endTime || '',
                link: editSubForm.link || '',
                isActive: editSubForm.isActive !== undefined ? editSubForm.isActive : true
            };
            addSubJobMutation.mutate(newSub);
        }

        setIsEditingSub(null);
        setEditSubForm({});
    };

    const handleCancelEditSub = () => {
        setIsEditingSub(null);
        setEditSubForm({});
    };

    // ========== DELETE HANDLER ==========
    const confirmDelete = async () => {
        if (!deleteConfirm) return;

        if (deleteConfirm.type === 'job') {
            deleteJobMutation.mutate(deleteConfirm.id);
        } else {
            deleteSubJobMutation.mutate(deleteConfirm.id);
        }
        setDeleteConfirm(null);
    };

    // ========== EXCEL HANDLERS ==========
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
                toast.error("File không có dữ liệu.");
                return;
            }

            const rows = data.slice(1);

            if (importMode === 'jobs') {
                const newJobs: Job[] = [];
                rows.forEach((row, idx) => {
                    if (row.length >= 1 && row[0]) {
                        const name = String(row[0]).trim();
                        const groupStr = String(row[1] || '').trim();
                        const group = Object.values(JobGroup).find(g => g === groupStr) || JobGroup.Other;
                        const classification = String(row[2]).trim() === 'Nghiệp vụ' || String(row[2]).trim() === 'Lĩnh vực' ? String(row[2]).trim() as any : undefined;
                        const standardPoint = parseFloat(String(row[3]).replace(',', '.') || '0');
                        const durationMinutes = parseInt(String(row[4]).trim() || '0');
                        const difficulty = parseFloat(String(row[5]).replace(',', '.') || '1');
                        const activeStr = String(row[6]).trim().toLowerCase();
                        const isActive = activeStr === 'active' || activeStr === 'đang hoạt động' || activeStr === 'true' || activeStr === 'có' || true;

                        newJobs.push({
                            id: `job_imp_${Date.now()}_${idx}`,
                            name, group, classification, standardPoint, durationMinutes, difficulty, isActive
                        });
                    }
                });

                if (newJobs.length > 0) {
                    toast.promise(
                        Promise.all(newJobs.map(j => jobsService.save(j))).then(() => {
                            queryClient.invalidateQueries({ queryKey: JOB_KEYS.all });
                        }),
                        {
                            loading: `Đang lưu ${newJobs.length} công việc...`,
                            success: `Đã nhập và lưu thành công!`,
                            error: 'Lỗi khi lưu dữ liệu'
                        }
                    );
                    setImportMode('none');
                }
            } else if (importMode === 'subJobs') {
                const newSubs: SubJob[] = [];
                rows.forEach((row, idx) => {
                    if (row.length >= 2 && row[0]) {
                        const jobName = String(row[0]).trim();
                        const parentJob = jobs.find(j => j.name === jobName);
                        if (parentJob) {
                            newSubs.push({
                                id: `sub_imp_${Date.now()}_${idx}`,
                                jobId: parentJob.id,
                                name: String(row[1]).trim() || 'No Name',
                                product: String(row[2] || '').trim(),
                                day: String(row[3] || '').trim(),
                                duration: parseInt(String(row[4] || '0')),
                                shift: (String(row[5] || 'Sáng').trim() as any),
                                startTime: String(row[6] || '').trim(),
                                endTime: String(row[7] || '').trim(),
                                link: String(row[8] || '').trim(),
                                isActive: true
                            });
                        }
                    }
                });

                if (newSubs.length > 0) {
                    toast.promise(
                        Promise.all(newSubs.map(s => subJobsService.save(s))).then(() => {
                            queryClient.invalidateQueries({ queryKey: SUBJOB_KEYS.all });
                        }),
                        {
                            loading: `Đang lưu ${newSubs.length} hạng mục...`,
                            success: `Đã nhập và lưu thành công!`,
                            error: 'Lỗi khi lưu dữ liệu'
                        }
                    );
                    setImportMode('none');
                }
            }
        };
        reader.readAsBinaryString(file);
    };

    const downloadTemplate = () => {
        const wb = XLSX.utils.book_new();

        if (importMode === 'jobs') {
            const headers = ["Tên công việc", "Nhóm (Đào tạo/Livechat/Chia hàng ngày/Khác)", "Phân loại (Nghiệp vụ/Lĩnh vực)", "Điểm chuẩn", "Thời lượng (phút)", "Độ khó", "Trạng thái (Có/Không)"];
            const example = ["Đào tạo A", "Đào tạo", "Nghiệp vụ", "1.5", "180", "1", "Có"];
            const ws = XLSX.utils.aoa_to_sheet([headers, example]);
            XLSX.utils.book_append_sheet(wb, ws, "Jobs");
            XLSX.writeFile(wb, "Mau_Cong_Viec.xlsx");
        } else {
            const headers = ["Tên công việc cha (Phải khớp chính xác)", "Tên hạng mục chi tiết", "Sản phẩm", "Thứ (Thứ 2...)", "Thời lượng", "Buổi (Sáng/Chiều/Tối)", "Bắt đầu (HH:mm)", "Kết thúc (HH:mm)", "Link Meet"];
            const example = ["Đào tạo A", "Hướng dẫn phần 1", "AMIS", "Thứ 2", "180", "Sáng", "08:30", "11:30", "meet.google.com/abc"];
            const ws = XLSX.utils.aoa_to_sheet([headers, example]);
            XLSX.utils.book_append_sheet(wb, ws, "SubJobs");
            XLSX.writeFile(wb, "Mau_Hang_Muc.xlsx");
        }
    };

    // ========== FILTER HELPERS ==========
    const clearSubJobFilters = () => {
        setFilterParentJob([]);
        setFilterProduct([]);
        setFilterDay([]);
        setFilterShift([]);
        setSearchSubQuery('');
    };

    // ========== FILTERED DATA ==========
    const filteredJobs = useMemo(() => {
        let result = jobs;
        if (filterGroup !== 'All') {
            result = result.filter(j => j.group === filterGroup);
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            result = result.filter(j =>
                j.name.toLowerCase().includes(q) ||
                j.group.toLowerCase().includes(q) ||
                (j.classification?.toLowerCase().includes(q))
            );
        }
        return result;
    }, [jobs, filterGroup, searchQuery]);

    const filteredSubJobs = useMemo(() => {
        let result = subJobs;
        if (filterParentJob.length > 0) {
            result = result.filter(sub => {
                const parent = jobs.find(j => j.id === sub.jobId);
                return parent && filterParentJob.includes(parent.name);
            });
        }
        if (filterProduct.length > 0) {
            result = result.filter(sub => sub.product && filterProduct.includes(sub.product));
        }
        if (filterDay.length > 0) {
            result = result.filter(sub => filterDay.includes(sub.day));
        }
        if (filterShift.length > 0) {
            result = result.filter(sub => filterShift.includes(sub.shift));
        }
        if (searchSubQuery.trim()) {
            const q = searchSubQuery.toLowerCase().trim();
            result = result.filter(sub => {
                const parent = jobs.find(j => j.id === sub.jobId);
                return (
                    sub.name.toLowerCase().includes(q) ||
                    (parent?.name.toLowerCase().includes(q)) ||
                    sub.product?.toLowerCase().includes(q) ||
                    sub.day?.toLowerCase().includes(q) ||
                    sub.link?.toLowerCase().includes(q)
                );
            });
        }
        return result;
    }, [subJobs, jobs, searchSubQuery, filterParentJob, filterProduct, filterDay, filterShift]);

    return {
        // Data
        jobs,
        subJobs,
        filteredJobs,
        filteredSubJobs,

        // UI State
        activeTab,
        setActiveTab,
        importMode,
        setImportMode,
        deleteConfirm,
        setDeleteConfirm,

        // Job Edit
        isEditing,
        editForm,
        setEditForm,
        handleEditJob,
        handleAddJob,
        handleDeleteJobClick,
        handleSaveJob,
        handleCancelEditJob,

        // SubJob Edit
        isEditingSub,
        editSubForm,
        setEditSubForm,
        handleEditSub,
        handleAddSub,
        handleDeleteSubClick,
        handleSaveSub,
        handleCancelEditSub,

        // Delete
        confirmDelete,

        // Excel
        handleFileUpload,
        downloadTemplate,

        // Filters - Jobs
        searchQuery,
        setSearchQuery,
        filterGroup,
        setFilterGroup,

        // Filters - SubJobs
        searchSubQuery,
        setSearchSubQuery,
        filterParentJob,
        setFilterParentJob,
        filterProduct,
        setFilterProduct,
        filterDay,
        setFilterDay,
        filterShift,
        setFilterShift,
        clearSubJobFilters,
    };
};
