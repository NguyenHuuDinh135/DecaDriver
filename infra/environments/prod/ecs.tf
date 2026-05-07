resource "aws_security_group" "alb" {
  name   = "decadriver-alb"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "ecs" {
  name   = "decadriver-ecs"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port       = 8000
    to_port         = 8000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_lb" "api" {
  name               = "decadriver-api"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id
}

resource "aws_lb_target_group" "api" {
  name        = "decadriver-api"
  port        = 8000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    path                = "/api/v1/health/"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
  }
}

resource "aws_lb_listener" "api" {
  load_balancer_arn = aws_lb.api.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.web.arn
  }
}

resource "aws_lb_listener_rule" "api" {
  listener_arn = aws_lb_listener.api.arn
  priority     = 1

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }

  condition {
    path_pattern {
      values = ["/api/*"]
    }
  }
}

resource "aws_ecs_cluster" "main" {
  name = "decadriver"
}

resource "aws_cloudwatch_log_group" "api" {
  name              = "/ecs/decadriver-api"
  retention_in_days = 7
}

resource "aws_ecs_task_definition" "api" {
  family                   = "decadriver-api"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 1024
  memory                   = 2048
  task_role_arn            = aws_iam_role.ecs_task.arn
  execution_role_arn       = aws_iam_role.ecs_execution.arn

  container_definitions = jsonencode([{
    name  = "api"
    image = "${aws_ecr_repository.api.repository_url}:latest"
    portMappings = [{ containerPort = 8000, protocol = "tcp" }]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.api.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "api"
      }
    }
    secrets = [
      { name = "POSTGRES_PASSWORD", valueFrom = aws_ssm_parameter.db_password.arn },
      { name = "SECRET_KEY",        valueFrom = aws_ssm_parameter.secret_key.arn },
      { name = "FIRST_SUPERUSER_PASSWORD", valueFrom = aws_ssm_parameter.first_superuser_password.arn },
    ]
    environment = [
      { name = "ENVIRONMENT",       value = "production" },
      { name = "PROJECT_NAME",      value = "DecaDriver" },
      { name = "POSTGRES_SERVER",   value = aws_db_instance.main.address },
      { name = "POSTGRES_PORT",     value = "5432" },
      { name = "POSTGRES_USER",     value = "decadriver" },
      { name = "POSTGRES_DB",       value = "decadriver" },
      { name = "AWS_REGION",        value = var.aws_region },
      { name = "AI_S3_BUCKET",      value = aws_s3_bucket.ai_assets.bucket },
      { name = "SAGEMAKER_FASHN_ENDPOINT", value = "decadriver-fashn-prod" },
      { name = "SAGEMAKER_QWEN_ENDPOINT",  value = "decadriver-qwen-prod" },
      { name = "SAGEMAKER_CLIP_ENDPOINT",  value = "decadriver-clip-prod" },
      { name = "SAGEMAKER_ROLE_ARN",       value = aws_iam_role.sagemaker.arn },
      { name = "FIRST_SUPERUSER",          value = var.first_superuser_email },
    ]
  }])
}

resource "aws_ecs_service" "api" {
  name            = "decadriver-api"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 8000
  }

  depends_on = [aws_lb_listener.api]

  lifecycle {
    ignore_changes = [task_definition]
  }
}
