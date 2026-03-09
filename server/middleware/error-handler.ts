import type { Request, Response, NextFunction } from "express";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = "INTERNAL_ERROR",
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string | number) {
    const msg = id
      ? `${resource} with id '${id}' not found`
      : `${resource} not found`;
    super(msg, 404, "NOT_FOUND");
  }
}

export class ValidationError extends AppError {
  public readonly fields: Record<string, string>;

  constructor(message: string, fields: Record<string, string> = {}) {
    super(message, 400, "VALIDATION_ERROR");
    this.fields = fields;
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, "CONFLICT");
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Authentication required") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Insufficient permissions") {
    super(message, 403, "FORBIDDEN");
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter: number) {
    super(
      `Rate limit exceeded. Retry after ${retryAfter} seconds`,
      429,
      "RATE_LIMIT_EXCEEDED"
    );
  }
}

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
    timestamp: string;
    requestId?: string;
  };
}

function formatErrorResponse(err: AppError, reqId?: string): ErrorResponse {
  const response: ErrorResponse = {
    error: {
      code: err.code,
      message: err.message,
      timestamp: new Date().toISOString(),
    },
  };

  if (err instanceof ValidationError && Object.keys(err.fields).length > 0) {
    response.error.fields = err.fields;
  }

  if (reqId) {
    response.error.requestId = reqId;
  }

  return response;
}

export function globalErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = req.headers["x-request-id"] as string | undefined;

  if (err instanceof AppError) {
    if (!err.isOperational) {
      console.error("[FATAL] Non-operational error:", err);
    }

    res.status(err.statusCode).json(formatErrorResponse(err, requestId));
    return;
  }

  console.error("[ERROR] Unhandled error:", err.message);
  console.error(err.stack);

  const genericError = new AppError(
    process.env.NODE_ENV === "production"
      ? "An unexpected error occurred"
      : err.message,
    500,
    "INTERNAL_ERROR",
    false
  );

  res.status(500).json(formatErrorResponse(genericError, requestId));
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
