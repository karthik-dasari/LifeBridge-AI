import os

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
import logging
import google.cloud.logging
import time
from collections import defaultdict

try:
    project_id = os.getenv("GCP_PROJECT_ID", "promptwars-hackathon-490805")
    client = google.cloud.logging.Client(project=project_id)
    client.setup_logging()
    logging.getLogger("uvicorn.access").info("Cloud Logging attached!")
except Exception as e:
    logging.warning(f"Failed to attach Cloud Logging: {e}")

from app.routes import emergency, hospitals, alerts

app = FastAPI(
    title="LifeBridge AI",
    description="AI-powered emergency response platform",
    version="1.0.0",
    docs_url=None if os.getenv("ENVIRONMENT") == "production" else "/docs",
    redoc_url=None if os.getenv("ENVIRONMENT") == "production" else "/redoc",
)

# --- CORS: restrict to known origins ---
_allowed_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:8080,https://promptwars-hackathon-490805.web.app,https://promptwars-hackathon-490805.firebaseapp.com",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT"],
    allow_headers=["Authorization", "Content-Type"],
)

# --- Trusted Host middleware ---
_allowed_hosts = os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")
app.add_middleware(TrustedHostMiddleware, allowed_hosts=_allowed_hosts)


# --- Security headers middleware ---
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response: Response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(self), camera=(), microphone=()"
    response.headers["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'none'"
    response.headers["Cache-Control"] = "no-store"
    return response


# --- Rate limiting middleware ---
_rate_limit_store: dict[str, list[float]] = defaultdict(list)
RATE_LIMIT_MAX = int(os.getenv("RATE_LIMIT_MAX", "60"))  # requests per window
RATE_LIMIT_WINDOW = int(os.getenv("RATE_LIMIT_WINDOW", "60"))  # seconds


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    # Clean old entries
    _rate_limit_store[client_ip] = [
        t for t in _rate_limit_store[client_ip] if now - t < RATE_LIMIT_WINDOW
    ]
    if len(_rate_limit_store[client_ip]) >= RATE_LIMIT_MAX:
        return Response(
            content='{"detail":"Rate limit exceeded. Try again later."}',
            status_code=429,
            media_type="application/json",
        )
    _rate_limit_store[client_ip].append(now)
    return await call_next(request)


# Register routers
app.include_router(emergency.router, tags=["Emergency"])
app.include_router(hospitals.router, tags=["Hospitals"])
app.include_router(alerts.router, tags=["Alerts"])


@app.get("/")
def health_check():
    return {"status": "ok", "service": "LifeBridge AI API"}
