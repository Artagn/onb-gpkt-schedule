import React, { useState, useMemo } from 'react';
import { format, isSameDay, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ArrowLeftRight, Search, AlertCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { ScheduleItem, Employee, Job, Status } from '../../types';
import { swapService } from '../../services/swapService';
import { useData } from '../../context/DataContext';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    currentUser: Employee;
    sourceItem: ScheduleItem;
    employees: Employee[];
    schedule: ScheduleItem[];
    jobs: Job[];
}

const SwapRequestModal: React.FC<Props> = ({ isOpen, onClose, currentUser, sourceItem, employees, schedule, jobs }) => {
    const { leaves } = useData();
    const [targetDetail, setTargetDetail] = useState<{ empId: string, item?: ScheduleItem } | null>(null);
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    if (!isOpen) return null;

    const sourceDate = parseISO(sourceItem.date);
    const sourceJob = jobs.find(j => j.id === sourceItem.jobId);

    // Get leave status for a candidate in the source date and shift
    const getCandidateLeaveStatus = (empId: string) => {
        const leave = leaves.find(l =>
            l.employeeId === empId &&
            l.date === sourceItem.date &&
            l.shift === sourceItem.shift &&
            (l.status === 'Approved' || l.status === 'Pending')
        );
        return leave ? leave.status : null;
    };

    // List of active employees excluding self
    const candidates = employees
        .filter(e => e.status === Status.Active && e.id !== currentUser.id)
        .filter(e => e.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || e.email.toLowerCase().includes(searchTerm.toLowerCase()));

    const handleSelectCandidate = (empId: string) => {
        // Find if this candidate has a job in the same slot
        const item = schedule.find(s =>
            isSameDay(parseISO(s.date), sourceDate) &&
            s.shift === sourceItem.shift &&
            s.employeeIds.includes(empId) &&
            s.jobId !== 'JOB_NGHI_BU' // Ignore Rest for now, or handle specifically? 
            // Actually if they are Resting, they CAN taking a job but they lose Rest.
            // But usually we swap Job <-> Job.
            // If they are OFF, item is undefined.
        );
        setTargetDetail({ empId, item });
    };

    const handleSubmit = async () => {
        if (!targetDetail) return;

        // Block swap if target has approved leave
        const targetLeaveStatus = getCandidateLeaveStatus(targetDetail.empId);
        if (targetLeaveStatus === 'Approved') {
            toast.error("Không thể đổi lịch với người đã được duyệt nghỉ phép!");
            return;
        }

        setIsSubmitting(true);
        try {
            await swapService.createRequest({
                requesterId: currentUser.id,
                targetId: targetDetail.empId,
                requestDate: sourceItem.date,
                requestShift: sourceItem.shift,
                requestJobId: sourceItem.jobId,
                targetDate: sourceItem.date, // Same day swap for now
                targetShift: sourceItem.shift,
                targetJobId: targetDetail.item?.jobId || null, // null if OFF
                reason: reason.trim() || 'Đổi lịch',
            });
            toast.success("Đã gửi yêu cầu đổi lịch!");
            onClose();
        } catch (error) {
            console.error(error);
            toast.error("Lỗi gửi yêu cầu");
        } finally {
            setIsSubmitting(false);
        }
    };

    const targetJob = targetDetail?.item ? jobs.find(j => j.id === targetDetail.item?.jobId) : null;
    const targetLeaveStatus = targetDetail ? getCandidateLeaveStatus(targetDetail.empId) : null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col max-h-[90vh]">
                <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <ArrowLeftRight className="w-5 h-5 text-blue-600" />
                        Yêu cầu Đổi lịch
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                <div className="p-4 overflow-y-auto flex-1 space-y-4">
                    {/* INFO CARD */}
                    <div className="bg-blue-50 p-3 rounded border border-blue-100">
                        <div className="text-xs text-blue-600 uppercase font-bold mb-1">Lịch của bạn</div>
                        <div className="font-bold text-gray-800">{format(sourceDate, 'EEEE dd/MM', { locale: vi })} - Buổi {sourceItem.shift}</div>
                        <div className="text-sm text-gray-600">{sourceJob?.name}</div>
                        {sourceItem.shift === 'Tối' && (
                            <div className="mt-2 text-[10px] text-red-600 bg-white px-2 py-1 rounded border border-red-100 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                <span>Cảnh báo: Đổi ca Tối sẽ hoán đổi cả trạng thái (Làm/Nghỉ) của sáng hôm sau.</span>
                            </div>
                        )}
                    </div>

                    {/* SELECT TARGET */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Người muốn đổi cùng</label>
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Tìm tên nhân viên..."
                                className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="mt-2 max-h-40 overflow-y-auto border rounded divide-y">
                            {candidates.map(emp => (
                                <div
                                    key={emp.id}
                                    className={`p-2 text-sm cursor-pointer hover:bg-gray-50 flex justify-between items-center ${targetDetail?.empId === emp.id ? 'bg-blue-50 text-blue-700' : ''}`}
                                    onClick={() => handleSelectCandidate(emp.id)}
                                >
                                    <span>{emp.fullName}</span>
                                    {targetDetail?.empId === emp.id && <span className="text-blue-600">✓</span>}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* TARGET PREVIEW */}
                    {targetDetail && (
                        <div className="space-y-2">
                            <div className={`p-3 rounded border ${targetDetail.item ? 'bg-purple-50 border-purple-100' : 'bg-gray-50 border-gray-200'}`}>
                                <div className="text-xs uppercase font-bold mb-1 text-gray-500">Trạng thái của họ:</div>
                                {targetDetail.item ? (
                                    <div>
                                        <div className="font-bold text-purple-700">{targetJob?.name || 'Công việc khác'}</div>
                                        <div className="text-xs text-purple-600">Họ sẽ nhận việc của bạn, và bạn nhận việc này.</div>
                                    </div>
                                ) : (
                                    <div>
                                        <div className="font-bold text-gray-600 italic">Hiện đang Trống lịch</div>
                                        <div className="text-xs text-gray-500">Họ nhận việc của bạn. Bạn sẽ được nghỉ.</div>
                                    </div>
                                )}
                            </div>

                            {targetLeaveStatus && (
                                <div className={`text-xs px-3 py-2 rounded border flex items-start gap-1.5
                                    ${targetLeaveStatus === 'Approved' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-yellow-50 text-yellow-700 border-yellow-100'}
                                `}>
                                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    <span>
                                        {targetLeaveStatus === 'Approved'
                                            ? '⚠️ Không thể đổi lịch: Nhân viên này đã được DUYỆT nghỉ phép ca này!'
                                            : '⚠️ Lưu ý: Nhân viên này đang có đơn xin nghỉ phép CHỜ DUYỆT ca này!'}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* REASON */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Lý do đổi</label>
                        <textarea
                            className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            rows={2}
                            placeholder="Nhập lý do..."
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                        />
                    </div>
                </div>

                <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 bg-white border rounded text-sm font-medium hover:bg-gray-50 text-gray-700">Hủy</button>
                    <button
                        disabled={!targetDetail || isSubmitting || targetLeaveStatus === 'Approved'}
                        onClick={handleSubmit}
                        className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        Gửi yêu cầu
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SwapRequestModal;
