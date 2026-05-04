import React from 'react';
import { RefreshCcw } from 'lucide-react';
import { format } from 'date-fns';

interface Props {
    data: any[];
}

export const LeaveSwapTable: React.FC<Props> = ({ data }) => {
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 border">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày đăng ký</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nhân viên</th>
                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày nghỉ cũ</th>
                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày nghỉ bù (Mới)</th>
                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Buổi</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lý do / Nguồn gốc</th>
                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {data.length === 0 ? (
                        <tr>
                            <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                                Không có dữ liệu đổi ngày nghỉ bù.
                            </td>
                        </tr>
                    ) : (
                        data.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-3 py-2 text-sm text-gray-500 whitespace-nowrap">
                                    {/* Assuming ID has timestamp or we just use date */}
                                    {/* Leaves don't have createdAt, so we can't show registration date properly unless we parse ID or add it. 
                                        For now, we just show the date of the leave relative to... 
                                        Actually let's just show '-' if unknown. */}
                                    -
                                </td>
                                <td className="px-3 py-2 text-sm font-medium text-blue-700">
                                    {item.employeeName}
                                </td>
                                <td className="px-3 py-2 text-sm text-center font-medium text-gray-500">
                                    {item.originalDateStr || '-'}
                                </td>
                                <td className="px-3 py-2 text-sm text-center font-bold text-gray-700">
                                    {item.dateStr}
                                </td>
                                <td className="px-3 py-2 text-sm text-center">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${item.shift === 'Sáng' ? 'bg-yellow-100 text-yellow-800' :
                                        item.shift === 'Chiều' ? 'bg-orange-100 text-orange-800' :
                                            'bg-slate-800 text-white'
                                        }`}>
                                        {item.shift}
                                    </span>
                                </td>
                                <td className="px-3 py-2 text-sm text-gray-600">
                                    <div className="flex items-center gap-1">
                                        <RefreshCcw className="w-3 h-3 text-purple-500" />
                                        <span>{item.reason}</span>
                                    </div>
                                </td>
                                <td className="px-3 py-2 text-center">
                                    <span className={`px-2 py-1 inline-flex text-[10px] leading-4 font-semibold rounded-full
                                        ${item.status === 'Approved' ? 'bg-green-100 text-green-800' :
                                            item.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                                                item.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                                        {item.status === 'Approved' ? 'Đã duyệt' :
                                            item.status === 'Rejected' ? 'Từ chối' :
                                                'Đang chờ'}
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
