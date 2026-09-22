import { verifyToken } from "@clerk/backend";
import { createDatabase } from "./database.js";

// Equivalent to FinSight's shared dependencies: verification and database
// access are supplied to the app, so tests can replace external services.
export function createDependencies(config) {
  return {
    origins: config.origins,
    authenticate: (token) =>
      verifyToken(token, {
        secretKey: config.clerkSecretKey,
        authorizedParties: config.authorizedParties,
      }),
    database: (token) => createDatabase(config, token),
  };
}

// All /api routes run through this guard before their router handles a request.
export function requireSession({ authenticate, database }) {
  return async (req, res, next) => {
    const match = /^Bearer (\S+)$/.exec(req.get("authorization") ?? "");
    if (!match)
      return res.status(401).json({ error: "Authentication required." });
    try {
      const identity = await authenticate(match[1]);
      if (!identity?.sub || !identity.sid || identity.sts === "pending") {
        return res.status(401).json({ error: "Active user session required." });
      }
      // Identity comes from verified claims, never from a client-supplied user ID.
      req.userId = identity.sub;
      req.db = database(match[1]);
      next();
    } catch {
      res.status(401).json({ error: "Invalid or expired session." });
    }
  };
}
