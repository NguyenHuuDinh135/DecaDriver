variable "aws_region" {
  type    = string
  default = "us-west-2"
}

variable "first_superuser_email" {
  type    = string
  default = "admin@decadriver.com"
}

variable "create_ai_endpoints" {
  type        = bool
  description = "Set true after deploy-ai.yml has pushed FASHN image and uploaded Qwen handler to S3"
  default     = false
}
