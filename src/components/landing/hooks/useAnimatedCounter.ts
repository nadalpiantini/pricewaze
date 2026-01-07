'use client';

import { useEffect, useRef, useState } from 'react';

interface UseAnimatedCounterOptions {
  duration?: number;
  startOnView?: boolean;
  easing?: 'linear' | 'easeOut' | 'easeOutExpo';
}

function easeOutExpo(x: number): number {
  return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
}

function easeOut(x: number): number {
  return 1 - Math.pow(1 - x, 3);
}

export function useAnimatedCounter(
  targetValue: number,
  options: UseAnimatedCounterOptions = {}
) {
  const { duration = 2000, startOnView = true, easing = 'easeOutExpo' } = options;

  const [value, setValue] = useState(0);
  const [hasStarted, setHasStarted] = useState(!startOnView);
  const ref = useRef<HTMLElement>(null);
  const startTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Intersection Observer
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

    return () => observer.disconnect();
  }, [startOnView, hasStarted]);

  // Animation
  useEffect(() => {
    if (!hasStarted) return;

    const easingFn =
      easing === 'linear'
        ? (x: number) => x
        : easing === 'easeOut'
          ? easeOut
          : easeOutExpo;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easingFn(progress);

      setValue(Math.floor(easedProgress * targetValue));

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setValue(targetValue);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [targetValue, duration, hasStarted, easing]);

  return { value, ref, hasStarted };
}

export function useLiveCounter(
  baseValue: number,
  incrementRate: number = 1 // increments per second
) {
  const [value, setValue] = useState(baseValue);
  const [mounted, setMounted] = useState(false);

  // Only start counter after mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    const interval = setInterval(() => {
      // Random small increment for "live" feel
      // Only runs on client after mount, so no hydration issues
      setValue((prev) => prev + Math.floor(Math.random() * 3) + 1);
    }, 1000 / incrementRate);

    return () => clearInterval(interval);
  }, [incrementRate, mounted]);

  return value;
}
