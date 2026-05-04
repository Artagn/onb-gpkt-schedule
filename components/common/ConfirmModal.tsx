/**
 * ConfirmModal - Reusable confirmation modal
 * Replaces browser's native confirm() with a styled modal
 */

import React from 'react';
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

export type ConfirmType = 'warning' | 'danger' | 'info' | 'success';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: ConfirmType;
    onConfirm: () => void;
    onCancel: () => void;
}

const TYPE_CONFIG = {
    warning: {
        icon: AlertTriangle,
        iconColor: 'text-yellow-500',
        bgColor: 'bg-yellow-50',
        buttonColor: 'bg-yellow-600 hover:bg-yellow-700',
    },
    danger: {
        icon: AlertTriangle,
        iconColor: 'text-red-500',
        bgColor: 'bg-red-50',
        buttonColor: 'bg-red-600 hover:bg-red-700',
    },
    info: {
        icon: Info,
        iconColor: 'text-blue-500',
        bgColor: 'bg-blue-50',
        buttonColor: 'bg-blue-600 hover:bg-blue-700',
    },
    success: {
        icon: CheckCircle,
        iconColor: 'text-green-500',
        bgColor: 'bg-green-50',
        buttonColor: 'bg-green-600 hover:bg-green-700',
    },
};

export default function ConfirmModal({
    isOpen,
    title,
    message,
    confirmText = 'Xác nhận',
    cancelText = 'Hủy',
    type = 'warning',
    onConfirm,
    onCancel,
}: ConfirmModalProps) {
    if (!isOpen) return null;

    const config = TYPE_CONFIG[type];
    const Icon = config.icon;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
        >
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
                {/* Header */}
                <div className={`${config.bgColor} p-4 flex items-center gap-3`}>
                    <div className={`p-2 rounded-full bg-white ${config.iconColor}`}>
                        <Icon className="w-6 h-6" aria-hidden="true" />
                    </div>
                    <h3
                        id="confirm-modal-title"
                        className="font-semibold text-gray-800 flex-1"
                    >
                        {title}
                    </h3>
                    <button
                        onClick={onCancel}
                        className="p-1 hover:bg-white/50 rounded transition-colors"
                        aria-label="Đóng"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4">
                    <p className="text-gray-600">{message}</p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 p-4 bg-gray-50 justify-end">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`px-4 py-2 text-white rounded-lg transition-colors ${config.buttonColor}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ========== HOOK FOR EASY USAGE ==========

interface ConfirmState {
    isOpen: boolean;
    title: string;
    message: string;
    type: ConfirmType;
    resolve: ((value: boolean) => void) | null;
}

export function useConfirmModal() {
    const [state, setState] = React.useState<ConfirmState>({
        isOpen: false,
        title: '',
        message: '',
        type: 'warning',
        resolve: null,
    });

    const confirm = React.useCallback((
        title: string,
        message: string,
        type: ConfirmType = 'warning'
    ): Promise<boolean> => {
        return new Promise((resolve) => {
            setState({
                isOpen: true,
                title,
                message,
                type,
                resolve,
            });
        });
    }, []);

    const handleConfirm = React.useCallback(() => {
        state.resolve?.(true);
        setState(prev => ({ ...prev, isOpen: false, resolve: null }));
    }, [state.resolve]);

    const handleCancel = React.useCallback(() => {
        state.resolve?.(false);
        setState(prev => ({ ...prev, isOpen: false, resolve: null }));
    }, [state.resolve]);

    const ModalComponent = React.useCallback(() => (
        <ConfirmModal
            isOpen={state.isOpen}
            title={state.title}
            message={state.message}
            type={state.type}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
        />
    ), [state, handleConfirm, handleCancel]);

    return { confirm, ModalComponent };
}
