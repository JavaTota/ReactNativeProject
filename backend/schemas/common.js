import { z } from "zod";

// Shared validation rules, equivalent to reusable Pydantic fields in FinSight.
export const id = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z0-9_-]+$/);
export const date = z.iso.date();
export const offsetSchema = z.coerce.number().int().min(0).default(0);
