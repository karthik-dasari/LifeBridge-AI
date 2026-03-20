from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
import google.cloud.logging

try:
    client = google.cloud.logging.Client(project="promptwars-hackathon-490805")
    client.setup_logging()
    logging.getLogger("uvicorn.access").info("Cloud Logging attached!")
except Exception as e:
    logging.warning(f"Failed to attach Cloud Logging: {e}")

from app.routes import emergency, hospitals, alerts

app = FastAPI(
    title="LifeBridge AI",
    description="AI-powered emergency response platform",
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(emergency.router, tags=["Emergency"])
app.include_router(hospitals.router, tags=["Hospitals"])
app.include_router(alerts.router, tags=["Alerts"])


@app.get("/")
def health_check():
    return {"status": "ok", "service": "LifeBridge AI API"}
