"""
Pydantic models for word/wordbook operations.
"""
from typing import Optional, List
from pydantic import BaseModel


class WordMeaningSchema(BaseModel):
    pos: str
    definition_zh: str
    definition_en: Optional[str] = None
    example: Optional[str] = None
    example_zh: Optional[str] = None


class WordFamilySchema(BaseModel):
    root: Optional[str] = None
    prefix: Optional[str] = None
    suffix: Optional[str] = None
    etymology: Optional[str] = None
    related: Optional[List[str]] = None


class WordSchema(BaseModel):
    word_id: str
    language_code: str
    word: str
    phonetic_ipa: Optional[str] = None
    meanings: List[WordMeaningSchema]
    word_family: Optional[WordFamilySchema] = None
    frequency_rank: Optional[int] = None
    difficulty_level: int = 1
    tags: Optional[List[str]] = None

    class Config:
        from_attributes = True


class WordbookSchema(BaseModel):
    book_id: str
    language_code: str
    category_type: Optional[str] = None
    name: str
    description: Optional[str] = None
    word_count: int = 0
    difficulty: int = 1
    is_free: bool = True
    cover_color: Optional[str] = None
    sort_order: int = 0

    class Config:
        from_attributes = True


class CategorySchema(BaseModel):
    category_id: int
    language_code: str
    category_type: str
    category_name: str
    parent_id: Optional[int] = None
    sort_order: int = 0
    children: List["CategorySchema"] = []

    class Config:
        from_attributes = True


class LanguageSchema(BaseModel):
    code: str
    name: str
    flag: Optional[str] = None
    is_active: bool = True


class WordbookListResponse(BaseModel):
    total: int
    wordbooks: List[WordbookSchema]


class WordListResponse(BaseModel):
    total: int
    words: List[WordSchema]


class WordbookDetailResponse(WordbookSchema):
    words_preview: List[WordSchema] = []


class SearchResponse(BaseModel):
    results: List[WordSchema]
