import { hash, timingSafeEqual } from "node:crypto";
import argon2, { argon2id } from "argon2";

export const MAX_PASSWORD_LENGTH = 128;
const LEGACY_SHA256_PATTERN = /^[a-f0-9]{64}$/i;

export const ARGON2ID_OPTIONS = {
  type: argon2id,
  memoryCost: 19 * 1024,
  timeCost: 2,
  parallelism: 1,
} as const;

export async function hashPassword(password: string): Promise<string> {
  if (password.length > MAX_PASSWORD_LENGTH) {
    throw new RangeError(
      `Password must not exceed ${MAX_PASSWORD_LENGTH} characters`,
    );
  }

  return argon2.hash(password, ARGON2ID_OPTIONS);
}

export function passwordNeedsRehash(
  passwordHash: string,
): boolean {
  if (LEGACY_SHA256_PATTERN.test(passwordHash)) {
    return true;
  }
  if (passwordHash.startsWith("$argon2id$")) {
    try {
      return argon2.needsRehash(passwordHash, ARGON2ID_OPTIONS);
    } catch {
      return false;
    }
  }
  return false;
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  if (password.length > MAX_PASSWORD_LENGTH) {
    return false;
  }
  if (LEGACY_SHA256_PATTERN.test(passwordHash)) {
    const candidateHash = Buffer.from(hash("sha256", password, "hex"), "hex");
    const storedHash = Buffer.from(passwordHash, "hex");
    return timingSafeEqual(candidateHash, storedHash);
  }
  if (passwordHash.startsWith("$argon2id$")) {
    try {
      return await argon2.verify(passwordHash, password);
    } catch {
      return false;
    }
  }
  return false;
}
