import React, { useState, useEffect } from 'react';
import { Loader2, Calendar as CalendarIcon, CalendarRange } from 'lucide-react';
import { format } from 'date-fns';
import PublicDailySchedule from './PublicDailySchedule';
import PublicWeeklySchedule from './PublicWeeklySchedule';
import { Job, SubJob } from '../../types';

interface Holiday {
    id: string;
    date: string;
    name: string;
}

interface WorkPeriod {
    id: string;
    startDate: string;
    endDate: string;
    days: Record<string, any>;
    title?: string;
}

interface ScheduleData {
    jobs: Partial<Job>[];
    subJobs: Partial<SubJob>[];
    holidays: Holiday[];
    workPeriods: WorkPeriod[];
}

const PublicScheduleContainer: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'daily' | 'weekly'>('daily');
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [selectedProducts, setSelectedProducts] = useState<string[]>(['AMIS Kế toán', 'MISA SME']);
    
    const [data, setData] = useState<ScheduleData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch data from Cloud Function
    useEffect(() => {
        const fetchScheduleData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // Routing through Firebase Hosting rewrite to enable native CDN Edge Caching
                const apiUrl = '/api/public-schedule';
                
                const response = await fetch(apiUrl);
                if (!response.ok) {
                    throw new Error('Failed to fetch schedule data');
                }
                const result = await response.json();
                
                if (result.success && result.data) {
                    setData(result.data);
                } else {
                    throw new Error('Invalid data format');
                }
            } catch (err) {
                console.error(err);
                setError('Không thể tải dữ liệu lịch. Vui lòng thử lại sau.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchScheduleData();
    }, []);

    // Check if a specific date is a holiday
    const getHolidayName = (date: Date): string | null => {
        if (!data || !data.holidays) return null;
        const dateStr = format(date, 'yyyy-MM-dd');
        const holiday = data.holidays.find(h => h.date === dateStr);
        return holiday ? holiday.name : null;
    };

    const handleProductToggle = (product: string) => {
        setSelectedProducts(prev => {
            if (prev.includes(product)) {
                // Đảm bảo chọn ít nhất 1 cái, nếu bỏ chọn cái cuối cùng thì bỏ qua
                if (prev.length === 1) return prev;
                return prev.filter(p => p !== product);
            }
            return [...prev, product];
        });
    };

    return (
        <div className="flex flex-col animate-in fade-in duration-500 w-full">
            {/* Tabs & Controls */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2 md:p-3 mb-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                
                {/* Tabs Switcher */}
                <div className="flex p-1 bg-gray-100/80 rounded-lg border border-gray-200/50">
                    <button
                        onClick={() => setActiveTab('weekly')}
                        className={`flex items-center gap-2 px-3 md:px-5 py-2 rounded-md text-sm font-semibold transition-all ${
                            activeTab === 'weekly' 
                                ? 'bg-white text-indigo-700 shadow-sm border border-indigo-100' 
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                        }`}
                    >
                        <CalendarRange className="w-4 h-4 md:w-5 md:h-5" />
                        Lịch Tuần
                    </button>
                    <button
                        onClick={() => setActiveTab('daily')}
                        className={`flex items-center gap-2 px-3 md:px-5 py-2 rounded-md text-sm font-semibold transition-all ${
                            activeTab === 'daily' 
                                ? 'bg-white text-emerald-700 shadow-sm border border-emerald-100' 
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                        }`}
                    >
                        <CalendarIcon className="w-4 h-4 md:w-5 md:h-5" />
                        Lịch Ngày
                    </button>
                </div>

                {/* Product Filters */}
                <div className="flex items-center gap-2 bg-gray-50/80 p-1.5 rounded-lg border border-gray-200/50 flex-wrap justify-center">
                    <button
                        onClick={() => handleProductToggle('AMIS Kế toán')}
                        className={`px-3 py-1.5 rounded-md text-xs md:text-sm font-medium transition-colors border ${
                            selectedProducts.includes('AMIS Kế toán')
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'
                        }`}
                    >
                        AMIS Kế toán
                    </button>
                    <button
                        onClick={() => handleProductToggle('MISA SME')}
                        className={`px-3 py-1.5 rounded-md text-xs md:text-sm font-medium transition-colors border ${
                            selectedProducts.includes('MISA SME')
                                ? 'bg-teal-50 text-teal-700 border-teal-200'
                                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'
                        }`}
                    >
                        MISA SME
                    </button>
                </div>
            </div>

            {/* Content Area */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-emerald-600">
                    <Loader2 className="w-8 h-8 animate-spin mb-4" />
                    <p className="font-medium">Đang tải lịch học...</p>
                </div>
            ) : error ? (
                <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-6 text-center">
                    <p className="font-medium">{error}</p>
                </div>
            ) : data && (
                <div className="mt-2">
                    {activeTab === 'daily' ? (
                        <PublicDailySchedule 
                            selectedDate={selectedDate}
                            setSelectedDate={setSelectedDate}
                            jobs={data.jobs} 
                            subJobs={data.subJobs} 
                            getHolidayName={getHolidayName}
                            selectedProducts={selectedProducts}
                        />
                    ) : (
                        <PublicWeeklySchedule 
                            selectedDate={selectedDate}
                            setSelectedDate={setSelectedDate}
                            jobs={data.jobs} 
                            subJobs={data.subJobs} 
                            getHolidayName={getHolidayName}
                            selectedProducts={selectedProducts}
                        />
                    )}
                </div>
            )}
        </div>
    );
};

export default PublicScheduleContainer;
