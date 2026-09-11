import { createClient } from "@supabase/supabase-js";

// Create a separate client for each request: never share one user's token with
// another request. The publishable key does not bypass row-level security.
export function createDatabase(config, token) {
  return createClient(config.supabaseUrl, config.supabaseKey, {
    accessToken: async () => token,
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
