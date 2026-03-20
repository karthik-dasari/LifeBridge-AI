"""
Firebase Authentication dependency for FastAPI routes.

Verifies Firebase ID tokens from the Authorization header.
"""

import os
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

_security = HTTPBearer(auto_error=False)


async def verify_firebase_token(
    credentials: HTTPAuthorizationCredentials | None = Depends(_security),
) -> dict:
    """Verify a Firebase ID token and return the decoded claims.

    In development mode (ENVIRONMENT != 'production'), requests without
    tokens are allowed with a stub identity so local testing still works.
    """
    if credentials is None or not credentials.credentials:
        if os.getenv("ENVIRONMENT") != "production":
            return {"uid": "dev-user", "email": "dev@localhost"}
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
        )

    token = credentials.credentials
    try:
        from firebase_admin import auth

        decoded = auth.verify_id_token(token)
        return decoded
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
        )
