"""
User routes.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from api.database.connection import get_db
from api.auth.router import get_current_user_id
from api.users.service import UserService
from api.users.models import UserProfile, UpdateUserRequest, UpdateSettingsRequest

router = APIRouter(prefix="/users", tags=["用户"])


@router.get("/me", response_model=UserProfile)
async def get_my_profile(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """获取当前用户信息"""
    service = UserService(db)
    try:
        return await service.get_profile(user_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.put("/me", response_model=UserProfile)
async def update_my_profile(
    request: UpdateUserRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """更新当前用户信息"""
    service = UserService(db)
    try:
        return await service.update_profile(user_id, request)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/me/settings")
async def get_my_settings(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """获取用户设置"""
    service = UserService(db)
    try:
        settings = await service.get_settings(user_id)
        return {"settings": settings}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.put("/me/settings")
async def update_my_settings(
    request: UpdateSettingsRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """更新用户设置"""
    service = UserService(db)
    try:
        settings = await service.update_settings(user_id, request)
        return {"settings": settings}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
