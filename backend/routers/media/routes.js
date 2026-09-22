import { Router } from "express";
import { uploadSchema, readMediaSchema } from "../../schemas/media.js";
import { createUpload, readMedia } from "../../services/media_service.js";

// Mounted at /api/media. These endpoints exchange storage paths and permissions,
// not image bytes. Storage enforces the file size/type and ownership rules.
export const router = Router();
router.post("/upload", async (req, res) => {
  const { extension } = uploadSchema.parse(req.body);
  res.status(201).json(await createUpload(req.db, req.userId, extension));
});
router.post("/read", async (req, res) => {
  const { path } = readMediaSchema.parse(req.body);
  res.json(await readMedia(req.db, path));
});
