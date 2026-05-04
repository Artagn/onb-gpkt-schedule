
import React from 'react';
import { Award, Users, ClipboardCheck, CheckCircle2, X, Video } from 'lucide-react';
import { format } from 'date-fns';
import { ScheduleItem, Job, JobGroup, SubJob } from '../../types';

export const TaskModal = ({ selectedTask, setSelectedTask, actionNote, setActionNote, trainingMetrics, setTrainingMetrics, handleTaskAction, jobs }: any) => {
    if (!selectedTask) return null;
    const job = jobs.find((j: Job) => j.id === selectedTask.jobId);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md m-4 shadow-xl">
                <h3 className="text-lg font-bold mb-2 text-gray-800">{job?.name}</h3>
                <div className="text-sm text-gray-500 mb-4">
                    {format(new Date(selectedTask.date), 'dd/MM/yyyy')} - {selectedTask.shift}
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú / Lý do hủy</label>
                    <textarea
                        className="w-full border rounded p-2 text-sm"
                        rows={3}
                        value={actionNote}
                        onChange={(e: any) => setActionNote(e.target.value)}
                        placeholder="Nhập ghi chú..."
                    />
                </div>

                {/* TRAINING METRICS INPUTS */}
                {job?.group === JobGroup.Training && (
                    <div className="mb-4 bg-blue-50 p-3 rounded-lg border border-blue-100">
                        <h4 className="font-bold text-blue-800 text-sm mb-2 flex items-center">
                            <Award className="w-4 h-4 mr-1" /> Kết quả Đào tạo
                        </h4>
                        <div className="space-y-2">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center">
                                    <Users className="w-3 h-3 mr-1" /> Số lượng KH tham gia
                                </label>
                                <input
                                    type="number" min="0"
                                    className="w-full border rounded p-1.5 text-sm"
                                    value={trainingMetrics.participants || ''}
                                    onChange={(e: any) => setTrainingMetrics({ ...trainingMetrics, participants: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center">
                                        <ClipboardCheck className="w-3 h-3 mr-1" /> Lượng Khảo sát
                                    </label>
                                    <input
                                        type="number" min="0"
                                        className="w-full border rounded p-1.5 text-sm"
                                        value={trainingMetrics.surveys || ''}
                                        onChange={(e: any) => setTrainingMetrics({ ...trainingMetrics, surveys: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center">
                                        <Award className="w-3 h-3 mr-1" /> Biết sử dụng
                                    </label>
                                    <input
                                        type="number" min="0"
                                        className="w-full border rounded p-1.5 text-sm"
                                        value={trainingMetrics.capable || ''}
                                        onChange={(e: any) => setTrainingMetrics({ ...trainingMetrics, capable: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex flex-col gap-2">
                    <button
                        onClick={() => handleTaskAction('Completed')}
                        className="w-full bg-green-600 text-white py-2 rounded font-medium hover:bg-green-700 flex justify-center items-center"
                    >
                        <CheckCircle2 className="w-4 h-4 mr-2" /> Xác nhận Hoàn thành
                    </button>
                    <button
                        onClick={() => handleTaskAction('Cancelled')}
                        className="w-full bg-red-100 text-red-700 py-2 rounded font-medium hover:bg-red-200 flex justify-center items-center"
                    >
                        <X className="w-4 h-4 mr-2" /> Báo Hủy / Sự cố
                    </button>
                    <button
                        onClick={() => setSelectedTask(null)}
                        className="w-full border py-2 rounded font-medium hover:bg-gray-50 mt-2"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
};

export const EditRestModal = ({ editingRestItem, setEditingRestItem, handleSaveRestItem }: any) => {
    if (!editingRestItem) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md m-4 shadow-xl">
                <h3 className="text-lg font-bold mb-4">Sửa lịch nghỉ bù</h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ngày nghỉ</label>
                        <input
                            type="date"
                            className="w-full border rounded p-2"
                            value={format(new Date(editingRestItem.date), 'yyyy-MM-dd')}
                            onChange={(e) => {
                                if (e.target.value) {
                                    setEditingRestItem({ ...editingRestItem, date: new Date(e.target.value).toISOString() });
                                }
                            }}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                        <textarea
                            className="w-full border rounded p-2"
                            value={editingRestItem.note || ''}
                            onChange={(e) => setEditingRestItem({ ...editingRestItem, note: e.target.value })}
                        />
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                    <button
                        onClick={() => setEditingRestItem(null)}
                        className="px-4 py-2 border rounded hover:bg-gray-50"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={handleSaveRestItem}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Lưu
                    </button>
                </div>
            </div>
        </div>
    );
};

export const SubJobDetailModal = ({ viewingDetailItem, setViewingDetailItem, jobs, getSubJobs }: any) => {
    if (!viewingDetailItem) return null;
    const job = jobs.find((j: Job) => j.id === viewingDetailItem.jobId);
    const subs = getSubJobs(viewingDetailItem.jobId, new Date(viewingDetailItem.date), viewingDetailItem.shift);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setViewingDetailItem(null)}>
            <div className="bg-white rounded-lg p-6 w-full max-w-md m-4 shadow-xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-indigo-900">{job?.name}</h3>
                        <div className="text-sm text-gray-500 mt-1">
                            {format(new Date(viewingDetailItem.date), 'dd/MM/yyyy')} - {viewingDetailItem.shift}
                        </div>
                    </div>
                    <button onClick={() => setViewingDetailItem(null)} className="text-gray-400 hover:text-gray-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto pr-1">
                    {subs.length === 0 ? (
                        <div className="text-center py-8 text-gray-400 italic">
                            Chưa có hạng mục chi tiết cho buổi này.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {subs.map((sub: any) => (
                                <div key={sub.id} className="border border-indigo-50 rounded-lg p-3 bg-indigo-50/30">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap">
                                            {sub.startTime} - {sub.endTime}
                                        </span>
                                        {sub.product && (
                                            <span className="text-[10px] text-gray-500 border bg-white px-1.5 py-0.5 rounded">
                                                {sub.product}
                                            </span>
                                        )}
                                    </div>
                                    <div className="font-medium text-gray-800 text-sm mb-2">{sub.name}</div>
                                    {sub.link && (
                                        <a
                                            href={sub.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center text-xs text-blue-600 hover:text-blue-800 hover:underline gap-1.5 bg-blue-50 w-fit px-2 py-1 rounded border border-blue-100"
                                        >
                                            <Video className="w-3.5 h-3.5" />
                                            Tham gia họp (Meet)
                                        </a>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
