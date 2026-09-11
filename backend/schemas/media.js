import { z } from "zod";

// A saved photo reference is a storage path, not a device URI or expiring URL.
export const uploadSchema = z
  .object({
    extension: z.enum(["jpg", "png", "webp"]),
  })
  .strict();
export const readMediaSchema = z
  .object({
    path: z
      .string()
      .max(400)
      .regex(/^[\w/-]+\.(jpg|png|webp)$/),
  })
  .strict();
