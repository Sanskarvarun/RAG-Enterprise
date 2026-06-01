import time
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse


class SimpleRateLimiterMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_requests: int = 60, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window = window_seconds
        self.clients = {}  # ip -> (count, window_start)

    async def dispatch(self, request: Request, call_next):
        # Skip static and docs paths
        path = request.url.path
        if path.startswith("/docs") or path.startswith("/openapi.json"):
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        now = int(time.time())
        entry = self.clients.get(client_ip)
        if entry:
            count, start = entry
            if now - start < self.window:
                if count >= self.max_requests:
                    return JSONResponse({"detail": "Rate limit exceeded"}, status_code=429)
                else:
                    self.clients[client_ip] = (count + 1, start)
            else:
                self.clients[client_ip] = (1, now)
        else:
            self.clients[client_ip] = (1, now)

        response = await call_next(request)
        return response
