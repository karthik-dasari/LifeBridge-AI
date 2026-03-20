"""Tests for app/services/firebase_service.py — mock mode only."""
import pytest
from app.services import firebase_service as fb


@pytest.fixture(autouse=True)
def reset_mock_state():
    """Reset mock state before each test."""
    fb._db = None
    fb._use_mock = True
    fb._mock_alerts.clear()
    fb._mock_locations.clear()
    # Restore MOCK_HOSPITALS to original 5
    fb.MOCK_HOSPITALS.clear()
    fb.MOCK_HOSPITALS.extend([
        {
            "id": "h1",
            "name": "Apollo Hospital",
            "location": {"lat": 17.4325, "lng": 78.4673},
            "facilities": ["ICU", "Cardiology", "Neurology", "Emergency", "Orthopedics"],
            "availability": {"icu_beds": 5, "emergency_slots": 10},
        },
        {
            "id": "h2",
            "name": "KIMS Hospital",
            "location": {"lat": 17.4156, "lng": 78.4347},
            "facilities": ["ICU", "Cardiology", "Emergency", "Pediatrics"],
            "availability": {"icu_beds": 3, "emergency_slots": 7},
        },
        {
            "id": "h3",
            "name": "Yashoda Hospital",
            "location": {"lat": 17.4483, "lng": 78.3915},
            "facilities": ["ICU", "Neurology", "Emergency", "Burn Unit"],
            "availability": {"icu_beds": 4, "emergency_slots": 8},
        },
        {
            "id": "h4",
            "name": "Care Hospital",
            "location": {"lat": 17.4399, "lng": 78.4983},
            "facilities": ["Emergency", "Orthopedics", "General Surgery"],
            "availability": {"icu_beds": 2, "emergency_slots": 12},
        },
        {
            "id": "h5",
            "name": "Sunshine Hospital",
            "location": {"lat": 17.4600, "lng": 78.3550},
            "facilities": ["ICU", "Cardiology", "Neurology", "Orthopedics", "Emergency", "Burn Unit"],
            "availability": {"icu_beds": 8, "emergency_slots": 15},
        },
    ])
    yield


# ── get_all_hospitals ─────────────────────────────────────────
class TestGetAllHospitals:
    def test_returns_mock_list(self):
        hospitals = fb.get_all_hospitals()
        assert len(hospitals) == 5
        assert hospitals[0]["name"] == "Apollo Hospital"

    def test_returns_list_of_dicts(self):
        hospitals = fb.get_all_hospitals()
        for h in hospitals:
            assert "id" in h
            assert "name" in h
            assert "location" in h
            assert "facilities" in h
            assert "availability" in h


# ── get_hospital ──────────────────────────────────────────────
class TestGetHospital:
    def test_found(self):
        h = fb.get_hospital("h1")
        assert h is not None
        assert h["name"] == "Apollo Hospital"

    def test_not_found(self):
        h = fb.get_hospital("nonexistent")
        assert h is None

    def test_each_hospital(self):
        for hid in ["h1", "h2", "h3", "h4", "h5"]:
            assert fb.get_hospital(hid) is not None


# ── create_alert ──────────────────────────────────────────────
class TestCreateAlert:
    def test_returns_id(self):
        alert_id = fb.create_alert({
            "hospital_id": "h1",
            "emergency_type": "cardiac",
            "eta": "10 mins",
            "requirements": ["ICU"],
        })
        assert isinstance(alert_id, str)
        assert len(alert_id) > 0

    def test_adds_timestamp(self):
        fb.create_alert({"hospital_id": "h1", "emergency_type": "test"})
        assert "timestamp" in fb._mock_alerts[0]

    def test_stores_in_mock_alerts(self):
        fb.create_alert({"hospital_id": "h1", "emergency_type": "cardiac"})
        fb.create_alert({"hospital_id": "h2", "emergency_type": "trauma"})
        assert len(fb._mock_alerts) == 2


# ── get_alerts_for_hospital ───────────────────────────────────
class TestGetAlertsForHospital:
    def test_empty(self):
        alerts = fb.get_alerts_for_hospital("h1")
        assert alerts == []

    def test_filters_by_hospital(self):
        fb.create_alert({"hospital_id": "h1", "emergency_type": "cardiac"})
        fb.create_alert({"hospital_id": "h2", "emergency_type": "trauma"})
        fb.create_alert({"hospital_id": "h1", "emergency_type": "burn"})
        h1_alerts = fb.get_alerts_for_hospital("h1")
        assert len(h1_alerts) == 2
        h2_alerts = fb.get_alerts_for_hospital("h2")
        assert len(h2_alerts) == 1

    def test_nonexistent_hospital(self):
        alerts = fb.get_alerts_for_hospital("nonexistent")
        assert alerts == []


# ── update_alert_location ─────────────────────────────────────
class TestUpdateAlertLocation:
    def test_returns_true(self):
        result = fb.update_alert_location("alert1", 17.0, 78.0)
        assert result is True

    def test_stores_location(self):
        fb.update_alert_location("alert1", 17.0, 78.0)
        assert "alert1" in fb._mock_locations
        assert fb._mock_locations["alert1"]["lat"] == 17.0
        assert fb._mock_locations["alert1"]["lng"] == 78.0

    def test_overwrites_location(self):
        fb.update_alert_location("alert1", 17.0, 78.0)
        fb.update_alert_location("alert1", 18.0, 79.0)
        assert fb._mock_locations["alert1"]["lat"] == 18.0

    def test_includes_timestamp(self):
        fb.update_alert_location("alert1", 17.0, 78.0)
        assert "updated_at" in fb._mock_locations["alert1"]


# ── get_live_location ─────────────────────────────────────────
class TestGetLiveLocation:
    def test_not_found(self):
        loc = fb.get_live_location("nonexistent")
        assert loc is None

    def test_found(self):
        fb.update_alert_location("alert1", 17.0, 78.0)
        loc = fb.get_live_location("alert1")
        assert loc is not None
        assert loc["lat"] == 17.0
        assert loc["lng"] == 78.0


# ── register_hospital ────────────────────────────────────────
class TestRegisterHospital:
    def test_returns_id(self):
        hid = fb.register_hospital({
            "name": "New Hospital",
            "location": {"lat": 17.0, "lng": 78.0},
            "facilities": ["Emergency"],
            "availability": {"icu_beds": 1, "emergency_slots": 2},
        })
        assert isinstance(hid, str)
        assert len(hid) > 0

    def test_adds_to_mock_hospitals(self):
        initial_count = len(fb.MOCK_HOSPITALS)
        fb.register_hospital({
            "name": "New Hospital",
            "location": {"lat": 17.0, "lng": 78.0},
            "facilities": ["Emergency"],
            "availability": {"icu_beds": 1, "emergency_slots": 2},
        })
        assert len(fb.MOCK_HOSPITALS) == initial_count + 1
        assert fb.MOCK_HOSPITALS[-1]["name"] == "New Hospital"


# ── update_hospital ──────────────────────────────────────────
class TestUpdateHospital:
    def test_success(self):
        result = fb.update_hospital("h1", {"availability": {"icu_beds": 10, "emergency_slots": 20}})
        assert result is True
        h = fb.get_hospital("h1")
        assert h["availability"]["icu_beds"] == 10

    def test_not_found(self):
        result = fb.update_hospital("nonexistent", {"name": "X"})
        assert result is False

    def test_partial_update(self):
        fb.update_hospital("h1", {"name": "Apollo Updated"})
        h = fb.get_hospital("h1")
        assert h["name"] == "Apollo Updated"


# ── _init_firebase (mock fallback path) ───────────────────────
class TestInitFirebase:
    def test_mock_mode_on_failure(self):
        """When no Firebase credentials, should stay in mock mode."""
        fb._db = None
        fb._use_mock = True
        fb._init_firebase()
        # Should still be in mock mode (no real credentials)
        assert fb._use_mock is True

    def test_idempotent_when_db_set(self):
        """If _db is already set, _init_firebase is a no-op."""
        fb._db = "fake_db"
        fb._use_mock = False
        fb._init_firebase()
        assert fb._db == "fake_db"

    def test_init_with_credentials_path(self):
        """Test _init_firebase with FIREBASE_CREDENTIALS_PATH set."""
        from unittest.mock import MagicMock, patch
        fb._db = None
        fb._use_mock = True

        mock_cred = MagicMock()
        mock_firestore_client = MagicMock()

        with patch.object(fb.settings, "FIREBASE_CREDENTIALS_PATH", "/fake/path.json"), \
             patch.object(fb.credentials, "Certificate", return_value=mock_cred) as mock_cert, \
             patch.object(fb.firebase_admin, "initialize_app") as mock_init, \
             patch.object(fb.firestore, "client", return_value=mock_firestore_client), \
             patch.object(fb, "_seed_mock_data"):
            fb._init_firebase()
            mock_cert.assert_called_once_with("/fake/path.json")
            mock_init.assert_called_once_with(mock_cred)
            assert fb._db == mock_firestore_client
            assert fb._use_mock is False

    def test_init_without_credentials_path(self):
        """Test _init_firebase with ADC (no credentials path)."""
        from unittest.mock import MagicMock, patch
        fb._db = None
        fb._use_mock = True

        mock_firestore_client = MagicMock()

        with patch.object(fb.settings, "FIREBASE_CREDENTIALS_PATH", ""), \
             patch.object(fb.firebase_admin, "initialize_app") as mock_init, \
             patch.object(fb.firestore, "client", return_value=mock_firestore_client), \
             patch.object(fb, "_seed_mock_data"):
            fb._init_firebase()
            mock_init.assert_called_once_with(options={'projectId': 'promptwars-hackathon-490805'})
            assert fb._db == mock_firestore_client
            assert fb._use_mock is False


# ── _seed_mock_data ───────────────────────────────────────────
class TestSeedMockData:
    def test_no_op_in_mock_mode(self):
        """_seed_mock_data should do nothing when _use_mock is True."""
        fb._use_mock = True
        fb._seed_mock_data()  # Should not raise

    def test_no_op_when_db_is_none(self):
        """_seed_mock_data should do nothing when _db is None."""
        fb._use_mock = False
        fb._db = None
        fb._seed_mock_data()  # Should not raise


# ── Firestore (non-mock) branch coverage ─────────────────────
class TestFirestoreBranches:
    """Test non-mock code paths by setting _use_mock=False and mocking _db."""

    def _make_mock_doc(self, data, doc_id="doc1", exists=True):
        from unittest.mock import MagicMock
        doc = MagicMock()
        doc.to_dict.return_value = data
        doc.id = doc_id
        doc.exists = exists
        return doc

    def test_get_all_hospitals_firestore(self):
        from unittest.mock import MagicMock
        mock_db = MagicMock()
        fb._db = mock_db
        fb._use_mock = False

        doc1 = self._make_mock_doc({"name": "H1", "location": {}}, "id1")
        doc2 = self._make_mock_doc({"name": "H2", "location": {}}, "id2")
        mock_db.collection.return_value.stream.return_value = [doc1, doc2]

        result = fb.get_all_hospitals()
        assert len(result) == 2
        assert result[0]["id"] == "id1"
        assert result[1]["name"] == "H2"

    def test_get_hospital_firestore_found(self):
        from unittest.mock import MagicMock
        mock_db = MagicMock()
        fb._db = mock_db
        fb._use_mock = False

        doc = self._make_mock_doc({"name": "Apollo"}, "h1")
        mock_db.collection.return_value.document.return_value.get.return_value = doc

        result = fb.get_hospital("h1")
        assert result["name"] == "Apollo"
        assert result["id"] == "h1"

    def test_get_hospital_firestore_not_found(self):
        from unittest.mock import MagicMock
        mock_db = MagicMock()
        fb._db = mock_db
        fb._use_mock = False

        doc = self._make_mock_doc({}, exists=False)
        mock_db.collection.return_value.document.return_value.get.return_value = doc

        result = fb.get_hospital("missing")
        assert result is None

    def test_create_alert_firestore(self):
        from unittest.mock import MagicMock
        mock_db = MagicMock()
        fb._db = mock_db
        fb._use_mock = False

        mock_doc_ref = MagicMock()
        mock_doc_ref.id = "firestore-alert-id"
        mock_db.collection.return_value.document.return_value = mock_doc_ref

        alert_id = fb.create_alert({"hospital_id": "h1", "emergency_type": "cardiac"})
        assert alert_id == "firestore-alert-id"
        mock_doc_ref.set.assert_called_once()

    def test_get_alerts_for_hospital_firestore(self):
        from unittest.mock import MagicMock
        mock_db = MagicMock()
        fb._db = mock_db
        fb._use_mock = False

        doc = self._make_mock_doc({"hospital_id": "h1", "emergency_type": "cardiac"}, "alert1")
        mock_db.collection.return_value.where.return_value.stream.return_value = [doc]

        result = fb.get_alerts_for_hospital("h1")
        assert len(result) == 1
        assert result[0]["id"] == "alert1"

    def test_update_alert_location_firestore(self):
        from unittest.mock import MagicMock
        mock_db = MagicMock()
        fb._db = mock_db
        fb._use_mock = False

        result = fb.update_alert_location("alert1", 17.0, 78.0)
        assert result is True
        mock_db.collection.return_value.document.return_value.set.assert_called_once()

    def test_get_live_location_firestore_found(self):
        from unittest.mock import MagicMock
        mock_db = MagicMock()
        fb._db = mock_db
        fb._use_mock = False

        doc = self._make_mock_doc({"lat": 17.0, "lng": 78.0}, exists=True)
        mock_db.collection.return_value.document.return_value.get.return_value = doc

        result = fb.get_live_location("alert1")
        assert result["lat"] == 17.0

    def test_get_live_location_firestore_not_found(self):
        from unittest.mock import MagicMock
        mock_db = MagicMock()
        fb._db = mock_db
        fb._use_mock = False

        doc = self._make_mock_doc({}, exists=False)
        mock_db.collection.return_value.document.return_value.get.return_value = doc

        result = fb.get_live_location("missing")
        assert result is None

    def test_register_hospital_firestore(self):
        from unittest.mock import MagicMock
        mock_db = MagicMock()
        fb._db = mock_db
        fb._use_mock = False

        mock_doc_ref = MagicMock()
        mock_doc_ref.id = "new-h-id"
        mock_db.collection.return_value.document.return_value = mock_doc_ref

        result = fb.register_hospital({"name": "New"})
        assert result == "new-h-id"

    def test_update_hospital_firestore_found(self):
        from unittest.mock import MagicMock
        mock_db = MagicMock()
        fb._db = mock_db
        fb._use_mock = False

        mock_doc_ref = MagicMock()
        mock_doc_ref.get.return_value.exists = True
        mock_db.collection.return_value.document.return_value = mock_doc_ref

        result = fb.update_hospital("h1", {"name": "Updated"})
        assert result is True
        mock_doc_ref.update.assert_called_once_with({"name": "Updated"})

    def test_update_hospital_firestore_not_found(self):
        from unittest.mock import MagicMock
        mock_db = MagicMock()
        fb._db = mock_db
        fb._use_mock = False

        mock_doc_ref = MagicMock()
        mock_doc_ref.get.return_value.exists = False
        mock_db.collection.return_value.document.return_value = mock_doc_ref

        result = fb.update_hospital("missing", {"name": "X"})
        assert result is False

    def test_seed_mock_data_firestore_empty(self):
        from unittest.mock import MagicMock
        mock_db = MagicMock()
        fb._db = mock_db
        fb._use_mock = False

        # Simulate empty collection
        mock_db.collection.return_value.limit.return_value.get.return_value = []
        fb._seed_mock_data()
        # Should have called set for each mock hospital
        assert mock_db.collection.return_value.document.return_value.set.call_count == len(fb.MOCK_HOSPITALS)

    def test_seed_mock_data_firestore_not_empty(self):
        from unittest.mock import MagicMock
        mock_db = MagicMock()
        fb._db = mock_db
        fb._use_mock = False

        # Simulate non-empty collection
        mock_db.collection.return_value.limit.return_value.get.return_value = [MagicMock()]
        fb._seed_mock_data()
        # Should NOT call set (data already exists)
        mock_db.collection.return_value.document.return_value.set.assert_not_called()
