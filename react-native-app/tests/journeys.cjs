/* global __filename */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const ts = require("typescript");
const Module = require("node:module");
const compiled = ts.transpileModule(
  fs.readFileSync("domain/journeys.ts", "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;
const domain = new Module(__filename);
domain._compile(compiled, __filename);
const {
  addDays,
  dayCount,
  emptyStop,
  validateJourney,
  bookingProgress,
  copyItinerary,
  publishJourney,
} = domain.exports;
const base = () => ({
  id: "test",
  title: "Rome",
  destination: "Rome, Italy",
  startDate: "2026-01-01",
  endDate: "2026-01-04",
  status: "Completed",
  stops: [
    {
      ...emptyStop(),
      name: "Hotel",
      kind: "Hotel",
      endDay: 3,
      visited: true,
      booking: "Booked",
      confirmation: "SECRET-123",
      bookingLink: "https://private.example",
      cost: "123",
      cancellationDate: "2025-12-30",
      review: "Lovely stay",
      rating: 4,
      photoUri: "data:image/jpeg;base64,private-photo",
    },
  ],
});
test("calendar dates handle leap years, DST and invalid ranges", () => {
  assert.equal(addDays("2024-02-28", 1), "2024-02-29");
  assert.equal(dayCount("2026-03-07", "2026-03-10"), 4);
  assert.equal(dayCount("2026-01-01", "2026-01-01"), 1);
  assert.throws(() => dayCount("2026-02-30", "2026-03-01"));
  assert.throws(() => dayCount("2026-01-04", "2026-01-01"));
  assert.throws(() => dayCount("2026-01-01", "2028-01-01"));
});
test("bookings count a hotel once and exclude no-booking-needed stops", () => {
  const statuses = ["Booked", "Not booked", "No booking needed", "Cancelled"];
  assert.deepEqual(
    bookingProgress(statuses.map((booking) => ({ ...emptyStop(), booking }))),
    { booked: 1, total: 3 },
  );
  assert.deepEqual(bookingProgress(base().stops), { booked: 1, total: 1 });
});
test("shortening trips cannot orphan stays or stops", () => {
  const j = base();
  validateJourney(j);
  assert.throws(() => validateJourney({ ...j, endDate: "2026-01-03" }));
  assert.throws(() =>
    validateJourney({ ...j, stops: [{ ...j.stops[0], endDay: 0 }] }),
  );
  assert.throws(() =>
    validateJourney({
      ...j,
      stops: [{ ...emptyStop(4), name: "Late activity" }],
    }),
  );
  assert.throws(() =>
    validateJourney({ ...j, stops: [{ ...j.stops[0], cost: "-1" }] }),
  );
  assert.throws(() =>
    validateJourney({ ...j, stops: [{ ...j.stops[0], rating: 6 }] }),
  );
});
test("publication is a snapshot with an explicit public allowlist", () => {
  const j = base();
  j.stops.push({ ...emptyStop(1), name: "Unvisited restaurant" });
  const p = publishJourney(j, "Aria", "2026-01-05");
  assert.equal(p.planStops.length, 1);
  for (const key of [
    "confirmation",
    "bookingLink",
    "cost",
    "currency",
    "cancellationDate",
    "booking",
    "visited",
  ])
    assert.equal(key in p.planStops[0], false, key);
  assert.equal(JSON.stringify(p).includes("SECRET-123"), false);
  assert.equal(p.planStops[0].review, "Lovely stay");
  j.stops[0].review = "Edited privately";
  assert.equal(p.planStops[0].review, "Lovely stay");
  assert.throws(() =>
    publishJourney({ ...j, status: "Planning" }, "Aria", "2026-01-05"),
  );
  assert.throws(() => publishJourney(j, "Aria", "2026-01-02"));
  assert.throws(() =>
    publishJourney({ ...j, stops: [] }, "Aria", "2026-01-05"),
  );
});
test("reuse keeps offsets and attribution but resets all personal records", () => {
  const original = publishJourney(base(), "Aria", "2026-01-05");
  const copied = copyItinerary(original, "2026-12-30");
  assert.equal(copied.endDate, "2027-01-02");
  assert.equal(copied.stops[0].endDay, 3);
  assert.equal(copied.source.author, "Aria");
  assert.equal(copied.stops[0].booking, "Not booked");
  assert.equal(copied.stops[0].visited, false);
  assert.equal(copied.stops[0].photoUri, undefined);
  assert.equal(copied.stops[0].review, "");
  assert.equal(copied.stops[0].confirmation, "");
  copied.stops[0].name = "Different hotel";
  assert.equal(original.planStops[0].name, "Hotel");
  const legacy = copyItinerary(
    {
      ...original,
      planStops: undefined,
      durationDays: undefined,
      itinerary: ["First", "", "Third"],
    },
    "2026-06-01",
  );
  assert.deepEqual(
    legacy.stops.map((s) => s.day),
    [0, 2],
  );
});
