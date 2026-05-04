// useCountUp.ts - Animated counting hook for KPI cards
import { useEffect, useState, useRef } from 'react';

interface CountUpOptions {
    duration?: number;      // Animation duration in ms (default: 800)
    decimals?: number;      // Number of decimal places (default: 0)
    startOnMount?: boolean; // Start animation on mount (default: true)
}

/**
 * Animated count-up hook with easeOutCubic for smooth KPI card animations
 * Automatically pauses when tab is hidden (visibility API)
 * 
 * @example
 * const displayValue = useCountUp(1234, { duration: 900 });
 * return <div>{displayValue}</div>;
 */
export function useCountUp(target: number, options: CountUpOptions = {}): number {
    const { duration = 800, decimals = 0, startOnMount = true } = options;
    const [value, setValue] = useState(startOnMount ? 0 : target);
    const rafRef = useRef<number | null>(null);
    const startTimeRef = useRef<number | null>(null);
    const pausedTimeRef = useRef<number>(0);

    useEffect(() => {
        if (!startOnMount && target === value) return;

        // Reset for new target
        setValue(0);
        startTimeRef.current = null;
        pausedTimeRef.current = 0;

        const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

        const animate = (currentTime: number) => {
            // Handle visibility pause
            if (document.hidden) {
                if (startTimeRef.current !== null) {
                    pausedTimeRef.current = currentTime - startTimeRef.current;
                }
                rafRef.current = requestAnimationFrame(animate);
                return;
            }

            // Initialize or resume
            if (startTimeRef.current === null) {
                startTimeRef.current = currentTime - pausedTimeRef.current;
            }

            const elapsed = currentTime - startTimeRef.current;
            const progress = Math.min(1, elapsed / duration);
            const easedProgress = easeOutCubic(progress);

            const currentValue = target * easedProgress;
            setValue(decimals > 0
                ? parseFloat(currentValue.toFixed(decimals))
                : Math.round(currentValue)
            );

            if (progress < 1) {
                rafRef.current = requestAnimationFrame(animate);
            }
        };

        rafRef.current = requestAnimationFrame(animate);

        return () => {
            if (rafRef.current !== null) {
                cancelAnimationFrame(rafRef.current);
            }
        };
    }, [target, duration, decimals, startOnMount]);

    return value;
}

/**
 * Format number with thousand separators for display
 */
export function formatNumber(n: number, locale = 'vi-VN'): string {
    return n.toLocaleString(locale);
}

export default useCountUp;
