"""
Hospital Matching Service — finds the best hospital matches
based on required facilities, distance, and availability.

Matching algorithm:
1. Exact match — hospitals with ALL required facilities
2. Partial match — hospitals with some required facilities
3. Nearest fallback — closest hospitals regardless of facilities

Ranking factors:
- Distance (Haversine formula)
- Availability (ICU beds, emergency slots)
- Match score (0–100)
"""

from app.models.hospital import Hospital, HospitalMatch, HospitalMatchResponse
from app.services.firebase_service import get_all_hospitals
from app.utils.haversine import haversine

# Approximate coordinates for common Indian cities
CITY_COORDS = {
    "hyderabad": (17.3850, 78.4867),
    "mumbai": (19.0760, 72.8777),
    "delhi": (28.7041, 77.1025),
    "bangalore": (12.9716, 77.5946),
    "chennai": (13.0827, 80.2707),
    "kolkata": (22.5726, 88.3639),
    "pune": (18.5204, 73.8567),
    "ahmedabad": (23.0225, 72.5714),
}


def _geocode_location(location: str) -> tuple[float, float]:
    """Convert a location string to lat/lng coordinates (mock geocoding)."""
    loc_lower = location.lower().strip()
    for city, coords in CITY_COORDS.items():
        if city in loc_lower:
            return coords
    # Default to Hyderabad
    return (17.3850, 78.4867)


def _compute_match_score(
    hospital: dict,
    required_facilities: list[str],
    distance_km: float,
) -> float:
    """Compute a composite match score (0–100)."""
    # Facility match component (0-50 points)
    h_facilities = [f.lower() for f in hospital.get("facilities", [])]
    req_lower = [f.lower() for f in required_facilities]

    if req_lower:
        matched = sum(1 for f in req_lower if f in h_facilities)
        facility_score = (matched / len(req_lower)) * 50
    else:
        facility_score = 25

    # Distance component (0-30 points) — closer is better
    if distance_km <= 2:
        distance_score = 30
    elif distance_km <= 5:
        distance_score = 25
    elif distance_km <= 10:
        distance_score = 20
    elif distance_km <= 20:
        distance_score = 15
    elif distance_km <= 50:
        distance_score = 10
    else:
        distance_score = 5

    # Availability component (0-20 points)
    avail = hospital.get("availability", {})
    icu = avail.get("icu_beds", 0)
    slots = avail.get("emergency_slots", 0)
    avail_score = min(20, (icu * 2) + (slots * 1))

    return round(facility_score + distance_score + avail_score, 1)


def match_hospitals(
    required_facilities: list[str],
    location: str,
    emergency_type: str,
    severity: str,
    lat: float | None = None,
    lng: float | None = None,
) -> HospitalMatchResponse:
    """Match and rank hospitals based on emergency requirements."""
    if lat is not None and lng is not None:
        user_lat, user_lng = lat, lng
    else:
        user_lat, user_lng = _geocode_location(location)
    all_hospitals = get_all_hospitals()

    exact_matches = []
    partial_matches = []
    nearest_fallback = []

    for h in all_hospitals:
        h_loc = h.get("location", {})
        h_lat = h_loc.get("lat", 0)
        h_lng = h_loc.get("lng", 0)
        distance = round(haversine(user_lat, user_lng, h_lat, h_lng), 2)

        h_facilities_lower = [f.lower() for f in h.get("facilities", [])]
        req_lower = [f.lower() for f in required_facilities]

        matched_count = sum(1 for f in req_lower if f in h_facilities_lower)

        hospital_obj = Hospital(
            id=h.get("id"),
            name=h["name"],
            location={"lat": h_lat, "lng": h_lng},
            facilities=h.get("facilities", []),
            availability=h.get("availability", {"icu_beds": 0, "emergency_slots": 0}),
        )

        if req_lower and matched_count == len(req_lower):
            match_type = "exact"
            score = _compute_match_score(h, required_facilities, distance)
            exact_matches.append(HospitalMatch(
                hospital=hospital_obj,
                match_score=score,
                distance_km=distance,
                match_type=match_type,
            ))
        elif req_lower and matched_count > 0:
            match_type = "partial"
            score = _compute_match_score(h, required_facilities, distance)
            partial_matches.append(HospitalMatch(
                hospital=hospital_obj,
                match_score=score,
                distance_km=distance,
                match_type=match_type,
            ))
        else:
            match_type = "nearest"
            score = _compute_match_score(h, required_facilities, distance)
            nearest_fallback.append(HospitalMatch(
                hospital=hospital_obj,
                match_score=score,
                distance_km=distance,
                match_type=match_type,
            ))

    # Sort each group by score descending, then distance ascending
    sort_key = lambda m: (-m.match_score, m.distance_km)
    exact_matches.sort(key=sort_key)
    partial_matches.sort(key=sort_key)
    nearest_fallback.sort(key=sort_key)

    # Combine: exact first, then partial, then nearest
    matches = exact_matches + partial_matches + nearest_fallback

    return HospitalMatchResponse(matches=matches)
