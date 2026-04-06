"""
Configuración de logging estructurado con Loguru.
Formato consistente, rotación de archivos, y niveles por entorno.
"""

import sys
from pathlib import Path

from loguru import logger

from app.core.config import get_settings


def setup_logging() -> None:
    """Configura Loguru según el entorno de ejecución."""
    settings = get_settings()

    # Eliminar handlers por defecto
    logger.remove()

    # Formato del log
    log_format = (
        "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
        "<level>{level: <8}</level> | "
        "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> | "
        "<level>{message}</level>"
    )

    # Console handler — siempre activo
    logger.add(
        sys.stderr,
        format=log_format,
        level="DEBUG" if settings.app_debug else "INFO",
        colorize=True,
    )

    # File handler — rotación diaria, retención 30 días
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)

    logger.add(
        log_dir / "ofisolve_{time:YYYY-MM-DD}.log",
        format=log_format,
        level="DEBUG",
        rotation="00:00",  # Rota a medianoche
        retention="30 days",
        compression="zip",
        encoding="utf-8",
    )

    # Log de auditoría — solo operaciones de privacidad y generación
    logger.add(
        log_dir / "audit_{time:YYYY-MM-DD}.log",
        format=log_format,
        level="INFO",
        rotation="00:00",
        retention="90 days",
        compression="zip",
        encoding="utf-8",
        filter=lambda record: "audit" in record["extra"],
    )

    logger.info("Sistema de logging inicializado", app_env=settings.app_env)
