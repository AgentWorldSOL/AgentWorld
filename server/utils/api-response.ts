import type { Response } from "express";

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    pagination?: PaginationMeta;
    timestamp: string;
  };
}

interface ApiListResponse<T> {
  success: true;
  data: T[];
  meta: {
    pagination: PaginationMeta;
    timestamp: string;
  };
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode: number = 200
): void {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
    },
  };
  res.status(statusCode).json(response);
}

export function sendCreated<T>(res: Response, data: T): void {
  sendSuccess(res, data, 201);
}

export function sendList<T>(
  res: Response,
  items: T[],
  total: number,
  page: number = 1,
  limit: number = 50
): void {
  const totalPages = Math.ceil(total / limit);
  const response: ApiListResponse<T> = {
    success: true,
    data: items,
    meta: {
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      timestamp: new Date().toISOString(),
    },
  };
  res.status(200).json(response);
}

export function sendNoContent(res: Response): void {
  res.status(204).end();
}

export function parsePaginationParams(query: Record<string, unknown>): {
  page: number;
  limit: number;
  offset: number;
} {
  const page = Math.max(1, parseInt(String(query.page || "1"), 10) || 1);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(String(query.limit || "50"), 10) || 50)
  );
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

export function parseSortParams(
  query: Record<string, unknown>,
  allowedFields: string[]
): { sortBy: string; sortOrder: "asc" | "desc" } | null {
  const sortBy = String(query.sortBy || "");
  const sortOrder = String(query.sortOrder || "desc").toLowerCase();

  if (!sortBy || !allowedFields.includes(sortBy)) {
    return null;
  }

  return {
    sortBy,
    sortOrder: sortOrder === "asc" ? "asc" : "desc",
  };
}
