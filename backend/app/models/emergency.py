from pydantic import BaseModel
from typing import List, Optional


class EmergencyInput(BaseModel):
    """Input from user describing an emergency."""

    input_text: str
    location: str = ""
    lat: Optional[float] = None
    lng: Optional[float] = None


class EmergencyAnalysis(BaseModel):
    """Structured output from AI analysis."""

    emergency_type: str
    severity: str
    required_facilities: List[str]
    confidence_score: float
