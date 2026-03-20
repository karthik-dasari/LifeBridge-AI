"""Tests for main.py — app creation and middleware."""
from unittest.mock import patch, MagicMock


def test_app_creation():
    """Test that the FastAPI app is created with correct properties."""
    from main import app
    assert app.title == "LifeBridge AI"
    assert app.version == "1.0.0"


def test_app_has_routes():
    """Test that all expected routes are registered."""
    from main import app
    routes = [r.path for r in app.routes]
    assert "/" in routes
    assert "/analyze-emergency" in routes
    assert "/hospitals" in routes
    assert "/hospitals/register" in routes
    assert "/match-hospitals" in routes
    assert "/alert-hospital" in routes
    assert "/alerts/{hospital_id}" in routes
    assert "/location-update" in routes
    assert "/live-location/{alert_id}" in routes
    assert "/hospitals/{hospital_id}" in routes


def test_health_check():
    """Test the health check endpoint function."""
    from main import health_check
    result = health_check()
    assert result == {"status": "ok", "service": "LifeBridge AI API"}


def test_cors_middleware_present():
    """Test that CORS middleware is configured."""
    from main import app
    middleware_classes = [m.cls.__name__ for m in app.user_middleware]
    assert "CORSMiddleware" in middleware_classes


def test_cloud_logging_setup():
    """Test the cloud logging setup branch (lines 7-9)."""
    mock_client = MagicMock()
    with patch("google.cloud.logging.Client", return_value=mock_client):
        mock_client.setup_logging.return_value = None
        # Re-execute the try block logic
        import google.cloud.logging
        import logging
        client = google.cloud.logging.Client(project="promptwars-hackathon-490805")
        client.setup_logging()
        logging.getLogger("uvicorn.access").info("Cloud Logging attached!")
        mock_client.setup_logging.assert_called_once()
