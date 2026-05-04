import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * Global Error Boundary - Catches unhandled errors across the entire app
 * Prevents white screen of death and provides user-friendly error recovery
 * @version 3.9.15
 */
export class GlobalErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
        // TODO: Send to error tracking service (e.g., Sentry)
    }

    private handleReload = () => {
        window.location.reload();
    };

    private handleGoHome = () => {
        window.location.href = '/';
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                    <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-3xl">💥</span>
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Đã có lỗi xảy ra!</h2>
                        <p className="text-gray-600 mb-6 text-sm">
                            Ứng dụng gặp sự cố không mong muốn. Vui lòng tải lại trang hoặc quay về trang chủ.
                        </p>
                        {process.env.NODE_ENV !== 'production' && this.state.error && (
                            <pre className="bg-gray-100 p-3 rounded text-xs text-left mb-4 overflow-auto max-h-40 border border-gray-200">
                                {this.state.error.toString()}
                                {'\n\n'}
                                {this.state.error.stack}
                            </pre>
                        )}
                        <div className="flex gap-3">
                            <button
                                onClick={this.handleGoHome}
                                className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                            >
                                Về trang chủ
                            </button>
                            <button
                                onClick={this.handleReload}
                                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                            >
                                Tải lại trang
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default GlobalErrorBoundary;
