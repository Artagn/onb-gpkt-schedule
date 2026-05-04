/**
 * Skeleton Components - Loading Placeholders
 * Provides contextual loading states instead of generic spinners
 */

import React from 'react';

// Base skeleton element with pulse animation
export const SkeletonBox: React.FC<{
    className?: string;
    width?: string;
    height?: string;
}> = ({ className = '', width, height }) => (
    <div
        className={`animate-pulse bg-gray-200 rounded ${className}`}
        style={{ width, height }}
    />
);

// Text line skeleton
export const SkeletonText: React.FC<{
    lines?: number;
    className?: string;
}> = ({ lines = 1, className = '' }) => (
    <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
            <SkeletonBox
                key={i}
                className="h-4"
                width={i === lines - 1 ? '75%' : '100%'}
            />
        ))}
    </div>
);

// Card skeleton - generic card placeholder
export const CardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div className={`bg-white rounded-xl border border-gray-100 p-4 shadow-sm ${className}`}>
        <div className="animate-pulse space-y-3">
            <SkeletonBox className="h-5 w-3/4" />
            <SkeletonBox className="h-4 w-1/2" />
            <SkeletonBox className="h-4 w-2/3" />
        </div>
    </div>
);

// Dashboard skeleton - for main dashboard loading
export const DashboardSkeleton: React.FC = () => (
    <div className="p-4 space-y-4 animate-pulse">
        {/* Header */}
        <div className="flex justify-between items-center">
            <SkeletonBox className="h-8 w-48" />
            <SkeletonBox className="h-10 w-32 rounded-lg" />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white rounded-xl border p-4">
                    <SkeletonBox className="h-4 w-20 mb-2" />
                    <SkeletonBox className="h-8 w-16" />
                </div>
            ))}
        </div>

        {/* Widget area */}
        <div className="bg-white rounded-xl border p-4">
            <div className="flex gap-4 mb-4">
                <SkeletonBox className="h-10 w-24 rounded-lg" />
                <SkeletonBox className="h-10 w-24 rounded-lg" />
            </div>
            <div className="space-y-3">
                {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <SkeletonBox className="h-10 w-10 rounded-full" />
                        <div className="flex-1 space-y-2">
                            <SkeletonBox className="h-4 w-32" />
                            <SkeletonBox className="h-3 w-48" />
                        </div>
                        <SkeletonBox className="h-8 w-20 rounded-lg" />
                    </div>
                ))}
            </div>
        </div>
    </div>
);

// Table skeleton - for data tables
export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({
    rows = 5,
    cols = 4
}) => (
    <div className="bg-white rounded-xl border overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 border-b p-4">
            <div className="flex gap-4">
                {Array.from({ length: cols }).map((_, i) => (
                    <SkeletonBox key={i} className="h-4 flex-1" />
                ))}
            </div>
        </div>
        {/* Rows */}
        <div className="divide-y">
            {Array.from({ length: rows }).map((_, rowIdx) => (
                <div key={rowIdx} className="p-4 flex gap-4">
                    {Array.from({ length: cols }).map((_, colIdx) => (
                        <SkeletonBox key={colIdx} className="h-4 flex-1" />
                    ))}
                </div>
            ))}
        </div>
    </div>
);

// Schedule skeleton - for schedule views
export const ScheduleSkeleton: React.FC = () => (
    <div className="p-4 space-y-4">
        {/* Week navigation */}
        <div className="flex items-center justify-between">
            <SkeletonBox className="h-10 w-10 rounded-lg" />
            <SkeletonBox className="h-6 w-48" />
            <SkeletonBox className="h-10 w-10 rounded-lg" />
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="text-center">
                    <SkeletonBox className="h-4 w-8 mx-auto mb-2" />
                    <div className="bg-white rounded-lg border p-3 space-y-2">
                        <SkeletonBox className="h-6 w-6 rounded-full mx-auto" />
                        <SkeletonBox className="h-3 w-full" />
                        <SkeletonBox className="h-3 w-3/4 mx-auto" />
                    </div>
                </div>
            ))}
        </div>
    </div>
);

// List skeleton - for items list
export const ListSkeleton: React.FC<{ items?: number }> = ({ items = 5 }) => (
    <div className="space-y-3">
        {Array.from({ length: items }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                <SkeletonBox className="h-10 w-10 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                    <SkeletonBox className="h-4 w-1/3" />
                    <SkeletonBox className="h-3 w-1/2" />
                </div>
            </div>
        ))}
    </div>
);

// Loading spinner with optional text
export const LoadingSpinner: React.FC<{ text?: string; size?: 'sm' | 'md' | 'lg' }> = ({
    text,
    size = 'md'
}) => {
    const sizeClasses = {
        sm: 'h-4 w-4 border-2',
        md: 'h-8 w-8 border-3',
        lg: 'h-12 w-12 border-4'
    };

    return (
        <div className="flex flex-col items-center justify-center py-8 gap-3">
            <div className={`${sizeClasses[size]} border-blue-200 border-t-blue-600 rounded-full animate-spin`} />
            {text && <p className="text-sm text-gray-500">{text}</p>}
        </div>
    );
};
