import { z } from "zod";

export const id = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z0-9_-]+$/);
export const date = z.iso.date();
const blank = z.string().max(1000).default("");
export const stopSchema = z
  .object({
    id,
    kind: z.enum(["Hotel", "Restaurant", "Activity"]),
    name: z.string().trim().min(1).max(200),
    day: z.number().int().min(0).max(365),
    endDay: z.number().int().min(1).max(365).optional(),
    booking: z
      .enum(["Not booked", "Booked", "No booking needed", "Cancelled"])
      .default("Not booked"),
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
    status: z.enum(["Planning", "Traveling", "Completed"]).default("Planning"),
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

// PostgREST returns unique child relationships as objects, not arrays.
export function toJourney(row) {
  const one = (value) => (Array.isArray(value) ? value[0] : value);
  return {
    id: row.id,
    title: row.title,
    destination: row.destination,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    ...(row.source_post_id
      ? {
          source: {
            id: row.source_post_id,
            author: row.source_author,
            title: row.source_title,
          },
        }
      : {}),
    ...(row.published_post_id ? { publishedId: row.published_post_id } : {}),
    stops: (row.journey_stops ?? [])
      .map((s) => {
        const b = one(s.booking_details) ?? {},
          j = one(s.journal_entries) ?? {};
        return {
          id: s.id,
          kind: s.kind,
          name: s.name,
          day: s.day_number,
          ...(s.end_day_number == null ? {} : { endDay: s.end_day_number }),
          visited: s.visited,
          booking: b.status ?? "Not booked",
          confirmation: b.confirmation_number ?? "",
          bookingLink: b.booking_url ?? "",
          cost: b.cost == null ? "" : String(b.cost),
          currency: b.currency ?? "USD",
          cancellationDate: b.cancellation_date ?? "",
          review: j.review ?? "",
          rating: j.rating ?? 0,
          ...(j.photo_path ? { photoUri: j.photo_path } : {}),
        };
      })
      .sort((a, b) => a.day - b.day),
  };
}
