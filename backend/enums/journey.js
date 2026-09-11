// Keep these values aligned with the PostgreSQL enums in the SQL migrations.
// Changing them is a database/API change, not just a label change in the UI.
export const JOURNEY_STATUSES = ["Planning", "Traveling", "Completed"];
export const STOP_KINDS = ["Hotel", "Restaurant", "Activity"];
export const BOOKING_STATUSES = [
  "Not booked",
  "Booked",
  "No booking needed",
  "Cancelled",
];
