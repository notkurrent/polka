import os

import pytest

from app.rate_limit import reset_rate_limits_for_tests

os.environ["POLKA_TESTING"] = "1"


@pytest.fixture(autouse=True)
def disable_real_admin_telegram_notifications(monkeypatch):
    monkeypatch.delenv("ADMIN_TELEGRAM_BOT_TOKEN", raising=False)
    monkeypatch.delenv("ADMIN_TELEGRAM_CHAT_ID", raising=False)
    monkeypatch.delenv("ADMIN_TELEGRAM_THREAD_ID", raising=False)


@pytest.fixture(autouse=True)
def reset_rate_limit_state():
    reset_rate_limits_for_tests()
    yield
    reset_rate_limits_for_tests()
