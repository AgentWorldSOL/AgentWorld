import { useState, useEffect, useRef, useCallback } from "react";

interface InfiniteScrollOptions {
  threshold?: number;
  rootMargin?: string;
  enabled?: boolean;
}

interface InfiniteScrollResult {
  sentinelRef: React.RefObject<HTMLDivElement>;
  isIntersecting: boolean;
}

export function useInfiniteScrollSentinel(
  onIntersect: () => void,
  options: InfiniteScrollOptions = {}
): InfiniteScrollResult {
  const { threshold = 0.1, rootMargin = "0px", enabled = true } = options;
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const callbackRef = useRef(onIntersect);
  callbackRef.current = onIntersect;

  useEffect(() => {
    if (!enabled || !sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setIsIntersecting(entry.isIntersecting);
        if (entry.isIntersecting) {
          callbackRef.current();
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [enabled, threshold, rootMargin]);

  return { sentinelRef, isIntersecting };
}

interface UseInfiniteDataOptions<T> {
  fetchFn: (page: number, pageSize: number) => Promise<{ data: T[]; hasMore: boolean }>;
  pageSize?: number;
  enabled?: boolean;
}

interface UseInfiniteDataResult<T> {
  items: T[];
  isLoading: boolean;
  isFetchingMore: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => void;
  reset: () => void;
  sentinelRef: React.RefObject<HTMLDivElement>;
}

export function useInfiniteData<T>(
  options: UseInfiniteDataOptions<T>
): UseInfiniteDataResult<T> {
  const { fetchFn, pageSize = 20, enabled = true } = options;
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;

  const fetchPage = useCallback(async (pageNum: number, reset: boolean = false) => {
    const loading = reset || pageNum === 1;

    if (loading) setIsLoading(true);
    else setIsFetchingMore(true);

    setError(null);

    try {
      const result = await fetchFnRef.current(pageNum, pageSize);
      setItems((prev) => (reset ? result.data : [...prev, ...result.data]));
      setHasMore(result.hasMore);
      setPage(pageNum);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setIsLoading(false);
      setIsFetchingMore(false);
    }
  }, [pageSize]);

  useEffect(() => {
    if (!enabled) return;
    fetchPage(1, true);
  }, [enabled, fetchPage]);

  const loadMore = useCallback(() => {
    if (!hasMore || isLoading || isFetchingMore) return;
    fetchPage(page + 1);
  }, [hasMore, isLoading, isFetchingMore, page, fetchPage]);

  const reset = useCallback(() => {
    setItems([]);
    setPage(1);
    setHasMore(true);
    setError(null);
    fetchPage(1, true);
  }, [fetchPage]);

  const { sentinelRef } = useInfiniteScrollSentinel(loadMore, {
    enabled: hasMore && !isLoading && !isFetchingMore,
  });

  return { items, isLoading, isFetchingMore, hasMore, error, loadMore, reset, sentinelRef };
}
