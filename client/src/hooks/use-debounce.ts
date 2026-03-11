import { useState, useEffect, useRef, useCallback } from "react";

export function useDebounce<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debouncedValue;
}

export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delayMs: number
): (...args: Parameters<T>) => void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useCallback(
    (...args: Parameters<T>) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delayMs);
    },
    [delayMs]
  );
}

export function useThrottle<T>(value: T, intervalMs: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastUpdated = useRef<number>(0);

  useEffect(() => {
    const now = Date.now();
    const timeSinceLast = now - lastUpdated.current;

    if (timeSinceLast >= intervalMs) {
      lastUpdated.current = now;
      setThrottledValue(value);
    } else {
      const timer = setTimeout(() => {
        lastUpdated.current = Date.now();
        setThrottledValue(value);
      }, intervalMs - timeSinceLast);
      return () => clearTimeout(timer);
    }
  }, [value, intervalMs]);

  return throttledValue;
}

export function useThrottledCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  intervalMs: number
): (...args: Parameters<T>) => void {
  const lastCalled = useRef<number>(0);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCalled.current >= intervalMs) {
        lastCalled.current = now;
        callbackRef.current(...args);
      }
    },
    [intervalMs]
  );
}
