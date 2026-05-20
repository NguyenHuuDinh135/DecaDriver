# AWS S3 Setup Guide for DecaDriver

This guide explains how to set up an AWS S3 bucket for the Hybrid Local + Cloud setup.

## Prerequisites
- An AWS Account (Free tier is fine for initial development)
- AWS Console access

## Step 1: Create an S3 Bucket

1. Sign in to the [AWS Management Console](https://console.aws.amazon.com/).
2. Search for **S3** and open the S3 dashboard.
3. Click **Create bucket**.
4. **Bucket name:** Enter a unique name (e.g., `decadriver-assets-<your-id>`).
5. **AWS Region:** Choose a region close to you (e.g., `us-west-2`). Remember this for your `.env` file.
6. **Object Ownership:** Keep "ACLs disabled (recommended)".
7. **Block Public Access settings for this bucket:** Keep "Block all public access" checked. We will use presigned URLs for access.
8. Click **Create bucket**.

## Step 2: Create an IAM User for Access

We need programmatic access keys for the DecaDriver backend to upload and download files.

1. Search for **IAM** in the AWS console and open the IAM dashboard.
2. Go to **Users** > **Create user**.
3. **User name:** `decadriver-app-user`.
4. **Permissions options:** Select **Attach policies directly**.
5. Search for and select `AmazonS3FullAccess` (for simplicity) OR create a custom policy with `s3:PutObject`, `s3:GetObject`, and `s3:ListBucket`.
6. Click **Next** > **Create user**.

## Step 3: Generate Access Keys

1. Click on the newly created user `decadriver-app-user`.
2. Go to the **Security credentials** tab.
3. Scroll down to **Access keys** and click **Create access key**.
4. Select **Application running outside AWS** (since the backend is local).
5. Click **Next**, then **Create access key**.
6. **IMPORTANT:** Copy the **Access key ID** and **Secret access key**. You will not be able to see the secret key again.

## Step 4: Configure DecaDriver

Update your `apps/.env` file with the following values:

```bash
# Storage (AWS S3)
AI_S3_BUCKET=decadriver-assets-<your-id>
AWS_REGION=us-west-2
AWS_ACCESS_KEY_ID=<your-access-key-id>
AWS_SECRET_ACCESS_KEY=<your-secret-access-key>
```

## Step 5: Test the Connection

Run the following test script to verify that your backend can communicate with S3:

```bash
cd apps/api
uv run python - << 'PY'
from app.services.ai_client import ai_client
from app.core.config import settings
import os

print(f"Testing S3 connection...")
print(f"Bucket: {settings.AI_S3_BUCKET}")
print(f"Region: {settings.AWS_REGION}")

try:
    # Try uploading a small test file
    uri = ai_client.upload_bytes_to_s3(
        settings.AI_S3_BUCKET, 
        "test-connection.txt", 
        b"DecaDriver Connection Test", 
        "text/plain"
    )
    print(f"✅ Successfully uploaded test file to: {uri}")
    
    # Try generating a presigned URL
    url = ai_client.generate_presigned_url(uri)
    print(f"✅ Generated presigned URL: {url[:50]}...")
    
except Exception as e:
    print(f"❌ Error connecting to S3: {e}")
PY
```

## CORS Configuration (Optional but Recommended)

If you plan to allow the frontend to upload files directly to S3 (optional for some features), you should configure CORS on your bucket:

1. In the S3 console, go to your bucket > **Permissions** tab.
2. Scroll down to **Cross-origin resource sharing (CORS)** and click **Edit**.
3. Paste the following JSON:
```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
        "AllowedOrigins": ["http://localhost:3000"],
        "ExposedHeaders": ["ETag"],
        "MaxAgeSeconds": 3000
    }
]
```
4. Click **Save changes**.
