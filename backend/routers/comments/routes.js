import { Router } from "express";
import { id, offsetSchema } from "../../schemas/common.js";
import { commentSchema, commentIdSchema } from "../../schemas/comment.js";
import * as comments from "../../services/comment_service.js";

// Mounted at /api because listing/creating uses a post URL while deletion uses
// a comment URL. This preserves the original frontend-facing API paths.
export const router = Router();
router.get("/posts/:id/comments", async (req, res) => {
  const offset = offsetSchema.parse(req.query.offset);
  res.json(
    await comments.listComments(req.db, id.parse(req.params.id), offset),
  );
});
router.post("/posts/:id/comments", async (req, res) => {
  const { body } = commentSchema.parse(req.body);
  res
    .status(201)
    .json(
      await comments.createComment(
        req.db,
        req.userId,
        id.parse(req.params.id),
        body,
      ),
    );
});
router.delete("/comments/:id", async (req, res) => {
  await comments.deleteComment(
    req.db,
    req.userId,
    commentIdSchema.parse(req.params.id),
  );
  res.status(204).end();
});
