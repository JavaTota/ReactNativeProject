# WeTravel Python backend

A FastAPI backend organized like the Python project you supplied. It implements the 22 existing WeTravel API operations plus `/health`, using Clerk sessions and the existing Supabase database. This is a separate `backend-python` folder; the Express backend and Expo frontend have not been replaced.

## Run on Windows

Install Python 3.12. Extract `backend-python` alongside `react-native-app` and your existing `backend` folder. Stop the Express server before starting Python on the same port.

**PowerShell**, from the project root:

```powershell
cd backend-python
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
notepad .env
```

**Git Bash**, from the project root:

```bash
cd backend-python
py -3.12 -m venv .venv
./.venv/Scripts/python.exe -m pip install -r requirements.txt
cp .env.example .env
notepad .env
```

Run the copy command only once; keep any `.env` you have already configured. You may instead copy your existing WeTravel backend's `.env` into this folder. The variable names are the same. The uploaded FinSight sample's database URL and JWT secret are not used.

Configure the following in this backend's `.env`:

| Variable | Meaning |
| --- | --- |
| `SUPABASE_URL` | Project root URL, such as `https://PROJECT.supabase.co`; no `/rest/v1/` suffix |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key or legacy anon key |
| `CLERK_SECRET_KEY` | Clerk backend secret from the same instance used by the Expo app |
| `CLERK_AUTHORIZED_PARTIES` | Comma-separated frontend origins that may appear in session tokens |
| `CORS_ORIGINS` | Comma-separated browser origins allowed to call the API |
| `HOST` | `0.0.0.0` for access from your phone on the local network |
| `PORT` | `3001` by default |

Start in **PowerShell**:

```powershell
.\.venv\Scripts\python.exe run.py
```

Or **Git Bash**:

```bash
./.venv/Scripts/python.exe run.py
```

No virtual-environment activation is necessary with these commands. On macOS/Linux, use `python3 -m venv .venv` and `.venv/bin/python`.

Open:

- [Swagger UI](http://localhost:3001/docs): browse endpoints and try requests.
- [ReDoc](http://localhost:3001/redoc): read the API reference.
- [OpenAPI JSON](http://localhost:3001/openapi.json): generated from the running code.
- [Health](http://localhost:3001/health): process status, not a live integration check.

In Swagger, click **Authorize** and paste a Clerk **session JWT** from the signed-in frontend's `getToken()`. Enter only the token; Swagger adds `Bearer`. Do not enter your Clerk secret key. Token renewal stays with the Clerk frontend SDK. An expired token must be replaced. Native and web clients use the same API; on a phone, use your computer's LAN address instead of `localhost`.

## Database and Clerk setup

Use the native Clerk/Supabase third-party authentication integration in both dashboards. Session tokens must contain `role: authenticated`. Passwords, email verification and sign-in remain managed by Clerk. This API stores the application's display name and bio in `profiles`, and never creates a second password table.

The two SQL files under `supabase/migrations/` are unchanged copies from the Express backend:

1. `202609030001_wetravel.sql`
2. `202609100002_api.sql`

If you already applied both, **do not rerun them**. If you only applied the first, run the second. For a new project, run them in order in Supabase's SQL editor. Startup does not create tables or apply migrations automatically.

The per-request Supabase client carries the verified user's token for database and Storage calls. This retains the current row-level security rules. A direct SQLAlchemy connection as a database administrator would bypass those rules, so this version uses the Supabase Python SDK. The sample's folder organization is retained; its financial tables and custom password authentication are not copied.

## File responsibilities

| File or folder | What it does |
| --- | --- |
| `main.py` | Creates FastAPI, registers routers, CORS and error handlers |
| `run.py` | Starts the development server with reload enabled |
| `config.py` | Loads and validates this folder's environment settings |
| `database.py` | Supplies a Supabase client per request and closes its HTTP connections |
| `dependencies.py` | Provides `get_current_user`, used to protect every feature router |
| `utils/security.py` | Verifies Clerk tokens through the official Python SDK |
| `routers/users/routes.py` | GET/PUT current application profile |
| `routers/journeys/routes.py` | Private journey CRUD and publishing |
| `routers/posts/routes.py` | Feed, individual posts, reuse, likes and bookmarks |
| `routers/saved/routes.py` | Current user's saved posts |
| `routers/comments/routes.py` | List, create and delete comments |
| `routers/media/routes.py` | Signed photo upload and read URLs |
| `schemas/` | Pydantic request validation and response models; powers Swagger |
| `models/user.py` | Verified session identity, without storing a password |
| `models/journey.py` | Converts Supabase rows into the Expo app's journey format |
| `enums/journey.py` | Allowed journey, stop and booking status values |
| `services/` | Database operations and feature logic, separated from HTTP handlers |
| `utils/errors.py` | Converts database/storage failures into safe API errors |
| `utils/middleware.py` | Limits JSON body size and requests per IP |
| `tests/` | Offline route, SDK transport and signed-token tests |

Example: creating a trip enters `routers/journeys/routes.py`. FastAPI checks the session and validates `JourneyInput`; `journey_service.py` checks photo ownership and calls the existing `save_journey` SQL function. The SQL transaction saves the journey, stops, bookings and journals together. The mapper then formats the result for the frontend.

## API behavior

All `/api/*` routes require a Clerk bearer token. The actual URL paths and successful status codes match the existing Express API. Profiles, posts and comments use snake_case JSON; private journeys use camelCase. `GET /api/me` returns `profile: null` before the first `PUT /api/me`.

Create/update requests exclude server-owned `id`, `user_id`, `source`, and `publishedId`. Journey PUT replaces the entire editable trip, including the full stop list; it is not a PATCH. Saves remain last-write-wins. Hotel checkout must occur after check-in and within the journey. Journey dates include the first and last day and allow up to 366 days.

Publishing shares visited stop names, reviews, ratings and photos. It requires a completed journey, a past/current end date, a profile, and at least one visited stop. Reservation numbers, booking URLs, prices and unvisited stops stay private. Reusing a public post creates a fresh plan with new IDs, reset booking status and an empty journal. Bookmarks do not create editable plans.

Photo uploads go directly to Supabase Storage using the signed URL/token. JPEG, PNG and WebP are allowed, up to 10 MiB. Save the returned path in `photoUri`; do not persist a temporary device URI or signed URL. Read URLs expire after 300 seconds. Published photos become accessible through Storage policies; deleting a post cannot recall downloaded images or immediately invalidate previously issued links.

Validation errors return status 400 and `{ "error": "Invalid request.", "issues": [...] }`. FastAPI checks typed input before entering a service; an invalid PUT body can therefore return 400 before a missing journey is checked (the Express implementation checked that ownership first). Rate-limit responses are now JSON with status 429. These are documented differences; the successful API contracts stay compatible.

## Tests and generated documentation

PowerShell:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe export_openapi.py
```

In Git Bash, use `./.venv/Scripts/python.exe` for the same commands. `export_openapi.py` updates `openapi.yaml` from the actual route schemas; it does not need `.env` or live credentials.

Tests exercise all 22 API operations with the real Supabase SDK against mocked HTTP responses, verify that database and Storage requests carry the caller's token, and check Clerk verification with locally signed RSA test tokens. They also cover ownership filters, invalid inputs, body/rate limits, CORS and generated OpenAPI. No tests modify a real Supabase project. Live Clerk JWKS fetching, Supabase credentials, deployed RLS and real image uploads still need an integration test with your accounts. The SQL rules themselves are unchanged from the previously tested migrations.

## Next steps and deployment

After starting this backend, test `/api/me` with a real Clerk session. Then connect the Expo app's data fetching and saving to it. Existing AsyncStorage plans are not imported automatically; frontend changes are a separate step.

The `run.py` command is for development. A production process can use:

```bash
uvicorn main:application --factory --host 0.0.0.0 --port 3001 --no-proxy-headers
```

Configure HTTPS and your actual frontend origins at deployment. The included limiter is per-process and uses the connecting IP, not untrusted forwarded headers; use a trusted-proxy configuration and shared limiter for multiple workers/instances. Account deletion cleanup, moderation, automatic photo books and collaborative conflict handling are not implemented by this migration.

Reference documentation: [FastAPI application structure](https://fastapi.tiangolo.com/tutorial/bigger-applications/), [Clerk Python authentication](https://clerk.com/articles/how-to-add-authentication-to-a-python-backend), [Supabase Python client](https://supabase.com/docs/reference/python/initializing).
