"""Map existing Supabase rows to the JSON expected by the Expo app.

SQL migrations define the tables; these functions do not create new ORM tables.
"""

SELECTION = "*,journey_stops(*,booking_details(*),journal_entries(*))"


def first(value):
    # A unique PostgREST relationship is an object; support legacy array fixtures.
    if isinstance(value, list):
        return value[0] if value else {}
    return value or {}


def to_journey(row):
    stops = []
    for stop in row.get("journey_stops", []):
        booking = first(stop.get("booking_details"))
        journal = first(stop.get("journal_entries"))
        result = {
            "id": stop["id"],
            "kind": stop["kind"],
            "name": stop["name"],
            "day": stop["day_number"],
            "visited": stop["visited"],
            "booking": booking.get("status") or "Not booked",
            "confirmation": booking.get("confirmation_number") or "",
            "bookingLink": booking.get("booking_url") or "",
            "cost": str(booking["cost"]) if booking.get("cost") is not None else "",
            "currency": booking.get("currency") or "USD",
            "cancellationDate": booking.get("cancellation_date") or "",
            "review": journal.get("review") or "",
            "rating": journal.get("rating") or 0,
        }
        if stop.get("end_day_number") is not None:
            result["endDay"] = stop["end_day_number"]
        if journal.get("photo_path"):
            result["photoUri"] = journal["photo_path"]
        stops.append(result)
    journey = {
        "id": row["id"],
        "title": row["title"],
        "destination": row["destination"],
        "startDate": row["start_date"],
        "endDate": row["end_date"],
        "status": row["status"],
        "stops": sorted(stops, key=lambda stop: stop["day"]),
    }
    if row.get("source_post_id"):
        journey["source"] = {
            "id": row["source_post_id"],
            "author": row.get("source_author"),
            "title": row.get("source_title"),
        }
    if row.get("published_post_id"):
        journey["publishedId"] = row["published_post_id"]
    return journey
