"""Application setup: middleware, errors and routers; business logic lives in services."""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException
from config import get_settings
from dependencies import get_current_user
from schemas.common import ErrorResponse
from utils.middleware import RequestLimitsMiddleware
from routers.users.routes import router as users_router
from routers.journeys.routes import router as journeys_router
from routers.posts.routes import router as posts_router
from routers.saved.routes import router as saved_router
from routers.comments.routes import router as comments_router
from routers.media.routes import router as media_router


def create_app(settings=None):
    @asynccontextmanager
    async def lifespan(app):
        # Missing credentials stop the real server at startup. Imports/tests need no .env.
        app.state.settings = settings or get_settings()
        yield

    app = FastAPI(
        title="WeTravel API",
        version="2.0.0",
        lifespan=lifespan,
        description="Python backend with Clerk sessions and Supabase. Authorize with a session JWT, never a secret key.",
    )
    # CORS needs its allowlist during app construction. Environment loading is deferred
    # to startup except when explicit settings are passed by run.py.
    app.add_middleware(RequestLimitsMiddleware)
    if settings is not None:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.allowed_origins,
            allow_methods=["GET", "POST", "PUT", "DELETE"],
            allow_headers=["Authorization", "Content-Type"],
        )

    @app.exception_handler(HTTPException)
    async def http_error(_request, exc):
        return JSONResponse(
            {"error": exc.detail}, status_code=exc.status_code, headers=exc.headers
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error(_request, exc):
        # Match the old API's 400 convention; omit input values (may be sensitive).
        issues = [
            {"path": list(error["loc"]), "message": error["msg"]}
            for error in exc.errors()
        ]
        return JSONResponse(
            {"error": "Invalid request.", "issues": issues}, status_code=400
        )

    @app.exception_handler(Exception)
    async def unexpected_error(_request, _exc):
        return JSONResponse({"error": "Unexpected server error."}, status_code=500)

    @app.get("/health", tags=["Health"])
    def health():
        """Process health only; does not prove live Clerk/Supabase connectivity."""
        return {"status": "ok"}

    errors = {
        code: {"model": ErrorResponse}
        for code in [400, 401, 403, 404, 409, 413, 429, 500, 502]
    }
    for router in [
        users_router,
        journeys_router,
        posts_router,
        saved_router,
        comments_router,
        media_router,
    ]:
        app.include_router(
            router, dependencies=[Depends(get_current_user)], responses=errors
        )

    # FastAPI normally documents 422. Our validation handler intentionally returns 400.
    original_openapi = app.openapi

    def openapi():
        document = original_openapi()
        for path in document["paths"].values():
            for operation in path.values():
                if isinstance(operation, dict) and "responses" in operation:
                    operation["responses"].pop("422", None)
        return document

    app.openapi = openapi
    return app


def application():
    """Uvicorn factory: load settings before configuring CORS."""
    return create_app(get_settings())
