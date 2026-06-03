import React from 'react';
import { format, parseISO } from 'date-fns';
import { SwapRequest, Employee, Job } from '../../types';
import { ArrowLeftRight, History } from 'lucide-react';
import EmptyState from '../common/EmptyState';

interface Props {
    requests: SwapRequest[];
    employees: Employee[];
    jobs: Job[];
    currentUserId: string;
}

const SwapHistory: React.FC<Props> = ({ requests, employees, jobs, currentUserId }) => {
    const getEmpName = (id: string) => employees.find(e => e.id === id)?.fullName || id;
    const getJobName = (id: string) => jobs.find(j => j.id === id)?.name || id;

    if (requests.length === 0) {
        return (
            <EmptyState
                icon={History}
                title="Chưa có lịch sử đổi lịch nào"
                description="Các yêu cầu đổi ca đã hoàn thành, bị từ chối hoặc đã hủy sẽ hiển thị ở đây."
            />
        );
    }

    // Sort requests by updatedAt descending (newest first)
    const sortedRequests = [...requests].sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.createdAt).getTime();
        const dateB = new Date(b.updatedAt || b.createdAt).getTime();
        return dateB - dateA;
    });

    return (
        <div className="space-y-3">
            {sortedRequests.map(req => {
                const isMyRequest = req.requesterId === currentUserId;
                const partnerId = isMyRequest ? req.targetId : req.requesterId;
                const partnerName = getEmpName(partnerId);

                // Determine who owns which slot for display purposes
                // If I am requester: slot1 is Mine, slot2 is Partner's
                // If I am target: slot1 is Partner's, slot2 is Mine

                // But to be consistent with the "Request vs Target" structure:
                // Request Slot: Always the one initiated by Requester
                // Target Slot: Always the one held by Target

                // Let's display it as "Request Slot" -> "Target Slot" but label owners clearly
                const requestOwnerName = isMyRequest ? "Bạn" : partnerName;
                const targetOwnerName = isMyRequest ? partnerName : "Bạn";

                return (
                    <div key={req.id} className="p-4 rounded-lg border bg-gray-50 border-gray-200">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase text-white
                                        ${req.status === 'Approved' ? 'bg-green-500' :
                                            req.status === 'Rejected' ? 'bg-red-500' : 'bg-gray-400'}
                                    `}>
                                        {req.status === 'Approved' ? 'Thành công' :
                                            req.status === 'Rejected' ? 'Bị từ chối' : 'Đã hủy'}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                        {format(new Date(req.updatedAt || req.createdAt), 'dd/MM/yyyy HH:mm')}
                                    </span>
                                </div>
                                <h4 className="font-bold text-sm text-gray-700 flex items-center gap-1">
                                    {isMyRequest ? (
                                        <><ArrowLeftRight className="w-3.5 h-3.5" /> Gửi tới {partnerName}</>
                                    ) : (
                                        <><ArrowLeftRight className="w-3.5 h-3.5" /> Từ {partnerName}</>
                                    )}
                                </h4>
                            </div>
                        </div>

                        <div className="bg-white p-2 rounded border border-gray-100 text-sm grid grid-cols-[1fr_auto_1fr] gap-2 items-center opacity-80">
                            <div className="text-center">
                                <div className="text-[10px] text-gray-500 uppercase">Của {requestOwnerName}</div>
                                <div className="font-bold text-gray-700">
                                    {format(parseISO(req.requestDate), 'dd/MM')} ({req.requestShift})
                                </div>
                                <div className="text-xs text-gray-500 truncate">{getJobName(req.requestJobId)}</div>
                            </div>

                            <ArrowLeftRight className="w-4 h-4 text-gray-300 mx-auto" />

                            <div className="text-center">
                                <div className="text-[10px] text-gray-500 uppercase">Của {targetOwnerName}</div>
                                <div className="font-bold text-gray-700">
                                    {format(parseISO(req.targetDate), 'dd/MM')} ({req.targetShift})
                                </div>
                                <div className="text-xs text-gray-500 truncate">
                                    {req.targetJobId ? getJobName(req.targetJobId) : '(Nghỉ/Không có việc)'}
                                </div>
                            </div>
                        </div>

                        {req.reason && (
                            <div className="mt-2 text-xs text-gray-500 italic bg-white px-2 py-1 rounded border border-gray-100">
                                "{req.reason}"
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default SwapHistory;
