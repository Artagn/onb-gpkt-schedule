
import React from 'react';

interface Props {
    data: any[];
    selectedEmployeeId?: string | null;
}

export const DailyTable: React.FC<Props> = ({ data, selectedEmployeeId }) => {
    return (
        <div className="overflow-auto border rounded-lg">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 sticky top-0">
                    <tr>
                        <th className="px-3 py-2 text-left font-bold text-[11px] text-gray-500 uppercase tracking-wider">Nhân viên</th>
                        <th className="px-3 py-2 text-center font-bold text-[11px] uppercase tracking-wider text-blue-600">Chia mới</th>
                        <th className="px-3 py-2 text-center font-bold text-[11px] uppercase tracking-wider text-green-600">Hoàn thành</th>
                        <th className="px-3 py-2 text-center font-bold text-[11px] uppercase tracking-wider text-orange-600">Trả KD</th>
                        <th className="px-3 py-2 text-center font-bold text-[11px] uppercase tracking-wider text-red-600">Trả TP</th>
                        <th className="px-3 py-2 text-center font-bold text-[11px] text-gray-500 uppercase tracking-wider">Tồn đọng</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {data.map((row, idx) => {
                        const isSelected = selectedEmployeeId === row.id;
                        return (
                            <tr
                                key={idx}
                                className={`transition-all duration-200 ${isSelected
                                        ? 'bg-blue-50 ring-2 ring-blue-400 ring-inset'
                                        : selectedEmployeeId
                                            ? 'opacity-50'
                                            : 'hover:bg-slate-50'
                                    }`}
                            >
                                <td className={`px-3 py-2 text-gray-900 text-xs ${isSelected ? 'font-bold text-blue-800' : 'font-medium'}`}>
                                    {row.name}
                                    {isSelected && <span className="ml-2 text-blue-500">●</span>}
                                </td>
                                <td className="px-3 py-2 text-center text-xs">
                                    <span className={`inline-block min-w-[24px] px-1.5 py-0.5 rounded ${row.newAssigned > 0 ? 'bg-blue-100 text-blue-700 font-bold' : 'text-gray-400'}`}>
                                        {row.newAssigned}
                                    </span>
                                </td>
                                <td className="px-3 py-2 text-center text-xs">
                                    <span className={`inline-block min-w-[24px] px-1.5 py-0.5 rounded ${row.completed > 0 ? 'bg-green-100 text-green-700 font-bold' : 'text-gray-400'}`}>
                                        {row.completed}
                                    </span>
                                </td>
                                <td className="px-3 py-2 text-center text-xs">
                                    <span className={`inline-block min-w-[24px] px-1.5 py-0.5 rounded ${row.returnedKD > 0 ? 'bg-orange-100 text-orange-700 font-medium' : 'text-gray-400'}`}>
                                        {row.returnedKD}
                                    </span>
                                </td>
                                <td className="px-3 py-2 text-center text-xs">
                                    <span className={`inline-block min-w-[24px] px-1.5 py-0.5 rounded ${row.returnedTP > 0 ? 'bg-red-100 text-red-700 font-medium' : 'text-gray-400'}`}>
                                        {row.returnedTP}
                                    </span>
                                </td>
                                <td className="px-3 py-2 text-center text-xs">
                                    <span className={`inline-block min-w-[24px] px-1.5 py-0.5 rounded font-bold ${row.pending > 0 ? 'bg-gray-200 text-gray-800' : 'text-gray-400'}`}>
                                        {row.pending}
                                    </span>
                                </td>
                            </tr>
                        );
                    })}
                    {data.length === 0 && (
                        <tr><td colSpan={6} className="p-8 text-center text-gray-500 italic">Không có dữ liệu phù hợp.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};
