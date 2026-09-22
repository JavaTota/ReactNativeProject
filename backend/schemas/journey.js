// Validate editable journey fields before calling the service. Strict schemas
// reject extra ownership fields; refinements check dates across related stops.
import { z } from "zod";

import { id, date } from "./common.js";
import {
  JOURNEY_STATUSES,
  STOP_KINDS,
  BOOKING_STATUSES,
} from "../enums/journey.js";
const blank = z.string().max(1000).default("");
export const stopSchema = z
  .object({
    id,
    kind: z.enum(STOP_KINDS),
    name: z.string().trim().min(1).max(200),
    day: z.number().int().min(0).max(365),
    endDay: z.number().int().min(1).max(365).optional(),
    booking: z.enum(BOOKING_STATUSES).default("Not booked"),
    visited: z.boolean().default(false),
    confirmation: blank,
    bookingLink: z
      .union([z.literal(""), z.url().regex(/^https?:\/\//)])
      .default(""),
    cost: z
      .string()
      .regex(/^(?:\d{1,10}(?:\.\d{1,2})?)?$/)
      .default(""),
    currency: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .default("USD"),
    cancellationDate: z.union([z.literal(""), date]).default(""),
    review: z.string().max(2000).default(""),
    rating: z.number().int().min(0).max(5).default(0),
    photoUri: z.string().max(400).optional(),
  })
  .strict();
export const journeySchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    destination: z.string().trim().min(1).max(160),
    startDate: date,
    endDate: date,
    status: z.enum(JOURNEY_STATUSES).default("Planning"),
    stops: z.array(stopSchema).max(1000).default([]),
  })
  .strict()
  .superRefine((j, ctx) => {
    const last = (Date.parse(j.endDate) - Date.parse(j.startDate)) / 86400000;
    if (last < 0 || last > 365)
      ctx.addIssue({
        code: "custom",
        message: "Journey must last 1–366 days.",
      });
    const seen = new Set();
    for (const s of j.stops) {
      if (seen.has(s.id))
        ctx.addIssue({ code: "custom", message: "Duplicate stop ID." });
      seen.add(s.id);
      if (
        s.day > last ||
        (s.kind === "Hotel" &&
          (s.endDay === undefined || s.endDay <= s.day || s.endDay > last))
      )
        ctx.addIssue({
          code: "custom",
          message: "Stop or hotel checkout is outside the journey.",
        });
      if (s.kind !== "Hotel" && s.endDay !== undefined)
        ctx.addIssue({
          code: "custom",
          message: "Only hotels have checkout days.",
        });
    }
  });

export function checkPhotoPaths(journey, userId) {
  for (const s of journey.stops) {
    if (
      s.photoUri &&
      (!s.photoUri.startsWith(`${userId}/`) ||
        !/^[\w/-]+\.(jpg|png|webp)$/.test(s.photoUri))
    ) {
      throw Object.assign(
        new Error("Photo must be a journal-media path owned by your account."),
        { status: 400 },
      );
    }
  }
}
