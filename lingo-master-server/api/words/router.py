"""
Word and wordbook routes.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from api.database.connection import get_db
from api.words.service import WordService
from api.words.models import (
    LanguageSchema, CategorySchema, WordbookListResponse,
    WordListResponse, WordbookDetailResponse, WordSchema, SearchResponse,
)

router = APIRouter(tags=["词库"])


@router.get("/languages", response_model=list[LanguageSchema])
async def get_languages(db: AsyncSession = Depends(get_db)):
    """获取支持的语言列表"""
    service = WordService(db)
    return await service.get_languages()


@router.get("/languages/{code}/categories", response_model=list[CategorySchema])
async def get_categories(code: str, db: AsyncSession = Depends(get_db)):
    """获取指定语言的词库分类树"""
    service = WordService(db)
    return await service.get_categories(code)


@router.get("/wordbooks", response_model=WordbookListResponse)
async def get_wordbooks(
    language: str = Query(..., description="语言代码"),
    category_type: Optional[str] = Query(None, description="分类类型"),
    category_id: Optional[int] = Query(None, description="分类ID"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """获取词库列表"""
    service = WordService(db)
    return await service.get_wordbooks(language, category_type, category_id, page, size)


@router.get("/wordbooks/{book_id}", response_model=WordbookDetailResponse)
async def get_wordbook_detail(book_id: str, db: AsyncSession = Depends(get_db)):
    """获取词库详情"""
    service = WordService(db)
    try:
        return await service.get_wordbook_detail(book_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/wordbooks/{book_id}/words", response_model=WordListResponse)
async def get_wordbook_words(
    book_id: str,
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """获取词库中的单词列表"""
    service = WordService(db)
    return await service.get_wordbook_words(book_id, page, size)


@router.get("/words/{word_id}", response_model=WordSchema)
async def get_word(word_id: str, db: AsyncSession = Depends(get_db)):
    """获取单词详情"""
    service = WordService(db)
    try:
        return await service.get_word(word_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/words/search", response_model=SearchResponse)
async def search_words(
    q: str = Query(..., min_length=1, description="搜索关键词"),
    language: str = Query(..., description="语言代码"),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """搜索单词"""
    service = WordService(db)
    return await service.search_words(q, language, limit)
