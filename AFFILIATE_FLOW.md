# Affiliate Flow Documentation

This document outlines the architectural and conceptual design for the Affiliate system in DecaDriver. The system is divided into two phases: Phase 1 focuses on the User Affiliate experience, and Phase 2 addresses Admin oversight.

## PHASE 1 — USER AFFILIATE FLOW (MAIN PRIORITY)

### 1. Affiliate Post Creation Flow

The creation flow is designed to be seamless, allowing users to quickly turn Shopee products into high-quality AI-generated content.

1.  **Entry Point**: The user initiates the "Create Affiliate Post" workflow from their profile or the main feed.
2.  **Product Selection**:
    *   **Shopee Link**: User pastes a Shopee product link (clothing/fashion focus).
    *   **Manual Upload (Optional)**: User can upload a product image and provide the link manually to skip extraction and speed up the process.
3.  **Data Extraction**:
    *   The system uses `ShopeeProductFetcher` to extract the product title, primary image, and price from the provided link.
4.  **AI Image Generation**:
    *   The `ImageGenerationService` takes the product image and generates a high-quality image of an AI model wearing the garment.
    *   This leverages the existing SageMaker infrastructure to ensure the clothing is rendered realistically on a human model.
5.  **Review and Publication**:
    *   User reviews the generated model image.
    *   User adds a caption/description.
    *   The post is published, containing:
        *   Generated AI Model Image
        *   Shopee Product Link (wrapped in a tracking URL)
        *   Product Details (Title, Price)
6.  **Engagement**:
    *   Followers and other users see the post in their feed.
    *   Clicking the link redirects the viewer to Shopee via a referral tracker.

### 2. User Commission Dashboard

Located at `/profile/affiliate`, this dashboard provides users with transparency into their performance and earnings.

*   **Global Metrics**:
    *   **Total Commission**: Aggregate earnings from all affiliate activity.
    *   **Total Clicks**: Number of times users clicked on their affiliate links.
    *   **Conversion Rate**: Percentage of clicks that resulted in a purchase.
*   **Post-Level Analytics**:
    *   A list of all affiliate posts with specific metrics for each:
        *   **Clicks**: Engagement per post.
        *   **Conversions**: Sales attributed to the post.
        *   **Revenue**: Total sales value generated.
        *   **Commission Earned**: The user's cut from that specific post.

---

## PHASE 2 — ADMIN (FUTURE PHASE)

*Note: This phase is to be documented and executed ONLY after Phase 1 is confirmed as complete and stable.*

### Admin Dashboard Requirements

The Admin interface provides a macro-view of the entire affiliate ecosystem.

*   **Global Analytics Overview**:
    *   Platform-wide performance (Total revenue, Total commissions paid, Top performing products).
*   **Affiliate Performance by User**:
    *   A searchable list of all users in the affiliate program.
    *   Ranking users by total revenue and commission generated.
*   **Detailed Breakdown**:
    *   Ability to drill down into a specific user's performance.
    *   View detailed stats per post at the administrative level for auditing and quality control.

---

## SYSTEM ARCHITECTURE

### Suggested Folder Structure

The implementation should follow the existing monorepo patterns.

```text
E:/DecaDriver/
├── apps/api/app/
│   ├── api/routes/
│   │   ├── affiliate.py           # User-facing affiliate endpoints
│   │   └── admin_affiliate.py     # (Phase 2) Admin endpoints
│   ├── services/
│   │   ├── shopee_fetcher.py      # Link scraping and data extraction
│   │   ├── image_generation.py    # Integration with AI/SageMaker for models
│   │   ├── commission_tracker.py  # Logic for logging clicks and conversions
│   │   └── analytics.py           # Aggregation logic for dashboards
│   └── models.py                  # Definitions for AffiliatePost and Commission schemas
├── apps/web/app/(app)/
│   ├── affiliate/                 # Creation and feed pages
│   └── profile/affiliate/         # User dashboard
└── apps/web/app/(admin)/
    └── affiliate/                 # (Phase 2) Admin analytics
```

### Class/Module Responsibilities

#### 1. AffiliatePost (Model)
*   **Responsibility**: Defines the data structure for an affiliate post.
*   **Inputs**: `user_id`, `shopee_link`, `product_image_url`, `ai_image_url`, `caption`.
*   **Outputs**: Database record stored via SQLModel.

#### 2. ShopeeProductFetcher
*   **Responsibility**: Scrape or use APIs to retrieve product metadata from Shopee.
*   **Inputs**: Shopee URL.
*   **Outputs**: Product JSON (Title, Price, Main Image URL).

#### 3. ImageGenerationService
*   **Responsibility**: Orchestrates the AI image generation process.
*   **Inputs**: Product Image (Garment), User/Model reference parameters.
*   **Outputs**: S3 URL of the generated image.
*   **Interaction**: Communicates with the SageMaker client and `avatar_job` logic.

#### 4. CommissionTracker
*   **Responsibility**: Records user engagement and calculates earnings.
*   **Inputs**: Click events (User ID, Post ID), Conversion webhooks (from Shopee or third-party aggregator).
*   **Outputs**: Transaction logs and updated user balances.

#### 5. AnalyticsService
*   **Responsibility**: Aggregates raw logs into meaningful metrics.
*   **Inputs**: Commission records, Click logs.
*   **Outputs**: Structured data for User and Admin dashboards.

#### 6. UserAffiliateDashboard
*   **Responsibility**: Frontend component to display personal metrics.
*   **Interaction**: Fetches data from `/api/affiliate/me/stats`.

#### 7. AdminAffiliateDashboard (Phase 2)
*   **Responsibility**: Frontend component for platform-wide oversight.
*   **Interaction**: Fetches data from `/api/admin/affiliate/stats`.
