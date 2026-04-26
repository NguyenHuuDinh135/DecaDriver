resource "random_password" "db" {
  length  = 32
  special = false
}

resource "aws_db_subnet_group" "main" {
  name       = "decadriver-prod"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_db_parameter_group" "postgres15" {
  name   = "decadriver-postgres15"
  family = "postgres15"

  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }
}

resource "aws_security_group" "rds" {
  name   = "decadriver-rds"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_db_instance" "main" {
  identifier             = "decadriver-prod"
  engine                 = "postgres"
  engine_version         = "15"
  instance_class         = "db.t3.medium"
  allocated_storage      = 20
  db_name                = "decadriver"
  username               = "decadriver"
  password               = random_password.db.result
  db_subnet_group_name   = aws_db_subnet_group.main.name
  parameter_group_name   = aws_db_parameter_group.postgres15.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  multi_az               = false
  skip_final_snapshot    = true
  deletion_protection    = false

  tags = { Name = "decadriver-prod" }
}

resource "aws_ssm_parameter" "db_password" {
  name  = "/decadriver/prod/postgres_password"
  type  = "SecureString"
  value = random_password.db.result
}

resource "aws_ssm_parameter" "db_url" {
  name  = "/decadriver/prod/database_url"
  type  = "SecureString"
  value = "postgresql+psycopg://decadriver:${random_password.db.result}@${aws_db_instance.main.address}:5432/decadriver"
}
