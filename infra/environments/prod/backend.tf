# Dùng S3 remote state để GitHub Actions có thể đọc/ghi state
# Tạo bucket trước khi terraform init:
#   aws s3 mb s3://decadriver-tfstate --region us-west-2
#   aws dynamodb create-table --table-name decadriver-tfstate-lock \
#     --attribute-definitions AttributeName=LockID,AttributeType=S \
#     --key-schema AttributeName=LockID,KeyType=HASH \
#     --billing-mode PAY_PER_REQUEST --region us-west-2

terraform {
  backend "s3" {
    bucket         = "decadriver-tfstate"
    key            = "prod/terraform.tfstate"
    region         = "us-west-2"
    dynamodb_table = "decadriver-tfstate-lock"
    encrypt        = true
  }
}
