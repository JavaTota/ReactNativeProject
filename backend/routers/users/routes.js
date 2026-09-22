import { Router } from "express";
import { profileSchema } from "../../schemas/user.js";
import { getProfile, saveProfile } from "../../services/user_service.js";

// Mounted at /api/me. Routers parse HTTP input and choose response status;
// services perform the database operations.
export const router = Router();
router.get("/", async (req, res) => {
  const profile = await getProfile(req.db, req.userId);
  res.json({ userId: req.userId, profile });
});
router.put("/", async (req, res) => {
  res.json(
    await saveProfile(req.db, req.userId, profileSchema.parse(req.body)),
  );
});
