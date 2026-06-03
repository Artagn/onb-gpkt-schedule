
import React, { useState } from 'react';
import { WorkPeriod, Holiday, WorkShiftConfig } from '../types';
import { Plus, Trash2, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

import { useData } from '../context/DataContext';
import { useWorkPeriodMutations } from '../hooks/useWorkPeriodsQuery';
import { useHolidayMutations } from '../hooks/useHolidaysQuery';
import EmptyState from './common/EmptyState';

interface Props {
    // No data props needed
}

const WorkCalendarConfig: React.FC<Props> = () => {
    const { workPeriods, holidays } = useData();
    const wpMutations = useWorkPeriodMutations();
    const holidayMutations = useHolidayMutations();

    const [activeTab, setActiveTab] = useState<'periods' | 'holidays'>('periods');

    // --- Holiday Logic ---
    const [newHoliday, setNewHoliday] = useState({ date: '', name: '' });

    const handleAddHoliday = async () => {
        if (!newHoliday.date || !newHoliday.name) return toast.error("Vui lòng nhập đầy đủ ngày và tên lễ");
        const holiday: Holiday = { id: Date.now().toString(), ...newHoliday };
        holidayMutations.save.mutate(holiday);
        setNewHoliday({ date: '', name: '' });
    };

    const handleDeleteHoliday = async (id: string) => {
        holidayMutations.remove.mutate(id);
    };

    // --- Period Logic ---
    const [editingPeriod, setEditingPeriod] = useState<WorkPeriod | null>(null);

    const handleSavePeriod = async () => {
        if (!editingPeriod) return;
        wpMutations.save.mutate(editingPeriod);
        setEditingPeriod(null);
    };

    const handleDeletePeriod = async (id: string) => {
        if (window.confirm("Bạn có chắc chắn muốn xóa lịch làm việc này?")) {
            wpMutations.remove.mutate(id);
        }
    };

    const createNewPeriod = () => {
        const emptyConfig: WorkShiftConfig = { morning: true, afternoon: true, evening: true };
        const newPeriod: WorkPeriod = {
            id: `wp_${Date.now()}`,
            name: 'Lịch mới',
            startDate: '',
            endDate: '',
            days: {
                0: { ...emptyConfig }, 1: { ...emptyConfig }, 2: { ...emptyConfig },
                3: { ...emptyConfig }, 4: { ...emptyConfig }, 5: { ...emptyConfig },
                6: { morning: false, afternoon: false, evening: false }
            }
        };
        setEditingPeriod(newPeriod);
    };

    const toggleShift = (dayIndex: number, shift: keyof WorkShiftConfig) => {
        if (!editingPeriod) return;
        setEditingPeriod(prev => {
            if (!prev) return null;
            return {
                ...prev,
                days: {
                    ...prev.days,
                    [dayIndex]: {
                        ...prev.days[dayIndex as keyof typeof prev.days],
                        [shift]: !prev.days[dayIndex as keyof typeof prev.days][shift]
                    }
                }
            };
        });
    };

    const dayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];

    return (
        <div className="p-6 bg-white rounded-lg shadow h-full flex flex-col">
            <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center">
                <Calendar className="mr-2" /> Cấu hình Lịch làm việc Năm
            </h2>

            <div className="flex border-b mb-6">
                <button
                    className={`px-4 py-2 font-medium ${activeTab === 'periods' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
                    onClick={() => setActiveTab('periods')}
                >
                    Khoảng thời gian làm việc
                </button>
                <button
                    className={`px-4 py-2 font-medium ${activeTab === 'holidays' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
                    onClick={() => setActiveTab('holidays')}
                >
                    Danh sách Ngày nghỉ lễ
                </button>
            </div>

            {/* --- WORK PERIODS TAB --- */}
            {activeTab === 'periods' && (
                <div className="flex-1 overflow-auto">
                    {!editingPeriod ? (
                        <>
                            <div className="mb-4">
                                <button onClick={createNewPeriod} className="btn-primary">
                                    <Plus className="w-4 h-4 mr-2" /> Thêm khoảng thời gian
                                </button>
                            </div>
                            {workPeriods.length === 0 ? (
                                <EmptyState
                                    title="Chưa có khoảng thời gian làm việc nào."
                                    description="Vui lòng thêm khoảng thời gian mới để thiết lập lịch làm việc."
                                    action={{
                                        label: "Thêm khoảng thời gian",
                                        onClick: createNewPeriod
                                    }}
                                />
                            ) : (
                                <div className="grid gap-4">
                                    {workPeriods.map(period => (
                                        <div key={period.id} className="border rounded p-4 bg-gray-50 hover:bg-white hover:shadow transition-shadow">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h3 className="font-bold text-lg text-blue-800">{period.name}</h3>
                                                    <p className="text-sm text-gray-600">
                                                        {period.startDate ? format(parseISO(period.startDate), 'dd/MM/yyyy') : '...'} - {period.endDate ? format(parseISO(period.endDate), 'dd/MM/yyyy') : '...'}
                                                    </p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => setEditingPeriod(period)} className="text-blue-600 hover:underline text-sm">Sửa</button>
                                                    <button onClick={() => handleDeletePeriod(period.id)} className="text-red-600 hover:underline text-sm">Xóa</button>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-7 gap-1 text-center">
                                                {dayNames.map((day, idx) => {
                                                    const conf = period.days[idx as keyof typeof period.days];
                                                    const isActive = conf.morning || conf.afternoon || conf.evening;
                                                    return (
                                                        <div key={idx} className={`text-xs p-1 rounded ${isActive ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-400'}`}>
                                                            <div className="font-bold mb-1">{day}</div>
                                                            <div>{conf.morning ? 'S' : '-'} {conf.afternoon ? 'C' : '-'} {conf.evening ? 'T' : '-'}</div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="bg-gray-50 p-6 rounded border">
                            <h3 className="font-bold text-lg mb-4">{editingPeriod.id.startsWith('wp_') ? 'Thêm mới' : 'Chỉnh sửa'} Lịch</h3>

                            <div className="grid grid-cols-3 gap-4 mb-6">
                                <div className="col-span-3">
                                    <label className="block text-sm font-medium mb-1">Tên mô tả</label>
                                    <input className="w-full border p-2 rounded" value={editingPeriod.name} onChange={e => setEditingPeriod({ ...editingPeriod, name: e.target.value })} placeholder="VD: Mùa thấp điểm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Từ ngày</label>
                                    <input type="date" className="w-full border p-2 rounded" value={editingPeriod.startDate} onChange={e => setEditingPeriod({ ...editingPeriod, startDate: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Đến ngày</label>
                                    <input type="date" className="w-full border p-2 rounded" value={editingPeriod.endDate} onChange={e => setEditingPeriod({ ...editingPeriod, endDate: e.target.value })} />
                                </div>
                            </div>

                            <h4 className="font-bold text-sm mb-2 text-gray-700">Cấu hình chi tiết các thứ trong tuần</h4>
                            <div className="overflow-x-auto">
                                <table className="w-full bg-white border">
                                    <thead>
                                        <tr className="bg-gray-100 border-b">
                                            <th className="p-1.5 text-left text-xs">Thứ</th>
                                            <th className="p-1.5 text-center text-xs">Sáng</th>
                                            <th className="p-1.5 text-center text-xs">Chiều</th>
                                            <th className="p-1.5 text-center text-xs">Tối</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dayNames.map((day, idx) => (
                                            <tr key={idx} className="border-b">
                                                <td className="p-1.5 font-medium text-xs">{day}</td>
                                                <td className="p-1.5 text-center">
                                                    <input type="checkbox" className="w-4 h-4"
                                                        checked={editingPeriod.days[idx as keyof typeof editingPeriod.days].morning}
                                                        onChange={() => toggleShift(idx, 'morning')}
                                                    />
                                                </td>
                                                <td className="p-1.5 text-center">
                                                    <input type="checkbox" className="w-4 h-4"
                                                        checked={editingPeriod.days[idx as keyof typeof editingPeriod.days].afternoon}
                                                        onChange={() => toggleShift(idx, 'afternoon')}
                                                    />
                                                </td>
                                                <td className="p-1.5 text-center">
                                                    <input type="checkbox" className="w-4 h-4"
                                                        checked={editingPeriod.days[idx as keyof typeof editingPeriod.days].evening}
                                                        onChange={() => toggleShift(idx, 'evening')}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button onClick={() => setEditingPeriod(null)} className="btn-secondary">Hủy</button>
                                <button onClick={handleSavePeriod} className="btn-primary">Lưu cấu hình</button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* --- HOLIDAYS TAB --- */}
            {activeTab === 'holidays' && (
                <div className="flex-1 overflow-auto">
                    <div className="mb-4 flex gap-2">
                        <input type="date" className="border rounded p-2" value={newHoliday.date} onChange={e => setNewHoliday({ ...newHoliday, date: e.target.value })} />
                        <input type="text" className="border rounded p-2 flex-1" placeholder="Tên ngày lễ (VD: Giỗ tổ Hùng Vương)" value={newHoliday.name} onChange={e => setNewHoliday({ ...newHoliday, name: e.target.value })} />
                        <button onClick={handleAddHoliday} className="btn-success">
                            <Plus className="w-4 h-4" /> Thêm
                        </button>
                    </div>

                    <table className="w-full border-collapse">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="border p-2 text-left text-xs font-bold text-gray-600">Ngày</th>
                                <th className="border p-2 text-left text-xs font-bold text-gray-600">Tên ngày lễ</th>
                                <th className="border p-2 text-center w-20 text-xs font-bold text-gray-600">Xóa</th>
                            </tr>
                        </thead>
                        <tbody>
                            {holidays.length === 0 ? (
                                <tr>
                                    <EmptyState colSpan={3} size="sm" title="Chưa có ngày lễ nào." />
                                </tr>
                            ) : (
                                holidays.sort((a, b) => a.date.localeCompare(b.date)).map(h => (
                                    <tr key={h.id} className="hover:bg-gray-50">
                                        <td className="border p-2 text-xs">{format(parseISO(h.date), 'dd/MM/yyyy')}</td>
                                        <td className="border p-2 font-medium text-xs">{h.name}</td>
                                        <td className="border p-2 text-center">
                                            <button onClick={() => handleDeleteHoliday(h.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-3.5 h-3.5" /></button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default WorkCalendarConfig;
