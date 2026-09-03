import type { Trip } from "../constants/trips";
export type Booking =
  "Not booked" | "Booked" | "No booking needed" | "Cancelled";
export type Kind = "Hotel" | "Restaurant" | "Activity";
export type Stop = {
  id: string;
  kind: Kind;
  name: string;
  day: number;
  endDay?: number;
  booking: Booking;
  visited: boolean;
  confirmation: string;
  bookingLink: string;
  cost: string;
  currency: string;
  cancellationDate: string;
  review: string;
  rating: number;
  photoUri?: string;
};
export type PublicStop = Pick<
  Stop,
  "kind" | "name" | "day" | "endDay" | "review" | "rating" | "photoUri"
>;
export type Journey = {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  status: "Planning" | "Traveling" | "Completed";
  stops: Stop[];
  source?: { id: string; author: string; title: string };
  publishedId?: string;
};
export const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
export function dateNumber(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new Error("Choose a valid calendar date.");
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  if (
    !Number.isFinite(timestamp) ||
    new Date(timestamp).toISOString().slice(0, 10) !== value
  )
    throw new Error("Choose a valid calendar date.");
  return timestamp;
}
export function addDays(date: string, days: number) {
  return new Date(dateNumber(date) + days * 86400000)
    .toISOString()
    .slice(0, 10);
}
export function dayCount(start: string, end: string) {
  const count = (dateNumber(end) - dateNumber(start)) / 86400000 + 1;
  if (count < 1)
    throw new Error("The return date must be on or after departure.");
  if (count > 366)
    throw new Error("This planner supports journeys up to 366 days.");
  return count;
}
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function validateJourney(journey: Journey) {
  if (!journey.title.trim() || !journey.destination.trim())
    throw new Error("Add a journey name and destination.");
  const count = dayCount(journey.startDate, journey.endDate);
  for (const stop of journey.stops) {
    if (!Number.isInteger(stop.rating) || stop.rating < 0 || stop.rating > 5)
      throw new Error("Ratings must be between 0 and 5.");
    if (!stop.name.trim()) throw new Error("Give each stop a name.");
    if (!Number.isInteger(stop.day) || stop.day < 0 || stop.day >= count)
      throw new Error(
        "A stop falls outside the journey dates. Move or remove it before shortening the trip.",
      );
    if (
      stop.kind === "Hotel" &&
      (!Number.isInteger(stop.endDay) ||
        stop.endDay! <= stop.day ||
        stop.endDay! >= count)
    )
      throw new Error(
        "Hotel checkout must follow check-in and fall within the trip.",
      );
    if (
      stop.cost &&
      (!Number.isFinite(Number(stop.cost)) || Number(stop.cost) < 0)
    )
      throw new Error("Enter a valid non-negative cost.");
    if (stop.cancellationDate) dateNumber(stop.cancellationDate);
    if (stop.bookingLink && !/^https?:\/\//i.test(stop.bookingLink))
      throw new Error("Booking links must start with https:// or http://.");
  }
}
export function bookingProgress(stops: Stop[]) {
  const required = stops.filter((s) => s.booking !== "No booking needed");
  return {
    booked: required.filter((s) => s.booking === "Booked").length,
    total: required.length,
  };
}
export function emptyStop(day = 0): Stop {
  return {
    id: uid(),
    kind: "Activity",
    name: "",
    day,
    booking: "Not booked",
    visited: false,
    confirmation: "",
    bookingLink: "",
    cost: "",
    currency: "USD",
    cancellationDate: "",
    review: "",
    rating: 0,
  };
}
// Explicit allowlist: reservation details never enter the public post.
export function publicStops(journey: Journey): PublicStop[] {
  return journey.stops
    .filter((s) => s.visited)
    .map((s) => ({
      kind: s.kind,
      name: s.name,
      day: s.day,
      ...(s.kind === "Hotel" ? { endDay: s.endDay } : {}),
      review: s.review,
      rating: s.rating,
      ...(s.photoUri ? { photoUri: s.photoUri } : {}),
    }));
}
export function copyItinerary(trip: Trip, startDate: string): Journey {
  const duration = trip.durationDays ?? Math.max(1, trip.itinerary.length);
  const templates: Pick<PublicStop, "name" | "day" | "kind" | "endDay">[] =
    trip.planStops ??
    trip.itinerary
      .map((name, day) => ({ name, day, kind: "Activity" as Kind }))
      .filter((s) => s.name.trim());
  const result: Journey = {
    id: uid(),
    title: trip.title,
    destination: trip.location,
    startDate,
    endDate: addDays(startDate, duration - 1),
    status: "Planning",
    source: { id: trip.id, author: trip.author, title: trip.title },
    stops: templates.map((s) => ({
      ...emptyStop(s.day),
      kind: s.kind,
      name: s.name,
      ...(s.kind === "Hotel" ? { endDay: s.endDay } : {}),
    })),
  };
  validateJourney(result);
  return result;
}
export function publishJourney(
  journey: Journey,
  author: string,
  currentDate = today(),
): Trip {
  validateJourney(journey);
  if (journey.status !== "Completed")
    throw new Error("Mark the journey completed before publishing.");
  if (dateNumber(journey.endDate) > dateNumber(currentDate))
    throw new Error("Publish after your journey has ended.");
  const stops = publicStops(journey);
  if (!stops.length)
    throw new Error("Mark at least one stop visited before publishing.");
  const duration = dayCount(journey.startDate, journey.endDate);
  return {
    id: journey.publishedId ?? `journey-${journey.id}`,
    author,
    avatar: "imgEllipse9",
    location: journey.destination,
    country: journey.destination.split(",").pop()!.trim(),
    title: journey.title,
    caption: `${duration} days exploring ${journey.destination}.`,
    photo: "imgPostImage",
    ...(stops.find((s) => s.photoUri)?.photoUri
      ? { photoUri: stops.find((s) => s.photoUri)!.photoUri }
      : {}),
    category: "Hidden Gems",
    likes: 0,
    itinerary: Array.from(
      { length: duration },
      (_, day) =>
        stops
          .filter((s) => s.day === day)
          .map((s) => s.name)
          .join(" · ") || "Free time",
    ),
    mine: true,
    durationDays: duration,
    planStops: stops,
    ...(journey.source ? { source: { ...journey.source } } : {}),
  };
}
