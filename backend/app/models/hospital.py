from pydantic import BaseModel
from typing import List, Optional


class Location(BaseModel):
    """Geographic coordinates."""

    lat: float
    lng: float


class Availability(BaseModel):
    """Hospital bed/slot availability."""

    icu_beds: int = 0
    emergency_slots: int = 0


class Hospital(BaseModel):
    """Hospital data model."""

    id: Optional[str] = None
    name: str
    location: Location
    facilities: List[str]
    availability: Availability


class HospitalMatchRequest(BaseModel):
    """Request to match hospitals for an emergency."""

    required_facilities: List[str]
    location: str = ""
    lat: Optional[float] = None
    lng: Optional[float] = None
    emergency_type: str
    severity: str


class HospitalMatch(BaseModel):
    """A single hospital match result."""

    hospital: Hospital
    match_score: float
    distance_km: float
    match_type: str  # "exact", "partial", "nearest"


class HospitalMatchResponse(BaseModel):
    """Response with ranked hospital matches."""

    matches: List[HospitalMatch]
