import { Router } from "express";
import { offsetSchema } from "../../schemas/common.js";
import { listSaved } from "../../services/social_service.js";

// Mounted at /api/saved; saved posts belong to the current account only.
export const router = Router();
router.get("/", async (req, res) => {
  res.json(
    await listSaved(req.db, req.userId, offsetSchema.parse(req.query.offset)),
  );
});
