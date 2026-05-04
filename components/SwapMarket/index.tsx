import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ArrowLeftRight, CheckCircle, XCircle, Clock, History, Inbox, Send } from 'lucide-react';
import { swapService } from '../../services/swapService';
import { ScheduleItem, SwapRequest, Employee } from '../../types';
import { useData } from '../../context/DataContext';
import toast from 'react-hot-toast';
import SwapHistory from './SwapHistory';
import { useQueryClient } from '@tanstack/react-query';
import { SCHEDULE_KEYS } from '../../hooks/useSchedulesQuery';

interface Props {
    currentUser: Employee;
}

const SwapMarket: React.FC<Props> = ({ currentUser }) => {
    const { employees, jobs } = useData();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing' | 'history'>('incoming');
    const [incoming, setIncoming] = useState<SwapRequest[]>([]);
    const [outgoing, setOutgoing] = useState<SwapRequest[]>([]);
    const [loading, setLoading] = useState(false);

    const loadRequests = async () => {
        if (!currentUser?.id) return;
        setLoading(true);
        try {
            const [inc, out] = await Promise.all([
                swapService.getIncomingRequests(currentUser.id),
                swapService.getMyRequests(currentUser.id)
            ]);
            setIncoming(inc);
            setOutgoing(out);
        } catch (error) {
            console.error(error);
            toast.error("Lỗi tải danh sách yêu cầu");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRequests();
    }, [currentUser?.id]);

    const handleApprove = async (req: SwapRequest) => {
        if (!window.confirm(`Bạn có chắc chắn muốn ĐỔI lịch với ${getEmpName(req.requesterId)}?\n\n⚠️ Nếu đây là CA TỐI, hệ thống sẽ tự động đổi luôn lịch Sáng hôm sau!`)) return;

        try {
            await swapService.approveRequest(req.id);
            toast.success("Đã chấp nhận đổi lịch!");
            loadRequests();
            queryClient.invalidateQueries({ queryKey: SCHEDULE_KEYS.all });
        } catch (error) {
            console.error(error);
            toast.error("Lỗi xử lý đổi lịch");
        }
    };

    const handleReject = async (req: SwapRequest) => {
        if (!window.confirm("Từ chối yêu cầu này?")) return;
        try {
            await swapService.rejectRequest(req.id);
            toast.success("Đã từ chối.");
            loadRequests();
        } catch (error) {
            toast.error("Lỗi!");
        }
    };

    const handleCancel = async (req: SwapRequest) => {
        if (!window.confirm("Hủy yêu cầu này?")) return;
        try {
            await swapService.cancelRequest(req.id);
            toast.success("Đã hủy.");
            loadRequests();
        } catch (error) {
            toast.error("Lỗi!");
        }
    };

    const getEmpName = (id: string) => employees.find(e => e.id === id)?.fullName || id;
    const getJobName = (id: string) => jobs.find(j => j.id === id)?.name || id;

    // Filter lists
    const pendingIncoming = incoming.filter(r => r.status === 'Pending');
    const pendingOutgoing = outgoing.filter(r => r.status === 'Pending');
    const historyRequests = [...incoming, ...outgoing].filter(r => r.status !== 'Pending');

    const RequestCard = ({ req, type }: { req: SwapRequest, type: 'incoming' | 'outgoing' }) => {
        const partnerId = type === 'incoming' ? req.requesterId : req.targetId;
        const partnerName = getEmpName(partnerId);

        return (
            <div className="p-4 rounded-lg border bg-white border-blue-200 shadow-sm flex flex-col gap-3">
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded textxs font-bold text-white text-[10px] uppercase bg-yellow-500">
                                Chờ duyệt
                            </span>
                            <span className="text-xs text-gray-400">{format(new Date(req.createdAt), 'dd/MM/yyyy HH:mm')}</span>
                        </div>
                        <h4 className="font-bold text-sm text-gray-800 flex items-center gap-1">
                            {type === 'incoming' ?
                                <><ArrowLeftRight className="w-4 h-4 text-blue-600" /> Yêu cầu từ {partnerName}</> :
                                <><ArrowLeftRight className="w-4 h-4 text-purple-600" /> Gửi tới {partnerName}</>}
                        </h4>
                    </div>
                </div>

                <div className="bg-slate-50 p-2 rounded border border-slate-100 text-sm grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
                    <div className="text-center">
                        <div className="text-[10px] text-gray-500 uppercase">Của {type === 'incoming' ? partnerName : 'Bạn'}</div>
                        <div className="font-bold text-blue-700">{format(new Date(req.requestDate), 'dd/MM')} ({req.requestShift})</div>
                        <div className="text-xs truncate" title={getJobName(req.requestJobId)}>{getJobName(req.requestJobId)}</div>
                    </div>

                    <ArrowLeftRight className="w-4 h-4 text-gray-400 mx-auto" />

                    <div className="text-center">
                        <div className="text-[10px] text-gray-500 uppercase">Của {type === 'incoming' ? 'Bạn' : partnerName}</div>
                        <div className="font-bold text-purple-700">{format(new Date(req.targetDate), 'dd/MM')} ({req.targetShift})</div>
                        <div className="text-xs truncate italic text-gray-600">
                            {req.targetJobId ? getJobName(req.targetJobId) : '(Không có việc)'}
                        </div>
                    </div>
                </div>

                {req.requestShift === 'Tối' && (
                    <div className="text-[10px] bg-red-50 text-red-700 px-2 py-1 rounded border border-red-100 flex items-center gap-1">
                        ⚠️ <strong>Lưu ý:</strong> Đổi ca Tối sẽ đổi luôn lịch Sáng hôm sau!
                    </div>
                )}

                {req.reason && <div className="text-xs text-gray-600 italic border-l-2 pl-2 border-gray-300">"{req.reason}"</div>}

                <div className="flex gap-2 mt-1">
                    {type === 'incoming' ? (
                        <>
                            <button onClick={() => handleApprove(req)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded text-xs font-bold flex items-center justify-center gap-1">
                                <CheckCircle className="w-3 h-3" /> Chấp nhận
                            </button>
                            <button onClick={() => handleReject(req)} className="flex-1 bg-white border border-red-200 text-red-600 hover:bg-red-50 py-1.5 rounded text-xs font-bold flex items-center justify-center gap-1">
                                <XCircle className="w-3 h-3" /> Từ chối
                            </button>
                        </>
                    ) : (
                        <button onClick={() => handleCancel(req)} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 py-1.5 rounded text-xs font-bold">
                            Hủy yêu cầu
                        </button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col bg-white">
            <div className="flex border-b">
                <button
                    onClick={() => setActiveTab('incoming')}
                    className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'incoming' ? 'border-blue-600 text-blue-700 bg-blue-50' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}
                >
                    <Inbox className="w-4 h-4" />
                    Cần duyệt
                    {pendingIncoming.length > 0 && <span className="ml-1 bg-red-500 text-white text-[10px] px-1.5 rounded-full">{pendingIncoming.length}</span>}
                </button>
                <button
                    onClick={() => setActiveTab('outgoing')}
                    className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'outgoing' ? 'border-purple-600 text-purple-700 bg-purple-50' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}
                >
                    <Send className="w-4 h-4" />
                    Đang chờ
                    {pendingOutgoing.length > 0 && <span className="ml-1 bg-gray-200 text-gray-600 text-[10px] px-1.5 rounded-full">{pendingOutgoing.length}</span>}
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'history' ? 'border-gray-600 text-gray-700 bg-gray-50' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}
                >
                    <History className="w-4 h-4" />
                    Lịch sử
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                {loading ? (
                    <div className="flex justify-center p-8"><span className="animate-spin text-2xl">⏳</span></div>
                ) : (
                    <div className="space-y-3">
                        {activeTab === 'incoming' && (
                            pendingIncoming.length === 0 ?
                                <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                                    <CheckCircle className="w-12 h-12 mb-2 opacity-20" />
                                    <p className="text-sm">Không có yêu cầu nào cần duyệt.</p>
                                </div>
                                : pendingIncoming.map(req => <RequestCard key={req.id} req={req} type="incoming" />)
                        )}

                        {activeTab === 'outgoing' && (
                            pendingOutgoing.length === 0 ?
                                <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                                    <Send className="w-12 h-12 mb-2 opacity-20" />
                                    <p className="text-sm">Bạn không có yêu cầu nào đang chờ.</p>
                                </div>
                                : pendingOutgoing.map(req => <RequestCard key={req.id} req={req} type="outgoing" />)
                        )}

                        {activeTab === 'history' && (
                            <SwapHistory
                                requests={historyRequests}
                                employees={employees}
                                jobs={jobs}
                                currentUserId={currentUser.id}
                            />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SwapMarket;
