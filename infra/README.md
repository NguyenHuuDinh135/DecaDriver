# Infrastructure

## Setup 

1. Tạo S3 bucket + DynamoDB table cho remote state:
```bash
aws s3 mb s3://decadriver-tfstate --region us-west-2
aws dynamodb create-table \
  --table-name decadriver-tfstate-lock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-west-2
```

2. Deploy infra:
```bash
cd infra/environments/prod
terraform init
terraform plan -var="bucket_name=decadriver-web-prod"
terraform apply -var="bucket_name=decadriver-web-prod"
```

3. Lấy outputs để config GitHub Secrets:
```bash
terraform output
```

## GitHub Secrets cần thiết

- `AWS_DEPLOY_ROLE_ARN` — IAM role ARN (OIDC)
- `S3_BUCKET` — từ terraform output `bucket_id`
- `CLOUDFRONT_DISTRIBUTION_ID` — từ terraform output `cloudfront_distribution_id`

## OIDC Role

Tạo IAM role cho GitHub Actions với trust policy:
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Federated": "arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"},
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {
        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
      },
      "StringLike": {
        "token.actions.githubusercontent.com:sub": "repo:<ORG>/<REPO>:ref:refs/heads/main"
      }
    }
  }]
}
```

Attach policies: `AmazonS3FullAccess`, `CloudFrontFullAccess` (hoặc tạo policy tối thiểu hơn).
