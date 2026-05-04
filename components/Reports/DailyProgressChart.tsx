
import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface Props {
    data: any[];
    selectedEmployeeId?: string | null;
    onBarClick?: (employeeId: string | null) => void;
}

// Custom Tooltip with colored indicators
const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    // Get data from first payload item
    const data = payload[0]?.payload;
    if (!data) return null;

    return (
        <div className="bg-white rounded-lg shadow-lg border border-gray-100 p-3 min-w-[180px]">
            <div className="font-bold text-gray-800 text-sm mb-2 pb-2 border-b border-gray-100">
                {data.name}
            </div>
            <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-sm bg-blue-500"></span>
                        <span className="text-gray-600">Chia mới</span>
                    </span>
                    <span className="font-bold text-blue-600">{data.newAssigned}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-sm bg-green-500"></span>
                        <span className="text-gray-600">Hoàn thành</span>
                    </span>
                    <span className="font-bold text-green-600">{data.completed}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-sm bg-orange-500"></span>
                        <span className="text-gray-600">Trả KD</span>
                    </span>
                    <span className="font-bold text-orange-600">{data.returnedKD}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-sm bg-red-500"></span>
                        <span className="text-gray-600">Trả TP</span>
                    </span>
                    <span className="font-bold text-red-600">{data.returnedTP}</span>
                </div>
            </div>
        </div>
    );
};

export const DailyProgressChart: React.FC<Props> = ({ data, selectedEmployeeId, onBarClick }) => {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    const handleBarClick = (index: number) => {
        if (onBarClick) {
            const employee = data[index];
            // Toggle selection: if already selected, deselect
            if (selectedEmployeeId === employee.id) {
                onBarClick(null);
            } else {
                onBarClick(employee.id);
            }
        }
    };

    // Find selected index for visual highlight
    const selectedIndex = selectedEmployeeId
        ? data.findIndex(d => d.id === selectedEmployeeId)
        : null;

    return (
        <div className="w-full h-[400px] mb-8 overflow-x-auto">
            <div className="min-w-[800px] h-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        onMouseLeave={() => setActiveIndex(null)}
                    >
                        {/* Gradient Definitions */}
                        <defs>
                            <linearGradient id="blueGradientDaily" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#60a5fa" />
                                <stop offset="100%" stopColor="#3b82f6" />
                            </linearGradient>
                            <linearGradient id="greenGradientDaily" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#4ade80" />
                                <stop offset="100%" stopColor="#22c55e" />
                            </linearGradient>
                            <linearGradient id="orangeGradientDaily" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#fb923c" />
                                <stop offset="100%" stopColor="#f97316" />
                            </linearGradient>
                            <linearGradient id="redGradientDaily" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#f87171" />
                                <stop offset="100%" stopColor="#ef4444" />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={70} />
                        <YAxis />
                        <Tooltip
                            content={<CustomTooltip />}
                            cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                        />

                        <Legend />
                        <Bar
                            dataKey="newAssigned"
                            stackId="a"
                            fill="url(#blueGradientDaily)"
                            name="Chia mới"
                            radius={[0, 0, 0, 0]}
                            style={{ cursor: onBarClick ? 'pointer' : 'default' }}
                        >
                            {data.map((_, index) => (
                                <Cell
                                    key={`new-${index}`}
                                    opacity={selectedIndex !== null ? (selectedIndex === index ? 1 : 0.3) : (activeIndex === null || activeIndex === index ? 1 : 0.3)}
                                    onMouseEnter={() => setActiveIndex(index)}
                                    onClick={() => handleBarClick(index)}
                                />
                            ))}
                        </Bar>
                        <Bar
                            dataKey="completed"
                            stackId="a"
                            fill="url(#greenGradientDaily)"
                            name="Hoàn thành"
                            radius={[0, 0, 0, 0]}
                            style={{ cursor: onBarClick ? 'pointer' : 'default' }}
                        >
                            {data.map((_, index) => (
                                <Cell
                                    key={`completed-${index}`}
                                    opacity={selectedIndex !== null ? (selectedIndex === index ? 1 : 0.3) : (activeIndex === null || activeIndex === index ? 1 : 0.3)}
                                    onMouseEnter={() => setActiveIndex(index)}
                                    onClick={() => handleBarClick(index)}
                                />
                            ))}
                        </Bar>
                        <Bar
                            dataKey="returnedKD"
                            stackId="a"
                            fill="url(#orangeGradientDaily)"
                            name="Trả KD"
                            radius={[0, 0, 0, 0]}
                            style={{ cursor: onBarClick ? 'pointer' : 'default' }}
                        >
                            {data.map((_, index) => (
                                <Cell
                                    key={`kd-${index}`}
                                    opacity={selectedIndex !== null ? (selectedIndex === index ? 1 : 0.3) : (activeIndex === null || activeIndex === index ? 1 : 0.3)}
                                    onMouseEnter={() => setActiveIndex(index)}
                                    onClick={() => handleBarClick(index)}
                                />
                            ))}
                        </Bar>
                        <Bar
                            dataKey="returnedTP"
                            stackId="a"
                            fill="url(#redGradientDaily)"
                            name="Trả TP"
                            radius={[4, 4, 0, 0]}
                            style={{ cursor: onBarClick ? 'pointer' : 'default' }}
                        >
                            {data.map((_, index) => (
                                <Cell
                                    key={`tp-${index}`}
                                    opacity={selectedIndex !== null ? (selectedIndex === index ? 1 : 0.3) : (activeIndex === null || activeIndex === index ? 1 : 0.3)}
                                    onMouseEnter={() => setActiveIndex(index)}
                                    onClick={() => handleBarClick(index)}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
