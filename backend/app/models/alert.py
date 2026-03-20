from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class AlertRequest(BaseModel):
    """Request to send an alert to a hospital."""

    hospital_id: str
    emergency: str
    eta: str
    requirements: List[str]


class AlertResponse(BaseModel):
    """Response after sending an alert."""

    alert_id: str
    status: str
    timestamp: str
