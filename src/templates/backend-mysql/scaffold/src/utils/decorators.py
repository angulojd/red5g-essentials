"""Decoradores transversales.

@handle_exceptions captura todas las excepciones,
loguea con contexto estructurado, y retorna JSON con status code.
"""

import functools
import json
import traceback
from typing import Any, Callable
from http import HTTPStatus

from src.exceptions.domain import DomainException
from src.utils.logger import get_logger

logger = get_logger(__name__)


def handle_exceptions(func: Callable) -> Callable:
    """Decorador que captura excepciones y retorna respuesta HTTP JSON.

    Captura DomainException (errores de negocio con status code)
    y Exception genérica (500). Loguea con contexto estructurado.

    Args:
        func: Controller function a decorar.

    Returns:
        Callable: Función decorada con manejo de excepciones.
    """

    @functools.wraps(func)
    def wrapper(*args: Any, **kwargs: Any) -> dict[str, Any]:
        """Wrapper que captura excepciones."""
        try:
            return func(*args, **kwargs)
        except DomainException as e:
            logger.warning(
                "Error de dominio | func=%s | status=%s | error=%s",
                func.__name__,
                e.status_code,
                e.message,
            )
            return {
                "statusCode": e.status_code,
                "body": json.dumps({
                    "error": e.message,
                    "type": type(e).__name__,
                }),
            }
        except Exception as e:
            logger.error(
                "Error inesperado | func=%s | error=%s | trace=%s",
                func.__name__,
                str(e),
                traceback.format_exc(),
            )
            return {
                "statusCode": HTTPStatus.INTERNAL_SERVER_ERROR,
                "body": json.dumps({
                    "error": "Error interno del servidor",
                }),
            }

    return wrapper
