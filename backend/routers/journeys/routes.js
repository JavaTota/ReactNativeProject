import { Router } from "express";
import { id, offsetSchema } from "../../schemas/common.js";
import { journeySchema } from "../../schemas/journey.js";
import { publishSchema } from "../../schemas/post.js";
import * as journeys from "../../services/journey_service.js";
import { publishJourney } from "../../services/post_service.js";

// Mounted at /api/journeys. Authentication has already supplied req.db/userId.
export const router = Router();
router.get("/", async (req, res) => {
  res.json(
    await journeys.listJourneys(
      req.db,
      req.userId,
      offsetSchema.parse(req.query.offset),
    ),
  );
});
router.post("/", async (req, res) => {
  res
    .status(201)
    .json(
      await journeys.createJourney(
        req.db,
        req.userId,
        journeySchema.parse(req.body),
      ),
    );
});
router.get("/:id", async (req, res) => {
  res.json(
    await journeys.getJourney(req.db, req.userId, id.parse(req.params.id)),
  );
});
router.put("/:id", async (req, res) => {
  // Full replacement: include every stop that should remain in the journey.
  res.json(
    await journeys.updateJourney(
      req.db,
      req.userId,
      id.parse(req.params.id),
      req.body,
    ),
  );
});
router.delete("/:id", async (req, res) => {
  await journeys.deleteJourney(req.db, req.userId, id.parse(req.params.id));
  res.status(204).end();
});
router.post("/:id/publish", async (req, res) => {
  const body = publishSchema.parse(req.body);
  const postId = await publishJourney(req.db, id.parse(req.params.id), body);
  res.status(201).json({ id: postId });
});
