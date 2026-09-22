import { z } from "zod";

// Supabase returns {data, error} rather than throwing for ordinary DB errors.
// Convert errors here so every service follows the same HTTP error contract.
export async function query(promise) {
  const { data, error } = await promise;
  if (error) {
    const status =
      error.code === "42501"
        ? 403
        : error.code === "23505"
          ? 409
          : ["23503", "23514", "22P02", "P0001", "22007"].includes(error.code)
            ? 400
            : 502;
    throw Object.assign(
      new Error(
        status === 502
          ? "Database request failed."
          : "Request violates ownership or data rules.",
      ),
      { status },
    );
  }
  return data;
}

export function notFound(message) {
  return Object.assign(new Error(message), { status: 404 });
}

export function routeNotFound(_req, res) {
  res.status(404).json({ error: "Route not found." });
}

// Express recognizes error middleware by its four parameters. Keep _next even
// though it is unused. Never return stack traces or raw database errors.
export function errorHandler(error, _req, res, _next) {
  if (error instanceof z.ZodError)
    return res.status(400).json({
      error: "Invalid request.",
      issues: error.issues.map((issue) => ({
        path: issue.path,
        message: issue.message,
      })),
    });
  const status = error.status >= 400 && error.status < 600 ? error.status : 500;
  res
    .status(status)
    .json({
      error:
        status === 500
          ? "Unexpected server error."
          : status === 413
            ? "Request too large."
            : status === 400 && error.type === "entity.parse.failed"
              ? "Invalid JSON."
              : error.message,
    });
}
