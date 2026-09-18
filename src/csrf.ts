import type { RequestHandler } from "express";
import { sendErrorPage } from "./errors.ts";
import { timingSafeEqual } from "crypto";

export function validateRequestOrigin(appOrigin: string): RequestHandler {
  return (req, res, next) => {
    if (req.method !== "POST") {
      return next();
    }

    if (req.header("Origin")) {
      if (req.header("Origin") === appOrigin) {
        return next();
      } else {
        sendErrorPage(res, 403, "Forbidden", "Request came from outside");
      }
    } else if (req.header("Referer")) {
      try {
        const url = new URL(req.header("Referer") as string);
        if (url.origin === appOrigin) return next();
        else throw new Error("Origin Not same");
      } catch (error) {
        sendErrorPage(
          res,
          403,
          "Origin Mismatch",
          "Request Origin is not valid",
        );
      }
    } else {
      sendErrorPage(res, 403, "Unautohrized", "Request could not be validated");
    }
  };
}

export function csrfTokensMatch(expected: string, actual: unknown): boolean {
  if (typeof actual !== "string") return false;

  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);
  if (expectedBuffer.length === actualBuffer.length) {
    return timingSafeEqual(expectedBuffer, actualBuffer);
  } else return false;
}
