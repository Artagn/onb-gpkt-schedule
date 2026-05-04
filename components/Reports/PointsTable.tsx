
import React from 'react';

interface Props {
    data: any[];
}

// Ranking badge component
const RankBadge: React.FC<{ rank: number }> = ({ rank }) => {
    if (rank === 1) return <span className="text-lg" title="Hạng 1">🥇</span>;
    if (rank === 2) return <span className="text-lg" title="Hạng 2">🥈</span>;
    if (rank === 3) return <span className="text-lg" title="Hạng 3">🥉</span>;
    return <span className="text-xs text-gray-400 font-medium w-6 text-center">{rank}</span>;
};

export const PointsTable: React.FC<Props> = ({ data }) => {
    return (
        <div className="overflow-auto border rounded-lg">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 sticky top-0">
                    <tr>
                        <th className="px-2 py-2 text-center font-bold text-[11px] text-gray-500 uppercase tracking-wider w-12">#</th>
                        <th className="px-3 py-2 text-left font-bold text-[11px] text-gray-500 uppercase tracking-wider">Nhân viên</th>
                        <th className="px-3 py-2 text-center font-bold text-[11px] text-gray-500 uppercase tracking-wider">Tổng ca</th>
                        <th className="px-3 py-2 text-center font-bold text-[11px] uppercase tracking-wider text-slate-600">Điểm được giao</th>
                        <th className="px-3 py-2 text-center font-bold text-[11px] uppercase tracking-wider text-blue-600">Điểm thực tế</th>
                        <th className="px-3 py-2 text-center font-bold text-[11px] text-gray-500 uppercase tracking-wider">Tỷ lệ</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {data.map((row, idx) => (
                        <tr
                            key={row.id}
                            className={`transition-all duration-200 ${idx < 3 ? 'bg-gradient-to-r from-amber-50/50 to-transparent' : ''} hover:bg-blue-50`}
                        >
                            <td className="px-2 py-2 text-center">
                                <RankBadge rank={idx + 1} />
                            </td>
                            <td className="px-3 py-2 font-medium text-gray-900 text-xs">
                                {row.name}
                                {idx === 0 && <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold">Top 1</span>}
                            </td>
                            <td className="px-3 py-2 text-center text-xs">
                                <span className={`inline-block min-w-[24px] px-1.5 py-0.5 rounded ${row.taskCount > 0 ? 'bg-gray-100 text-gray-700 font-medium' : 'text-gray-400'}`}>
                                    {row.taskCount}
                                </span>
                            </td>
                            <td className="px-3 py-2 text-center text-xs">
                                <span className={`inline-block min-w-[32px] px-1.5 py-0.5 rounded ${row.assignedPoints > 0 ? 'bg-slate-100 text-slate-700 font-bold' : 'text-gray-400'}`}>
                                    {row.assignedPoints}
                                </span>
                            </td>
                            <td className="px-3 py-2 text-center text-xs">
                                <span className={`inline-block min-w-[32px] px-1.5 py-0.5 rounded ${row.actualPoints > 0 ? 'bg-blue-100 text-blue-700 font-bold' : 'text-gray-400'}`}>
                                    {row.actualPoints}
                                </span>
                            </td>
                            <td className="px-3 py-2 text-center">
                                <span className={`inline-block min-w-[36px] px-2 py-0.5 rounded text-[10px] font-bold ${row.rate >= 100 ? 'bg-green-100 text-green-800' : row.rate >= 80 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                                    {row.rate}%
                                </span>
                            </td>
                        </tr>
                    ))}
                    {data.length === 0 && (
                        <tr><td colSpan={6} className="p-8 text-center text-gray-500 italic">Không có dữ liệu phù hợp.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};
