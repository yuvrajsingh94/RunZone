from typing import Generic, TypeVar, Optional, List, Any, Dict
from pydantic import BaseModel, Field

T = TypeVar("T")


class PaginationMeta(BaseModel):
    page: int = 1
    limit: int = 20
    total_items: int = 0
    total_pages: int = 0
    has_next: bool = False
    has_prev: bool = False


class PaginationParams(BaseModel):
    page: int = Field(1, ge=1, description="Page number (1-indexed)")
    limit: int = Field(20, ge=1, le=100, description="Items per page (max 100)")
    search: Optional[str] = Field(None, max_length=100, description="Optional search term")
    sort_by: Optional[str] = Field("created_at", description="Field to sort by")
    sort_order: str = Field("desc", regex="^(asc|desc)$", description="Sort order ('asc' or 'desc')")


class ErrorDetail(BaseModel):
    code: str = "VALIDATION_ERROR"
    message: str
    details: Optional[List[Dict[str, Any]]] = None


class APIResponse(BaseModel, Generic[T]):
    success: bool = True
    message: str = "Operation successful"
    data: Optional[T] = None
    pagination: Optional[PaginationMeta] = None


class ErrorResponse(BaseModel):
    success: bool = False
    message: str
    error: ErrorDetail
