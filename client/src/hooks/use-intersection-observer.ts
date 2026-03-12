import { useState, useEffect, useRef, useCallback } from "react";

interface IntersectionObserverOptions {
  root?: Element | null;
  rootMargin?: string;
  threshold?: number | number[];
  once?: boolean;
  enabled?: boolean;
}

interface IntersectionObserverResult {
  ref: React.RefObject<HTMLElement>;
  isIntersecting: boolean;
  entry: IntersectionObserverEntry | null;
}

export function useIntersectionObserver(
  options: IntersectionObserverOptions = {}
): IntersectionObserverResult {
  const {
    root = null,
    rootMargin = "0px",
    threshold = 0,
    once = false,
    enabled = true,
  } = options;

  const ref = useRef<HTMLElement>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const disconnect = useCallback(() => {
    observerRef.current?.disconnect();
    observerRef.current = null;
  }, []);

  useEffect(() => {
    if (!enabled || !ref.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        setEntry(first);
        setIsIntersecting(first.isIntersecting);

        if (once && first.isIntersecting) {
          disconnect();
        }
      },
      { root, rootMargin, threshold }
    );

    observerRef.current.observe(ref.current);
    return disconnect;
  }, [enabled, root, rootMargin, JSON.stringify(threshold), once, disconnect]);

  return { ref, isIntersecting, entry };
}

interface LazyLoadOptions extends IntersectionObserverOptions {
  placeholder?: boolean;
}

export function useLazyLoad(options: LazyLoadOptions = {}): {
  ref: React.RefObject<HTMLElement>;
  isVisible: boolean;
  hasBeenVisible: boolean;
} {
  const { isIntersecting, ref } = useIntersectionObserver({
    ...options,
    threshold: options.threshold ?? 0.1,
    rootMargin: options.rootMargin ?? "50px",
    once: false,
  });

  const [hasBeenVisible, setHasBeenVisible] = useState(false);

  useEffect(() => {
    if (isIntersecting) setHasBeenVisible(true);
  }, [isIntersecting]);

  return { ref, isVisible: isIntersecting, hasBeenVisible };
}

export function useAnimateOnScroll(
  animationClass: string = "animate-fade-in",
  options: IntersectionObserverOptions = {}
): {
  ref: React.RefObject<HTMLElement>;
  className: string;
} {
  const { ref, isIntersecting } = useIntersectionObserver({
    threshold: 0.15,
    once: true,
    ...options,
  });

  return {
    ref,
    className: isIntersecting ? animationClass : "opacity-0",
  };
}
