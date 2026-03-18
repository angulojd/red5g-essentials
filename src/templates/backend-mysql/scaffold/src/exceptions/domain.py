"""Excepciones custom del dominio.

Cada excepción define su status code HTTP para que
el decorador @handle_exceptions las mapee automáticamente.
"""

from http import HTTPStatus


class DomainException(Exception):
    """Excepción base del dominio."""

    default_message: str = "Error interno del servidor"

    def __init__(self, message: str | None = None) -> None:
        """Inicializa la excepción.

        Args:
            message: Mensaje descriptivo del error.
        """
        self.message = message or self.default_message
        super().__init__(self.message)


class NotFoundError(DomainException):
    """Recurso no encontrado."""

    status_code = HTTPStatus.NOT_FOUND
    default_message = "Recurso no encontrado"


class ValidationError(DomainException):
    """Error de validación de datos."""

    status_code = HTTPStatus.BAD_REQUEST
    default_message = "Datos inválidos"


class ConflictError(DomainException):
    """Conflicto con el estado actual del recurso."""

    status_code = HTTPStatus.CONFLICT
    default_message = "Conflicto con el estado actual"


class UnauthorizedError(DomainException):
    """No autorizado."""

    status_code = HTTPStatus.UNAUTHORIZED
    default_message = "No autorizado"


class ForbiddenError(DomainException):
    """Acceso prohibido."""

    status_code = HTTPStatus.FORBIDDEN
    default_message = "Acceso prohibido"
