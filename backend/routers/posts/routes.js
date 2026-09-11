import { Router } from "express";
import { id, offsetSchema } from "../../schemas/common.js";
import { countrySchema, reuseSchema } from "../../schemas/post.js";
import * as posts from "../../services/post_service.js";
import * as social from "../../services/social_service.js";

// Mounted at /api/posts. Post content is public, but this API requires a session.
export const router = Router();
router.get("/", async (req, res) => {
  const offset = offsetSchema.parse(req.query.offset);
  const country = req.query.country
    ? countrySchema.parse(req.query.country)
    : undefined;
  res.json(await posts.listPosts(req.db, offset, country));
});
router.get("/:id", async (req, res) => {
  res.json(await posts.getPost(req.db, id.parse(req.params.id)));
});
router.post("/:id/reuse", async (req, res) => {
  const { startDate } = reuseSchema.parse(req.body);
  res
    .status(201)
    .json(
      await posts.reusePost(
        req.db,
        req.userId,
        id.parse(req.params.id),
        startDate,
      ),
    );
});
router.delete("/:id", async (req, res) => {
  await posts.deletePost(req.db, req.userId, id.parse(req.params.id));
  res.status(204).end();
});
// Bookmarks and likes are idempotent: repeating the same action creates no duplicate.
router.put("/:id/save", async (req, res) => {
  await social.savePost(req.db, req.userId, id.parse(req.params.id));
  res.status(204).end();
});
router.delete("/:id/save", async (req, res) => {
  await social.unsavePost(req.db, req.userId, id.parse(req.params.id));
  res.status(204).end();
});
router.put("/:id/like", async (req, res) => {
  await social.likePost(req.db, req.userId, id.parse(req.params.id));
  res.status(204).end();
});
router.delete("/:id/like", async (req, res) => {
  await social.unlikePost(req.db, req.userId, id.parse(req.params.id));
  res.status(204).end();
});
