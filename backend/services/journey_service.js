import { randomUUID } from "node:crypto";
import { query, notFound } from "../utils/errors.js";
import { journeySelection, toJourney } from "../models/journey.js";
import { checkPhotoPaths, journeySchema } from "../schemas/journey.js";

export async function listJourneys(db, userId, offset) {
  const rows = await query(
    db
      .from("journeys")
      .select(journeySelection)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .order("id")
      .range(offset, offset + 19),
  );
  return { items: rows.map(toJourney), offset, limit: 20 };
}
export async function getJourney(db, userId, journeyId) {
  const row = await query(
    db
      .from("journeys")
      .select(journeySelection)
      .eq("id", journeyId)
      .eq("user_id", userId)
      .maybeSingle(),
  );
  // Missing and foreign journeys return the same response to avoid revealing IDs.
  if (!row) throw notFound("Journey not found.");
  return toJourney(row);
}
export async function createJourney(db, userId, body) {
  checkPhotoPaths(body, userId);
  const journeyId = randomUUID();
  // The RPC saves parent and children atomically: no half-saved bookings/journal.
  await query(db.rpc("save_journey", { payload: { ...body, id: journeyId } }));
  return getJourney(db, userId, journeyId);
}
export async function updateJourney(db, userId, journeyId, input) {
  const existing = await getJourney(db, userId, journeyId);
  // Check ownership before parsing replacements, preserving the original 404 behavior.
  const body = journeySchema.parse(input);
  checkPhotoPaths(body, userId);
  // Preserve attribution/publication fields loaded from the server.
  await query(
    db.rpc("save_journey", {
      payload: {
        ...body,
        id: journeyId,
        source: existing.source,
        publishedId: existing.publishedId,
      },
    }),
  );
  return getJourney(db, userId, journeyId);
}
export async function deleteJourney(db, userId, journeyId) {
  await getJourney(db, userId, journeyId);
  await query(
    db.from("journeys").delete().eq("id", journeyId).eq("user_id", userId),
  );
}
