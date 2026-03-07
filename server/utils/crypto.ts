import { randomBytes, createHash, createHmac } from "crypto";

export function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString("hex");
}

export function hashData(data: string, algorithm: string = "sha256"): string {
  return createHash(algorithm).update(data).digest("hex");
}

export function createSignature(
  payload: string,
  secret: string,
): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function verifySignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  const expected = createSignature(payload, secret);
  if (expected.length !== signature.length) return false;

  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

export function generateAgentSeed(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = randomBytes(8);
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

export function deriveWalletIdentifier(
  orgId: string,
  agentId: string,
): string {
  return hashData(`${orgId}:${agentId}`, "sha256").slice(0, 16);
}

export function generateNonce(): string {
  return randomBytes(16).toString("base64url");
}

export function encodePayload(data: Record<string, unknown>): string {
  const json = JSON.stringify(data);
  return Buffer.from(json).toString("base64url");
}

export function decodePayload(
  encoded: string,
): Record<string, unknown> | null {
  try {
    const json = Buffer.from(encoded, "base64url").toString("utf-8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}
