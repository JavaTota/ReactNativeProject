// Read environment settings in one place. Importing this file never reads secrets;
// server.js calls loadConfig only when starting the real server.
export function loadConfig(env = process.env) {
  for (const key of [
    "CLERK_SECRET_KEY",
    "SUPABASE_URL",
    "SUPABASE_PUBLISHABLE_KEY",
    "CLERK_AUTHORIZED_PARTIES",
    "CORS_ORIGINS",
  ]) {
    if (
      !env[key] ||
      env[key].includes("REPLACE_ME") ||
      env[key].includes("YOUR_PROJECT")
    ) {
      throw new Error(`Configure ${key} in backend/.env`);
    }
  }
  const list = (key) =>
    env[key]
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
  return {
    port: Number(env.PORT || 3001),
    host: env.HOST || "0.0.0.0",
    clerkSecretKey: env.CLERK_SECRET_KEY,
    authorizedParties: list("CLERK_AUTHORIZED_PARTIES"),
    origins: list("CORS_ORIGINS"),
    supabaseUrl: env.SUPABASE_URL,
    supabaseKey: env.SUPABASE_PUBLISHABLE_KEY,
  };
}
