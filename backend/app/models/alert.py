from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class AlertRequest(BaseModel):
    """Request to send an alert to a hospital."""

    hospital_id: str
    emergency: str
    eta: str
    requirements: List[str]
    user_lat: Optional[float] = None
    user_lng: Optional[float] = None


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
