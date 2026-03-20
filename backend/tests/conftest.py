"""Shared test configuration for all backend tests."""
import os

# Allow TestClient's default 'testserver' hostname through TrustedHostMiddleware
os.environ["ALLOWED_HOSTS"] = "localhost,127.0.0.1,testserver"
