// These are query/response mappings, not ORM table declarations.
// Supabase tables and RLS are defined in supabase/migrations.
export const journeySelection =
  "*,journey_stops(*,booking_details(*),journal_entries(*))";

// PostgREST returns unique child relationships as objects, not arrays.
export function toJourney(row) {
  const one = (value) => (Array.isArray(value) ? value[0] : value);
  return {
    id: row.id,
    title: row.title,
    destination: row.destination,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    ...(row.source_post_id
      ? {
          source: {
            id: row.source_post_id,
            author: row.source_author,
            title: row.source_title,
          },
        }
      : {}),
    ...(row.published_post_id ? { publishedId: row.published_post_id } : {}),
    stops: (row.journey_stops ?? [])
      .map((s) => {
        const b = one(s.booking_details) ?? {},
          j = one(s.journal_entries) ?? {};
        return {
          id: s.id,
          kind: s.kind,
          name: s.name,
          day: s.day_number,
          ...(s.end_day_number == null ? {} : { endDay: s.end_day_number }),
          visited: s.visited,
          booking: b.status ?? "Not booked",
          confirmation: b.confirmation_number ?? "",
          bookingLink: b.booking_url ?? "",
          cost: b.cost == null ? "" : String(b.cost),
          currency: b.currency ?? "USD",
          cancellationDate: b.cancellation_date ?? "",
          review: j.review ?? "",
          rating: j.rating ?? 0,
          ...(j.photo_path ? { photoUri: j.photo_path } : {}),
        };
      })
      .sort((a, b) => a.day - b.day),
  };
}
