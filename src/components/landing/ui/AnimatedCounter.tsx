'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  formatOptions?: Intl.NumberFormatOptions;
  startOnView?: boolean;
}

function easeOutExpo(x: number): number {
  return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
}

export function AnimatedCounter({
  value,
  duration = 2000,
  prefix = '',
  suffix = '',
  className,
  formatOptions = {},
  startOnView = true,
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [hasStarted, setHasStarted] = useState(!startOnView);
  const ref = useRef<HTMLSpanElement>(null);
  const startTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Intersection Observer for startOnView
  useEffect(() => {
    if (!startOnView) return;

    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted) {
          setHasStarted(true);
          observer.unobserve(element);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [startOnView, hasStarted]);

  // Animation logic
  useEffect(() => {
    if (!hasStarted) return;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutExpo(progress);

      setDisplayValue(Math.floor(easedProgress * value));

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [value, duration, hasStarted]);

  const formattedValue = new Intl.NumberFormat('en-US', formatOptions).format(
    displayValue
  );

  return (
    <span
      ref={ref}
      className={cn(
        'tabular-nums font-mono',
        'bg-gradient-to-r from-[var(--signal-cyan)] to-[var(--signal-lime)]',
        'bg-clip-text text-transparent',
        className
      )}
    >
      {prefix}
      {formattedValue}
      {suffix}
    </span>
  );
}

interface LiveCounterProps {
  baseValue: number;
  incrementRate?: number; // increments per second
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function LiveCounter({
  baseValue,
  incrementRate = 0.5,
  prefix = '',
  suffix = '',
  className,
}: LiveCounterProps) {
  const [value, setValue] = useState(baseValue);

  useEffect(() => {
    const interval = setInterval(() => {
      setValue((prev) => prev + Math.floor(Math.random() * 3));
    }, 1000 / incrementRate);

    return () => clearInterval(interval);
  }, [incrementRate]);

  const formattedValue = new Intl.NumberFormat('en-US').format(value);

  return (
    <span
      className={cn(
        'tabular-nums font-mono transition-all duration-300',
        'bg-gradient-to-r from-[var(--signal-cyan)] to-[var(--signal-lime)]',
        'bg-clip-text text-transparent',
        className
      )}
    >
      {prefix}
      {formattedValue}
      {suffix}
    </span>
  );
}
