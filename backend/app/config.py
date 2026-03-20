import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Application settings loaded from environment variables."""

    PROJECT_NAME: str = "LifeBridge AI"
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    FIREBASE_CREDENTIALS_PATH: str = os.getenv("FIREBASE_CREDENTIALS_PATH", "")
    GCP_PROJECT_ID: str = os.getenv("GCP_PROJECT_ID", "promptwars-hackathon-490805")
    PORT: int = int(os.getenv("PORT", "8080"))
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")


settings = Settings()
