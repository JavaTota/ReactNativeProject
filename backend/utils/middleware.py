"""Bound request memory and apply a simple per-process development rate limit."""

from collections import OrderedDict
from time import monotonic
from starlette.responses import JSONResponse


class RequestLimitsMiddleware:
    def __init__(self, app, max_bytes=1024 * 1024, requests_per_minute=120):
        self.app = app
        self.max_bytes = max_bytes
        self.limit = requests_per_minute
        self.clients = OrderedDict()

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        key = (scope.get("client") or ("unknown",))[0]
        now = monotonic()
        # Eviction bounds memory. Production multi-worker deployments need a shared limiter.
        while self.clients and next(iter(self.clients.values()))[0] <= now:
            self.clients.popitem(last=False)
        expires, count = self.clients.get(key, (now + 60, 0))
        if count >= self.limit:
            return await JSONResponse(
                {"error": "Too many requests."},
                status_code=429,
                headers={"Retry-After": str(max(1, int(expires - now)))},
            )(scope, receive, send)
        self.clients[key] = (expires, count + 1)
        if len(self.clients) > 10000:
            self.clients.popitem(last=False)

        # Count actual bytes, not only Content-Length (which clients can omit).
        body = bytearray()
        while True:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            body.extend(message.get("body", b""))
            if len(body) > self.max_bytes:
                return await JSONResponse(
                    {"error": "Request too large."}, status_code=413
                )(scope, receive, send)
            if not message.get("more_body", False):
                break
        consumed = False

        async def replay():
            nonlocal consumed
            if consumed:
                return await receive()
            consumed = True
            return {"type": "http.request", "body": bytes(body), "more_body": False}

        async def security_headers(message):
            if message["type"] == "http.response.start":
                message.setdefault("headers", []).extend(
                    [
                        (b"x-content-type-options", b"nosniff"),
                        (b"x-frame-options", b"DENY"),
                        (b"referrer-policy", b"no-referrer"),
                    ]
                )
            await send(message)

        await self.app(scope, replay, security_headers)
