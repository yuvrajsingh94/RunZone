import time
from typing import Dict, Tuple, List
from fastapi import Request, HTTPException, status


class InMemoryRateLimiter:
    """
    Sliding-window in-memory rate limiter for FastAPI endpoints.
    Protects authentication and sensitive endpoints from brute-force and credential-stuffing attacks.
    """

    def __init__(self):
        # Key: (ip_address, endpoint_key) -> List of timestamp floats
        self._history: Dict[Tuple[str, str], List[float]] = {}

    def is_rate_limited(self, key: str, max_requests: int, window_seconds: int) -> bool:
        now = time.time()
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

    def check(self, request: Request, endpoint_tag: str, max_requests: int, window_seconds: int = 60):
        client_ip = request.client.host if request.client else "unknown_client"
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
