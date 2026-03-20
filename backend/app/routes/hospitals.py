from fastapi import APIRouter, HTTPException

from app.models.hospital import Hospital, HospitalMatchRequest, HospitalMatchResponse
from app.services.firebase_service import get_all_hospitals, get_hospital, update_hospital
from app.services.matching_service import match_hospitals as do_match

router = APIRouter()


@router.get("/hospitals")
async def list_hospitals():
    """List all registered hospitals."""
    hospitals = get_all_hospitals()
    return hospitals


@router.post("/match-hospitals", response_model=HospitalMatchResponse)
async def match_hospitals(data: HospitalMatchRequest):
    """Match hospitals based on emergency requirements and location."""
    result = do_match(
        required_facilities=data.required_facilities,
        location=data.location,
        emergency_type=data.emergency_type,
        severity=data.severity,
        lat=data.lat,
        lng=data.lng,
    )
    return result


@router.get("/hospitals/{hospital_id}")
async def get_hospital_detail(hospital_id: str):
    """Get a single hospital by ID."""
    hospital = get_hospital(hospital_id)
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")
    return hospital


@router.put("/hospitals/{hospital_id}")
async def update_hospital_detail(hospital_id: str, data: dict):
    """Update hospital facilities/availability."""
    success = update_hospital(hospital_id, data)
    if not success:
        raise HTTPException(status_code=404, detail="Hospital not found")
    return {"status": "updated"}
