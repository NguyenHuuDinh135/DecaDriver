from typing import Any, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.tiki_service import tiki_service

router = APIRouter()

class TikiImportRequest(BaseModel):
    url: str

class TikiImportResponse(BaseModel):
    success: bool
    data: Any = None
    error: str = None

@router.post("/import", response_model=TikiImportResponse)
async def import_tiki_product(request: TikiImportRequest):
    """
    Import product data from a Tiki URL.
    Returns standardized product object.
    """
    if not request.url:
        raise HTTPException(status_code=400, detail="URL is required")
    
    result = await tiki_service.import_from_url(request.url)
    return result
