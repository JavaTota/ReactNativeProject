import { randomUUID } from "node:crypto";
import { query } from "../utils/errors.js";

// Image bytes go straight to Storage; Express only issues upload permission.
export async function createUpload(db, userId, extension) {
  const path = `${userId}/${randomUUID()}.${extension}`;
  const data = await query(
    db.storage.from("journal-media").createSignedUploadUrl(path),
  );
  return { path, signedUrl: data.signedUrl, token: data.token };
}
// Storage RLS permits owned images and images referenced by a published stop.
// Expiring links are for rendering only; save the permanent path in the journal.
export function readMedia(db, path) {
  return query(db.storage.from("journal-media").createSignedUrl(path, 300));
}
