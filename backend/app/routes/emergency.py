from fastapi import APIRouter

from app.models.emergency import EmergencyInput, EmergencyAnalysis
from app.services.gemini_service import analyze_emergency as ai_analyze

router = APIRouter()


@router.post("/analyze-emergency", response_model=EmergencyAnalysis)
async def analyze_emergency(data: EmergencyInput):
    """Analyze emergency input using AI and return structured data."""
    result = await ai_analyze(data.input_text, data.location)
    return result
