"""Conftest for services tests that don't need database access."""

import pytest


@pytest.fixture(scope="session", autouse=True)
def db():
    """Override the root conftest db fixture — services unit tests don't need a database."""
    yield None
