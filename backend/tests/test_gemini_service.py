"""Tests for app/services/gemini_service.py"""
import pytest
from app.services.gemini_service import (
    _mock_analyze,
    analyze_emergency,
    KEYWORD_MAP,
    SEVERITY_SCORES,
)


# ── KEYWORD_MAP & SEVERITY_SCORES ────────────────────────────
class TestConstants:
    def test_keyword_map_not_empty(self):
        assert len(KEYWORD_MAP) > 0

    def test_keyword_map_entries_have_required_keys(self):
        for keyword, info in KEYWORD_MAP.items():
            assert "type" in info
            assert "severity" in info
            assert "facilities" in info
            assert isinstance(info["facilities"], list)

    def test_severity_scores_has_all_levels(self):
        assert "critical" in SEVERITY_SCORES
        assert "high" in SEVERITY_SCORES
        assert "moderate" in SEVERITY_SCORES
        assert "low" in SEVERITY_SCORES

    def test_severity_scores_values(self):
        assert SEVERITY_SCORES["critical"] == 0.95
        assert SEVERITY_SCORES["high"] == 0.85
        assert SEVERITY_SCORES["moderate"] == 0.70
        assert SEVERITY_SCORES["low"] == 0.50


# ── _mock_analyze ─────────────────────────────────────────────
class TestMockAnalyze:
    def test_chest_pain(self):
        result = _mock_analyze("My father has chest pain")
        assert result.emergency_type == "cardiac"
        assert result.severity == "critical"
        assert "ICU" in result.required_facilities
        assert "Cardiology" in result.required_facilities
        assert result.confidence_score == 0.95

    def test_heart_attack(self):
        result = _mock_analyze("Someone is having a heart attack")
        assert result.emergency_type == "cardiac"
        assert result.severity == "critical"

    def test_heart_generic(self):
        result = _mock_analyze("heart problems")
        assert result.emergency_type == "cardiac"
        assert result.severity == "high"

    def test_stroke(self):
        result = _mock_analyze("I think someone is having a stroke")
        assert result.emergency_type == "neurological"
        assert result.severity == "critical"

    def test_head_injury(self):
        result = _mock_analyze("head injury from fall")
        assert result.emergency_type == "neurological"
        assert result.severity == "high"

    def test_headache(self):
        result = _mock_analyze("severe headache")
        assert result.emergency_type == "neurological"
        assert result.severity == "moderate"

    def test_fracture(self):
        result = _mock_analyze("broken leg, possible fracture")
        assert result.emergency_type == "orthopedic"
        assert result.severity == "moderate"

    def test_broken_bone(self):
        result = _mock_analyze("broken bone in arm")
        assert result.emergency_type == "orthopedic"

    def test_accident(self):
        result = _mock_analyze("car accident on highway")
        assert result.emergency_type == "trauma"
        assert result.severity == "high"

    def test_burn(self):
        result = _mock_analyze("severe burn injury")
        assert result.emergency_type == "burn"
        assert result.severity == "high"

    def test_breathing(self):
        result = _mock_analyze("difficulty breathing")
        assert result.emergency_type == "respiratory"
        assert result.severity == "high"

    def test_asthma(self):
        result = _mock_analyze("asthma attack")
        assert result.emergency_type == "respiratory"
        assert result.severity == "moderate"

    def test_child(self):
        result = _mock_analyze("child is sick")
        assert result.emergency_type == "pediatric"
        assert result.severity == "high"

    def test_baby(self):
        # "baby not breathing" matches "breathing" first in keyword order
        result = _mock_analyze("baby is sick")
        assert result.emergency_type == "pediatric"

    def test_bleeding(self):
        result = _mock_analyze("heavy bleeding from wound")
        assert result.emergency_type == "trauma"

    def test_unconscious(self):
        result = _mock_analyze("person is unconscious")
        assert result.emergency_type == "critical"
        assert result.severity == "critical"

    def test_poison(self):
        result = _mock_analyze("possible poison ingestion")
        assert result.emergency_type == "toxicology"
        assert result.severity == "critical"

    def test_seizure(self):
        result = _mock_analyze("having a seizure")
        assert result.emergency_type == "neurological"
        assert result.severity == "high"

    def test_fever(self):
        result = _mock_analyze("high fever for 3 days")
        assert result.emergency_type == "general"
        assert result.severity == "low"
        assert result.confidence_score == 0.50

    def test_pain(self):
        result = _mock_analyze("stomach pain")
        assert result.emergency_type == "general"
        assert result.severity == "moderate"

    def test_unknown_defaults(self):
        result = _mock_analyze("something happened xyz123")
        assert result.emergency_type == "general"
        assert result.severity == "moderate"
        assert result.required_facilities == ["Emergency"]
        assert result.confidence_score == 0.60

    def test_case_insensitive(self):
        result = _mock_analyze("CHEST PAIN emergency")
        assert result.emergency_type == "cardiac"


# ── analyze_emergency (async, mock fallback) ──────────────────
class TestAnalyzeEmergency:
    @pytest.mark.asyncio
    async def test_fallback_to_mock(self):
        """When Vertex AI is not configured, should fall back to mock."""
        result = await analyze_emergency("chest pain emergency", "Hyderabad")
        assert result.emergency_type == "cardiac"
        assert result.severity == "critical"

    @pytest.mark.asyncio
    async def test_fallback_unknown(self):
        result = await analyze_emergency("random unknown text xyz", "Delhi")
        assert result.emergency_type == "general"
        assert result.severity == "moderate"

    @pytest.mark.asyncio
    async def test_returns_emergency_analysis_type(self):
        from app.models.emergency import EmergencyAnalysis
        result = await analyze_emergency("stroke symptoms", "Mumbai")
        assert isinstance(result, EmergencyAnalysis)

    @pytest.mark.asyncio
    async def test_vertex_ai_success_path(self):
        """Test the Vertex AI success path with mocked response."""
        from unittest.mock import MagicMock, patch
        from app.models.emergency import EmergencyAnalysis

        mock_response = MagicMock()
        mock_response.text = '{"emergency_type": "cardiac", "severity": "critical", "required_facilities": ["ICU", "Cardiology"], "confidence_score": 0.95}'

        mock_model = MagicMock()
        mock_model.generate_content.return_value = mock_response

        with patch("app.services.gemini_service.vertexai", create=True) as mock_vertexai, \
             patch.dict("sys.modules", {"vertexai": MagicMock(), "vertexai.generative_models": MagicMock()}):
            import importlib
            from app.services import gemini_service
            # Directly test via mock patching of the try block
            # Since the import is inside the function, we mock it at a higher level
            mock_vertexai_module = MagicMock()
            mock_genmodel_module = MagicMock()
            mock_genmodel_module.GenerativeModel.return_value = mock_model

            with patch.dict("sys.modules", {
                "vertexai": mock_vertexai_module,
                "vertexai.generative_models": mock_genmodel_module,
            }):
                result = await gemini_service.analyze_emergency("chest pain", "Hyderabad")
                assert isinstance(result, EmergencyAnalysis)
                assert result.emergency_type == "cardiac"

    @pytest.mark.asyncio
    async def test_vertex_ai_invalid_json_fallback(self):
        """When Vertex AI returns non-JSON, should fall back to mock."""
        from unittest.mock import MagicMock, patch

        mock_response = MagicMock()
        mock_response.text = "this is not json at all"

        mock_model = MagicMock()
        mock_model.generate_content.return_value = mock_response

        mock_genmodel_module = MagicMock()
        mock_genmodel_module.GenerativeModel.return_value = mock_model

        with patch.dict("sys.modules", {
            "vertexai": MagicMock(),
            "vertexai.generative_models": mock_genmodel_module,
        }):
            from app.services import gemini_service
            result = await gemini_service.analyze_emergency("chest pain", "Hyderabad")
            # Should fall back to mock since no JSON found
            assert result.emergency_type == "cardiac"

    @pytest.mark.asyncio
    async def test_vertex_ai_json_in_code_block(self):
        """When Vertex AI returns JSON in markdown code block."""
        from unittest.mock import MagicMock, patch

        mock_response = MagicMock()
        mock_response.text = '```json\n{"emergency_type": "trauma", "severity": "high", "required_facilities": ["Emergency"], "confidence_score": 0.85}\n```'

        mock_model = MagicMock()
        mock_model.generate_content.return_value = mock_response

        mock_genmodel_module = MagicMock()
        mock_genmodel_module.GenerativeModel.return_value = mock_model

        with patch.dict("sys.modules", {
            "vertexai": MagicMock(),
            "vertexai.generative_models": mock_genmodel_module,
        }):
            from app.services import gemini_service
            result = await gemini_service.analyze_emergency("car accident", "Delhi")
            assert result.emergency_type == "trauma"
            assert result.severity == "high"
