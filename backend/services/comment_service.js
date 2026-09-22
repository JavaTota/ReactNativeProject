import { query, notFound } from "../utils/errors.js";

// Comments are visible on posts, but only their author can delete them.
export async function listComments(db, postId, offset) {
  const items = await query(
    db
      .from("comments")
      .select("*")
      .eq("trip_id", postId)
      .order("created_at")
      .order("id")
      .range(offset, offset + 49),
  );
  return { items, offset, limit: 50 };
}
export function createComment(db, userId, postId, body) {
  return query(
    db
      .from("comments")
      .insert({ body, trip_id: postId, user_id: userId })
      .select()
      .single(),
  );
}
export async function deleteComment(db, userId, commentId) {
  const rows = await query(
    db
      .from("comments")
      .delete()
      .eq("id", commentId)
      .eq("user_id", userId)
      .select("id"),
  );
  if (!rows.length) throw notFound("Comment not found.");
}
