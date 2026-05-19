from fastapi import APIRouter

from app.api.routes import (
    affiliate,
    avatar,
    demo,
    garments,
    health,
    items,
    login,
    private,
    recommend,
    stylist,
    tryon,
    users,
    utils,
    video_tryon,
    shopee,
    tiki,
)
from app.core.config import settings

api_router = APIRouter()
api_router.include_router(login.router)
api_router.include_router(users.router)
api_router.include_router(utils.router)
api_router.include_router(items.router)
api_router.include_router(tryon.router)
api_router.include_router(affiliate.router)
api_router.include_router(shopee.router, prefix="/shopee", tags=["shopee"])
api_router.include_router(tiki.router, prefix="/tiki", tags=["tiki"])
api_router.include_router(avatar.router)
api_router.include_router(stylist.router)
api_router.include_router(recommend.router)
api_router.include_router(health.router)
api_router.include_router(demo.router)
api_router.include_router(garments.router)
api_router.include_router(video_tryon.router)

if settings.ENVIRONMENT == "local":
    api_router.include_router(private.router)
