"""Fixtures compartidos para pytest.

Provee mocks de sesión de DB, settings, y helpers para tests de controllers.
"""

import json
import pytest
from unittest.mock import MagicMock, patch


@pytest.fixture
def mock_db_session() -> MagicMock:
    """Mock de sesión SQLAlchemy para tests de repository."""
    session = MagicMock()
    session.commit = MagicMock()
    session.rollback = MagicMock()
    session.close = MagicMock()
    return session


@pytest.fixture
def api_event() -> dict:
    """Genera un evento base de API Gateway.

    Returns:
        dict: Evento de API Gateway con body vacío.
    """
    return {
        "body": json.dumps({}),
        "headers": {"Content-Type": "application/json"},
        "httpMethod": "GET",
        "path": "/",
        "queryStringParameters": None,
        "pathParameters": None,
        "requestContext": {
            "requestId": "test-request-id",
        },
    }


def make_api_event(body: dict | None = None, method: str = "POST", path: str = "/") -> dict:
    """Helper para crear eventos de API Gateway con body custom.

    Args:
        body: Cuerpo del request como dict.
        method: Método HTTP.
        path: Path del endpoint.

    Returns:
        dict: Evento de API Gateway.
    """
    return {
        "body": json.dumps(body) if body else None,
        "headers": {"Content-Type": "application/json"},
        "httpMethod": method,
        "path": path,
        "queryStringParameters": None,
        "pathParameters": None,
        "requestContext": {
            "requestId": "test-request-id",
        },
    }
