/**
 * EvaluationErrorBoundary - Error boundary for Evaluation module
 * Catches render errors and displays fallback UI
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallbackMessage?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export default class EvaluationErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Evaluation Error:', error);
        console.error('Error Info:', errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-8 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                        <AlertTriangle className="w-8 h-8 text-red-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                        Có lỗi xảy ra
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                        {this.props.fallbackMessage || 'Không thể hiển thị nội dung. Vui lòng thử lại.'}
                    </p>
                    {this.state.error && (
                        <details className="mb-4 text-left bg-gray-50 p-3 rounded text-xs">
                            <summary className="cursor-pointer text-gray-500">Chi tiết lỗi</summary>
                            <pre className="mt-2 overflow-auto text-red-600">
                                {this.state.error.message}
                            </pre>
                        </details>
                    )}
                    <button
                        onClick={this.handleRetry}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Thử lại
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
