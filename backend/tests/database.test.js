import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("PostgreSQL: ownership, atomic saves, safe publishing, copying, and media access", async () => {
  const db = new PGlite();
  try {
    // Supabase platform scaffolding only; actual application migrations run below.
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth; create schema storage;
      create function auth.jwt() returns jsonb language sql stable as
        'select coalesce(nullif(current_setting(''request.jwt.claims'',true),''''),''{}'')::jsonb';
      create function storage.foldername(text) returns text[] language sql immutable as
        'select string_to_array($1,''/'')';
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
      alter table storage.objects enable row level security;
      grant usage on schema public,auth,storage to anon,authenticated;
      grant execute on all functions in schema auth,storage to anon,authenticated;
      alter default privileges in schema public grant select,insert,update,delete on tables to anon,authenticated;
      grant select,insert,update,delete on storage.objects to authenticated;
    `);
    const base = await readFile(
      new URL(
        "../supabase/migrations/202609030001_wetravel.sql",
        import.meta.url,
      ),
      "utf8",
    );
    // gen_random_uuid is built into PostgreSQL; PGlite does not need pgcrypto.
    await db.exec(base.replace("create extension if not exists pgcrypto;", ""));
    await db.exec(
      await readFile(
        new URL("../supabase/migrations/202609100002_api.sql", import.meta.url),
        "utf8",
      ),
    );
    const as = async (user) => {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claims',$1,false)", [
        JSON.stringify({ sub: user, role: "authenticated" }),
      ]);
      await db.exec("set role authenticated");
    };
    const save = (payload) =>
      db.query("select public.save_journey($1::jsonb)", [
        JSON.stringify(payload),
      ]);
    const publish = (journeyId) =>
      db.query("select public.publish_journey($1,'Italy','Our trip') as id", [
        journeyId,
      ]);
    const trip = {
      id: "trip1",
      title: "Rome",
      destination: "Rome",
      startDate: "2020-01-01",
      endDate: "2020-01-03",
      status: "Completed",
      stops: [
        {
          id: "stop1",
          kind: "Hotel",
          name: "Stay",
          day: 0,
          endDay: 2,
          visited: true,
          booking: "Booked",
          confirmation: "SECRET-123",
          cost: "100.00",
          review: "Lovely",
          rating: 5,
          photoUri: "user_alice/photo.jpg",
        },
        {
          id: "stop2",
          kind: "Activity",
          name: "Unvisited museum",
          day: 1,
          visited: false,
          review: "Do not publish",
          photoUri: "user_alice/private.jpg",
        },
      ],
    };
    await as("user_alice");
    await db.exec("insert into profiles(display_name) values('Alice')");
    await save(trip);
    await db.exec(
      "insert into storage.objects(bucket_id,name) values('journal-media','user_alice/photo.jpg'),('journal-media','user_alice/private.jpg')",
    );
    await assert.rejects(
      save({ ...trip, stops: [{ ...trip.stops[0], endDay: null }] }),
    );
    assert.equal(
      (await db.query("select count(*)::int as n from journey_stops")).rows[0]
        .n,
      2,
      "failed save rolls back deletion",
    );
    await assert.rejects(
      save({
        ...trip,
        stops: [{ ...trip.stops[0], photoUri: "user_bob/photo.jpg" }],
      }),
    );
    await assert.rejects(
      db.exec("update journeys set end_date='2020-01-01' where id='trip1'"),
    );
    await save({ ...trip, status: "Planning" });
    await assert.rejects(publish("trip1"));
    await save(trip);
    await as("user_bob");
    assert.equal((await db.query("select * from journeys")).rows.length, 0);
    assert.equal(
      (await db.query("select * from booking_details")).rows.length,
      0,
    );
    await assert.rejects(save(trip));
    await assert.rejects(publish("trip1"));
    assert.equal(
      (await db.query("select * from storage.objects")).rows.length,
      0,
    );
    await as("user_alice");
    const postId = (await publish("trip1")).rows[0].id;
    await publish("trip1");
    assert.equal(
      (await db.query("select * from published_trips")).rows.length,
      1,
      "republish uses same post",
    );
    await as("user_bob");
    const publicStops = (await db.query("select * from published_stops")).rows;
    assert.equal(publicStops.length, 1);
    assert.equal(publicStops[0].review, "Lovely");
    assert.equal(publicStops[0].confirmation_number, undefined);
    assert.ok(!JSON.stringify(publicStops).includes("SECRET-123"));
    assert.deepEqual(
      (await db.query("select name from storage.objects")).rows,
      [{ name: "user_alice/photo.jpg" }],
    );
    await assert.rejects(db.exec("update published_trips set title='Hijack'"));
    const newId = (
      await db.query("select reuse_itinerary($1,'2030-06-01') as id", [postId])
    ).rows[0].id;
    const copy = (await db.query("select * from journeys where id=$1", [newId]))
      .rows[0];
    assert.equal(copy.status, "Planning");
    assert.equal(copy.source_post_id, postId);
    assert.equal(copy.end_date.toISOString().slice(0, 10), "2030-06-03");
    const bookings = (await db.query("select * from booking_details")).rows;
    assert.equal(bookings.length, 1);
    assert.equal(bookings[0].status, "Not booked");
    assert.equal(bookings[0].confirmation_number, null);
    const journal = (await db.query("select * from journal_entries")).rows[0];
    assert.equal(journal.review, "");
    assert.equal(journal.photo_path, null);
    assert.equal(
      (await db.query("select visited from journey_stops")).rows[0].visited,
      false,
    );
    await as("user_alice");
    assert.equal(
      (
        await db.query(
          "delete from storage.objects where name='user_alice/photo.jpg' returning name",
        )
      ).rows.length,
      0,
      "cannot delete a published photo",
    );
    await db.query("delete from published_trips where id=$1", [postId]);
    await as("user_bob");
    assert.equal(
      (await db.query("select * from storage.objects")).rows.length,
      0,
      "unpublishing revokes new photo reads",
    );
  } finally {
    await db.close();
  }
});
