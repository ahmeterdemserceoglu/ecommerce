'use client'

import { useState, useEffect } from 'react';

interface CountdownTime {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
}

interface CountdownTimerProps {
    endTime: string | Date; // ISO string or Date object
    onEnded?: () => void;
    className?: string;
    timeBoxClassName?: string;
    separatorClassName?: string;
}

const calculateTimeLeft = (targetTime: number): CountdownTime | null => {
    const difference = targetTime - new Date().getTime();
    if (difference <= 0) {
        return null;
    }
    return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
    };
};

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
    endTime,
    onEnded,
    className = "flex items-center gap-1 text-xs font-mono",
    timeBoxClassName = "bg-red-500 text-white px-1.5 py-0.5 rounded-sm text-center min-w-[20px]",
    separatorClassName = "text-red-500"
}) => {
    const targetTime = new Date(endTime).getTime();
    const [timeLeft, setTimeLeft] = useState<CountdownTime | null>(calculateTimeLeft(targetTime));

    useEffect(() => {
        if (targetTime < new Date().getTime()) {
            setTimeLeft(null);
            onEnded?.();
            return;
        }

        const timer = setInterval(() => {
            const newTimeLeft = calculateTimeLeft(targetTime);
            setTimeLeft(newTimeLeft);
            if (!newTimeLeft) {
                onEnded?.();
                clearInterval(timer);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [targetTime, onEnded]);

    if (!timeLeft) {
        return <span className={cn(className, "text-red-600 font-semibold")}>Süre Doldu!</span>;
    }

    return (
        <div className={className}>
            {timeLeft.days > 0 && (
                <>
                    <span className={timeBoxClassName}>{String(timeLeft.days).padStart(2, '0')}</span>
                    <span className={separatorClassName}>:</span>
                </>
            )}
            <span className={timeBoxClassName}>{String(timeLeft.hours).padStart(2, '0')}</span>
            <span className={separatorClassName}>:</span>
            <span className={timeBoxClassName}>{String(timeLeft.minutes).padStart(2, '0')}</span>
            <span className={separatorClassName}>:</span>
            <span className={timeBoxClassName}>{String(timeLeft.seconds).padStart(2, '0')}</span>
        </div>
    );
};

// Helper for cn if not globally available, or import from lib
const cn = (...classes: Array<string | undefined | null | false>) => classes.filter(Boolean).join(' '); 