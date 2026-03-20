from pydantic import BaseModel, field_validator
from typing import List, Optional


class EmergencyInput(BaseModel):
    """Input from user describing an emergency."""

    input_text: str
    location: str = ""
    lat: Optional[float] = None
    lng: Optional[float] = None

    @field_validator("input_text")
    @classmethod
    def validate_input_text(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Emergency description cannot be empty")
        if len(v) > 2000:
            raise ValueError("Emergency description must be under 2000 characters")
        return v

    @field_validator("location")
    @classmethod
    def validate_location(cls, v: str) -> str:
        if len(v) > 200:
            raise ValueError("Location must be under 200 characters")
        return v.strip()

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


class EmergencyAnalysis(BaseModel):
    """Structured output from AI analysis."""

    emergency_type: str
    severity: str
    required_facilities: List[str]
    confidence_score: float
