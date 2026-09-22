"""Exercise the real Clerk verifier with locally signed test JWTs, without JWKS network calls."""

from time import time
from types import SimpleNamespace
import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
from fastapi import HTTPException
from clerk_backend_api.security import authenticate_request as real_authenticate
from utils import security
from tests.test_api import settings


@pytest.fixture
def signer(monkeypatch):
    private = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    public = (
        private.public_key()
        .public_bytes(
            serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo
        )
        .decode()
    )

    def verify(request, options):
        options.jwt_key = public
        options.secret_key = None
        return real_authenticate(request, options)

    monkeypatch.setattr(security, "authenticate_request", verify)

    def sign(changes=None, wrong_key=False):
        now = int(time())
        claims = {
            "sub": "user_alice",
            "sid": "sess_test",
            "azp": "http://localhost:8081",
            "iss": "https://test.clerk.accounts.dev",
            "iat": now,
            "nbf": now - 1,
            "exp": now + 60,
        }
        claims.update(changes or {})
        key = (
            rsa.generate_private_key(public_exponent=65537, key_size=2048)
            if wrong_key
            else private
        )
        return jwt.encode(claims, key, algorithm="RS256", headers={"kid": "test"})

    return sign


def test_valid_signed_session(signer):
    token = signer()
    request = SimpleNamespace(headers={"Authorization": "Bearer " + token})
    user = security.verify_session(request, token, settings())
    assert user.user_id == "user_alice"
    assert token not in repr(user)


@pytest.mark.parametrize(
    "changes,wrong_key",
    [
        ({"exp": 1}, False),
        ({"azp": "https://foreign.example"}, False),
        ({"sid": None}, False),
        ({"sub": None}, False),
        ({"sts": "pending"}, False),
        ({}, True),
    ],
)
def test_invalid_sessions_are_rejected(signer, changes, wrong_key):
    token = signer(changes, wrong_key)
    request = SimpleNamespace(headers={"Authorization": "Bearer " + token})
    with pytest.raises(HTTPException) as error:
        security.verify_session(request, token, settings())
    assert error.value.status_code == 401
