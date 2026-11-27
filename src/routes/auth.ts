import { Router } from "express";
import type { AuthedRequest } from "../middleware/auth";
import { requireAuth } from "../middleware/auth";
import { getAnonClient } from "../lib/supabase";

export const authRouter = Router();

/** Validate Supabase JWT / return user (stub-friendly). */
authRouter.post("/session", requireAuth, async (req, res) => {
  const { userId, accessToken } = req as AuthedRequest;

  const supabase = getAnonClient();
  if (supabase && accessToken && !accessToken.startsWith("stub:")) {
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (error || !data.user) {
      res.status(401).json({ error: "Invalid session" });
      return;
    }
    res.json({
      user: {
        id: data.user.id,
        email: data.user.email ?? null,
        display_name:
          (data.user.user_metadata?.display_name as string | undefined) ??
          (data.user.user_metadata?.full_name as string | undefined) ??
          null,
      },
    });
    return;
  }

  res.json({
    user: {
      id: userId,
      email: null,
      display_name: null,
      stub: true,
    },
  });
});
