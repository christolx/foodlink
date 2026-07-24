resource "random_password" "database" {
  length           = 32
  special          = true
  override_special = "!#$%&*+-=?^_~"
}

resource "aws_security_group" "database" {
  name        = "${local.name_prefix}-database"
  description = "FoodLink PostgreSQL access"
  vpc_id      = data.aws_vpc.default.id

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-database"
  })
}

resource "aws_vpc_security_group_ingress_rule" "database_from_api" {
  security_group_id            = aws_security_group.database.id
  referenced_security_group_id = aws_security_group.api.id
  description                  = "PostgreSQL from FoodLink API"
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
}

resource "aws_db_subnet_group" "database" {
  name       = "${local.name_prefix}-database"
  subnet_ids = data.aws_subnets.default.ids

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-database"
  })
}

resource "aws_db_instance" "database" {
  identifier = "${local.name_prefix}-postgres"

  engine         = "postgres"
  instance_class = var.database_instance_class

  allocated_storage     = var.database_allocated_storage_gb
  max_allocated_storage = var.database_max_allocated_storage_gb
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = var.database_name
  username = var.database_username
  password = random_password.database.result
  port     = 5432

  db_subnet_group_name   = aws_db_subnet_group.database.name
  vpc_security_group_ids = [aws_security_group.database.id]
  publicly_accessible    = false
  multi_az               = var.database_multi_az

  backup_retention_period = var.database_backup_retention_days
  copy_tags_to_snapshot   = true
  deletion_protection     = var.database_deletion_protection
  skip_final_snapshot     = var.database_skip_final_snapshot
  final_snapshot_identifier = var.database_skip_final_snapshot ? null : (
    "${local.name_prefix}-postgres-final"
  )

  auto_minor_version_upgrade = true

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-postgres"
  })
}

locals {
  database_url = format(
    "postgresql://%s:%s@%s:%d/%s?sslmode=require",
    var.database_username,
    urlencode(random_password.database.result),
    aws_db_instance.database.address,
    aws_db_instance.database.port,
    var.database_name,
  )
}
