import time
from typing import Dict, Tuple, List
from fastapi import Request, HTTPException, status


class InMemoryRateLimiter:
    """
    Sliding-window in-memory rate limiter for FastAPI endpoints with
    reverse-proxy header extraction and automated memory eviction.
    """

    def __init__(self):
        # Key: "ip:endpoint" -> List of timestamp floats
        self._history: Dict[str, List[float]] = {}
        self._last_cleanup: float = time.time()

    def _cleanup_expired_keys(self, now: float, max_idle_seconds: float = 3600):
        """Purge stale rate limit keys to prevent unbounded memory growth."""
        if now - self._last_cleanup < 300:
            return
        self._last_cleanup = now
        stale_keys = [
            k for k, timestamps in self._history.items()
            if not timestamps or (now - timestamps[-1]) > max_idle_seconds
        ]
        for k in stale_keys:
            self._history.pop(k, None)

    def is_rate_limited(self, key: str, max_requests: int, window_seconds: int) -> bool:
        now = time.time()
        self._cleanup_expired_keys(now)
        window_start = now - window_seconds

        # Get existing timestamps and clean up expired ones
        timestamps = self._history.get(key, [])
        valid_timestamps = [ts for ts in timestamps if ts > window_start]

        if len(valid_timestamps) >= max_requests:
            self._history[key] = valid_timestamps
            return True

        valid_timestamps.append(now)
        self._history[key] = valid_timestamps
        return False

    @staticmethod
    def extract_client_ip(request: Request) -> str:
        """Extract real client IP honoring standard proxy headers."""
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            # X-Forwarded-For: client, proxy1, proxy2
            return forwarded.split(",")[0].strip()
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip.strip()
        if request.client and request.client.host:
            return request.client.host
        return "unknown_client"

    def check(self, request: Request, endpoint_tag: str, max_requests: int, window_seconds: int = 60):
        client_ip = self.extract_client_ip(request)
        rate_key = f"{client_ip}:{endpoint_tag}"

        if self.is_rate_limited(rate_key, max_requests, window_seconds):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Maximum {max_requests} requests per {window_seconds} seconds for {endpoint_tag}. Please wait before trying again.",
            )



# Global rate limiter instance
rate_limiter = InMemoryRateLimiter()


def rate_limit(endpoint_tag: str, max_requests: int, window_seconds: int = 60):
    """
    FastAPI Dependency to enforce rate limits per client IP.
    """
    async def dependency(request: Request):
        rate_limiter.check(request, endpoint_tag, max_requests, window_seconds)

    return dependency
