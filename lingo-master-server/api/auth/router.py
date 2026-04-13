"""
Authentication routes.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.ext.asyncio import AsyncSession

from api.database.connection import get_db
from api.auth.service import AuthService
from api.auth.models import (
    RegisterRequest, LoginRequest, RefreshRequest,
    AuthResponse, TokenRefreshResponse,
)
from api.auth.jwt_handler import get_user_id_from_token

router = APIRouter(prefix="/auth", tags=["认证"])


async def get_current_user_id(authorization: str = Header(...)) -> str:
    """Extract and validate user ID from Authorization header."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header",
        )
    token = authorization[7:]
    try:
        return get_user_id_from_token(token)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )


@router.post("/register", response_model=AuthResponse)
async def register(request: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """用户注册"""
    service = AuthService(db)
    try:
        return await service.register(request)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    """用户登录"""
    service = AuthService(db)
    try:
        return await service.login(request)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.post("/refresh", response_model=TokenRefreshResponse)
async def refresh(request: RefreshRequest, db: AsyncSession = Depends(get_db)):
    """刷新Token"""
    service = AuthService(db)
    try:
        return await service.refresh_token(request.refresh_token)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.delete("/logout")
async def logout(user_id: str = Depends(get_current_user_id)):
    """退出登录"""
    # In a production system, we'd invalidate the token in Redis
    return {"message": "已退出登录"}
