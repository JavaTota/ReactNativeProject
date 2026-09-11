import { query, notFound } from "../utils/errors.js";
import { getJourney } from "./journey_service.js";

// Public snapshots are written by a checked SQL transaction, not by copying
// arbitrary request JSON. Completion, ownership and visited stops are checked there.
export function publishJourney(db, journeyId, body) {
  return query(
    db.rpc("publish_journey", {
      journey_id_input: journeyId,
      country_input: body.country,
      caption_input: body.caption,
    }),
  );
}
export async function listPosts(db, offset, country) {
  let selection = db
    .from("published_trips")
    .select("*,published_stops(*)")
    .order("published_at", { ascending: false })
    .order("id")
    .range(offset, offset + 19);
  if (country) selection = selection.eq("country", country);
  return { items: await query(selection), offset, limit: 20 };
}
export async function getPost(db, postId) {
  const post = await query(
    db
      .from("published_trips")
      .select("*,published_stops(*)")
      .eq("id", postId)
      .maybeSingle(),
  );
  if (!post) throw notFound("Post not found.");
  return post;
}
export async function reusePost(db, userId, postId, startDate) {
  // SQL generates new IDs and resets bookings/journal details in one transaction.
  const journeyId = await query(
    db.rpc("reuse_itinerary", {
      post_id_input: postId,
      start_date_input: startDate,
    }),
  );
  return getJourney(db, userId, journeyId);
}
export async function deletePost(db, userId, postId) {
  const rows = await query(
    db
      .from("published_trips")
      .delete()
      .eq("id", postId)
      .eq("user_id", userId)
      .select("id"),
  );
  if (!rows.length) throw notFound("Post not found.");
}
