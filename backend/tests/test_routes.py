"""Tests for FastAPI routes (alerts, emergency, hospitals) via TestClient."""
import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient

from app.services import firebase_service as fb


@pytest.fixture(autouse=True)
def reset_mock_state():
    """Reset mock state before each test."""
    fb._db = None
    fb._use_mock = True
    fb._mock_alerts.clear()
    fb._mock_locations.clear()
    fb.MOCK_HOSPITALS.clear()
    fb.MOCK_HOSPITALS.extend([
        {
            "id": "h1",
            "name": "Apollo Hospital",
            "location": {"lat": 17.4325, "lng": 78.4673},
            "facilities": ["ICU", "Cardiology", "Neurology", "Emergency", "Orthopedics"],
            "availability": {"icu_beds": 5, "emergency_slots": 10},
        },
        {
            "id": "h2",
            "name": "KIMS Hospital",
            "location": {"lat": 17.4156, "lng": 78.4347},
            "facilities": ["ICU", "Cardiology", "Emergency", "Pediatrics"],
            "availability": {"icu_beds": 3, "emergency_slots": 7},
        },
    ])
    yield


@pytest.fixture
def client():
    from main import app
    return TestClient(app)


# ── Health check ──────────────────────────────────────────────
class TestHealthCheck:
    def test_root(self, client):
        resp = client.get("/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["service"] == "LifeBridge AI API"


# ── Emergency routes ──────────────────────────────────────────
class TestEmergencyRoutes:
    def test_analyze_emergency(self, client):
        resp = client.post("/analyze-emergency", json={
            "input_text": "chest pain",
            "location": "Hyderabad",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["emergency_type"] == "cardiac"
        assert data["severity"] == "critical"
        assert "ICU" in data["required_facilities"]
        assert 0 < data["confidence_score"] <= 1.0

    def test_analyze_emergency_unknown(self, client):
        resp = client.post("/analyze-emergency", json={
            "input_text": "some unknown issue xyz",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["emergency_type"] == "general"

    def test_analyze_emergency_with_coords(self, client):
        resp = client.post("/analyze-emergency", json={
            "input_text": "stroke symptoms",
            "location": "Delhi",
            "lat": 28.7,
            "lng": 77.1,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["emergency_type"] == "neurological"


# ── Hospital routes ───────────────────────────────────────────
class TestHospitalRoutes:
    def test_list_hospitals(self, client):
        resp = client.get("/hospitals")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) == 2

    def test_get_hospital_detail(self, client):
        resp = client.get("/hospitals/h1")
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Apollo Hospital"

    def test_get_hospital_not_found(self, client):
        resp = client.get("/hospitals/nonexistent")
        assert resp.status_code == 404
        assert resp.json()["detail"] == "Hospital not found"

    def test_register_hospital(self, client):
        resp = client.post("/hospitals/register", json={
            "name": "New Test Hospital",
            "location": {"lat": 18.0, "lng": 79.0},
            "facilities": ["Emergency", "ICU"],
            "availability": {"icu_beds": 2, "emergency_slots": 5},
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "id" in data
        assert data["status"] == "registered"

    def test_update_hospital(self, client):
        resp = client.put("/hospitals/h1", json={
            "availability": {"icu_beds": 99, "emergency_slots": 99},
        })
        assert resp.status_code == 200
        assert resp.json()["status"] == "updated"

    def test_update_hospital_not_found(self, client):
        resp = client.put("/hospitals/nonexistent", json={"name": "X"})
        assert resp.status_code == 404

    def test_match_hospitals(self, client):
        resp = client.post("/match-hospitals", json={
            "required_facilities": ["ICU", "Cardiology"],
            "emergency_type": "cardiac",
            "severity": "critical",
            "location": "Hyderabad",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "matches" in data
        assert len(data["matches"]) > 0
        first = data["matches"][0]
        assert "hospital" in first
        assert "match_score" in first
        assert "distance_km" in first
        assert "match_type" in first

    def test_match_hospitals_with_coords(self, client):
        resp = client.post("/match-hospitals", json={
            "required_facilities": ["ICU"],
            "emergency_type": "cardiac",
            "severity": "critical",
            "lat": 17.40,
            "lng": 78.47,
        })
        assert resp.status_code == 200
        assert len(resp.json()["matches"]) > 0


# ── Alert routes ──────────────────────────────────────────────
class TestAlertRoutes:
    def test_alert_hospital(self, client):
        resp = client.post("/alert-hospital", json={
            "hospital_id": "h1",
            "emergency": "cardiac",
            "eta": "10 mins",
            "requirements": ["ICU", "Cardiology"],
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "alert_id" in data
        assert data["status"] == "sent"
        assert "timestamp" in data

    def test_alert_hospital_with_coords(self, client):
        resp = client.post("/alert-hospital", json={
            "hospital_id": "h1",
            "emergency": "cardiac",
            "eta": "15 mins",
            "requirements": ["ICU"],
            "user_lat": 17.43,
            "user_lng": 78.46,
        })
        assert resp.status_code == 200
        alert_id = resp.json()["alert_id"]
        # Verify location was stored
        loc = fb.get_live_location(alert_id)
        assert loc is not None
        assert loc["lat"] == 17.43

    def test_get_alerts_empty(self, client):
        resp = client.get("/alerts/h1")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_get_alerts_with_data(self, client):
        # Create an alert first
        client.post("/alert-hospital", json={
            "hospital_id": "h1",
            "emergency": "cardiac",
            "eta": "5 mins",
            "requirements": ["ICU"],
        })
        resp = client.get("/alerts/h1")
        assert resp.status_code == 200
        alerts = resp.json()
        assert len(alerts) == 1
        assert alerts[0]["hospital_id"] == "h1"

    def test_location_update(self, client):
        # Create alert first
        alert_resp = client.post("/alert-hospital", json={
            "hospital_id": "h1",
            "emergency": "cardiac",
            "eta": "10 mins",
            "requirements": ["ICU"],
        })
        alert_id = alert_resp.json()["alert_id"]

        resp = client.post("/location-update", json={
            "alert_id": alert_id,
            "lat": 17.50,
            "lng": 78.50,
        })
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"

    def test_live_location_found(self, client):
        alert_resp = client.post("/alert-hospital", json={
            "hospital_id": "h1",
            "emergency": "cardiac",
            "eta": "10 mins",
            "requirements": ["ICU"],
            "user_lat": 17.43,
            "user_lng": 78.46,
        })
        alert_id = alert_resp.json()["alert_id"]
        resp = client.get(f"/live-location/{alert_id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["lat"] == 17.43
        assert data["lng"] == 78.46

    def test_live_location_not_found(self, client):
        resp = client.get("/live-location/nonexistent")
        assert resp.status_code == 200
        data = resp.json()
        assert data["lat"] is None
        assert data["lng"] is None
