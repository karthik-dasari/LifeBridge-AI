"""
Gemini AI Service — processes unstructured emergency input
and returns structured emergency analysis.
"""

import json
import re
from app.config import settings
from app.models.emergency import EmergencyAnalysis


# Mock analysis based on keyword matching
KEYWORD_MAP = {
    "chest pain": {"type": "cardiac", "severity": "critical", "facilities": ["ICU", "Cardiology"]},
    "heart attack": {"type": "cardiac", "severity": "critical", "facilities": ["ICU", "Cardiology"]},
    "heart": {"type": "cardiac", "severity": "high", "facilities": ["Cardiology", "Emergency"]},
    "stroke": {"type": "neurological", "severity": "critical", "facilities": ["ICU", "Neurology"]},
    "head injury": {"type": "neurological", "severity": "high", "facilities": ["Neurology", "Emergency"]},
    "headache": {"type": "neurological", "severity": "moderate", "facilities": ["Neurology"]},
    "fracture": {"type": "orthopedic", "severity": "moderate", "facilities": ["Orthopedics", "Emergency"]},
    "broken bone": {"type": "orthopedic", "severity": "moderate", "facilities": ["Orthopedics", "Emergency"]},
    "accident": {"type": "trauma", "severity": "high", "facilities": ["ICU", "Emergency", "Orthopedics"]},
    "burn": {"type": "burn", "severity": "high", "facilities": ["Burn Unit", "Emergency"]},
    "breathing": {"type": "respiratory", "severity": "high", "facilities": ["ICU", "Emergency"]},
    "asthma": {"type": "respiratory", "severity": "moderate", "facilities": ["Emergency"]},
    "child": {"type": "pediatric", "severity": "high", "facilities": ["Pediatrics", "Emergency"]},
    "baby": {"type": "pediatric", "severity": "high", "facilities": ["Pediatrics", "Emergency"]},
    "bleeding": {"type": "trauma", "severity": "high", "facilities": ["Emergency", "General Surgery"]},
    "unconscious": {"type": "critical", "severity": "critical", "facilities": ["ICU", "Emergency"]},
    "poison": {"type": "toxicology", "severity": "critical", "facilities": ["ICU", "Emergency"]},
    "seizure": {"type": "neurological", "severity": "high", "facilities": ["Neurology", "Emergency"]},
    "fever": {"type": "general", "severity": "low", "facilities": ["Emergency"]},
    "pain": {"type": "general", "severity": "moderate", "facilities": ["Emergency"]},
}

SEVERITY_SCORES = {"critical": 0.95, "high": 0.85, "moderate": 0.70, "low": 0.50}


def _mock_analyze(input_text: str) -> EmergencyAnalysis:
    """Keyword-based fallback when Gemini API is not available."""
    text_lower = input_text.lower()

    for keyword, info in KEYWORD_MAP.items():
        if keyword in text_lower:
            return EmergencyAnalysis(
                emergency_type=info["type"],
                severity=info["severity"],
                required_facilities=info["facilities"],
                confidence_score=SEVERITY_SCORES.get(info["severity"], 0.7),
            )

    return EmergencyAnalysis(
        emergency_type="general",
        severity="moderate",
        required_facilities=["Emergency"],
        confidence_score=0.60,
    )


async def analyze_emergency(input_text: str, location: str) -> EmergencyAnalysis:
    """Analyze emergency input using Vertex AI Gemini model or mock fallback."""
    try:
        import vertexai
        from vertexai.generative_models import GenerativeModel

        vertexai.init(project=settings.GCP_PROJECT_ID, location="us-central1")
        model = GenerativeModel("gemini-1.5-flash") # Using 1.5 because 2.0 might need preview SDK on Vertex

        prompt = f"""You are a medical emergency triage AI. Analyze the following emergency description and return ONLY a JSON object with no extra text.

Emergency: "{input_text}"
Location: "{location}"

Return exactly this JSON structure:
{{
  "emergency_type": "<type like cardiac, neurological, trauma, burn, respiratory, orthopedic, pediatric, general>",
  "severity": "<critical, high, moderate, or low>",
  "required_facilities": ["<list of required hospital facilities like ICU, Cardiology, Neurology, Orthopedics, Emergency, Burn Unit, Pediatrics, General Surgery>"],
  "confidence_score": <float between 0.0 and 1.0>
}}"""

        response = model.generate_content(prompt)
        text = response.text.strip()

        # Extract JSON from response (handle markdown code blocks)
        json_match = re.search(r'\{[^{}]*\}', text, re.DOTALL)
        if json_match:
            data = json.loads(json_match.group())
            return EmergencyAnalysis(**data)

        return _mock_analyze(input_text)

    except Exception:
        return _mock_analyze(input_text)
