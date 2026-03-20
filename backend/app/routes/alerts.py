from fastapi import APIRouter
from datetime import datetime, timezone

from app.models.alert import AlertRequest, AlertResponse
from app.services.firebase_service import create_alert, get_alerts_for_hospital

router = APIRouter()


@router.post("/alert-hospital", response_model=AlertResponse)
async def alert_hospital(data: AlertRequest):
    """Send an alert to a hospital about an incoming emergency."""
    alert_data = {
        "hospital_id": data.hospital_id,
        "emergency_type": data.emergency,
        "eta": data.eta,
        "requirements": data.requirements,
    }
    alert_id = create_alert(alert_data)
    return AlertResponse(
        alert_id=alert_id,
        status="sent",
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@router.get("/alerts/{hospital_id}")
async def get_alerts(hospital_id: str):
    """Get all alerts for a specific hospital."""
    alerts = get_alerts_for_hospital(hospital_id)
    return alerts
