import { useState, useRef, useCallback, useEffect, useMemo } from "react";

interface VirtualListOptions {
  itemHeight: number | ((index: number) => number);
  overscan?: number;
  containerHeight: number;
}

interface VirtualItem {
  index: number;
  offsetTop: number;
  height: number;
}

interface VirtualListResult {
  containerRef: React.RefObject<HTMLDivElement>;
  virtualItems: VirtualItem[];
  totalHeight: number;
  scrollToIndex: (index: number, behavior?: ScrollBehavior) => void;
}

export function useVirtualList<T>(
  items: T[],
  options: VirtualListOptions
): VirtualListResult {
  const { itemHeight, overscan = 3, containerHeight } = options;
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const getHeight = useCallback(
    (index: number): number =>
      typeof itemHeight === "function" ? itemHeight(index) : itemHeight,
    [itemHeight]
  );

  const offsets = useMemo(() => {
    const result: number[] = [0];
    for (let i = 0; i < items.length; i++) {
      result.push(result[i] + getHeight(i));
    }
    return result;
  }, [items.length, getHeight]);

  const totalHeight = offsets[items.length] || 0;

  const virtualItems = useMemo(() => {
    if (items.length === 0) return [];

    let startIndex = 0;
    let endIndex = items.length - 1;

    for (let i = 0; i < items.length; i++) {
      if (offsets[i + 1] > scrollTop) {
        startIndex = Math.max(0, i - overscan);
        break;
      }
    }

    for (let i = startIndex; i < items.length; i++) {
      if (offsets[i] >= scrollTop + containerHeight) {
        endIndex = Math.min(items.length - 1, i + overscan);
        break;
      }
    }

    const result: VirtualItem[] = [];
    for (let i = startIndex; i <= endIndex; i++) {
      result.push({
        index: i,
        offsetTop: offsets[i],
        height: getHeight(i),
      });
    }

    return result;
  }, [scrollTop, items.length, offsets, containerHeight, overscan, getHeight]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onScroll = () => setScrollTop(el.scrollTop);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToIndex = useCallback(
    (index: number, behavior: ScrollBehavior = "smooth") => {
      const el = containerRef.current;
      if (!el || index < 0 || index >= items.length) return;
      el.scrollTo({ top: offsets[index], behavior });
    },
    [offsets, items.length]
  );

  return { containerRef, virtualItems, totalHeight, scrollToIndex };
}
