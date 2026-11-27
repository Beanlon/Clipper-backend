import cors from "cors";
import express from "express";
import { authRouter } from "./routes/auth";
import { jobsRouter } from "./routes/jobs";
import { libraryRouter } from "./routes/library";
import { sourcesRouter } from "./routes/sources";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "2mb" }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "clipper-backend" });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/library", libraryRouter);
  app.use("/api/sources", sourcesRouter);
  app.use("/api/jobs", jobsRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
