"""Real Python SDK calls against a fake HTTP transport; no live credentials used."""

import json
import httpx
import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from config import Settings
from main import create_app
from database import create_database, get_db
from dependencies import get_current_user
from models.user import CurrentUser


def settings():
    return Settings(
        _env_file=None,
        supabase_url="https://project.supabase.co",
        supabase_publishable_key="sb_publishable_test",
        clerk_secret_key="sk_test_dummy",
        clerk_authorized_parties="http://localhost:8081",
        cors_origins="http://localhost:8081",
    )


NOW = "2026-01-01T00:00:00+00:00"
INPUT = {
    "title": "Rome",
    "destination": "Italy",
    "startDate": "2020-01-01",
    "endDate": "2020-01-03",
    "stops": [],
}
TRIP = {
    "id": "trip1",
    "user_id": "user_alice",
    "title": "Rome",
    "destination": "Italy",
    "start_date": "2020-01-01",
    "end_date": "2020-01-03",
    "status": "Planning",
    "journey_stops": [],
}
PROFILE = {
    "user_id": "user_alice",
    "display_name": "Alice",
    "bio": "",
    "avatar_path": None,
    "created_at": NOW,
    "updated_at": NOW,
}
POST = {
    "id": "journey-trip1",
    "user_id": "user_alice",
    "author_name": "Alice",
    "title": "Rome",
    "destination": "Italy",
    "country": "Italy",
    "caption": "",
    "duration_days": 3,
    "cover_path": None,
    "source_post_id": None,
    "source_author": None,
    "source_title": None,
    "published_at": NOW,
    "updated_at": NOW,
    "published_stops": [],
}
COMMENT = {
    "id": "00000000-0000-4000-8000-000000000001",
    "trip_id": POST["id"],
    "user_id": "user_alice",
    "body": "Nice trip",
    "created_at": NOW,
    "updated_at": NOW,
}


@pytest.fixture
def api():
    captured = []

    def upstream(request):
        captured.append(request)
        assert request.headers["authorization"] == "Bearer test-session"
        assert request.headers["apikey"] == "sb_publishable_test"
        path = request.url.path
        if "/rpc/" in path:
            name = path.rsplit("/", 1)[1]
            return httpx.Response(
                200,
                json={
                    "save_journey": None,
                    "publish_journey": POST["id"],
                    "reuse_itinerary": TRIP["id"],
                }[name],
            )
        if "/storage/" in path:
            if "/upload/sign/" in path:
                return httpx.Response(
                    200,
                    json={
                        "url": "/object/upload/sign/journal-media/user_alice/photo.jpg?token=upload-token"
                    },
                )
            return httpx.Response(
                200,
                json={
                    "signedURL": "/object/sign/journal-media/user_alice/photo.jpg?token=read-token"
                },
            )
        table = path.rsplit("/", 1)[1]
        if request.url.params.get("id") == "eq.missing":
            return httpx.Response(200, json=[])
        rows = {
            "journeys": [TRIP],
            "profiles": [PROFILE],
            "published_trips": [POST],
            "saved_trips": [{"trip_id": POST["id"], "published_trips": POST}],
            "trip_likes": [],
            "comments": [COMMENT],
        }
        return httpx.Response(200, json=rows[table])

    user = CurrentUser("user_alice", "test-session")
    with httpx.Client(transport=httpx.MockTransport(upstream)) as transport:
        db = create_database(settings(), user, transport)
        app = create_app(settings())
        app.dependency_overrides[get_current_user] = lambda: user
        app.dependency_overrides[get_db] = lambda: db
        with TestClient(app) as client:
            yield client, captured


CASES = [
    ("GET", "/api/me", None, 200),
    ("PUT", "/api/me", {"display_name": "Alice"}, 200),
    ("GET", "/api/journeys", None, 200),
    ("POST", "/api/journeys", INPUT, 201),
    ("GET", "/api/journeys/trip1", None, 200),
    ("PUT", "/api/journeys/trip1", INPUT, 200),
    ("DELETE", "/api/journeys/trip1", None, 204),
    ("POST", "/api/journeys/trip1/publish", {"country": "Italy"}, 201),
    ("GET", "/api/posts?country=Italy", None, 200),
    ("GET", "/api/posts/journey-trip1", None, 200),
    ("DELETE", "/api/posts/journey-trip1", None, 204),
    ("POST", "/api/posts/journey-trip1/reuse", {"startDate": "2030-01-01"}, 201),
    ("GET", "/api/saved", None, 200),
    ("PUT", "/api/posts/journey-trip1/save", None, 204),
    ("DELETE", "/api/posts/journey-trip1/save", None, 204),
    ("PUT", "/api/posts/journey-trip1/like", None, 204),
    ("DELETE", "/api/posts/journey-trip1/like", None, 204),
    ("GET", "/api/posts/journey-trip1/comments", None, 200),
    ("POST", "/api/posts/journey-trip1/comments", {"body": "Nice trip"}, 201),
    ("DELETE", "/api/comments/" + COMMENT["id"], None, 204),
    ("POST", "/api/media/upload", {"extension": "jpg"}, 201),
    ("POST", "/api/media/read", {"path": "user_alice/photo.jpg"}, 200),
]


@pytest.mark.parametrize("method,path,body,status", CASES)
def test_all_routes_with_real_supabase_sdk(api, method, path, body, status):
    client, captured = api
    response = client.request(method, path, json=body)
    assert response.status_code == status, response.text
    assert captured, "The route must reach the database/Storage transport"
    if status == 204:
        assert not response.content
    if method == "DELETE":
        deletion = next(item for item in captured if item.method == "DELETE")
        assert deletion.url.params["user_id"] == "eq.user_alice"
    if path == "/api/journeys" and method == "POST":
        saved = json.loads(captured[0].content)["payload"]
        assert "user_id" not in saved and saved["id"]
    if path.endswith("/save") and method == "PUT":
        assert "resolution=ignore-duplicates" in captured[0].headers["prefer"]
    if path == "/api/media/read":
        assert response.json()["signedUrl"].startswith(
            "https://project.supabase.co/storage/v1/"
        )
        assert json.loads(captured[0].content)["expiresIn"] == "300"


def test_every_api_route_requires_a_session():
    with TestClient(create_app(settings())) as client:
        for method, path, body, _ in CASES:
            assert client.request(method, path, json=body).status_code == 401
        assert client.get("/health").json() == {"status": "ok"}
        assert client.get("/docs").status_code == 200


@pytest.mark.parametrize(
    "extra",
    [
        {"user_id": "user_bob"},
        {"publishedId": "spoof"},
        {"source": {}},
        {"id": "spoof"},
    ],
)
def test_no_client_owned_identity_fields(api, extra):
    client, captured = api
    assert client.post("/api/journeys", json={**INPUT, **extra}).status_code == 400
    assert not captured


def test_validation_and_missing_resource(api):
    client, captured = api
    for stop in [
        {"id": "s1", "kind": "Hotel", "name": "Hotel", "day": 0},
        {
            "id": "s1",
            "kind": "Activity",
            "name": "Walk",
            "day": 0,
            "photoUri": "user_bob/photo.jpg",
        },
        {
            "id": "s1",
            "kind": "Activity",
            "name": "Walk",
            "day": 0,
            "photoUri": "file:///image.jpg",
        },
    ]:
        assert (
            client.post("/api/journeys", json={**INPUT, "stops": [stop]}).status_code
            == 400
        )
    assert not captured
    assert client.get("/api/journeys/missing").status_code == 404
    assert client.get("/api/posts/missing").status_code == 404
    assert (
        client.post("/api/journeys", json={**INPUT, "startDate": 0}).status_code == 400
    )


def test_openapi_has_all_operations():
    doc = create_app().openapi()
    assert sum(len(item) for item in doc["paths"].values()) == 23
    for path, methods in doc["paths"].items():
        for operation in methods.values():
            if path.startswith("/api/"):
                assert operation["security"] == [{"ClerkSession": []}]
                assert "422" not in operation["responses"]


def test_body_limit_cors_and_rate_limit():
    with TestClient(create_app(settings())) as client:
        response = client.post(
            "/api/journeys",
            content=b"x" * (1024 * 1024 + 1),
            headers={"Origin": "http://localhost:8081"},
        )
        assert response.status_code == 413
        assert (
            response.headers["access-control-allow-origin"] == "http://localhost:8081"
        )
        for _ in range(119):
            assert client.get("/health").status_code == 200
        assert client.get("/health").status_code == 429


def test_bad_project_url_is_rejected():
    with pytest.raises(ValidationError):
        Settings(
            _env_file=None,
            supabase_url="https://project.supabase.co/rest/v1/",
            supabase_publishable_key="test",
            clerk_secret_key="test",
            clerk_authorized_parties="http://localhost",
            cors_origins="http://localhost",
        )
