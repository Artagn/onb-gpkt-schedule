
import React from 'react';

interface Props {
    data: any[];
}

export const TrainingTable: React.FC<Props> = ({ data }) => {
    return (
        <div className="overflow-auto border rounded-lg">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 sticky top-0">
                    <tr>
                        <th className="px-3 py-2 text-left font-bold text-[11px] text-gray-500 uppercase tracking-wider">Ngày</th>
                        <th className="px-3 py-2 text-left font-bold text-[11px] text-gray-500 uppercase tracking-wider">Nội dung đào tạo</th>
                        <th className="px-3 py-2 text-left font-bold text-[11px] text-gray-500 uppercase tracking-wider">Người thực hiện</th>
                        <th className="px-3 py-2 text-center font-bold text-[11px] uppercase tracking-wider text-blue-600">Tham gia</th>
                        <th className="px-3 py-2 text-center font-bold text-[11px] uppercase tracking-wider text-orange-600">Khảo sát</th>
                        <th className="px-3 py-2 text-center font-bold text-[11px] uppercase tracking-wider text-green-600">Biết sử dụng</th>
                        <th className="px-3 py-2 text-center font-bold text-[11px] text-gray-500 uppercase tracking-wider">Tỷ lệ</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {data.map((row) => (
                        <tr key={row.id} className="transition-all duration-200 hover:bg-slate-50">
                            <td className="px-3 py-2 font-medium text-gray-900 text-xs">{row.dateStr}</td>
                            <td className="px-3 py-2 font-bold text-gray-800 text-xs">{row.jobName}</td>
                            <td className="px-3 py-2 text-gray-600 text-xs">{row.assignees}</td>
                            <td className="px-3 py-2 text-center text-xs">
                                <span className={`inline-block min-w-[24px] px-1.5 py-0.5 rounded ${row.participants > 0 ? 'bg-blue-100 text-blue-700 font-bold' : 'text-gray-400'}`}>
                                    {row.participants}
                                </span>
                            </td>
                            <td className="px-3 py-2 text-center text-xs">
                                <span className={`inline-block min-w-[24px] px-1.5 py-0.5 rounded ${row.surveys > 0 ? 'bg-orange-100 text-orange-700 font-medium' : 'text-gray-400'}`}>
                                    {row.surveys}
                                </span>
                            </td>
                            <td className="px-3 py-2 text-center text-xs">
                                <span className={`inline-block min-w-[24px] px-1.5 py-0.5 rounded ${row.capable > 0 ? 'bg-green-100 text-green-700 font-bold' : 'text-gray-400'}`}>
                                    {row.capable}
                                </span>
                            </td>
                            <td className="px-3 py-2 text-center">
                                <span className={`inline-block min-w-[36px] px-2 py-0.5 rounded text-[10px] font-bold ${parseFloat(row.ratio) >= 80 ? 'bg-green-100 text-green-800' : parseFloat(row.ratio) >= 50 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                                    {row.ratio}%
                                </span>
                            </td>
                        </tr>
                    ))}
                    {data.length === 0 && (
                        <tr><td colSpan={7} className="p-8 text-center text-gray-500 italic">Không có dữ liệu đào tạo hoàn thành trong khoảng thời gian này.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};
