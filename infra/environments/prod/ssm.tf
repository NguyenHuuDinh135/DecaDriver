resource "random_password" "secret_key" {
  length  = 64
  special = false
}

resource "random_password" "superuser_password" {
  length  = 24
  special = false
}

resource "aws_ssm_parameter" "secret_key" {
  name  = "/decadriver/prod/secret_key"
  type  = "SecureString"
  value = random_password.secret_key.result
}

resource "aws_ssm_parameter" "first_superuser_password" {
  name  = "/decadriver/prod/first_superuser_password"
  type  = "SecureString"
  value = random_password.superuser_password.result
}

resource "aws_ssm_parameter" "alb_dns_name" {
  name  = "/decadriver/prod/alb_dns_name"
  type  = "String"
  value = aws_lb.api.dns_name
}
