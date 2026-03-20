"""Tests for app/models/ — Pydantic model validation."""
from app.models.alert import AlertRequest, AlertResponse, LocationUpdate
from app.models.emergency import EmergencyInput, EmergencyAnalysis
from app.models.hospital import (
    Location,
    Availability,
    Hospital,
    HospitalMatchRequest,
    HospitalMatch,
    HospitalMatchResponse,
)


# ── AlertRequest ──────────────────────────────────────────────
class TestAlertRequest:
    def test_required_fields(self):
        req = AlertRequest(
            hospital_id="h1",
            emergency="cardiac",
            eta="10 mins",
            requirements=["ICU", "Cardiology"],
        )
        assert req.hospital_id == "h1"
        assert req.emergency == "cardiac"
        assert req.eta == "10 mins"
        assert req.requirements == ["ICU", "Cardiology"]
        assert req.user_lat is None
        assert req.user_lng is None

    def test_optional_coords(self):
        req = AlertRequest(
            hospital_id="h2",
            emergency="trauma",
            eta="5 mins",
            requirements=["Emergency"],
            user_lat=17.43,
            user_lng=78.46,
        )
        assert req.user_lat == 17.43
        assert req.user_lng == 78.46


class TestAlertResponse:
    def test_fields(self):
        resp = AlertResponse(alert_id="abc123", status="sent", timestamp="2025-01-01T00:00:00Z")
        assert resp.alert_id == "abc123"
        assert resp.status == "sent"
        assert resp.timestamp == "2025-01-01T00:00:00Z"


class TestLocationUpdate:
    def test_fields(self):
        loc = LocationUpdate(alert_id="a1", lat=17.0, lng=78.0)
        assert loc.alert_id == "a1"
        assert loc.lat == 17.0
        assert loc.lng == 78.0


# ── EmergencyInput ────────────────────────────────────────────
class TestEmergencyInput:
    def test_defaults(self):
        inp = EmergencyInput(input_text="chest pain")
        assert inp.input_text == "chest pain"
        assert inp.location == ""
        assert inp.lat is None
        assert inp.lng is None

    def test_with_coords(self):
        inp = EmergencyInput(input_text="accident", location="Delhi", lat=28.7, lng=77.1)
        assert inp.location == "Delhi"
        assert inp.lat == 28.7
        assert inp.lng == 77.1


class TestEmergencyAnalysis:
    def test_fields(self):
        a = EmergencyAnalysis(
            emergency_type="cardiac",
            severity="critical",
            required_facilities=["ICU", "Cardiology"],
            confidence_score=0.95,
        )
        assert a.emergency_type == "cardiac"
        assert a.severity == "critical"
        assert a.required_facilities == ["ICU", "Cardiology"]
        assert a.confidence_score == 0.95


# ── Hospital models ───────────────────────────────────────────
class TestLocation:
    def test_fields(self):
        loc = Location(lat=17.38, lng=78.48)
        assert loc.lat == 17.38
        assert loc.lng == 78.48


class TestAvailability:
    def test_defaults(self):
        a = Availability()
        assert a.icu_beds == 0
        assert a.emergency_slots == 0

    def test_custom(self):
        a = Availability(icu_beds=5, emergency_slots=10)
        assert a.icu_beds == 5
        assert a.emergency_slots == 10


class TestHospital:
    def test_required_and_optional(self):
        h = Hospital(
            name="Apollo",
            location=Location(lat=17.0, lng=78.0),
            facilities=["ICU"],
            availability=Availability(icu_beds=3, emergency_slots=5),
        )
        assert h.id is None
        assert h.name == "Apollo"
        assert h.location.lat == 17.0
        assert h.facilities == ["ICU"]
        assert h.availability.icu_beds == 3

    def test_with_id(self):
        h = Hospital(
            id="h1",
            name="KIMS",
            location=Location(lat=17.0, lng=78.0),
            facilities=[],
            availability=Availability(),
        )
        assert h.id == "h1"


class TestHospitalMatchRequest:
    def test_defaults(self):
        req = HospitalMatchRequest(
            required_facilities=["ICU"],
            emergency_type="cardiac",
            severity="critical",
        )
        assert req.location == ""
        assert req.lat is None
        assert req.lng is None

    def test_with_coords(self):
        req = HospitalMatchRequest(
            required_facilities=["ICU"],
            emergency_type="cardiac",
            severity="critical",
            location="Hyderabad",
            lat=17.38,
            lng=78.48,
        )
        assert req.lat == 17.38


class TestHospitalMatch:
    def test_fields(self):
        h = Hospital(
            name="Test",
            location=Location(lat=17.0, lng=78.0),
            facilities=["ICU"],
            availability=Availability(),
        )
        m = HospitalMatch(hospital=h, match_score=80.0, distance_km=5.0, match_type="exact")
        assert m.match_score == 80.0
        assert m.distance_km == 5.0
        assert m.match_type == "exact"


class TestHospitalMatchResponse:
    def test_empty(self):
        r = HospitalMatchResponse(matches=[])
        assert r.matches == []

    def test_with_matches(self):
        h = Hospital(
            name="T",
            location=Location(lat=0, lng=0),
            facilities=[],
            availability=Availability(),
        )
        m = HospitalMatch(hospital=h, match_score=50, distance_km=10, match_type="nearest")
        r = HospitalMatchResponse(matches=[m])
        assert len(r.matches) == 1
