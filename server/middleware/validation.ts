import type { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";
import { createLogger } from "../utils/logger";

const logger = createLogger("validation");

export function validateBody(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req.body);
      req.body = parsed;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formatted = error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
          code: err.code,
        }));

        logger.warn("Validation failed", {
          path: req.path,
          errors: formatted.length,
        });

        return res.status(400).json({
          message: "Validation failed",
          errors: formatted,
        });
      }
      next(error);
    }
  };
}

export function validateQuery(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req.query);
      (req as any).validatedQuery = parsed;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: "Invalid query parameters",
          errors: error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        });
      }
      next(error);
    }
  };
}

export function validateParams(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: "Invalid URL parameters",
          errors: error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        });
      }
      next(error);
    }
  };
}

export function requireFields(...fields: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const missing = fields.filter(
      (field) => req.body[field] === undefined || req.body[field] === null,
    );

    if (missing.length > 0) {
      return res.status(400).json({
        message: `Missing required fields: ${missing.join(", ")}`,
      });
    }

    next();
  };
}

export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .trim();
}
