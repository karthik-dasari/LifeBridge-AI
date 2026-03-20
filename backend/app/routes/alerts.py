from fastapi import APIRouter, Depends
from datetime import datetime, timezone

from app.models.alert import AlertRequest, AlertResponse, LocationUpdate
from app.services.firebase_service import (
    create_alert,
    get_alerts_for_hospital,
    update_alert_location,
    get_live_location,
)
from app.utils.auth import verify_firebase_token

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
    if data.user_lat is not None and data.user_lng is not None:
        alert_data["user_lat"] = data.user_lat
        alert_data["user_lng"] = data.user_lng
    alert_id = create_alert(alert_data)

    # Store initial location if provided
    if data.user_lat is not None and data.user_lng is not None:
        update_alert_location(alert_id, data.user_lat, data.user_lng)

    return AlertResponse(
        alert_id=alert_id,
        status="sent",
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@router.get("/alerts/{hospital_id}")
async def get_alerts(
    hospital_id: str,
    _user: dict = Depends(verify_firebase_token),
):
    """Get all alerts for a specific hospital (requires authentication)."""
    alerts = get_alerts_for_hospital(hospital_id)
    return alerts


@router.post("/location-update")
async def location_update(data: LocationUpdate):
    """Update the live location of a user en route to hospital."""
    update_alert_location(data.alert_id, data.lat, data.lng)
    return {"status": "ok"}


@router.get("/live-location/{alert_id}")
async def live_location(
    alert_id: str,
    _user: dict = Depends(verify_firebase_token),
):
    """Get the latest live location for a specific alert (requires authentication)."""
    loc = get_live_location(alert_id)
    if loc is None:
        return {"lat": None, "lng": None}
    return loc
