output "website_url" {
  value = "http://${aws_s3_bucket_website_configuration.web.website_endpoint}"
}

output "bucket_id" {
  value = aws_s3_bucket.web.id
}

output "alb_dns_name" {
  value = aws_lb.api.dns_name
}

output "ecr_repository_url" {
  value = aws_ecr_repository.api.repository_url
}

output "rds_endpoint" {
  value = aws_db_instance.main.address
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  value = aws_ecs_service.api.name
}

output "ai_s3_bucket" {
  value = aws_s3_bucket.ai_assets.bucket
}

output "sagemaker_fashn_endpoint" {
  value = aws_sagemaker_endpoint.fashn.name
}

output "sagemaker_qwen_endpoint" {
  value = aws_sagemaker_endpoint.qwen.name
}

output "sagemaker_clip_endpoint" {
  value = aws_sagemaker_endpoint.clip.name
}
