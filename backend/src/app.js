import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  journeySchema,
  checkPhotoPaths,
  toJourney,
  id,
  date,
} from "./validation.js";

const selection = "*,journey_stops(*,booking_details(*),journal_entries(*))";
export function createApp({ authenticate, database, origins = [] }) {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      origin(origin, cb) {
        cb(null, !origin || origins.includes(origin));
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
  app.use("/api", async (req, res, next) => {
    const match = /^Bearer (\S+)$/.exec(req.get("authorization") ?? "");
    if (!match)
      return res.status(401).json({ error: "Authentication required." });
    try {
      const identity = await authenticate(match[1]);
      if (!identity?.sub || !identity.sid || identity.sts === "pending")
        return res.status(401).json({ error: "Active user session required." });
      req.userId = identity.sub;
      req.db = database(match[1]);
      next();
    } catch {
      res.status(401).json({ error: "Invalid or expired session." });
    }
  });
  const query = async (promise) => {
    const { data, error } = await promise;
    if (error) {
      const status =
        error.code === "42501"
          ? 403
          : error.code === "23505"
            ? 409
            : ["23503", "23514", "22P02", "P0001", "22007"].includes(error.code)
              ? 400
              : 502;
      throw Object.assign(
        new Error(
          status === 502
            ? "Database request failed."
            : "Request violates ownership or data rules.",
        ),
        { status },
      );
    }
    return data;
  };
  const getJourney = async (req, journeyId) => {
    const row = await query(
      req.db
        .from("journeys")
        .select(selection)
        .eq("id", journeyId)
        .eq("user_id", req.userId)
        .maybeSingle(),
    );
    if (!row)
      throw Object.assign(new Error("Journey not found."), { status: 404 });
    return toJourney(row);
  };
  app.get("/api/me", async (req, res) => {
    const profile = await query(
      req.db
        .from("profiles")
        .select("*")
        .eq("user_id", req.userId)
        .maybeSingle(),
    );
    res.json({ userId: req.userId, profile });
  });
  app.put("/api/me", async (req, res) => {
    const body = z
      .object({
        display_name: z.string().trim().min(1).max(100),
        bio: z.string().max(2000).default(""),
      })
      .strict()
      .parse(req.body);
    res.json(
      await query(
        req.db
          .from("profiles")
          .upsert({
            ...body,
            user_id: req.userId,
            updated_at: new Date().toISOString(),
          })
          .select()
          .single(),
      ),
    );
  });
  app.get("/api/journeys", async (req, res) => {
    const offset = z.coerce
      .number()
      .int()
      .min(0)
      .default(0)
      .parse(req.query.offset);
    const rows = await query(
      req.db
        .from("journeys")
        .select(selection)
        .eq("user_id", req.userId)
        .order("created_at", { ascending: false })
        .order("id")
        .range(offset, offset + 19),
    );
    res.json({ items: rows.map(toJourney), offset, limit: 20 });
  });
  app.post("/api/journeys", async (req, res) => {
    const body = journeySchema.parse(req.body);
    checkPhotoPaths(body, req.userId);
    const journeyId = randomUUID();
    await query(
      req.db.rpc("save_journey", { payload: { ...body, id: journeyId } }),
    );
    res.status(201).json(await getJourney(req, journeyId));
  });
  app.get("/api/journeys/:id", async (req, res) =>
    res.json(await getJourney(req, id.parse(req.params.id))),
  );
  app.put("/api/journeys/:id", async (req, res) => {
    const journeyId = id.parse(req.params.id),
      existing = await getJourney(req, journeyId);
    const body = journeySchema.parse(req.body);
    checkPhotoPaths(body, req.userId);
    await query(
      req.db.rpc("save_journey", {
        payload: {
          ...body,
          id: journeyId,
          source: existing.source,
          publishedId: existing.publishedId,
        },
      }),
    );
    res.json(await getJourney(req, journeyId));
  });
  app.delete("/api/journeys/:id", async (req, res) => {
    const journeyId = id.parse(req.params.id);
    await getJourney(req, journeyId);
    await query(
      req.db
        .from("journeys")
        .delete()
        .eq("id", journeyId)
        .eq("user_id", req.userId),
    );
    res.status(204).end();
  });
  app.post("/api/journeys/:id/publish", async (req, res) => {
    const body = z
      .object({
        country: z.string().trim().min(1).max(100),
        caption: z.string().max(2000).default(""),
      })
      .strict()
      .parse(req.body);
    const postId = await query(
      req.db.rpc("publish_journey", {
        journey_id_input: id.parse(req.params.id),
        country_input: body.country,
        caption_input: body.caption,
      }),
    );
    res.status(201).json({ id: postId });
  });
  app.get("/api/posts", async (req, res) => {
    const offset = z.coerce
      .number()
      .int()
      .min(0)
      .default(0)
      .parse(req.query.offset);
    let q = req.db
      .from("published_trips")
      .select("*,published_stops(*)")
      .order("published_at", { ascending: false })
      .order("id")
      .range(offset, offset + 19);
    if (req.query.country)
      q = q.eq("country", z.string().max(100).parse(req.query.country));
    res.json({ items: await query(q), offset, limit: 20 });
  });
  app.get("/api/posts/:id", async (req, res) => {
    const post = await query(
      req.db
        .from("published_trips")
        .select("*,published_stops(*)")
        .eq("id", id.parse(req.params.id))
        .maybeSingle(),
    );
    if (!post) return res.status(404).json({ error: "Post not found." });
    res.json(post);
  });
  app.post("/api/posts/:id/reuse", async (req, res) => {
    const { startDate } = z
      .object({ startDate: date })
      .strict()
      .parse(req.body);
    const journeyId = await query(
      req.db.rpc("reuse_itinerary", {
        post_id_input: id.parse(req.params.id),
        start_date_input: startDate,
      }),
    );
    res.status(201).json(await getJourney(req, journeyId));
  });
  app.delete("/api/posts/:id", async (req, res) => {
    const rows = await query(
      req.db
        .from("published_trips")
        .delete()
        .eq("id", id.parse(req.params.id))
        .eq("user_id", req.userId)
        .select("id"),
    );
    if (!rows.length) return res.status(404).json({ error: "Post not found." });
    res.status(204).end();
  });
  app.get("/api/saved", async (req, res) => {
    const offset = z.coerce
      .number()
      .int()
      .min(0)
      .default(0)
      .parse(req.query.offset);
    res.json({
      items: await query(
        req.db
          .from("saved_trips")
          .select("trip_id,published_trips(*)")
          .eq("user_id", req.userId)
          .order("created_at", { ascending: false })
          .order("trip_id")
          .range(offset, offset + 19),
      ),
      offset,
      limit: 20,
    });
  });
  for (const [action, table] of [
    ["save", "saved_trips"],
    ["like", "trip_likes"],
  ]) {
    app.put(`/api/posts/:id/${action}`, async (req, res) => {
      await query(
        req.db
          .from(table)
          .upsert(
            { user_id: req.userId, trip_id: id.parse(req.params.id) },
            { onConflict: "user_id,trip_id", ignoreDuplicates: true },
          ),
      );
      res.status(204).end();
    });
    app.delete(`/api/posts/:id/${action}`, async (req, res) => {
      await query(
        req.db
          .from(table)
          .delete()
          .eq("user_id", req.userId)
          .eq("trip_id", id.parse(req.params.id)),
      );
      res.status(204).end();
    });
  }
  app.get("/api/posts/:id/comments", async (req, res) => {
    const offset = z.coerce
      .number()
      .int()
      .min(0)
      .default(0)
      .parse(req.query.offset);
    res.json({
      items: await query(
        req.db
          .from("comments")
          .select("*")
          .eq("trip_id", id.parse(req.params.id))
          .order("created_at")
          .order("id")
          .range(offset, offset + 49),
      ),
      offset,
      limit: 50,
    });
  });
  app.post("/api/posts/:id/comments", async (req, res) => {
    const { body } = z
      .object({ body: z.string().trim().min(1).max(1000) })
      .strict()
      .parse(req.body);
    res.status(201).json(
      await query(
        req.db
          .from("comments")
          .insert({
            body,
            trip_id: id.parse(req.params.id),
            user_id: req.userId,
          })
          .select()
          .single(),
      ),
    );
  });
  app.delete("/api/comments/:id", async (req, res) => {
    const rows = await query(
      req.db
        .from("comments")
        .delete()
        .eq("id", z.uuid().parse(req.params.id))
        .eq("user_id", req.userId)
        .select("id"),
    );
    if (!rows.length)
      return res.status(404).json({ error: "Comment not found." });
    res.status(204).end();
  });
  // Signed uploads avoid routing large image bodies through the API.
  app.post("/api/media/upload", async (req, res) => {
    const { extension } = z
      .object({ extension: z.enum(["jpg", "png", "webp"]) })
      .strict()
      .parse(req.body);
    const path = `${req.userId}/${randomUUID()}.${extension}`;
    const data = await query(
      req.db.storage.from("journal-media").createSignedUploadUrl(path),
    );
    res
      .status(201)
      .json({ path, signedUrl: data.signedUrl, token: data.token });
  });
  app.post("/api/media/read", async (req, res) => {
    const { path } = z
      .object({
        path: z
          .string()
          .max(400)
          .regex(/^[\w/-]+\.(jpg|png|webp)$/),
      })
      .strict()
      .parse(req.body);
    // Storage RLS allows owned photos and photos explicitly shared in a post.
    res.json(
      await query(
        req.db.storage.from("journal-media").createSignedUrl(path, 300),
      ),
    );
  });
  app.use((_req, res) => res.status(404).json({ error: "Route not found." }));
  app.use((error, _req, res, _next) => {
    if (error instanceof z.ZodError)
      return res
        .status(400)
        .json({
          error: "Invalid request.",
          issues: error.issues.map((i) => ({
            path: i.path,
            message: i.message,
          })),
        });
    const status =
      error.status >= 400 && error.status < 600 ? error.status : 500;
    res
      .status(status)
      .json({
        error:
          status === 500
            ? "Unexpected server error."
            : status === 413
              ? "Request too large."
              : status === 400 && error.type === "entity.parse.failed"
                ? "Invalid JSON."
                : error.message,
      });
  });
  return app;
}
