"""
Analytics and statistics routes.
"""
from datetime import date, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from api.database.connection import get_db
from api.auth.router import get_current_user_id
from api.analytics.service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["数据统计"])


@router.get("/overview")
async def get_overview(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """获取学习概览统计"""
    service = AnalyticsService(db)
    return await service.get_learning_overview(user_id)


@router.get("/daily")
async def get_daily_stats(
    start: Optional[date] = Query(None, description="开始日期"),
    end: Optional[date] = Query(None, description="结束日期"),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """获取每日学习统计"""
    if not start:
        start = date.today() - timedelta(days=30)
    if not end:
        end = date.today()

    service = AnalyticsService(db)
    stats = await service.get_daily_stats(user_id, start, end)
    return {"daily_stats": stats}


@router.get("/achievements")
async def get_achievements(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """获取用户成就列表"""
    service = AnalyticsService(db)
    achievements = await service.get_achievements(user_id)
    return {"achievements": achievements}


@router.post("/achievements/check")
async def check_achievements(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """检查并授予新成就"""
    service = AnalyticsService(db)
    new_achievements = await service.check_and_award_achievements(user_id)
    return {"new_achievements": new_achievements}
