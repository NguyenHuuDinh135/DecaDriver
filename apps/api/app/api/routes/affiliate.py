import uuid
from typing import Any, List, Optional
from datetime import datetime

from fastapi import APIRouter, HTTPException, BackgroundTasks, Request
from fastapi.responses import RedirectResponse
from sqlmodel import select, func

from app.api.deps import CurrentUser, SessionDep
from app.core.config import settings
from app.models import (
    AffiliatePost, 
    AffiliatePostPublic, 
    AffiliatePostCreate,
    AffiliateStats,
    AffiliateClick,
    JobStatus,
    AvatarJob
)
from app.services.tiki_service import tiki_service
from app.services.sagemaker_client import sagemaker_client

router = APIRouter(prefix="/affiliate", tags=["affiliate"])

@router.post("/posts", response_model=AffiliatePostPublic)
async def create_affiliate_post(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    post_in: AffiliatePostCreate,
) -> Any:
    """
    Create an affiliate post. 
    If tiki_link is provided, it extracts product data and triggers AI image generation.
    """
    product_data = None
    if post_in.tiki_link:
        result = await tiki_service.import_from_url(post_in.tiki_link)
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=f"Could not extract data from Tiki link: {result.get('error')}")
        product_data = result.get("data")
    
    # Use extracted data or provided data
    title = post_in.title or (product_data["name"] if product_data else "Untitled Post")
    price_val = post_in.price or (str(product_data["price"]) if product_data else None)
    
    # Handle price formatting for display
    price = f"{int(price_val):,}đ".replace(",", ".") if price_val and price_val.isdigit() else price_val
    
    # Use first image from list if available
    images = product_data.get("images", []) if product_data else []
    product_image_url = post_in.product_image_url or (images[0] if images else None)
    
    if not product_image_url:
        raise HTTPException(status_code=400, detail="Product image is required")

    # Create the post record
    post = AffiliatePost(
        user_id=current_user.id,
        tiki_link=post_in.tiki_link,
        product_image_url=product_image_url,
        title=title,
        price=price,
        status=JobStatus.pending
    )
    session.add(post)
    session.commit()
    session.refresh(post)

    # Trigger AI Image Generation (Try-on pattern)
    # Get user's reference image
    avatar_job = session.exec(
        select(AvatarJob)
        .where(AvatarJob.user_id == current_user.id)
        .where(AvatarJob.status == JobStatus.completed)
        .order_by(AvatarJob.created_at.desc())
    ).first()

    # Use user's avatar or default model if none exists
    person_image_url = avatar_job.reference_image_url if avatar_job else settings.DEFAULT_MODEL_IMAGE_URL

    # Trigger SageMaker if configured
    if settings.AI_S3_BUCKET and settings.SAGEMAKER_FASHN_ENDPOINT:
        input_key = f"inputs/affiliate/{current_user.id}/{post.id}.json"
        input_s3_uri = sagemaker_client.upload_json_to_s3(
            settings.AI_S3_BUCKET,
            input_key,
            {
                "person_image_url": person_image_url,
                "garment_image_url": product_image_url,
                "category": "tops" # Default to tops for affiliate posts
            },
        )

        output_s3_uri = sagemaker_client.invoke_async_endpoint(
            settings.SAGEMAKER_FASHN_ENDPOINT, input_s3_uri
        )
        post.sagemaker_output_s3 = output_s3_uri
    else:
        # Fallback for local dev if AWS not configured - still set status to completed but use product image
        post.status = JobStatus.completed
        post.ai_image_url = product_image_url
        
    session.add(post)
    session.commit()
    session.refresh(post)

    return post

@router.get("/posts/{post_id}", response_model=AffiliatePostPublic)
def get_affiliate_post(
    *, session: SessionDep, current_user: CurrentUser, post_id: uuid.UUID
) -> Any:
    post = session.get(AffiliatePost, post_id)
    if not post or post.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Post not found")

    # Update status if pending
    if post.status == JobStatus.pending and post.sagemaker_output_s3:
        if sagemaker_client.check_async_failure(post.sagemaker_output_s3):
            post.status = JobStatus.failed
            session.add(post)
            session.commit()
        else:
            result = sagemaker_client.get_async_result(post.sagemaker_output_s3)
            if result:
                post.status = JobStatus.completed
                result_url = result.get("result_url")
                if result_url and result_url.startswith("s3://"):
                    result_url = sagemaker_client.generate_presigned_url(result_url)
                post.ai_image_url = result_url
                session.add(post)
                session.commit()
    
    return post

@router.get("/me/posts", response_model=List[AffiliatePostPublic])
def list_my_affiliate_posts(
    *, session: SessionDep, current_user: CurrentUser
) -> Any:
    posts = session.exec(
        select(AffiliatePost)
        .where(AffiliatePost.user_id == current_user.id)
        .where(AffiliatePost.is_active == True)
    ).all()
    return posts

@router.delete("/posts/{post_id}")
def delete_affiliate_post(
    *, session: SessionDep, current_user: CurrentUser, post_id: uuid.UUID
) -> Any:
    post = session.get(AffiliatePost, post_id)
    if not post or post.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Soft delete: just mark as inactive
    post.is_active = False
    session.add(post)
    session.commit()
    return {"message": "Post deleted"}

@router.get("/me/stats", response_model=AffiliateStats)
def get_affiliate_stats(
    *, session: SessionDep, current_user: CurrentUser
) -> Any:
    # Get all user's posts to calculate based on real prices
    posts = session.exec(
        select(AffiliatePost).where(AffiliatePost.user_id == current_user.id)
    ).all()
    
    total_clicks = 0
    total_revenue = 0.0
    total_commission = 0.0
    
    for post in posts:
        # Count clicks for this specific post
        click_count = session.exec(
            select(func.count(AffiliateClick.id))
            .where(AffiliateClick.post_id == post.id)
        ).one()
        
        if click_count > 0:
            total_clicks += click_count
            
            # Parse price (e.g., "150.000đ" -> 150000)
            price_str = post.price or "0"
            clean_price = price_str.replace("đ", "").replace(".", "").replace(",", "").strip()
            try:
                price_val = float(clean_price)
            except ValueError:
                price_val = 0.0
                
            # For demo: 1 click = 1 conversion
            # Revenue = price * conversions
            # Commission = 10% of revenue
            revenue_for_post = price_val * click_count
            commission_for_post = revenue_for_post * 0.10
            
            total_revenue += revenue_for_post
            total_commission += commission_for_post

    return {
        "total_clicks": total_clicks,
        "total_conversions": total_clicks, # 1:1 for demo
        "total_revenue": total_revenue,
        "total_commission": total_commission,
    }

@router.get("/click/{post_id}")
async def track_affiliate_click(
    post_id: uuid.UUID,
    request: Request,
    session: SessionDep,
) -> Any:
    post = session.get(AffiliatePost, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    # Record the click
    click = AffiliateClick(
        post_id=post.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    session.add(click)
    session.commit()

    # Redirect to Tiki
    return RedirectResponse(url=post.tiki_link)
