import yaml
from pathlib import Path
from typing import Any, Dict
from urllib.parse import quote_plus

from pydantic_settings import BaseSettings


def load_yaml_config() -> Dict[str, Any]:
    config_file = Path(__file__).parent.parent / "global_config.yaml"
    with open(config_file, "r", encoding="utf-8") as file:
        return yaml.safe_load(file)


class Settings(BaseSettings):
    yaml_config: Dict[str, Any] = load_yaml_config()

    BASE_DIR: Path = Path(__file__).parent.absolute()

    ALLOWED_ORIGINS: list[str] = ["*"]

    db_config: Dict[str, Any] = yaml_config.get("DATABASE", {})
    DB_USER: str = db_config.get("DB_USER", "postgres")
    DB_PASSWORD: str = db_config.get("DB_PASSWORD", "postgres")
    DB_HOST: str = db_config.get("DB_HOST", "127.0.0.1")
    DB_PORT: int = db_config.get("DB_PORT", 5432)
    DB_NAME: str = db_config.get("DB_NAME", "navigation")

    encoded_password: str = quote_plus(DB_PASSWORD)
    SQLALCHEMY_DATABASE_URL: str = (
        f"postgresql://{DB_USER}:{encoded_password}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )

    routing_config: Dict[str, Any] = yaml_config.get("ROUTING", {})
    BUFFER_DEG: float = routing_config.get("BUFFER_DEG", 0.15)
    MAX_BUFFER_DEG: float = routing_config.get("MAX_BUFFER_DEG", 0.8)
    BUFFER_STEP_DEG: float = routing_config.get("BUFFER_STEP_DEG", 0.15)
    SNAP_TOLERANCE_M: float = routing_config.get("SNAP_TOLERANCE_M", 500)
    AVG_SPEED_KMH: float = routing_config.get("AVG_SPEED_KMH", 40)

    DEBUG: bool = yaml_config.get("DEBUG", True)


settings = Settings()
