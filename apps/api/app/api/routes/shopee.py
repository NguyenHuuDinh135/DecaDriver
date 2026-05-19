from typing import Any, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, HttpUrl

from app.services.shopee_service import shopee_service

router = APIRouter()

class ShopeeImportRequest(BaseModel):
    url: str

class ShopeeImportResponse(BaseModel):
    success: bool
    data: Any = None
    error: str = None

@router.post("/import", response_model=ShopeeImportResponse)
async def import_shopee_product(request: ShopeeImportRequest):
    """
    Import product data from a Shopee URL.
    Does not save to database immediately.
    """
    if not request.url:
        raise HTTPException(status_code=400, detail="URL is required")
    
    result = await shopee_service.import_from_url(request.url)
    return result
