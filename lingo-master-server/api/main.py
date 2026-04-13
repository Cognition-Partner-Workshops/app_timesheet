"""
LingoMaster API - Main FastAPI application.
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.config import get_settings
from api.database.connection import init_db, close_db
from api.auth.router import router as auth_router
from api.users.router import router as users_router
from api.words.router import router as words_router
from api.sync.router import router as sync_router
from api.ai.router import router as ai_router
from api.analytics.router import router as analytics_router

settings = get_settings()

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    logger.info("Starting LingoMaster API...")
    await init_db()
    logger.info("Database initialized")
    yield
    logger.info("Shutting down LingoMaster API...")
    await close_db()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="多语种单词记忆学习系统后端API",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers under /api/v1
API_PREFIX = "/api/v1"
app.include_router(auth_router, prefix=API_PREFIX)
app.include_router(users_router, prefix=API_PREFIX)
app.include_router(words_router, prefix=API_PREFIX)
app.include_router(sync_router, prefix=API_PREFIX)
app.include_router(ai_router, prefix=API_PREFIX)
app.include_router(analytics_router, prefix=API_PREFIX)


@app.get("/health")
async def health_check():
    """健康检查"""
    return {
        "status": "ok",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }


@app.get("/api/v1/status")
async def api_status():
    """API状态"""
    return {
        "status": "ok",
        "version": settings.APP_VERSION,
        "endpoints": {
            "auth": "/api/v1/auth",
            "users": "/api/v1/users",
            "words": "/api/v1/languages, /api/v1/wordbooks, /api/v1/words",
            "sync": "/api/v1/sync",
            "ai": "/api/v1/ai",
            "analytics": "/api/v1/analytics",
        }
    }
