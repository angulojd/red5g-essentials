"""Configuración centralizada via pydantic-settings.

Las variables de entorno son inyectadas por Serverless Framework v3
desde AWS Secrets Manager via SSM Parameter Store.
En serverless.yml:
  environment:
    DB_HOST: ${ssm:/aws/reference/secretsmanager/${env:SECRET_NAME}~true}
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Configuración global del proyecto."""

    # Database (MySQL)
    db_host: str
    db_port: int = 3306
    db_user: str
    db_password: str
    db_name: str

    # AWS
    aws_region: str = "us-east-1"
    s3_bucket: str = ""

    # App
    debug: bool = False
    log_level: str = "INFO"

    class Config:
        """Configuración de pydantic-settings."""

        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
