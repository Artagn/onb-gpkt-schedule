
import React, { useState, useEffect, useRef } from 'react';
import { GraduationCap, Users, ClipboardCheck, Award } from 'lucide-react';

interface Props {
    data: any[];
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

const AnimatedNumber: React.FC<{ value: number; decimals?: number }> = ({ value, decimals = 0 }) => {
    const animatedValue = useCountUp(value * Math.pow(10, decimals), 800);
    const displayValue = decimals > 0
        ? (animatedValue / Math.pow(10, decimals)).toFixed(decimals)
        : animatedValue;
    return <>{displayValue}</>;
};

export const TrainingSummaryCards: React.FC<Props> = ({ data }) => {
    const totalSessions = data.length;
    const totalParticipants = data.reduce((acc, cur) => acc + cur.participants, 0);
    const totalSurveys = data.reduce((acc, cur) => acc + (cur.surveys || 0), 0);
    const totalCapable = data.reduce((acc, cur) => acc + cur.capable, 0);
    const avgRatio = totalParticipants > 0 ? (totalCapable / totalParticipants) * 100 : 0;

    return (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-3 border border-purple-200 transform transition-all duration-300 hover:scale-105 hover:shadow-lg">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-purple-500 rounded-lg"><GraduationCap className="w-4 h-4 text-white" /></div>
                    <div>
                        <p className="text-xl font-bold text-purple-700"><AnimatedNumber value={totalSessions} /></p>
                        <p className="text-[10px] text-purple-600 font-medium">Buổi đào tạo</p>
                    </div>
                </div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3 border border-blue-200 transform transition-all duration-300 hover:scale-105 hover:shadow-lg">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-500 rounded-lg"><Users className="w-4 h-4 text-white" /></div>
                    <div>
                        <p className="text-xl font-bold text-blue-700"><AnimatedNumber value={totalParticipants} /></p>
                        <p className="text-[10px] text-blue-600 font-medium">Tham gia</p>
                    </div>
                </div>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-3 border border-orange-200 transform transition-all duration-300 hover:scale-105 hover:shadow-lg">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-orange-500 rounded-lg"><ClipboardCheck className="w-4 h-4 text-white" /></div>
                    <div>
                        <p className="text-xl font-bold text-orange-700"><AnimatedNumber value={totalSurveys} /></p>
                        <p className="text-[10px] text-orange-600 font-medium">Khảo sát</p>
                    </div>
                </div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-3 border border-green-200 transform transition-all duration-300 hover:scale-105 hover:shadow-lg">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-green-500 rounded-lg"><Award className="w-4 h-4 text-white" /></div>
                    <div>
                        <p className="text-xl font-bold text-green-700"><AnimatedNumber value={totalCapable} /></p>
                        <p className="text-[10px] text-green-600 font-medium">Biết sử dụng</p>
                    </div>
                </div>
            </div>
            <div className={`bg-gradient-to-br rounded-xl p-3 border transform transition-all duration-300 hover:scale-105 hover:shadow-lg ${avgRatio >= 80 ? 'from-emerald-50 to-emerald-100 border-emerald-200' : 'from-amber-50 to-amber-100 border-amber-200'}`}>
                <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${avgRatio >= 80 ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                        <Award className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <p className={`text-xl font-bold ${avgRatio >= 80 ? 'text-emerald-700' : 'text-amber-700'}`}>
                            <AnimatedNumber value={avgRatio} decimals={1} />%
                        </p>
                        <p className={`text-[10px] font-medium ${avgRatio >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>Tỷ lệ TB</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
