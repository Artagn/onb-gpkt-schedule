
import React, { useState, useMemo } from 'react';
import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface Props {
    data: any[];
    onBarClick?: (employeeId: string, employeeName: string) => void;
}

// Custom tooltip to show both values clearly
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length > 0) {
        // Access original data from the first payload item
        const originalData = payload[0]?.payload || {};
        const assigned = originalData.assignedPoints || 0;
        const actual = originalData.actualPoints || 0;
        const rate = assigned > 0 ? ((actual / assigned) * 100).toFixed(1) : '0';

        return (
            <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
                <p className="font-semibold text-gray-800 mb-2">{label}</p>
                <div className="flex items-center gap-2 text-sm">
                    <span className="w-3 h-3 rounded" style={{ backgroundColor: '#2563eb' }}></span>
                    <span className="text-gray-600">Thực tế:</span>
                    <span className="font-bold text-blue-600">{actual}</span>
                </div>
                <div className="flex items-center gap-2 text-sm mt-1">
                    <span className="w-3 h-3 rounded" style={{ backgroundColor: '#94a3b8' }}></span>
                    <span className="text-gray-600">Được giao:</span>
                    <span className="font-bold text-slate-600">{assigned}</span>
                </div>
                <div className="border-t mt-2 pt-2 text-sm">
                    <span className="text-gray-600">Tỷ lệ: </span>
                    <span className={`font-bold ${Number(rate) >= 100 ? 'text-green-600' : Number(rate) >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {rate}%
                    </span>
                </div>
            </div>
        );
    }
    return null;
};

export const PointsChart: React.FC<Props> = ({ data, onBarClick }) => {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    // Transform data: for merged bar, we show the larger value as background, smaller as foreground
    const chartData = useMemo(() => {
        return data.map(item => ({
            ...item,
            // Background bar = max of two values
            bgValue: Math.max(item.assignedPoints, item.actualPoints),
            // Foreground bar = min of two values
            fgValue: Math.min(item.assignedPoints, item.actualPoints),
            // Which value is higher? Used for coloring
            actualIsHigher: item.actualPoints >= item.assignedPoints
        }));
    }, [data]);

    const handleBarClick = (data: any) => {
        if (onBarClick && data?.payload) {
            onBarClick(data.payload.id, data.payload.name);
        }
    };

    // Gradient colors
    const blueGradient = 'url(#blueGradient)';
    const grayGradient = 'url(#grayGradient)';

    return (
        <div className="w-full h-[400px] mb-6 overflow-x-auto">
            <div className="min-w-[800px] h-full">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                        data={chartData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        barGap={-40}
                        onMouseLeave={() => setActiveIndex(null)}
                    >
                        {/* Gradient Definitions */}
                        <defs>
                            <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#3b82f6" />
                                <stop offset="100%" stopColor="#1d4ed8" />
                            </linearGradient>
                            <linearGradient id="grayGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#cbd5e1" />
                                <stop offset="100%" stopColor="#94a3b8" />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={70} />
                        <YAxis />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }} />
                        <Legend
                            content={() => (
                                <div className="flex justify-center gap-6 mt-2 text-sm">
                                    <div className="flex items-center gap-2">
                                        <span className="w-3 h-3 rounded" style={{ background: 'linear-gradient(to bottom, #3b82f6, #1d4ed8)' }}></span>
                                        <span className="text-gray-600">Điểm thực tế (KPI)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-3 h-3 rounded" style={{ background: 'linear-gradient(to bottom, #cbd5e1, #94a3b8)' }}></span>
                                        <span className="text-gray-600">Điểm được giao</span>
                                    </div>
                                </div>
                            )}
                        />
                        {/* Background bar - the larger value */}
                        <Bar
                            dataKey="bgValue"
                            radius={[4, 4, 0, 0]}
                            isAnimationActive={true}
                            barSize={30}
                            onClick={handleBarClick}
                            style={{ cursor: onBarClick ? 'pointer' : 'default' }}
                        >
                            {chartData.map((entry, index) => (
                                <Cell
                                    key={`bg-${index}`}
                                    fill={entry.actualIsHigher ? blueGradient : grayGradient}
                                    opacity={activeIndex === null || activeIndex === index ? 1 : 0.3}
                                    onMouseEnter={() => setActiveIndex(index)}
                                />
                            ))}
                        </Bar>
                        {/* Foreground bar - the smaller value, overlaid */}
                        <Bar
                            dataKey="fgValue"
                            radius={[4, 4, 0, 0]}
                            isAnimationActive={true}
                            barSize={30}
                            onClick={handleBarClick}
                            style={{ cursor: onBarClick ? 'pointer' : 'default' }}
                        >
                            {chartData.map((entry, index) => (
                                <Cell
                                    key={`fg-${index}`}
                                    fill={entry.actualIsHigher ? grayGradient : blueGradient}
                                    opacity={activeIndex === null || activeIndex === index ? 1 : 0.3}
                                    onMouseEnter={() => setActiveIndex(index)}
                                />
                            ))}
                        </Bar>
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
