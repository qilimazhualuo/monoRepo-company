import logging

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import OperationalError

from app.global_config import settings

logger = logging.getLogger(__name__)

engine = None
SessionLocal = None


def init_db():
    global engine, SessionLocal

    try:
        engine = create_engine(
            settings.SQLALCHEMY_DATABASE_URL,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10,
            pool_timeout=10,
        )

        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))

        logger.info(f"数据库连接成功: {settings.DB_NAME}")

        with engine.begin() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))

        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    except OperationalError as exc:
        logger.error(f"数据库连接失败: {exc}")
        raise


def close_db():
    global engine
    if engine:
        engine.dispose()
        logger.info("数据库连接已关闭")


def get_engine():
    if engine is None:
        raise RuntimeError("数据库未初始化")
    return engine


def get_db():
    if SessionLocal is None:
        raise RuntimeError("数据库未初始化")

    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
