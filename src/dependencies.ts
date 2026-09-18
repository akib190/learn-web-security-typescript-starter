import { join } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { openDatabase } from "./db/index.ts";
import { loadOptionalKeyring, type Keyring } from "./storage/keyring.ts";

export type Dependencies = {
  appOrigin: string;
  port: number;
  databasePath: string;
  acornFulfillmentDelayMs: number;
  maxRequestBodyBytes: number;
  maxUploadBytes: number;
  maxPublicProductResults: number;
  downloadSigningKey: Buffer;
  keyring: Keyring | undefined;
  db: DatabaseSync;
  pawPalApiKey: string;
};

function requiredEnv(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function parseNonNegativeInteger(value: string, name: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }
  return parsed;
}

export function initDependencies(
  env: NodeJS.ProcessEnv = process.env,
  cwd: string = process.cwd(),
): Dependencies {
  const port = parseNonNegativeInteger(env.PORT ?? "3000", "PORT");
  if (port > 65_535) {
    throw new Error("PORT must be no greater than 65535");
  }

  const acornFulfillmentDelayMs = Number(env.ACORN_FULFILLMENT_DELAY_MS ?? "0");
  if (
    !Number.isFinite(acornFulfillmentDelayMs) ||
    acornFulfillmentDelayMs < 0
  ) {
    throw new Error("ACORN_FULFILLMENT_DELAY_MS must be a non-negative number");
  }
  const HEX_64_REGEX = /^[0-9a-fA-F]{64}$/;
  const dsk_env = requiredEnv(env, "DOWNLOAD_SIGNING_KEY");

  if (!HEX_64_REGEX.test(dsk_env)) { throw new Error(`Missing required environment variable: DOWNLOAD_SIGNING_KEY`); }
  const dsk = Buffer.from(dsk_env, "hex");

  const values = {
    appOrigin: new URL(env.APP_ORIGIN ?? "http://localhost:3000").origin,
    port,
    databasePath: env.DATABASE_URL ?? join(cwd, "data", "bearly-secure.sqlite"),
    acornFulfillmentDelayMs,
    maxRequestBodyBytes: 32 * 1024,
    maxUploadBytes: 1024 * 1024,
    maxPublicProductResults: 50,
    downloadSigningKey: dsk,
    keyring: loadOptionalKeyring(env),
    pawPalApiKey: requiredEnv(env, "PAWPAL_API_KEY")
  };

  return { ...values, db: openDatabase(values.databasePath) };
}
