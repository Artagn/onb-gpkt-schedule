
import React from 'react';
import { LucideIcon } from 'lucide-react';
import { useCountUp } from '../../hooks/useCountUp';

interface StatCardProps {
    title: string;
    value: number;
    icon: LucideIcon;
    color: {
        bg: string;
        text: string;
    };
    subText?: string;
    onClick?: () => void;
    animate?: boolean; // Optional: disable animation if needed
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color, subText, onClick, animate = true }) => {
    // Animated counting effect - called unconditionally to adhere to React Rules of Hooks
    const animatedValue = useCountUp(value, { duration: 800 });
    const displayValue = animate ? animatedValue : value;

    return (
        <div onClick={onClick} className={`bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer relative overflow-hidden group`}>
            <div className={`absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity`}>
                <Icon className={`w-16 h-16 ${color.text}`} />
            </div>
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${color.bg}`}>
                    <Icon className={`w-6 h-6 ${color.text}`} />
                </div>
                <div>
                    <p className="text-xs font-bold uppercase text-gray-400 tracking-wider">{title}</p>
                    <h3 className="text-2xl font-bold text-gray-800">{displayValue.toLocaleString('vi-VN')}</h3>
                </div>
            </div>
            {subText && <p className="text-xs text-gray-400 mt-3 flex items-center pl-1">{subText}</p>}
        </div>
    );
};

export default StatCard;

