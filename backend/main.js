import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { requireSession } from "./dependencies.js";
import { errorHandler, routeNotFound } from "./utils/errors.js";
import { router as usersRouter } from "./routers/users/routes.js";
import { router as journeysRouter } from "./routers/journeys/routes.js";
import { router as postsRouter } from "./routers/posts/routes.js";
import { router as savedRouter } from "./routers/saved/routes.js";
import { router as commentsRouter } from "./routers/comments/routes.js";
import { router as mediaRouter } from "./routers/media/routes.js";

// Like FinSight's main.py: assemble middleware and register feature routers.
// Creating the app does not open a port or require live credentials.
export function createApp({ authenticate, database, origins = [] }) {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        callback(null, !origin || origins.includes(origin));
      },
      methods: ["GET", "POST", "PUT", "DELETE"],
      allowedHeaders: ["Authorization", "Content-Type"],
    }),
  );
  app.use(
    rateLimit({
      windowMs: 60000,
      limit: 120,
      standardHeaders: "draft-8",
      legacyHeaders: false,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  // Register the guard before every feature router. No route may bypass it.
  app.use("/api", requireSession({ authenticate, database }));
  app.use("/api/me", usersRouter);
  app.use("/api/journeys", journeysRouter);
  app.use("/api/posts", postsRouter);
  app.use("/api/saved", savedRouter);
  app.use("/api", commentsRouter);
  app.use("/api/media", mediaRouter);

  // Express 5 forwards rejected async route promises to this error handler.
  app.use(routeNotFound);
  app.use(errorHandler);
  return app;
}
