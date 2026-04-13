"""
Data sync routes.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from api.database.connection import get_db
from api.auth.router import get_current_user_id
from api.sync.service import SyncService
from api.sync.models import (
    PushRequest, PushResponse, PullRequest, PullResponse, SyncStatusResponse,
)

router = APIRouter(prefix="/sync", tags=["数据同步"])


@router.post("/push", response_model=PushResponse)
async def push_sync(
    request: PushRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """上传本地变更到服务器"""
    service = SyncService(db)
    return await service.push(user_id, request)


@router.post("/pull", response_model=PullResponse)
async def pull_sync(
    request: PullRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """从服务器拉取变更"""
    service = SyncService(db)
    return await service.pull(user_id, request)


@router.get("/status", response_model=SyncStatusResponse)
async def sync_status(
    device_id: Optional[str] = Query(None),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """获取同步状态"""
    service = SyncService(db)
    return await service.get_status(user_id, device_id)
