"""Tests for app/services/matching_service.py"""
import pytest
from unittest.mock import patch
from app.services.matching_service import (
    match_hospitals,
    _geocode_location,
    _compute_match_score,
    CITY_COORDS,
)
from app.services import firebase_service as fb


@pytest.fixture(autouse=True)
def reset_mock_state():
    """Ensure mock mode and reset state."""
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
        {
            "id": "h3",
            "name": "Yashoda Hospital",
            "location": {"lat": 17.4483, "lng": 78.3915},
            "facilities": ["ICU", "Neurology", "Emergency", "Burn Unit"],
            "availability": {"icu_beds": 4, "emergency_slots": 8},
        },
        {
            "id": "h4",
            "name": "Care Hospital",
            "location": {"lat": 17.4399, "lng": 78.4983},
            "facilities": ["Emergency", "Orthopedics", "General Surgery"],
            "availability": {"icu_beds": 2, "emergency_slots": 12},
        },
        {
            "id": "h5",
            "name": "Sunshine Hospital",
            "location": {"lat": 17.4600, "lng": 78.3550},
            "facilities": ["ICU", "Cardiology", "Neurology", "Orthopedics", "Emergency", "Burn Unit"],
            "availability": {"icu_beds": 8, "emergency_slots": 15},
        },
    ])
    yield


# ── _geocode_location ────────────────────────────────────────
class TestGeocodeLocation:
    def test_known_cities(self):
        for city, expected in CITY_COORDS.items():
            lat, lng = _geocode_location(city)
            assert lat == expected[0]
            assert lng == expected[1]

    def test_case_insensitive(self):
        lat, lng = _geocode_location("HYDERABAD")
        assert lat == 17.3850
        assert lng == 78.4867

    def test_city_in_sentence(self):
        lat, lng = _geocode_location("near mumbai downtown")
        assert lat == 19.0760
        assert lng == 72.8777

    def test_unknown_defaults_to_hyderabad(self):
        lat, lng = _geocode_location("some unknown place")
        assert lat == 17.3850
        assert lng == 78.4867

    def test_empty_string(self):
        lat, lng = _geocode_location("")
        assert lat == 17.3850
        assert lng == 78.4867

    def test_whitespace_trimmed(self):
        lat, lng = _geocode_location("  delhi  ")
        assert lat == CITY_COORDS["delhi"][0]


# ── _compute_match_score ──────────────────────────────────────
class TestComputeMatchScore:
    def test_full_facility_match_close_distance(self):
        hospital = {
            "facilities": ["ICU", "Cardiology"],
            "availability": {"icu_beds": 5, "emergency_slots": 10},
        }
        score = _compute_match_score(hospital, ["ICU", "Cardiology"], 1.0)
        # facility: 50, distance: 30 (<=2km), avail: min(20, 5*2 + 10*1) = 20
        assert score == 100.0

    def test_partial_facility_match(self):
        hospital = {
            "facilities": ["ICU"],
            "availability": {"icu_beds": 2, "emergency_slots": 5},
        }
        score = _compute_match_score(hospital, ["ICU", "Cardiology"], 3.0)
        # facility: (1/2)*50=25, distance: 25 (2-5km), avail: min(20, 4+5)=9
        assert score == 59.0

    def test_no_facility_match(self):
        hospital = {
            "facilities": ["Burn Unit"],
            "availability": {"icu_beds": 0, "emergency_slots": 0},
        }
        score = _compute_match_score(hospital, ["ICU"], 100.0)
        # facility: 0, distance: 5 (>50km), avail: 0
        assert score == 5.0

    def test_distance_brackets(self):
        hospital = {
            "facilities": [],
            "availability": {"icu_beds": 0, "emergency_slots": 0},
        }
        # Test each distance bracket
        assert _compute_match_score(hospital, [], 1.0) == 55.0   # <= 2: 30 + 25 + 0
        assert _compute_match_score(hospital, [], 3.0) == 50.0   # 2-5: 25 + 25
        assert _compute_match_score(hospital, [], 7.0) == 45.0   # 5-10: 20 + 25
        assert _compute_match_score(hospital, [], 15.0) == 40.0  # 10-20: 15 + 25
        assert _compute_match_score(hospital, [], 30.0) == 35.0  # 20-50: 10 + 25
        assert _compute_match_score(hospital, [], 100.0) == 30.0 # >50: 5 + 25

    def test_no_required_facilities(self):
        hospital = {
            "facilities": ["ICU"],
            "availability": {"icu_beds": 0, "emergency_slots": 0},
        }
        score = _compute_match_score(hospital, [], 1.0)
        # facility: 25 (empty req), distance: 30, avail: 0
        assert score == 55.0

    def test_availability_capped_at_20(self):
        hospital = {
            "facilities": [],
            "availability": {"icu_beds": 50, "emergency_slots": 50},
        }
        score = _compute_match_score(hospital, [], 1.0)
        # facility: 25, distance: 30, avail: min(20, 100+50) = 20
        assert score == 75.0

    def test_missing_availability(self):
        hospital = {"facilities": []}
        score = _compute_match_score(hospital, [], 1.0)
        # facility: 25, distance: 30, avail: 0
        assert score == 55.0

    def test_missing_facilities(self):
        hospital = {"availability": {"icu_beds": 1, "emergency_slots": 1}}
        score = _compute_match_score(hospital, ["ICU"], 1.0)
        # facility: 0/1 * 50 = 0, distance: 30, avail: min(20, 2+1) = 3
        assert score == 33.0


# ── match_hospitals ───────────────────────────────────────────
class TestMatchHospitals:
    def test_returns_response(self):
        from app.models.hospital import HospitalMatchResponse
        result = match_hospitals(["ICU", "Cardiology"], "Hyderabad", "cardiac", "critical")
        assert isinstance(result, HospitalMatchResponse)
        assert len(result.matches) == 5  # All 5 mock hospitals

    def test_exact_matches_first(self):
        result = match_hospitals(["ICU", "Cardiology"], "Hyderabad", "cardiac", "critical")
        # Find the first non-exact match
        exact_done = False
        for m in result.matches:
            if m.match_type != "exact":
                exact_done = True
            if exact_done:
                assert m.match_type != "exact", "Exact matches should come first"

    def test_match_types(self):
        result = match_hospitals(["ICU", "Cardiology"], "Hyderabad", "cardiac", "critical")
        types = {m.match_type for m in result.matches}
        assert "exact" in types
        # h3 has ICU but not Cardiology -> partial
        assert "partial" in types

    def test_with_explicit_lat_lng(self):
        result = match_hospitals(
            ["ICU"], "Hyderabad", "cardiac", "critical", lat=17.40, lng=78.47
        )
        assert len(result.matches) > 0
        # All should have distance calculated from provided coords
        for m in result.matches:
            assert m.distance_km >= 0

    def test_with_location_string(self):
        result = match_hospitals(["ICU"], "Mumbai", "cardiac", "critical")
        assert len(result.matches) > 0
        # Distances should be much larger (Mumbai to Hyderabad hospitals)
        for m in result.matches:
            assert m.distance_km > 100

    def test_no_facility_match_all_nearest(self):
        result = match_hospitals(["XYZ_NoMatch"], "Hyderabad", "general", "low")
        for m in result.matches:
            assert m.match_type == "nearest"

    def test_sorted_by_score_then_distance(self):
        result = match_hospitals(["ICU", "Cardiology"], "Hyderabad", "cardiac", "critical")
        # Within each match_type group, verify sorting
        for match_type in ["exact", "partial", "nearest"]:
            group = [m for m in result.matches if m.match_type == match_type]
            for i in range(len(group) - 1):
                # Higher score first, or same score then closer distance
                assert (group[i].match_score > group[i + 1].match_score) or (
                    group[i].match_score == group[i + 1].match_score
                    and group[i].distance_km <= group[i + 1].distance_km
                )

    def test_hospital_objects_valid(self):
        result = match_hospitals(["ICU"], "Hyderabad", "cardiac", "critical")
        for m in result.matches:
            assert m.hospital.name
            assert m.hospital.location.lat != 0
            assert m.hospital.location.lng != 0
            assert isinstance(m.hospital.facilities, list)

    def test_empty_required_facilities(self):
        result = match_hospitals([], "Hyderabad", "general", "low")
        # All should be "nearest" when no facilities required
        for m in result.matches:
            assert m.match_type == "nearest"

    def test_single_facility_partial_and_exact(self):
        result = match_hospitals(["Burn Unit"], "Hyderabad", "burn", "high")
        exact = [m for m in result.matches if m.match_type == "exact"]
        # h3 (Yashoda) and h5 (Sunshine) have Burn Unit
        assert len(exact) >= 2
