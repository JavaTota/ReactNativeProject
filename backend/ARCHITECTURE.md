# Backend organization

WeTravel now follows the folder conventions in [FinSight-B's backend](https://github.com/Coding-Temple-Tech-Residency/FinSight-B/tree/main/backend). FinSight uses Python/FastAPI/SQLAlchemy; WeTravel keeps JavaScript/Express/Supabase. The organization is similar without introducing another runtime or replacing Clerk authentication.

## Where to find each responsibility

| FinSight                      | WeTravel                                            | Responsibility                                                                        |
| ----------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `main.py`                     | `main.js`                                           | Create the application, register middleware, mount feature routers                    |
| Uvicorn startup command       | `server.js`                                         | Load configuration and start listening for requests                                   |
| `config.py`                   | `config.js`                                         | Read environment variables and detect missing settings                                |
| `database.py`                 | `database.js`                                       | Create the database client for a request                                              |
| `dependencies.py`             | `dependencies.js`                                   | Verify the session and supply the current identity/database client                    |
| `routers/<feature>/routes.py` | `routers/<feature>/routes.js`                       | Connect HTTP methods and URLs to feature operations                                   |
| `services/*_service.py`       | `services/*_service.js`                             | Perform database operations and coordinate business rules                             |
| `schemas/*.py`                | `schemas/*.js`                                      | Validate request fields with Zod, serving the same purpose as Pydantic input schemas  |
| `models/*.py`                 | `models/journey.js` and `supabase/migrations/*.sql` | Map database results to API journeys; SQL defines the actual tables and relationships |
| `enums/*.py`                  | `enums/journey.js`                                  | Keep allowed journey, stop, and booking values together                               |
| `utils/security.py`           | `dependencies.js` and `utils/errors.js`             | Shared session checks and safe error responses                                        |

There is no SQLAlchemy-style ORM in this backend. `models/journey.js` defines the nested Supabase selection and converts database snake_case fields to the camelCase journey objects the app already expects. Creating JavaScript classes for every table would not create or validate the real database: that remains the job of the SQL migrations.

## Feature files

| Feature                                 | HTTP router                  | Service                       | Input validation     |
| --------------------------------------- | ---------------------------- | ----------------------------- | -------------------- |
| Profile                                 | `routers/users/routes.js`    | `services/user_service.js`    | `schemas/user.js`    |
| Private journeys, bookings and journals | `routers/journeys/routes.js` | `services/journey_service.js` | `schemas/journey.js` |
| Publishing and reusing trips            | Journey and post routers     | `services/post_service.js`    | `schemas/post.js`    |
| Feed and individual posts               | `routers/posts/routes.js`    | `services/post_service.js`    | `schemas/post.js`    |
| Bookmarks and likes                     | Post and saved routers       | `services/social_service.js`  | `schemas/common.js`  |
| Comments                                | `routers/comments/routes.js` | `services/comment_service.js` | `schemas/comment.js` |
| Photo upload/read permissions           | `routers/media/routes.js`    | `services/media_service.js`   | `schemas/media.js`   |

Bookings and journals remain part of a journey save. Their separate database tables do not require separate HTTP endpoints: saving them together is what lets the SQL transaction prevent partial updates.

## Follow a request through the code

For `POST /api/journeys`:

1. `main.js` runs security middleware, then the session guard from `dependencies.js`.
2. The guard verifies the Clerk token and sets `req.userId` and `req.db`. Each request gets its own Supabase client carrying that user's token.
3. `routers/journeys/routes.js` validates the body with `journeySchema` and calls `createJourney`.
4. `services/journey_service.js` checks photo ownership, generates an ID, and calls the `save_journey` SQL function. That function saves the journey and its related records in a transaction.
5. The service fetches the saved row, and `models/journey.js` turns it into the app's journey shape.
6. The router returns JSON with status 201. If validation or database work fails, Express sends the error to `utils/errors.js` instead.

The update path deliberately checks ownership before validating the replacement body, preserving the existing response for missing/foreign trips. Services accept the database client and user ID as arguments rather than accessing Express objects themselves.

## How to add or change a feature

Start with a schema for permitted request fields. Add a service function for database work, then a small router handler to validate input, call that service and send the response. Register a new feature router in `main.js`. Add a SQL migration only if the database structure or rules need to change.

Use `utils/errors.js` to unwrap Supabase results and return consistent errors. Keep user identity derived from the session. All `/api` routers must be mounted after `requireSession`; services must retain ownership filters on private records, and the database must retain its row-level security policies.

Comments explain decisions and boundaries—why a field stays private, why a save uses an RPC, or why each request gets a new client. Function and variable names explain routine operations.

## Installing this reorganized version

This is a replacement for the earlier backend code. Keep your existing `backend/.env` and its values. Copy the new backend files into that folder, including the updated `package.json`. The old `backend/src/app.js`, `backend/src/server.js`, and `backend/src/validation.js` are superseded and can be removed; the npm scripts now start the root `server.js`.

No dependency versions, API URLs, SQL migrations, or frontend files changed for this reorganization. Do not rerun migrations that were already applied. If this is your first backend setup, follow the migration instructions in `README.md`.

Stop the previous process with Ctrl+C, then run from `backend` in Git Bash or PowerShell:

```bash
npm ci
npm test
npm run dev
```

## Tests

- `tests/api.test.js`: authentication gates, input validation and journey mapping.
- `tests/routes.test.js`: all 22 API operations, their response/status contracts, shared authentication, owner-scoped deletions and errors.
- `tests/database.test.js`: actual application SQL in embedded PostgreSQL, including isolation between accounts, transaction rollback, publication and photo access.

These run without `.env` or live credentials. Real Clerk verification and Supabase HTTP/Storage integration still require a live integration test with your configured accounts.
