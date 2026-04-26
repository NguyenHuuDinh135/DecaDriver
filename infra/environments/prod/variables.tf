variable "aws_region" {
  type    = string
  default = "us-west-2"
}

variable "bucket_name" {
  type        = string
  description = "S3 bucket name for web static assets"
}

variable "first_superuser_email" {
  type        = string
  description = "Email for the first superuser account"
  default     = "admin@decadriver.com"
}
