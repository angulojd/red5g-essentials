"""Logging estructurado para CloudWatch."""

import logging
import os


def get_logger(name: str) -> logging.Logger:
    """Crea logger con formato para CloudWatch.

    Args:
        name: Nombre del módulo.

    Returns:
        logging.Logger: Logger configurado.
    """
    logger = logging.getLogger(name)
    level = os.environ.get("LOG_LEVEL", "INFO")
    logger.setLevel(getattr(logging, level, logging.INFO))
    if not logger.handlers:
        handler = logging.StreamHandler()
        fmt = logging.Formatter(
            "%(asctime)s | %(levelname)s | %(name)s | %(message)s"
        )
        handler.setFormatter(fmt)
        logger.addHandler(handler)
    return logger
