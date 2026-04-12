"""Example tests — these depend on Quuo packages installed (quuo-common).

Run after `python setup.py develop` so that Utils.* imports resolve.
"""
import json

import pytest

from Classes.ExampleClass import ExampleClass


class FakeSession:
    def query(self, stmt):
        return self

    def as_dict(self):
        return []

    def first(self):
        return None

    def all(self):
        return []

    def add(self, stmt, many=False):
        return 1

    def update(self, stmt):
        return 1


class FakeDB:
    """Mimics quuo-common Database manager (read_session, write_session)."""

    def __init__(self):
        self.read_session = FakeSession()
        self.write_session = FakeSession()


def _make_event(body=None, query=None):
    return {
        "httpMethod": "POST" if body else "GET",
        "body": json.dumps(body) if body else None,
        "queryStringParameters": query,
    }


def test_get_items_returns_status_and_data():
    cls = ExampleClass(FakeDB())
    result = cls.get_items(_make_event(query={"limit": "5", "offset": "10"}))
    assert "statusCode" in result
    assert result["data"]["items"] == []
    assert result["data"]["limit"] == 5
    assert result["data"]["offset"] == 10


def test_get_items_without_pagination():
    cls = ExampleClass(FakeDB())
    result = cls.get_items(_make_event(query=None))
    assert result["data"]["limit"] is None
    assert result["data"]["offset"] == 0


def test_create_item_requires_name():
    from Utils.ExceptionsTools import CustomException

    cls = ExampleClass(FakeDB())
    with pytest.raises(CustomException):
        cls.create_item(_make_event(body={}))


def test_create_item_returns_created_payload():
    cls = ExampleClass(FakeDB())
    result = cls.create_item(_make_event(body={"name": "demo"}))
    assert result["data"]["name"] == "demo"
