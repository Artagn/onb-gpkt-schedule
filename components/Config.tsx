
import React, { useRef, useState, useEffect } from 'react';
import { Save, Upload, RotateCcw, AlertTriangle, Download, Database } from 'lucide-react';
import { appConfigService } from '../services/appConfigService';
import { AppConfig } from '../types';
import toast from 'react-hot-toast';

// New Imports for Self-contained Logic
import { useData } from '../context/DataContext';
import { importDataToFirestore, auditService } from '../services/firestoreService';
import { auth } from '../services/firebaseConfig';

const Config: React.FC = () => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [appConfig, setAppConfig] = useState<AppConfig>({ id: 'default', autoScheduleCode: '123' });
    const [isLoading, setIsLoading] = useState(false);

    // Get Data from Context
    const {
        employees, jobs, subJobs, patterns, schedule,
        workPeriods, holidays, dailyAllocations: allocations, leaves,
        resetData
    } = useData();

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        const cfg = await appConfigService.get();
        if (cfg) setAppConfig(cfg);
    };

    const handleSaveConfig = async () => {
        setIsLoading(true);
        try {
            console.log("Saving Config:", appConfig);
            await appConfigService.save(appConfig);
            console.log("Config saved successfully");
            toast.success("Đã lưu cấu hình hệ thống!");
        } catch (error) {
            console.error("Config Save Error:", error);
            const msg = error instanceof Error ? error.message : 'Unknown error';
            toast.error(`Lỗi khi lưu cấu hình: ${msg}`);
        } finally {
            setIsLoading(false);
        }
    };

    // 1. Internal getAllData
    const getAllData = () => ({
        employees, jobs, subJobs, patterns, schedule, workPeriods, holidays, dailyAllocations: allocations, leaves
    });

    const handleExport = () => {
        const data = getAllData();
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const href = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = href;
        link.download = `onb_schedule_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // 2. Internal restoreData logic
    const handleRestoreData = async (data: any) => {
        try {
            await importDataToFirestore(data);
            // Audit Log
            if (auth.currentUser) {
                auditService.log(
                    'SYSTEM_RESTORE',
                    'SYSTEM',
                    'ALL',
                    { timestamp: new Date().toISOString() },
                    auth.currentUser.email || 'unknown'
                );
            }
            window.location.reload();
        } catch (error) {
            console.error("Restore failed", error);
            throw error;
        }
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                if (window.confirm("Cảnh báo: Hành động này sẽ XÓA TOÀN BỘ dữ liệu trên Cloud và thay thế bằng file backup này. Bạn có chắc chắn không?")) {
                    setIsLoading(true);
                    await handleRestoreData(json);
                    toast.success("Khôi phục dữ liệu thành công! Trang sẽ tải lại...");
                }
            } catch (error) {
                toast.error("File không hợp lệ hoặc lỗi khi khôi phục.");
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        };
        reader.readAsText(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleResetFactory = async () => {
        const confirmMsg = "CẢNH BÁO NGUY HIỂM!\n\nHành động này sẽ XÓA TOÀN BỘ dữ liệu trên Firestore Cloud và đưa về trạng thái mặc định.\n\nBạn có chắc chắn không?";
        if (window.confirm(confirmMsg)) {
            setIsLoading(true);
            try {
                await resetData(); // Use context resetData
                toast.success("Đã khôi phục cài đặt gốc. Trang sẽ tải lại...");
            } catch (e) {
                toast.error("Lỗi khi reset.");
            }
        }
    };

    return (
        <div className="p-6 bg-gray-50 h-full overflow-auto">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center">
                <Database className="mr-2 text-slate-600" /> Cấu hình & Dữ liệu
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">

                {/* 1. Backup & Restore */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-blue-100">
                    <h3 className="font-bold text-lg text-blue-900 mb-2 flex items-center">
                        <Save className="w-5 h-5 mr-2" /> Sao lưu & Khôi phục
                    </h3>
                    <p className="text-sm text-gray-600 mb-6">
                        Dữ liệu đã được đồng bộ an toàn trên Cloud (Firebase). Tuy nhiên, bạn vẫn nên sao lưu định kỳ (ví dụ: hàng tuần) để có thể khôi phục lại trạng thái cũ trong trường hợp thao tác sai hoặc xóa nhầm dữ liệu.
                    </p>

                    <div className="space-y-3">
                        <button onClick={handleExport} className="w-full flex items-center justify-center px-4 py-2.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 border border-blue-200 font-medium transition-colors text-sm">
                            <Download className="w-4 h-4 mr-2" /> Xuất dữ liệu (Backup)
                        </button>

                        <div className="relative">
                            <input
                                type="file"
                                accept=".json"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleImport}
                            />
                            <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center px-4 py-2.5 bg-white text-gray-700 rounded-lg hover:bg-gray-50 border border-gray-300 font-medium transition-colors text-sm">
                                <Upload className="w-4 h-4 mr-2" /> Nhập dữ liệu (Restore)
                            </button>
                        </div>
                    </div>
                </div>

                {/* 2. Dangerous Zone */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-red-100">
                    <h3 className="font-bold text-lg text-red-900 mb-2 flex items-center">
                        <AlertTriangle className="w-5 h-5 mr-2" /> Vùng nguy hiểm
                    </h3>
                    <p className="text-xs text-gray-600 mb-6">
                        Các hành động dưới đây không thể hoàn tác. Hãy cân nhắc kỹ trước khi thực hiện.
                    </p>

                    <button onClick={handleResetFactory} className="w-full flex items-center justify-center px-4 py-2.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 border border-red-200 font-medium transition-colors text-sm">
                        <RotateCcw className="w-4 h-4 mr-2" /> Khôi phục Dữ liệu mẫu (Reset)
                    </button>
                </div>

                {/* 3. Security Config */}
                <div className="col-span-1 md:col-span-2 bg-white p-6 rounded-lg shadow-sm border border-indigo-100">
                    <h3 className="font-bold text-lg text-indigo-900 mb-4 flex items-center">
                        <span>🔒</span> <span className="ml-2">Cấu hình Bảo mật</span>
                    </h3>
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 w-full">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Mã xác nhận Tự động xếp lịch</label>
                            <div className="text-xs text-gray-500 mb-2">Mã này dùng để xác thực trước khi chạy tính năng "Tự động xếp lịch" (tránh thao tác nhầm). Mặc định là: 123</div>
                            <input
                                type="text"
                                className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                                value={appConfig.autoScheduleCode}
                                onChange={e => setAppConfig({ ...appConfig, autoScheduleCode: e.target.value })}
                                placeholder="Nhập mã xác nhận..."
                            />
                        </div>
                        <button
                            onClick={handleSaveConfig}
                            disabled={isLoading}
                            className="px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 font-medium"
                        >
                            {isLoading ? 'Đang lưu...' : 'Lưu Cấu hình'}
                        </button>
                    </div>
                </div>

                {/* 4. System Info */}
                <div className="col-span-1 md:col-span-2 bg-slate-800 text-white p-6 rounded-lg shadow-sm">
                    <h3 className="font-bold text-lg mb-4">Thông tin hệ thống</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-slate-400">Lưu trữ:</span> Firebase Cloud Firestore
                        </div>
                        <div>
                            <span className="text-slate-400">Trạng thái đồng bộ:</span> <span className="text-emerald-400 font-bold">Realtime / Online</span>
                        </div>
                        <div className="col-span-2 text-xs text-slate-500 mt-2 border-t border-slate-700 pt-2">
                            Người thực hiện: <span className="text-slate-300">Nguyễn Văn Khải</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Config;
