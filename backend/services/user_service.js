import { query } from "../utils/errors.js";

// Services accept a request-scoped database client and verified user ID.
// They do not depend on Express req/res objects, making them reusable.
export function getProfile(db, userId) {
  return query(
    db.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
  );
}
export function saveProfile(db, userId, body) {
  return query(
    db
      .from("profiles")
      .upsert({
        ...body,
        user_id: userId,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single(),
  );
}
