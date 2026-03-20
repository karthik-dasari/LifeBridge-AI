from pydantic import BaseModel, field_validator
from typing import List, Optional
from datetime import datetime
import re


class AlertRequest(BaseModel):
    """Request to send an alert to a hospital."""

    hospital_id: str
    emergency: str
    eta: str
    requirements: List[str]
    user_lat: Optional[float] = None
    user_lng: Optional[float] = None

    @field_validator("hospital_id")
    @classmethod
    def validate_hospital_id(cls, v: str) -> str:
        v = v.strip()
        if not v or len(v) > 128:
            raise ValueError("Invalid hospital_id")
        if not re.match(r'^[a-zA-Z0-9_\-]+$', v):
            raise ValueError("hospital_id contains invalid characters")
        return v

    @field_validator("emergency")
    @classmethod
    def validate_emergency(cls, v: str) -> str:
        v = v.strip()
        if not v or len(v) > 500:
            raise ValueError("Emergency description must be 1-500 characters")
        return v

    @field_validator("eta")
    @classmethod
    def validate_eta(cls, v: str) -> str:
        v = v.strip()
        if not v or len(v) > 100:
            raise ValueError("ETA must be 1-100 characters")
        return v

    @field_validator("requirements")
    @classmethod
    def validate_requirements(cls, v: List[str]) -> List[str]:
        if len(v) > 20:
            raise ValueError("Too many requirements (max 20)")
        return [r.strip()[:100] for r in v if r.strip()]

    @field_validator("user_lat")
    @classmethod
    def validate_lat(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and (v < -90 or v > 90):
            raise ValueError("Latitude must be between -90 and 90")
        return v

    @field_validator("user_lng")
    @classmethod
    def validate_lng(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and (v < -180 or v > 180):
            raise ValueError("Longitude must be between -180 and 180")
        return v


class AlertResponse(BaseModel):
    """Response after sending an alert."""

    alert_id: str
    status: str
    timestamp: str


class LocationUpdate(BaseModel):
    """Live location update from a user en route to hospital."""

    alert_id: str
    lat: float
    lng: float

    @field_validator("alert_id")
    @classmethod
    def validate_alert_id(cls, v: str) -> str:
        v = v.strip()
        if not v or len(v) > 128:
            raise ValueError("Invalid alert_id")
        if not re.match(r'^[a-zA-Z0-9_\-]+$', v):
            raise ValueError("alert_id contains invalid characters")
        return v

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
