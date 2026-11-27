import type { NextFunction, Request, Response } from "express";
import { config } from "../lib/config";
import { getAnonClient } from "../lib/supabase";

export interface AuthedRequest extends Request {
  userId: string;
  accessToken?: string;
}

function unauthorized(res: Response, message = "Unauthorized"): void {
  res.status(401).json({ error: message });
}

/**
 * Validates Supabase JWT via Auth API, or accepts `Bearer stub:<userId>` when AUTH_STUB=true.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.header("authorization") ?? req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    unauthorized(res, "Missing Bearer token");
    return;
  }

  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    unauthorized(res, "Empty Bearer token");
    return;
  }

  if (config.authStub && token.startsWith("stub:")) {
    const userId = token.slice("stub:".length).trim() || "stub-user";
    (req as AuthedRequest).userId = userId;
    (req as AuthedRequest).accessToken = token;
    next();
    return;
  }

  const supabase = getAnonClient();
  if (!supabase) {
    if (config.authStub) {
      (req as AuthedRequest).userId = "stub-user";
      (req as AuthedRequest).accessToken = token;
      next();
      return;
    }
    unauthorized(res, "Auth not configured");
    return;
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    unauthorized(res, "Invalid token");
    return;
  }

  (req as AuthedRequest).userId = data.user.id;
  (req as AuthedRequest).accessToken = token;
  next();
}
