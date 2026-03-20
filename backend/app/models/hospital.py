from pydantic import BaseModel, field_validator
from typing import List, Optional


class Location(BaseModel):
    """Geographic coordinates."""

    lat: float
    lng: float

    @field_validator("lat")
    @classmethod
    def validate_lat(cls, v: float) -> float:
        if v < -90 or v > 90:
            raise ValueError("Latitude must be between -90 and 90")
        return v

    @field_validator("lng")
    @classmethod
    def validate_lng(cls, v: float) -> float:
        if v < -180 or v > 180:
            raise ValueError("Longitude must be between -180 and 180")
        return v


class Availability(BaseModel):
    """Hospital bed/slot availability."""

    icu_beds: int = 0
    emergency_slots: int = 0

    @field_validator("icu_beds", "emergency_slots")
    @classmethod
    def validate_non_negative(cls, v: int) -> int:
        if v < 0:
            raise ValueError("Availability values must be non-negative")
        if v > 10000:
            raise ValueError("Availability value is unreasonably large")
        return v


class Hospital(BaseModel):
    """Hospital data model."""

    id: Optional[str] = None
    name: str
    location: Location
    facilities: List[str]
    availability: Availability

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not v or len(v) > 200:
            raise ValueError("Hospital name must be 1-200 characters")
        return v

    @field_validator("facilities")
    @classmethod
    def validate_facilities(cls, v: List[str]) -> List[str]:
        if len(v) > 50:
            raise ValueError("Too many facilities (max 50)")
        return [f.strip()[:100] for f in v if f.strip()]


class HospitalUpdate(BaseModel):
    """Validated model for hospital updates (replaces raw dict)."""

    name: Optional[str] = None
    facilities: Optional[List[str]] = None
    availability: Optional[Availability] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v or len(v) > 200:
                raise ValueError("Hospital name must be 1-200 characters")
        return v

    @field_validator("facilities")
    @classmethod
    def validate_facilities(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is not None:
            if len(v) > 50:
                raise ValueError("Too many facilities (max 50)")
            return [f.strip()[:100] for f in v if f.strip()]
        return v


class HospitalMatchRequest(BaseModel):
    """Request to match hospitals for an emergency."""

    required_facilities: List[str]
    location: str = ""
    lat: Optional[float] = None
    lng: Optional[float] = None
    emergency_type: str
    severity: str

    @field_validator("required_facilities")
    @classmethod
    def validate_facilities(cls, v: List[str]) -> List[str]:
        if len(v) > 20:
            raise ValueError("Too many facilities (max 20)")
        return [f.strip()[:100] for f in v if f.strip()]

    @field_validator("location")
    @classmethod
    def validate_location(cls, v: str) -> str:
        if len(v) > 200:
            raise ValueError("Location must be under 200 characters")
        return v.strip()

    @field_validator("emergency_type")
    @classmethod
    def validate_emergency_type(cls, v: str) -> str:
        v = v.strip()
        if not v or len(v) > 100:
            raise ValueError("Emergency type must be 1-100 characters")
        return v

    @field_validator("severity")
    @classmethod
    def validate_severity(cls, v: str) -> str:
        allowed = {"critical", "high", "moderate", "low"}
        v = v.strip().lower()
        if v not in allowed:
            raise ValueError(f"Severity must be one of: {', '.join(allowed)}")
        return v

    @field_validator("lat")
    @classmethod
    def validate_lat(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and (v < -90 or v > 90):
            raise ValueError("Latitude must be between -90 and 90")
        return v

    @field_validator("lng")
    @classmethod
    def validate_lng(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and (v < -180 or v > 180):
            raise ValueError("Longitude must be between -180 and 180")
        return v


class HospitalMatch(BaseModel):
    """A single hospital match result."""

    hospital: Hospital
    match_score: float
    distance_km: float
    match_type: str  # "exact", "partial", "nearest"


class HospitalMatchResponse(BaseModel):
    """Response with ranked hospital matches."""

    matches: List[HospitalMatch]
