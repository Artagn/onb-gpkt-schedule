
import React, { useState, useEffect, useRef } from 'react';
import { Users, Target, CheckCircle2, TrendingUp } from 'lucide-react';

interface Props {
    stats: {
        totalEmployees: number;
        totalAssigned: string;
        totalActual: string;
        avgRate: string;
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

            // Easing function for smooth deceleration
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

// Animated number display component
const AnimatedNumber: React.FC<{ value: number | string; decimals?: number }> = ({ value, decimals = 0 }) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    const animatedValue = useCountUp(numValue * Math.pow(10, decimals), 800);
    const displayValue = decimals > 0
        ? (animatedValue / Math.pow(10, decimals)).toFixed(decimals)
        : animatedValue;
    return <>{displayValue}</>;
};

export const PointsSummaryCards: React.FC<Props> = ({ stats }) => {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200 transform transition-all duration-300 hover:scale-105 hover:shadow-lg">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500 rounded-lg"><Users className="w-5 h-5 text-white" /></div>
                    <div>
                        <p className="text-2xl font-bold text-blue-700">
                            <AnimatedNumber value={stats.totalEmployees} />
                        </p>
                        <p className="text-xs text-blue-600 font-medium">Nhân viên</p>
                    </div>
                </div>
            </div>
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200 transform transition-all duration-300 hover:scale-105 hover:shadow-lg">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-500 rounded-lg"><Target className="w-5 h-5 text-white" /></div>
                    <div>
                        <p className="text-2xl font-bold text-slate-700">
                            <AnimatedNumber value={stats.totalAssigned} decimals={1} />
                        </p>
                        <p className="text-xs text-slate-600 font-medium">Điểm được giao</p>
                    </div>
                </div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200 transform transition-all duration-300 hover:scale-105 hover:shadow-lg">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500 rounded-lg"><CheckCircle2 className="w-5 h-5 text-white" /></div>
                    <div>
                        <p className="text-2xl font-bold text-green-700">
                            <AnimatedNumber value={stats.totalActual} decimals={1} />
                        </p>
                        <p className="text-xs text-green-600 font-medium">Điểm thực tế</p>
                    </div>
                </div>
            </div>
            <div className={`bg-gradient-to-br rounded-xl p-4 border transform transition-all duration-300 hover:scale-105 hover:shadow-lg ${parseFloat(stats.avgRate) >= 80 ? 'from-emerald-50 to-emerald-100 border-emerald-200' : 'from-amber-50 to-amber-100 border-amber-200'}`}>
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${parseFloat(stats.avgRate) >= 80 ? 'bg-emerald-500' : 'bg-amber-500'}`}><TrendingUp className="w-5 h-5 text-white" /></div>
                    <div>
                        <p className={`text-2xl font-bold ${parseFloat(stats.avgRate) >= 80 ? 'text-emerald-700' : 'text-amber-700'}`}>
                            <AnimatedNumber value={stats.avgRate} decimals={1} />%
                        </p>
                        <p className={`text-xs font-medium ${parseFloat(stats.avgRate) >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>Tỷ lệ trung bình</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
