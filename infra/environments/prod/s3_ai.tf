resource "aws_s3_bucket" "ai_assets" {
  bucket = "decadriver-ai-assets-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_public_access_block" "ai_assets" {
  bucket                  = aws_s3_bucket.ai_assets.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "ai_assets" {
  bucket = aws_s3_bucket.ai_assets.id

  rule {
    id     = "expire-results"
    status = "Enabled"
    filter { prefix = "results/" }
    expiration { days = 30 }
  }
}
