import { z } from "zod";

// Comment IDs are database-generated UUIDs; their author comes from the session.
export const commentIdSchema = z.uuid();
export const commentSchema = z
  .object({
    body: z.string().trim().min(1).max(1000),
  })
  .strict();
