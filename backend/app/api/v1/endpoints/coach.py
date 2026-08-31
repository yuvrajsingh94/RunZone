from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.coach import (
    DailyCoachBriefing,
    CoachChatRequest,
    WorkoutPlanGeneratorRequest,
    AdaptiveTrainingPlan,
)
from app.schemas.common import APIResponse
from app.services.acwr_service import ACWRService
from app.services.llm_coach_service import LLMCoachService
from app.services.coach_guardrails import CoachGuardrails

router = APIRouter(prefix="/coach", tags=["AI ZoneCoach"])


@router.get("/daily-briefing", response_model=APIResponse[DailyCoachBriefing])
async def get_daily_coach_briefing(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get personalized AI Coach daily briefing powered by Groq Llama 3.3 70B & fallbacks,
    adapted to the athlete's chronic health conditions and ACWR score.
    """
    health_list = [c.strip() for c in (current_user.health_conditions or "").split(",") if c.strip()]
    acwr_summary = await ACWRService.compute_user_acwr(db=db, user_id=current_user.id)
    
    briefing = await LLMCoachService.generate_daily_briefing(
        username=current_user.full_name or current_user.username,
        acwr_data=acwr_summary,
        resting_hr=current_user.resting_hr or 52,
        max_hr=current_user.max_hr or 194,
        health_conditions=health_list,
    )
    return APIResponse(
        success=True,
        message="Daily briefing synthesized",
        data=briefing,
    )


@router.post("/chat", response_model=APIResponse[dict])
async def chat_with_coach(
    payload: CoachChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Interactive chat with ZoneCoach AI with persistent health condition memory and clinical guardrails.
    """
    health_list = [c.strip() for c in (current_user.health_conditions or "").split(",") if c.strip()]

    # Auto-detect and persist new chronic health conditions reported by the athlete
    new_conditions = CoachGuardrails.extract_health_conditions(payload.message)
    if new_conditions:
        updated = False
        for cond in new_conditions:
            if cond not in health_list:
                health_list.append(cond)
                updated = True
        if updated:
            current_user.health_conditions = ", ".join(health_list)
            db.add(current_user)
            await db.commit()
            await db.refresh(current_user)

    acwr_summary = await ACWRService.compute_user_acwr(db=db, user_id=current_user.id)
    response_text, model_used = await LLMCoachService.chat_with_coach(
        username=current_user.full_name or current_user.username,
        user_message=payload.message,
        acwr_data=acwr_summary,
        history=payload.conversation_history,
        resting_hr=current_user.resting_hr or 52,
        max_hr=current_user.max_hr or 194,
        health_conditions=health_list,
    )

    return APIResponse(
        success=True,
        message="Coach responded",
        data={
            "response": response_text,
            "coach": "ZoneCoach AI",
            "model_used": model_used,
            "health_conditions": health_list,
        },
    )


@router.post("/generate-plan", response_model=APIResponse[AdaptiveTrainingPlan])
async def generate_training_plan(
    payload: WorkoutPlanGeneratorRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate an AI adaptive multi-week periodized training plan tailored to the athlete's target race distance,
    ACWR workload baseline, Karvonen heart-rate zones, and active health conditions.
    """
    health_list = [c.strip() for c in (current_user.health_conditions or "").split(",") if c.strip()]
    acwr_summary = await ACWRService.compute_user_acwr(db=db, user_id=current_user.id)

    plan = await LLMCoachService.generate_training_plan(
        username=current_user.full_name or current_user.username,
        request=payload,
        acwr_data=acwr_summary,
        resting_hr=current_user.resting_hr or 52,
        max_hr=current_user.max_hr or 194,
        health_conditions=health_list,
    )

    return APIResponse(
        success=True,
        message="Adaptive training plan generated",
        data=plan,
    )


@router.post("/transcribe", response_model=APIResponse[dict])
async def transcribe_voice_note(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """
    Transcribe athlete audio voice note using Groq Whisper Large V3 Turbo with fallback.
    """
    audio_bytes = await file.read()
    if len(audio_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty audio file provided",
        )

    try:
        text, model_used = await LLMCoachService.transcribe_audio(
            audio_bytes=audio_bytes,
            filename=file.filename or "voice_note.m4a",
        )
        return APIResponse(
            success=True,
            message="Audio transcribed",
            data={
                "text": text,
                "model_used": model_used,
            },
        )
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Audio transcription failed: {str(err)}",
        )
