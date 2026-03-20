from fastapi import APIRouter, HTTPException, Depends

from app.models.hospital import Hospital, HospitalMatchRequest, HospitalMatchResponse, HospitalUpdate
from app.services.firebase_service import get_all_hospitals, get_hospital, update_hospital, register_hospital
from app.services.matching_service import match_hospitals as do_match
from app.utils.auth import verify_firebase_token

router = APIRouter()


@router.get("/hospitals")
async def list_hospitals():
    """List all registered hospitals."""
    hospitals = get_all_hospitals()
    return hospitals


@router.post("/hospitals/register")
async def register_hospital_route(
    data: Hospital,
    _user: dict = Depends(verify_firebase_token),
):
    """Register a new hospital (requires authentication)."""
    hospital_data = {
        "name": data.name,
        "location": {"lat": data.location.lat, "lng": data.location.lng},
        "facilities": data.facilities,
        "availability": {
            "icu_beds": data.availability.icu_beds,
            "emergency_slots": data.availability.emergency_slots,
        },
    }
    hospital_id = register_hospital(hospital_data)
    return {"id": hospital_id, "status": "registered"}


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
async def update_hospital_detail(
    hospital_id: str,
    data: HospitalUpdate,
    _user: dict = Depends(verify_firebase_token),
):
    """Update hospital facilities/availability (requires authentication)."""
    update_data = data.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    if "availability" in update_data:
        update_data["availability"] = {
            k: v for k, v in update_data["availability"].items()
        }
    success = update_hospital(hospital_id, update_data)
    if not success:
        raise HTTPException(status_code=404, detail="Hospital not found")
    return {"status": "updated"}
