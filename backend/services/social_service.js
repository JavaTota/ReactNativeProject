import { query } from "../utils/errors.js";

// Bookmarks and likes have the same (user_id, trip_id) uniqueness rule.
// Only internal callers choose the table; it never comes from request input.
async function addRelation(db, userId, postId, table) {
  await query(
    db.from(table).upsert(
      { user_id: userId, trip_id: postId },
      {
        onConflict: "user_id,trip_id",
        ignoreDuplicates: true,
      },
    ),
  );
}
async function removeRelation(db, userId, postId, table) {
  await query(
    db.from(table).delete().eq("user_id", userId).eq("trip_id", postId),
  );
}
export const savePost = (db, userId, postId) =>
  addRelation(db, userId, postId, "saved_trips");
export const unsavePost = (db, userId, postId) =>
  removeRelation(db, userId, postId, "saved_trips");
export const likePost = (db, userId, postId) =>
  addRelation(db, userId, postId, "trip_likes");
export const unlikePost = (db, userId, postId) =>
  removeRelation(db, userId, postId, "trip_likes");

export async function listSaved(db, userId, offset) {
  const items = await query(
    db
      .from("saved_trips")
      .select("trip_id,published_trips(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .order("trip_id")
      .range(offset, offset + 19),
  );
  return { items, offset, limit: 20 };
}
