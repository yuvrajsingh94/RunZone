from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.analytics import (
    ACWRDashboardSummary,
    BiometricEntryCreate,
    BiometricDayResponse,
    BiometricsDashboardResponse,
)
from app.schemas.common import APIResponse
from app.services.acwr_service import ACWRService
from app.services.biometrics_service import BiometricsService

router = APIRouter(prefix="/analytics", tags=["Analytics & ACWR"])


@router.get("/acwr", response_model=APIResponse[ACWRDashboardSummary])
async def get_acwr_analytics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns complete Acute:Chronic Workload Ratio metrics, injury risk score, 
    weekly history, and training zone guidance.
    """
    summary = await ACWRService.compute_user_acwr(db=db, user_id=current_user.id)
    return APIResponse(
        success=True,
        message="ACWR workload analytics computed successfully",
        data=summary,
    )


@router.get("/biometrics", response_model=APIResponse[BiometricsDashboardResponse])
async def get_biometrics_analytics(
    days: int = Query(7, ge=1, le=90, description="Number of days history to retrieve"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieves genuine autonomic biometric telemetry (HRV, Resting HR, Sleep & Readiness).
    Returns has_data=False when no records exist.
    """
    data = await BiometricsService.get_user_biometrics(
        db=db,
        user_id=current_user.id,
        days=days,
    )
    return APIResponse(
        success=True,
        message="Biometrics telemetry retrieved successfully",
        data=data,
    )


@router.post("/biometrics", response_model=APIResponse[BiometricDayResponse], status_code=status.HTTP_201_CREATED)
async def log_biometrics_entry(
    payload: BiometricEntryCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Logs morning biometric readings (HRV, Resting Heart Rate, Sleep) and computes holistic readiness score.
    """
    entry = await BiometricsService.log_biometrics(
        db=db,
        user_id=current_user.id,
        payload=payload,
    )
    return APIResponse(
        success=True,
        message=f"Biometrics logged. Calculated readiness score: {entry.readiness_score}%.",
        data=entry,
    )
