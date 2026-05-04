import React from 'react';
import { ArrowLeftRight, CheckCircle2, XCircle, Ban, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { SwapRequest } from '../../types';

interface SummaryProps {
    stats: {
        total: number;
        approved: number;
        rejected: number;
        cancelled: number;
        pending: number;
    };
}

export const SwapSummaryCards: React.FC<SummaryProps> = ({ stats }) => {
    return (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between">
                <div>
                    <div className="text-gray-500 text-xs font-bold uppercase mb-1">Tổng yêu cầu</div>
                    <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
                </div>
                <div className="p-2 bg-gray-100 rounded-full text-gray-600">
                    <ArrowLeftRight className="w-5 h-5" />
                </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-blue-200 shadow-sm flex items-center justify-between bg-blue-50">
                <div>
                    <div className="text-blue-600 text-xs font-bold uppercase mb-1">Chờ duyệt</div>
                    <div className="text-2xl font-bold text-blue-700">{stats.pending}</div>
                </div>
                <div className="p-2 bg-blue-200 rounded-full text-blue-700">
                    <Clock className="w-5 h-5" />
                </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-green-200 shadow-sm flex items-center justify-between bg-green-50">
                <div>
                    <div className="text-green-600 text-xs font-bold uppercase mb-1">Thành công</div>
                    <div className="text-2xl font-bold text-green-700">{stats.approved}</div>
                </div>
                <div className="p-2 bg-green-200 rounded-full text-green-700">
                    <CheckCircle2 className="w-5 h-5" />
                </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-red-200 shadow-sm flex items-center justify-between bg-red-50">
                <div>
                    <div className="text-red-600 text-xs font-bold uppercase mb-1">Từ chối</div>
                    <div className="text-2xl font-bold text-red-700">{stats.rejected}</div>
                </div>
                <div className="p-2 bg-red-200 rounded-full text-red-700">
                    <XCircle className="w-5 h-5" />
                </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between bg-gray-50 opacity-80">
                <div>
                    <div className="text-gray-500 text-xs font-bold uppercase mb-1">Đã hủy</div>
                    <div className="text-2xl font-bold text-gray-700">{stats.cancelled}</div>
                </div>
                <div className="p-2 bg-gray-200 rounded-full text-gray-600">
                    <Ban className="w-5 h-5" />
                </div>
            </div>
        </div>
    );
};

interface TableProps {
    data: any[];
}

export const SwapTable: React.FC<TableProps> = ({ data }) => {
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 border">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày tạo</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Người yêu cầu</th>
                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ca đổi (Của người yêu cầu)</th>
                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ca nhận (Của người nhận)</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Người nhận</th>
                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {data.length === 0 ? (
                        <tr>
                            <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                                Không có dữ liệu
                            </td>
                        </tr>
                    ) : (
                        data.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-3 py-2 text-sm text-gray-500 whitespace-nowrap">
                                    {item.createdAtStr}
                                </td>
                                <td className="px-3 py-2 text-sm font-medium text-blue-700">
                                    {item.requesterName}
                                </td>
                                <td className="px-3 py-2 text-sm text-center">
                                    <div className="text-xs font-bold text-gray-700">{item.requestDateStr} ({item.requestShift})</div>
                                    <div className="text-[10px] text-gray-500 truncate max-w-[150px] mx-auto" title={item.requestJobName}>{item.requestJobName}</div>
                                </td>
                                <td className="px-1 py-2 text-center text-gray-400">
                                    <ArrowLeftRight className="w-4 h-4 mx-auto" />
                                </td>
                                <td className="px-3 py-2 text-sm text-center">
                                    <div className="text-xs font-bold text-gray-700">{format(new Date(item.targetDate), 'dd/MM')} ({item.targetShift})</div>
                                    <div className="text-[10px] text-gray-500 truncate max-w-[150px] mx-auto bg-gray-50 rounded px-1" title={item.targetJobName}>{item.targetJobName}</div>
                                </td>
                                <td className="px-3 py-2 text-sm font-medium text-purple-700">
                                    {item.targetName}
                                </td>
                                <td className="px-3 py-2 text-center">
                                    <span className={`px-2 py-1 inline-flex text-[10px] leading-4 font-semibold rounded-full
                                        ${item.status === 'Approved' ? 'bg-green-100 text-green-800' :
                                            item.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                                                item.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                                        {item.status === 'Approved' ? 'Thành công' :
                                            item.status === 'Rejected' ? 'Từ chối' :
                                                item.status === 'Pending' ? 'Chờ duyệt' : 'Đã hủy'}
                                    </span>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
};
