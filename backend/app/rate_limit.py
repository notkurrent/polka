import math
import time
from collections.abc import Callable

from fastapi import HTTPException, Request

from app.config import (
    get_sensitive_rate_limit_max_requests,
    get_sensitive_rate_limit_window_seconds,
)

# Lightweight in-memory limiter for abuse-prone endpoints.
# Limitation: counters live only in this backend process and are not shared
# across multiple backend instances. Use shared storage if the app is scaled out.
_rate_limit_buckets: dict[tuple[str, str], tuple[float, int]] = {}


def _client_key(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",", 1)[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


def _prune_expired(now: float, window_seconds: int) -> None:
    expired_keys = [
        key
        for key, (window_started_at, _count) in _rate_limit_buckets.items()
        if now - window_started_at >= window_seconds
    ]
    for key in expired_keys:
        _rate_limit_buckets.pop(key, None)


def sensitive_rate_limit(scope: str) -> Callable[[Request], None]:
    def check_rate_limit(request: Request) -> None:
        max_requests = get_sensitive_rate_limit_max_requests()
        window_seconds = get_sensitive_rate_limit_window_seconds()
        now = time.monotonic()
        _prune_expired(now, window_seconds)

        key = (scope, _client_key(request))
        window_started_at, count = _rate_limit_buckets.get(key, (now, 0))
        if now - window_started_at >= window_seconds:
            window_started_at = now
            count = 0

        if count >= max_requests:
            retry_after = max(1, math.ceil(window_seconds - (now - window_started_at)))
            raise HTTPException(
                status_code=429,
                detail="Too many requests",
                headers={"Retry-After": str(retry_after)},
            )

        _rate_limit_buckets[key] = (window_started_at, count + 1)

    return check_rate_limit


def reset_rate_limits_for_tests() -> None:
    _rate_limit_buckets.clear()
