variable "aws_region" {
  type    = string
  default = "us-west-2"
}

variable "first_superuser_email" {
  type    = string
  default = "admin@decadriver.com"
}

variable "bucket_name" {
  type        = string
  description = "Name of the S3 bucket for the web frontend"
  default     = "decadriver-web-prod"
}

variable "create_ai_endpoints" {
  type        = bool
  description = "Set true after deploy-ai.yml has pushed FASHN image and uploaded Qwen handler to S3"
  default     = false
}
