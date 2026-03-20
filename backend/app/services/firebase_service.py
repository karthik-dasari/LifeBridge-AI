"""
Firebase Service — Firestore client for hospital and alert data.

Collections:
- hospitals: id, name, location, facilities, availability
- alerts: hospital_id, emergency_type, eta, timestamp
"""

import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime, timezone
from app.config import settings

# Mock hospital data used when Firebase is not configured
MOCK_HOSPITALS = [
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
]

_db = None
_use_mock = True
_mock_alerts = []
_mock_locations = {}


def _init_firebase():
    """Initialize Firebase Admin SDK using credentials or ADC."""
    global _db, _use_mock
    if _db is not None:
        return
    try:
        if settings.FIREBASE_CREDENTIALS_PATH:
            cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
            firebase_admin.initialize_app(cred)
        else:
            firebase_admin.initialize_app(options={'projectId': settings.GCP_PROJECT_ID})
        _db = firestore.client()
        _use_mock = False
        _seed_mock_data()
    except Exception as e:
        print(f"Firebase init failed: {e}")
        _use_mock = True


def _seed_mock_data():
    """Seed Firestore with mock hospital data if the collection is empty."""
    if _use_mock or _db is None:
        return
    hospitals_ref = _db.collection("hospitals")
    existing = hospitals_ref.limit(1).get()
    if len(list(existing)) > 0:
        return
    for h in MOCK_HOSPITALS:
        hospitals_ref.document(h["id"]).set(h)


def get_all_hospitals() -> list[dict]:
    """Fetch all hospitals from Firestore or return mock data."""
    _init_firebase()
    if _use_mock:
        return MOCK_HOSPITALS

    hospitals_ref = _db.collection("hospitals")
    docs = hospitals_ref.stream()
    hospitals = []
    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        hospitals.append(data)
    return hospitals


def get_hospital(hospital_id: str) -> dict | None:
    """Fetch a single hospital by ID."""
    _init_firebase()
    if _use_mock:
        for h in MOCK_HOSPITALS:
            if h["id"] == hospital_id:
                return h
        return None

    doc = _db.collection("hospitals").document(hospital_id).get()
    if doc.exists:
        data = doc.to_dict()
        data["id"] = doc.id
        return data
    return None


def create_alert(alert_data: dict) -> str:
    """Store an alert in Firestore and return the alert ID."""
    _init_firebase()
    alert_data["timestamp"] = datetime.now(timezone.utc).isoformat()

    if _use_mock:
        import uuid
        alert_id = str(uuid.uuid4())[:8]
        _mock_alerts.append({**alert_data, "id": alert_id})
        return alert_id

    doc_ref = _db.collection("alerts").document()
    doc_ref.set(alert_data)
    return doc_ref.id


def get_alerts_for_hospital(hospital_id: str) -> list[dict]:
    """Fetch all alerts for a specific hospital."""
    _init_firebase()
    if _use_mock:
        return [a for a in _mock_alerts if a.get("hospital_id") == hospital_id]

    alerts_ref = _db.collection("alerts").where("hospital_id", "==", hospital_id)
    docs = alerts_ref.stream()
    return [doc.to_dict() | {"id": doc.id} for doc in docs]


def update_alert_location(alert_id: str, lat: float, lng: float) -> bool:
    """Update live location for an active alert/emergency."""
    _init_firebase()
    location_data = {
        "lat": lat,
        "lng": lng,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if _use_mock:
        _mock_locations[alert_id] = location_data
        return True

    _db.collection("live_locations").document(alert_id).set(location_data)
    return True


def get_live_location(alert_id: str) -> dict | None:
    """Get the latest live location for an alert."""
    _init_firebase()
    if _use_mock:
        return _mock_locations.get(alert_id)

    doc = _db.collection("live_locations").document(alert_id).get()
    if doc.exists:
        return doc.to_dict()
    return None


def register_hospital(hospital_data: dict) -> str:
    """Register a new hospital and return its ID."""
    _init_firebase()
    if _use_mock:
        import uuid
        hospital_id = f"h{len(MOCK_HOSPITALS) + 1}_{uuid.uuid4().hex[:4]}"
        hospital_data["id"] = hospital_id
        MOCK_HOSPITALS.append(hospital_data)
        return hospital_id

    doc_ref = _db.collection("hospitals").document()
    doc_ref.set(hospital_data)
    return doc_ref.id


def update_hospital(hospital_id: str, data: dict) -> bool:
    """Update hospital data in Firestore."""
    _init_firebase()
    if _use_mock:
        for h in MOCK_HOSPITALS:
            if h["id"] == hospital_id:
                h.update(data)
                return True
        return False

    doc_ref = _db.collection("hospitals").document(hospital_id)
    if not doc_ref.get().exists:
        return False
    doc_ref.update(data)
    return True
