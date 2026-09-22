import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../main.js";

// These tests exercise the HTTP contract after splitting the routers. Supabase
// transport is stubbed; database.test.js separately executes the real SQL rules.
const trip = {
  id: "trip1",
  title: "Rome",
  destination: "Italy",
  start_date: "2020-01-01",
  end_date: "2020-01-03",
  status: "Completed",
  journey_stops: [],
};
const input = {
  title: "Rome",
  destination: "Italy",
  startDate: "2020-01-01",
  endDate: "2020-01-03",
  status: "Completed",
  stops: [],
};
const profile = { user_id: "user_alice", display_name: "Alice", bio: "" };
const post = { id: "journey-trip1", published_stops: [] };
const comment = {
  id: "00000000-0000-4000-8000-000000000001",
  body: "Nice trip",
};

function fixture({ missing = false, failure = null } = {}) {
  const calls = [];
  const db = {
    from(table) {
      const call = { table, filters: [] };
      calls.push(call);
      const row =
        table === "journeys"
          ? trip
          : table === "profiles"
            ? profile
            : table === "comments"
              ? comment
              : post;
      const result = (data) => ({ data, error: failure });
      const builder = {
        select() {
          return this;
        },
        order() {
          return this;
        },
        range() {
          return this;
        },
        eq(key, value) {
          call.filters.push([key, value]);
          return this;
        },
        upsert(value) {
          call.body = value;
          return this;
        },
        insert(value) {
          call.body = value;
          return this;
        },
        delete() {
          call.deleted = true;
          return this;
        },
        async maybeSingle() {
          return result(missing ? null : row);
        },
        async single() {
          return result(row);
        },
        then(resolve, reject) {
          return Promise.resolve(result(missing ? [] : [row])).then(
            resolve,
            reject,
          );
        },
      };
      return builder;
    },
    async rpc(name, args) {
      calls.push({ rpc: name, args });
      return {
        data:
          name === "publish_journey"
            ? post.id
            : name === "reuse_itinerary"
              ? trip.id
              : null,
        error: failure,
      };
    },
    storage: {
      from(bucket) {
        return {
          async createSignedUploadUrl(path) {
            calls.push({ bucket, path });
            return {
              data: {
                signedUrl: "https://storage.test/upload",
                token: "upload-token",
              },
              error: null,
            };
          },
          async createSignedUrl(path, expires) {
            calls.push({ bucket, path, expires });
            return {
              data: { signedUrl: "https://storage.test/read" },
              error: null,
            };
          },
        };
      },
    },
  };
  return {
    calls,
    app: createApp({
      authenticate: async () => ({ sub: "user_alice", sid: "sess_test" }),
      database: () => db,
    }),
  };
}

test("all feature routers preserve their URLs, success statuses and response shapes", async () => {
  const cases = [
    ["get", "/api/me", null, 200, (r) => assert.equal(r.userId, "user_alice")],
    [
      "put",
      "/api/me",
      { display_name: "Alice" },
      200,
      (r) => assert.equal(r.display_name, "Alice"),
    ],
    [
      "get",
      "/api/journeys",
      null,
      200,
      (r) => assert.equal(r.items[0].startDate, input.startDate),
    ],
    ["post", "/api/journeys", input, 201, (r) => assert.equal(r.id, "trip1")],
    [
      "get",
      "/api/journeys/trip1",
      null,
      200,
      (r) => assert.equal(r.id, "trip1"),
    ],
    [
      "put",
      "/api/journeys/trip1",
      input,
      200,
      (r) => assert.equal(r.id, "trip1"),
    ],
    ["delete", "/api/journeys/trip1", null, 204],
    [
      "post",
      "/api/journeys/trip1/publish",
      { country: "Italy" },
      201,
      (r) => assert.equal(r.id, post.id),
    ],
    [
      "get",
      "/api/posts?country=Italy",
      null,
      200,
      (r) => assert.equal(r.items[0].id, post.id),
    ],
    [
      "get",
      "/api/posts/journey-trip1",
      null,
      200,
      (r) => assert.equal(r.id, post.id),
    ],
    [
      "post",
      "/api/posts/journey-trip1/reuse",
      { startDate: "2030-01-01" },
      201,
      (r) => assert.equal(r.id, "trip1"),
    ],
    ["delete", "/api/posts/journey-trip1", null, 204],
    ["get", "/api/saved", null, 200, (r) => assert.equal(r.limit, 20)],
    ["put", "/api/posts/journey-trip1/save", null, 204],
    ["delete", "/api/posts/journey-trip1/save", null, 204],
    ["put", "/api/posts/journey-trip1/like", null, 204],
    ["delete", "/api/posts/journey-trip1/like", null, 204],
    [
      "get",
      "/api/posts/journey-trip1/comments",
      null,
      200,
      (r) => assert.equal(r.limit, 50),
    ],
    [
      "post",
      "/api/posts/journey-trip1/comments",
      { body: "Nice trip" },
      201,
      (r) => assert.equal(r.body, "Nice trip"),
    ],
    ["delete", `/api/comments/${comment.id}`, null, 204],
    [
      "post",
      "/api/media/upload",
      { extension: "jpg" },
      201,
      (r) => assert.match(r.path, /^user_alice\/.+\.jpg$/),
    ],
    [
      "post",
      "/api/media/read",
      { path: "user_alice/photo.jpg" },
      200,
      (r) => assert.equal(r.signedUrl, "https://storage.test/read"),
    ],
  ];
  for (const [method, path, body, status, check] of cases) {
    const { app } = fixture();
    // Every router must still be behind the shared authentication guard.
    await request(app)
      [method](path)
      .send(body ?? undefined)
      .expect(401);
    const response = await request(app)
      [method](path)
      .set("Authorization", "Bearer valid")
      .send(body ?? undefined)
      .expect(status);
    if (check) check(response.body);
    if (status === 204) assert.equal(response.text, "");
  }
});

test("owner-only deletion remains scoped to the verified account", async () => {
  for (const path of [
    "/api/journeys/trip1",
    "/api/posts/journey-trip1",
    `/api/comments/${comment.id}`,
    "/api/posts/journey-trip1/save",
    "/api/posts/journey-trip1/like",
  ]) {
    const { app, calls } = fixture();
    await request(app)
      .delete(path)
      .set("Authorization", "Bearer valid")
      .expect(204);
    const deletion = calls.find((call) => call.deleted);
    assert.ok(
      deletion.filters.some(
        ([key, value]) => key === "user_id" && value === "user_alice",
      ),
    );
  }
});

test("missing resources and upstream errors still use centralized JSON errors", async () => {
  const { app } = fixture({ missing: true });
  await request(app)
    .get("/api/journeys/missing")
    .set("Authorization", "Bearer valid")
    .expect(404, { error: "Journey not found." });
  await request(app)
    .put("/api/journeys/missing")
    .set("Authorization", "Bearer valid")
    .send({ bad: true })
    .expect(404);
  await request(app)
    .get("/api/posts/missing")
    .set("Authorization", "Bearer valid")
    .expect(404, { error: "Post not found." });
  const failed = fixture({
    failure: { code: "upstream", message: "PRIVATE DATABASE DETAIL" },
  });
  await request(failed.app)
    .get("/api/me")
    .set("Authorization", "Bearer valid")
    .expect(502, { error: "Database request failed." });
});
