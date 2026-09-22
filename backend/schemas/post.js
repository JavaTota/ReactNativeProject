import { z } from "zod";
import { date } from "./common.js";

// Publishing accepts presentation fields; the SQL transaction loads the trip
// and author itself so private booking fields cannot enter the public snapshot.
export const publishSchema = z
  .object({
    country: z.string().trim().min(1).max(100),
    caption: z.string().max(2000).default(""),
  })
  .strict();
export const reuseSchema = z.object({ startDate: date }).strict();
export const countrySchema = z.string().max(100);
