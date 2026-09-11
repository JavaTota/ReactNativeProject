# WeTravel backend

An Express API backed by Supabase PostgreSQL and Storage. Clerk authenticates users. This folder runs separately from the Expo app; it does not change the frontend or migrate its existing AsyncStorage data automatically.

The code is organized like FinSight-B, with feature routers, services, schemas, and shared configuration. Read [ARCHITECTURE.md](./ARCHITECTURE.md) for the file map, a request walkthrough, and instructions for replacing the earlier backend while keeping your `.env`.

## What is stored where

| Data                                                      | Source of truth                                          |
| --------------------------------------------------------- | -------------------------------------------------------- |
| Passwords, email verification, login identity, sessions   | Clerk                                                    |
| Public display name and bio                               | Supabase `profiles`                                      |
| Private plans, hotels, restaurants, activities            | Supabase `journeys` and `journey_stops`                  |
| Booking status, confirmation, price, cancellation date    | Supabase `booking_details`, accessible only to the owner |
| Reviews, ratings, journal photo references                | Supabase `journal_entries`                               |
| Uploaded photos                                           | Supabase Storage `journal-media`                         |
| Published itinerary snapshots, bookmarks, likes, comments | Supabase public/social tables                            |

React state still holds temporary form input and fetched data. It must not serve as the only persisted copy of a trip. Clerk's Expo SDK should keep managing the session with SecureStore on native devices. This API verifies the session token on each request, then forwards it to Supabase so database row-level security also checks ownership. There is no custom password table or `/login` endpoint.

## Windows PowerShell setup

Place this folder alongside `react-native-app`:

```text
ReactNativeProject/
  backend/
  react-native-app/
```

Use Node.js 22 or later. From the repository root:

```powershell
cd backend
npm ci
Copy-Item .env.example .env
notepad .env
```

Only copy the example the first time; do not overwrite an already configured `.env`.

Fill in:

| Variable                   | Value                                                                              |
| -------------------------- | ---------------------------------------------------------------------------------- |
| `SUPABASE_URL`             | Your Supabase project URL                                                          |
| `SUPABASE_PUBLISHABLE_KEY` | The same project's publishable key, or legacy anon key; never its service-role key |
| `CLERK_SECRET_KEY`         | Your Clerk application's secret key; backend only                                  |
| `CLERK_AUTHORIZED_PARTIES` | Comma-separated origins of your frontend, e.g. `http://localhost:8081`             |
| `CORS_ORIGINS`             | Comma-separated allowed browser frontend origins                                   |
| `PORT`                     | Defaults to `3001`                                                                 |
| `HOST`                     | Defaults to `0.0.0.0`, allowing a phone on your local network to reach it          |

Keep `.env` private. Never add `EXPO_PUBLIC_` to the Clerk secret key or copy it into the Expo app. The backend uses the same Clerk instance as the frontend.

### Connect Clerk and Supabase

1. Enable Supabase compatibility in Clerk's **Connect with Supabase** integration.
2. In Supabase, add Clerk under **Authentication → Third-Party Auth**, using that Clerk instance's domain.
3. Sign in again after changing the integration so the session token includes `role: authenticated`.

Use the native third-party integration, not the older Supabase JWT template workflow. See [Supabase's Clerk integration guide](https://supabase.com/docs/guides/auth/third-party/clerk). Token verification follows [Clerk's backend SDK documentation](https://clerk.com/docs/reference/backend/verify-token).

### Create the database

In your Supabase SQL editor, run the supplied files in this order:

1. `supabase/migrations/202609030001_wetravel.sql`
2. `supabase/migrations/202609100002_api.sql`

If you already ran the first migration from `react-native-app/supabase`, skip it: this is an identical copy. Run the second migration once. It adds publication/copy transactions, tighter validation, and photo access rules. It intentionally fails if old hotel rows have no checkout day or profiles violate the new text limits; correct those rows before rerunning. It does not delete existing user data. For CLI-managed databases, copy only unapplied migrations into your existing migration history instead of creating a second project history.

Then start the API:

```powershell
npm test
npm run dev
```

In another PowerShell window:

```powershell
Invoke-RestMethod http://localhost:3001/health
```

Expected result: `status: ok`. This checks that the process is running, not whether your Supabase or Clerk configuration is valid. Authenticated requests below exercise those integrations.

For a physical phone, the future frontend API URL must be your computer's local network address, such as `http://192.168.1.20:3001`. `localhost` on a phone refers to the phone. Add the actual web frontend origin to both origin variables when using a LAN browser. Native requests may have no browser origin; any `azp` claim in their token must match the configured allowlist. Keep the phone and computer on the same network and allow Node through Windows Firewall for your private network if needed.

## API contract

All `/api/*` routes require `Authorization: Bearer <Clerk session token>`. Obtain the token from the logged-in Clerk SDK with `getToken()`; do not invent tokens, save passwords in application storage, or use a Supabase service key. The API derives the current user from the verified token. Unknown ownership IDs are never accepted in request bodies.

`GET /api/me` returns `{ userId, profile }`; `profile` is `null` until the user saves a display name. Email and login settings remain in Clerk and are not exposed in the public profile.

| Method       | Path                                | Input / result                                                                               |
| ------------ | ----------------------------------- | -------------------------------------------------------------------------------------------- |
| GET          | `/health`                           | Public process health                                                                        |
| GET          | `/api/me`                           | Identity and application profile                                                             |
| PUT          | `/api/me`                           | `{ "display_name": "Jo", "bio": "Travel lover" }`                                            |
| GET          | `/api/journeys?offset=0`            | Current user's private journeys, 20 per page                                                 |
| POST         | `/api/journeys`                     | Create a journey from the body below; returns the saved journey                              |
| GET          | `/api/journeys/:id`                 | Owner-only journey with bookings and journal                                                 |
| PUT          | `/api/journeys/:id`                 | Replace the entire editable journey, including its complete stop list                        |
| DELETE       | `/api/journeys/:id`                 | Delete own private journey; an already published snapshot remains                            |
| POST         | `/api/journeys/:id/publish`         | `{ "country": "Italy", "caption": "Three days in Rome" }`; returns `{ "id": "journey-..." }` |
| GET          | `/api/posts?country=Italy&offset=0` | Feed, 20 per page; optional exact country match                                              |
| GET          | `/api/posts/:id`                    | One published itinerary and its published stops                                              |
| DELETE       | `/api/posts/:id`                    | Unpublish own post; removes its saves, likes, comments and public stop rows                  |
| POST         | `/api/posts/:id/reuse`              | `{ "startDate": "2027-06-01" }`; returns a new private plan                                  |
| GET          | `/api/saved?offset=0`               | Current user's saved posts, 20 per page                                                      |
| PUT / DELETE | `/api/posts/:id/save`               | Save / unsave, no body                                                                       |
| PUT / DELETE | `/api/posts/:id/like`               | Like / unlike, no body                                                                       |
| GET          | `/api/posts/:id/comments?offset=0`  | Comments, 50 per page                                                                        |
| POST         | `/api/posts/:id/comments`           | `{ "body": "Thanks for the itinerary!" }`                                                    |
| DELETE       | `/api/comments/:id`                 | Delete own comment                                                                           |
| POST         | `/api/media/upload`                 | `{ "extension": "jpg" }`; returns `{ path, signedUrl, token }`                               |
| POST         | `/api/media/read`                   | `{ "path": "user_.../image.jpg" }`; returns `{ signedUrl }` valid for 300 seconds            |

List routes return `{ items, offset, limit }`. Journey JSON uses the existing app's camelCase fields. Profile, post, saved-post, and comment responses use database snake_case fields. Public stop order should use `sort_order`; nested PostgREST arrays are not guaranteed to be sorted. All IDs are strings; day numbers are zero-based. A trip includes both its first and last day, up to 366 days.

Example journey body:

```json
{
  "title": "Three days in Rome",
  "destination": "Rome, Italy",
  "startDate": "2027-06-01",
  "endDate": "2027-06-03",
  "status": "Planning",
  "stops": [
    {
      "id": "hotel-1",
      "kind": "Hotel",
      "name": "My hotel",
      "day": 0,
      "endDay": 2,
      "booking": "Booked",
      "visited": false,
      "confirmation": "MY-RESERVATION",
      "bookingLink": "https://example.com/reservation",
      "cost": "240.00",
      "currency": "EUR",
      "cancellationDate": "2027-05-28",
      "review": "",
      "rating": 0
    },
    {
      "id": "activity-1",
      "kind": "Activity",
      "name": "Visit the Colosseum",
      "day": 1,
      "booking": "Not booked"
    }
  ]
}
```

Use new UUIDs for stop IDs in the real app. IDs must be unique across the database. The server generates journey IDs; omit `id`, `user_id`, `source`, and `publishedId` from create/update bodies. Hotel `endDay` is checkout and must be greater than `day`. Restaurant/activity stops have no `endDay`. Booking status is one of `Not booked`, `Booked`, `No booking needed`, or `Cancelled`. Price is a decimal string, not a floating-point amount. Ratings are integers from 0 (unrated) to 5.

### Photos, publishing, and reusing

Upload flow: request a signed upload, upload the image bytes to Supabase with `uploadToSignedUrl(path, token, bytes, { contentType })`, then save the returned storage `path` in a stop's `photoUri`. Never save a temporary `file://` URI or signed URL as the persisted photo reference. JPEG, PNG, and WebP are allowed, up to 10 MiB. Uploads use new paths and cannot overwrite existing photos. Private and published image rendering both use `/api/media/read`; storage policies decide access.

Publishing requires an existing profile, `Completed` status, an end date no later than today in database time, and at least one visited stop. Publication copies visited stop names, day offsets, reviews, ratings, and photo references into a snapshot. It omits confirmations, booking URLs, prices, cancellation dates, and unvisited stops. The frontend must explain that publishing makes these journal reviews/photos shareable. The public itinerary tables are readable through Supabase by design; the API itself requires login.

Changing a private trip does not change its published snapshot until republished. Republish updates the same post ID. Journal image files are shared by reference and become readable to signed-in users when referenced by a published stop. Removing a post blocks new signed links unless another post still references that photo; existing links can work for up to five minutes and previously downloaded images cannot be recalled. Deleting a private trip does not remove its published post or uploaded images. The legacy `published-media` bucket remains available from the base schema but this API does not use it.

Reusing copies the public stops and original duration onto new dates. It retains attribution, generates new IDs, sets status to `Planning`, and resets bookings to `Not booked`. It does not copy another person's journal, reviews, photos, or reservation information. Saving a post is only a bookmark; reusing it creates an editable plan.

Errors are JSON `{ error }`; validation errors also include `issues`. Status codes include 400 invalid input/business rule, 401 invalid session, 403 denied database operation, 404 missing/foreign resource, 409 conflict, 413 oversized request, 429 rate limit, and 502 upstream database failure. No credentials or database internals are returned in errors.

## Verification and remaining work

`npm test` checks API authentication gates and validation, plus both SQL migrations in embedded PostgreSQL (PGlite). Database tests execute as two different authenticated users and check cross-account isolation, rollback after failed saves, date constraints, publication filtering, photo visibility, and clean itinerary copies. The harness simulates Supabase's auth/storage schemas; it does not contact real Clerk, PostgREST, or the Storage upload service.

Before connecting the frontend, run a live test with two Clerk accounts against your configured Supabase project: save a trip, verify the other account cannot read it, upload/read a photo, publish, and reuse. Live credentials were not available during implementation.

Next frontend work: call `/api/me` after login; load/save plans through this API; upload photos; connect publish, bookmark, and reuse actions; and offer a one-time import of the current account's local plans. React state can cache server responses. Clear that cache on sign-out. Do not silently import old shared demo data into a real account.

This initial backend uses full-trip replacement and last-write-wins; simultaneous edits from two devices need revision/conflict handling before collaborative editing. It does not yet implement automatic photo-book generation, follows, notifications, account-deletion cleanup, or content moderation. Before public deployment, configure HTTPS, your real frontend origins, proxy-aware rate limiting if behind a trusted proxy, and a shared limiter if running multiple API instances. `npm start` starts one API process; deployment and live database migrations are separate steps.
