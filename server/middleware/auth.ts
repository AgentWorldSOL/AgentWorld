import type { Request, Response, NextFunction } from "express";
import { createLogger } from "../utils/logger";
import { generateSecureToken, hashData } from "../utils/crypto";

const logger = createLogger("auth");

interface SessionData {
  userId: string;
  username: string;
  walletAddress?: string;
  createdAt: number;
  expiresAt: number;
}

const sessions = new Map<string, SessionData>();
const SESSION_DURATION = 24 * 60 * 60 * 1000;

export function createSession(
  userId: string,
  username: string,
  walletAddress?: string,
): string {
  const token = generateSecureToken(48);
  const now = Date.now();

  sessions.set(token, {
    userId,
    username,
    walletAddress,
    createdAt: now,
    expiresAt: now + SESSION_DURATION,
  });

  logger.info("Session created", { userId, username });
  return token;
}

export function destroySession(token: string): boolean {
  const session = sessions.get(token);
  if (session) {
    logger.info("Session destroyed", { userId: session.userId });
    sessions.delete(token);
    return true;
  }
  return false;
}

export function getSession(token: string): SessionData | null {
  const session = sessions.get(token);
  if (!session) return null;

  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return null;
  }

  return session;
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const token =
    req.headers.authorization?.replace("Bearer ", "") ||
    (req.query.token as string);

  if (!token) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  const session = getSession(token);
  if (!session) {
    res.status(401).json({ message: "Invalid or expired session" });
    return;
  }

  (req as any).userId = session.userId;
  (req as any).username = session.username;
  (req as any).walletAddress = session.walletAddress;

  next();
}

export function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const token =
    req.headers.authorization?.replace("Bearer ", "") ||
    (req.query.token as string);

  if (token) {
    const session = getSession(token);
    if (session) {
      (req as any).userId = session.userId;
      (req as any).username = session.username;
      (req as any).walletAddress = session.walletAddress;
    }
  }

  next();
}

export function cleanExpiredSessions(): number {
  const now = Date.now();
  let cleaned = 0;

  for (const [token, session] of sessions) {
    if (now > session.expiresAt) {
      sessions.delete(token);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    logger.info("Expired sessions cleaned", { count: cleaned });
  }

  return cleaned;
}

setInterval(cleanExpiredSessions, 60 * 60 * 1000);
