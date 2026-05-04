
import React, { useState } from 'react';
import { auth, googleProvider } from '../services/firebaseConfig';
import { signInWithPopup } from 'firebase/auth';
import { LogIn, ShieldCheck, AlertCircle } from 'lucide-react';

interface Props {
    onLoginSuccess: (user: any) => void;
}

const Login: React.FC<Props> = ({ onLoginSuccess }) => {
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError('');
        try {
            const result = await signInWithPopup(auth, googleProvider);
            onLoginSuccess(result.user);
        } catch (err: any) {
            console.error("Login Error:", err);
            if (err.code === 'auth/api-key-not-valid') {
                setError("Chưa cấu hình Firebase API Key. Vui lòng liên hệ quản trị viên.");
            } else if (err.code === 'auth/popup-closed-by-user') {
                setError("Bạn đã đóng cửa sổ đăng nhập.");
            } else if (err.code === 'auth/unauthorized-domain') {
                setError(`Domain "${window.location.hostname}" chưa được cấp quyền. Hãy thêm nó vào Firebase Console > Auth > Settings.`);
            } else {
                setError("Đăng nhập thất bại: " + err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="bg-slate-900 p-8 text-center">
                    <div className="bg-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <ShieldCheck className="text-white w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">ONB GPKT Schedule</h1>
                    <p className="text-blue-200 text-sm">Hệ thống quản lý lịch & KPI</p>
                </div>

                <div className="p-8">
                    <div className="text-center mb-6">
                        <h2 className="text-xl font-bold text-gray-800">Đăng nhập</h2>
                        <p className="text-gray-500 text-sm mt-1">Vui lòng đăng nhập bằng tài khoản Google để tiếp tục</p>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-sm text-red-700 break-words">
                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="space-y-3">
                        <button
                            onClick={handleGoogleLogin}
                            disabled={loading}
                            className={`w-full flex items-center justify-center gap-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-3 px-4 rounded-lg transition-all shadow-sm ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {loading ? (
                                <span className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></span>
                            ) : (
                                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                            )}
                            <span>{loading ? 'Đang kết nối...' : 'Tiếp tục với Google'}</span>
                        </button>
                    </div>

                    <div className="mt-6 text-center text-xs text-gray-400">
                        © 2026 ONB GPKT
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
