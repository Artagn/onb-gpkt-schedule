
import React, { useState, useEffect, useRef } from 'react';
import { Users, FileText, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

interface Props {
    stats: {
        totalEmployees: number;
        totalNewAssigned: number;
        totalCompleted: number;
        totalReturnedKD: number;
        totalReturnedTP: number;
        totalPending: number;
    };
}

// Count-up animation hook
const useCountUp = (end: number, duration: number = 800) => {
    const [count, setCount] = useState(0);
    const countRef = useRef(0);
    const startTimeRef = useRef<number | null>(null);

    useEffect(() => {
        countRef.current = 0;
        startTimeRef.current = null;

        const animate = (timestamp: number) => {
            if (!startTimeRef.current) startTimeRef.current = timestamp;
            const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(easeOut * end);

            if (current !== countRef.current) {
                countRef.current = current;
                setCount(current);
            }

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                setCount(end);
            }
        };

        requestAnimationFrame(animate);
    }, [end, duration]);

    return count;
};

const AnimatedNumber: React.FC<{ value: number }> = ({ value }) => {
    const animatedValue = useCountUp(value, 800);
    return <>{animatedValue}</>;
};

export const DailySummaryCards: React.FC<Props> = ({ stats }) => {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3 border border-blue-200 transform transition-all duration-300 hover:scale-105 hover:shadow-lg">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-500 rounded-lg"><FileText className="w-4 h-4 text-white" /></div>
                    <div>
                        <p className="text-xl font-bold text-blue-700"><AnimatedNumber value={stats.totalNewAssigned} /></p>
                        <p className="text-[10px] text-blue-600 font-medium">Chia mới</p>
                    </div>
                </div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-3 border border-green-200 transform transition-all duration-300 hover:scale-105 hover:shadow-lg">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-green-500 rounded-lg"><CheckCircle2 className="w-4 h-4 text-white" /></div>
                    <div>
                        <p className="text-xl font-bold text-green-700"><AnimatedNumber value={stats.totalCompleted} /></p>
                        <p className="text-[10px] text-green-600 font-medium">Hoàn thành</p>
                    </div>
                </div>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-3 border border-orange-200 transform transition-all duration-300 hover:scale-105 hover:shadow-lg">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-orange-500 rounded-lg"><AlertTriangle className="w-4 h-4 text-white" /></div>
                    <div>
                        <p className="text-xl font-bold text-orange-700"><AnimatedNumber value={stats.totalReturnedKD} /></p>
                        <p className="text-[10px] text-orange-600 font-medium">Trả KD</p>
                    </div>
                </div>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-3 border border-red-200 transform transition-all duration-300 hover:scale-105 hover:shadow-lg">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-red-500 rounded-lg"><AlertTriangle className="w-4 h-4 text-white" /></div>
                    <div>
                        <p className="text-xl font-bold text-red-700"><AnimatedNumber value={stats.totalReturnedTP} /></p>
                        <p className="text-[10px] text-red-600 font-medium">Trả TP</p>
                    </div>
                </div>
            </div>
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-3 border border-slate-200 transform transition-all duration-300 hover:scale-105 hover:shadow-lg">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-slate-500 rounded-lg"><Clock className="w-4 h-4 text-white" /></div>
                    <div>
                        <p className="text-xl font-bold text-slate-700"><AnimatedNumber value={stats.totalPending} /></p>
                        <p className="text-[10px] text-slate-600 font-medium">Tồn đọng</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
