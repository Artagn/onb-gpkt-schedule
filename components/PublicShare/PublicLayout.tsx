import React from 'react';

interface Props {
    children: React.ReactNode;
}

const PublicLayout: React.FC<Props> = ({ children }) => {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            {/* Minimal Header */}
            <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                        ONB
                    </div>
                    <div>
                        <h1 className="font-bold text-gray-800 leading-tight">MISA ONB</h1>
                        <p className="text-[10px] text-gray-500 font-medium">Lịch Đào Tạo Khách Hàng</p>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 p-2 md:p-6 mx-auto w-full">
                {children}
            </main>

            {/* Footer */}
            <footer className="py-4 text-center text-gray-400 text-xs mt-auto">
                <p>&copy; {new Date().getFullYear()} MISA JSC. Phát triển bởi ONB/GPKT.</p>
            </footer>
        </div>
    );
};

export default PublicLayout;
