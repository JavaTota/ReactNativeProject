import { verifyToken } from "@clerk/backend";
import { createClient } from "@supabase/supabase-js";
import { createApp } from "./app.js";

for (const key of [
  "CLERK_SECRET_KEY",
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "CLERK_AUTHORIZED_PARTIES",
  "CORS_ORIGINS",
]) {
  if (
    !process.env[key] ||
    process.env[key].includes("REPLACE_ME") ||
    process.env[key].includes("YOUR_PROJECT")
  )
    throw new Error(`Configure ${key} in backend/.env`);
}
const list = (key) =>
  process.env[key]
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
const app = createApp({
  origins: list("CORS_ORIGINS"),
  authenticate: (token) =>
    verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
      authorizedParties: list("CLERK_AUTHORIZED_PARTIES"),
    }),
  // Forward the verified user's token so PostgreSQL RLS still enforces ownership.
  database: (token) =>
    createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_PUBLISHABLE_KEY,
      {
        accessToken: async () => token,
        auth: { persistSession: false, autoRefreshToken: false },
      },
    ),
});
const port = Number(process.env.PORT || 3001);
const server = app.listen(port, process.env.HOST || "0.0.0.0", () =>
  console.log(`WeTravel API listening on port ${port}`),
);
process.on("SIGTERM", () => server.close());
