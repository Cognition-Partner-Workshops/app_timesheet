"""
AI service routes - memory aid, analysis report, TTS.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone

from api.database.connection import get_db
from api.auth.router import get_current_user_id
from api.ai.llm_service import LLMService
from api.ai.tts_service import TTSService
from api.ai.cache import AICache

router = APIRouter(prefix="/ai", tags=["AI服务"])


class MemoryAidRequest(BaseModel):
    word_id: str
    word: str
    language: str
    phonetic: Optional[str] = ""
    meaning: str


class MemoryAidResponse(BaseModel):
    word_id: str
    harmonic: Optional[str] = None
    morphology: Optional[dict] = None
    story: Optional[str] = None
    related_words: list = []
    common_phrases: list = []
    memory_tip: Optional[str] = None
    cached: bool = False


class AnalysisReportRequest(BaseModel):
    period: str = Field(default="week", description="week or month")


class TTSSynthesizeRequest(BaseModel):
    word_id: str
    text: str
    language: str
    speed: float = 1.0


@router.post("/memory-aid", response_model=MemoryAidResponse)
async def get_memory_aid(
    request: MemoryAidRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """获取AI记忆辅助（自建LLM生成）"""
    cache = AICache(db)
    llm = LLMService(cache=cache)

    try:
        result = await llm.generate_memory_aid(
            word=request.word,
            language=request.language,
            phonetic=request.phonetic or "",
            meaning=request.meaning,
        )

        return MemoryAidResponse(
            word_id=request.word_id,
            harmonic=result.get("harmonic"),
            morphology=result.get("morphology"),
            story=result.get("story"),
            related_words=result.get("related_words", []),
            common_phrases=result.get("common_phrases", []),
            memory_tip=result.get("memory_tip"),
            cached=result.get("cached", False),
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI服务暂不可用",
        )


@router.post("/analysis-report")
async def get_analysis_report(
    request: AnalysisReportRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """获取AI学习分析报告（自建LLM生成）"""
    from api.analytics.service import AnalyticsService

    analytics = AnalyticsService(db)
    stats = await analytics.get_period_stats(user_id, request.period)

    llm = LLMService()
    try:
        report = await llm.generate_analysis_report(stats)
        report["generated_at"] = datetime.now(timezone.utc).isoformat()
        return report
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI服务暂不可用",
        )


@router.post("/tts/synthesize")
async def synthesize_tts(
    request: TTSSynthesizeRequest,
    user_id: str = Depends(get_current_user_id),
):
    """请求TTS语音合成（自建TTS服务）"""
    tts = TTSService()
    try:
        audio_data = await tts.synthesize(
            text=request.text,
            language=request.language,
            speed=request.speed,
        )
        return Response(
            content=audio_data,
            media_type="audio/mpeg",
        )
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        )
    finally:
        await tts.close()
