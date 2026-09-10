import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../src/app.js";
import { journeySchema, toJourney } from "../src/validation.js";

const body = {
  title: "Italy",
  destination: "Rome",
  startDate: "2026-08-01",
  endDate: "2026-08-03",
  stops: [],
};
const app = createApp({
  authenticate: async (token) => {
    if (token === "invalid") throw new Error("bad signature");
    return {
      sub: "user_alice",
      sid: "sess_123",
      sts: token === "pending" ? "pending" : "active",
    };
  },
  database: () => {
    throw new Error("Database should not be reached");
  },
});
// Use a separate factory: database construction itself happens after authentication.
const validationApp = createApp({
  authenticate: async () => ({ sub: "user_alice", sid: "sess_123" }),
  database: () => ({
    rpc: () => {
      throw new Error("Invalid input reached database");
    },
  }),
});

test("health works without authentication; protected API fails closed", async () => {
  await request(app).get("/health").expect(200);
  await request(app).get("/api/me").expect(401);
  await request(app)
    .get("/api/me")
    .set("Authorization", "Bearer invalid")
    .expect(401);
  await request(app)
    .get("/api/me")
    .set("Authorization", "Bearer pending")
    .expect(401);
});
test("client cannot supply ownership or publication identity", async () => {
  for (const field of ["user_id", "source", "publishedId", "id"]) {
    await request(validationApp)
      .post("/api/journeys")
      .set("Authorization", "Bearer valid")
      .send({ ...body, [field]: "spoof" })
      .expect(400);
  }
});
test("foreign and local-device photo paths are rejected before saving", async () => {
  for (const photoUri of [
    "user_bob/photo.jpg",
    "file:///camera/photo.jpg",
    "user_alice/../bob.jpg",
  ]) {
    await request(validationApp)
      .post("/api/journeys")
      .set("Authorization", "Bearer valid")
      .send({
        ...body,
        stops: [{ id: "s1", kind: "Activity", name: "Walk", day: 0, photoUri }],
      })
      .expect(400);
  }
});
test("hotel checkout, duplicate stops, and calendar dates are validated", () => {
  const hotel = { id: "s1", kind: "Hotel", name: "Hotel", day: 0 };
  assert.equal(
    journeySchema.safeParse({ ...body, stops: [hotel] }).success,
    false,
  );
  assert.equal(
    journeySchema.safeParse({ ...body, stops: [{ ...hotel, endDay: 3 }] })
      .success,
    false,
  );
  assert.equal(
    journeySchema.safeParse({ ...body, stops: [{ ...hotel, endDay: 2 }] })
      .success,
    true,
  );
  assert.equal(
    journeySchema.safeParse({ ...body, startDate: "2026-02-30" }).success,
    false,
  );
  assert.equal(
    journeySchema.safeParse({
      ...body,
      stops: [
        { ...hotel, endDay: 2 },
        { ...hotel, endDay: 2 },
      ],
    }).success,
    false,
  );
});
test("unique PostgREST child objects retain booking and journal values", () => {
  const mapped = toJourney({
    id: "j1",
    journey_stops: [
      {
        id: "s1",
        day_number: 0,
        booking_details: {
          status: "Booked",
          confirmation_number: "PRIVATE",
          cost: 12.5,
        },
        journal_entries: {
          review: "Nice",
          rating: 4,
          photo_path: "user_alice/photo.jpg",
        },
      },
    ],
  });
  assert.equal(mapped.stops[0].confirmation, "PRIVATE");
  assert.equal(mapped.stops[0].cost, "12.5");
  assert.equal(mapped.stops[0].review, "Nice");
});
test("verified token reaches the database and user ID comes from its claims", async () => {
  const filters = [];
  const query = {
    select() {
      return this;
    },
    eq(key, value) {
      filters.push([key, value]);
      return this;
    },
    async maybeSingle() {
      return { data: { display_name: "Alice" }, error: null };
    },
  };
  let forwarded;
  const happy = createApp({
    authenticate: async () => ({ sub: "user_alice", sid: "sess_123" }),
    database: (token) => {
      forwarded = token;
      return { from: () => query };
    },
  });
  const response = await request(happy)
    .get("/api/me")
    .set("Authorization", "Bearer valid")
    .expect(200);
  assert.equal(forwarded, "valid");
  assert.deepEqual(filters, [["user_id", "user_alice"]]);
  assert.equal(response.body.userId, "user_alice");
});
