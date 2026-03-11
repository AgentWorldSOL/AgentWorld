import { useState, useMemo, useCallback } from "react";

interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

interface PaginationActions {
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setTotal: (total: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  firstPage: () => void;
  lastPage: () => void;
}

interface PaginationMeta {
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  startIndex: number;
  endIndex: number;
  offset: number;
  pageNumbers: number[];
}

interface UsePaginationReturn extends PaginationState, PaginationActions, PaginationMeta {}

interface UsePaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
  initialTotal?: number;
  maxPageButtons?: number;
}

export function usePagination(options: UsePaginationOptions = {}): UsePaginationReturn {
  const {
    initialPage = 1,
    initialPageSize = 10,
    initialTotal = 0,
    maxPageButtons = 7,
  } = options;

  const [page, setPageRaw] = useState(initialPage);
  const [pageSize, setPageSizeRaw] = useState(initialPageSize);
  const [total, setTotal] = useState(initialTotal);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize]
  );

  const setPage = useCallback(
    (newPage: number) => {
      setPageRaw(Math.max(1, Math.min(newPage, totalPages)));
    },
    [totalPages]
  );

  const setPageSize = useCallback((newSize: number) => {
    setPageSizeRaw(newSize);
    setPageRaw(1);
  }, []);

  const nextPage = useCallback(() => setPage(page + 1), [page, setPage]);
  const prevPage = useCallback(() => setPage(page - 1), [page, setPage]);
  const firstPage = useCallback(() => setPage(1), [setPage]);
  const lastPage = useCallback(() => setPage(totalPages), [setPage, totalPages]);

  const hasNext = page < totalPages;
  const hasPrev = page > 1;
  const offset = (page - 1) * pageSize;
  const startIndex = total === 0 ? 0 : offset + 1;
  const endIndex = Math.min(offset + pageSize, total);

  const pageNumbers = useMemo(() => {
    if (totalPages <= maxPageButtons) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const half = Math.floor(maxPageButtons / 2);
    let start = Math.max(1, page - half);
    const end = Math.min(totalPages, start + maxPageButtons - 1);

    if (end - start < maxPageButtons - 1) {
      start = Math.max(1, end - maxPageButtons + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [page, totalPages, maxPageButtons]);

  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNext,
    hasPrev,
    startIndex,
    endIndex,
    offset,
    pageNumbers,
    setPage,
    setPageSize,
    setTotal,
    nextPage,
    prevPage,
    firstPage,
    lastPage,
  };
}

export function paginateArray<T>(items: T[], page: number, pageSize: number): T[] {
  const offset = (page - 1) * pageSize;
  return items.slice(offset, offset + pageSize);
}
