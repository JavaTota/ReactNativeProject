import { z } from "zod";

// Public application profile only. Clerk owns passwords and login email.
export const profileSchema = z
  .object({
    display_name: z.string().trim().min(1).max(100),
    bio: z.string().max(2000).default(""),
  })
  .strict();
