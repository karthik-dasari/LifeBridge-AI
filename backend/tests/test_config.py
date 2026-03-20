"""Tests for app/config.py"""
import os
from unittest.mock import patch


def test_settings_project_name():
    """Settings should have correct PROJECT_NAME."""
    from app.config import Settings
    s = Settings()
    assert s.PROJECT_NAME == "LifeBridge AI"


def test_settings_port_default():
    """PORT should default to 8080 or read from env."""
    from app.config import Settings
    s = Settings()
    assert isinstance(s.PORT, int)
    assert s.PORT > 0


def test_settings_gemini_key_is_string():
    """GEMINI_API_KEY should be a string."""
    from app.config import Settings
    s = Settings()
    assert isinstance(s.GEMINI_API_KEY, str)


def test_settings_firebase_path_is_string():
    """FIREBASE_CREDENTIALS_PATH should be a string."""
    from app.config import Settings
    s = Settings()
    assert isinstance(s.FIREBASE_CREDENTIALS_PATH, str)


def test_settings_singleton():
    """The module-level settings object should exist."""
    from app.config import settings
    assert settings.PROJECT_NAME == "LifeBridge AI"
    assert isinstance(settings.GEMINI_API_KEY, str)
    assert isinstance(settings.FIREBASE_CREDENTIALS_PATH, str)
    assert isinstance(settings.PORT, int)
