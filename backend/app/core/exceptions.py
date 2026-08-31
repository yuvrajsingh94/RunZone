from typing import List, Dict, Any
from fastapi import Request, status, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError


def setup_exception_handlers(app):
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        code_map = {
            400: "BAD_REQUEST",
            401: "UNAUTHORIZED",
            403: "FORBIDDEN",
            404: "NOT_FOUND",
            409: "CONFLICT",
            422: "UNPROCESSABLE_ENTITY",
            429: "RATE_LIMIT_EXCEEDED",
            500: "INTERNAL_SERVER_ERROR",
        }
        err_code = code_map.get(exc.status_code, "ERROR")
        
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "message": exc.detail if isinstance(exc.detail, str) else "An error occurred",
                "error": {
                    "code": err_code,
                    "details": exc.detail if isinstance(exc.detail, list) else None,
                },
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        errors: List[Dict[str, Any]] = []
        for err in exc.errors():
            loc = " -> ".join([str(l) for l in err.get("loc", []) if l != "body"])
            msg = err.get("msg", "Invalid field")
            errors.append({
                "field": loc or "request_body",
                "message": msg,
                "type": err.get("type"),
            })

        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "success": False,
                "message": "Validation failed on one or more request fields",
                "error": {
                    "code": "VALIDATION_ERROR",
                    "details": errors,
                },
            },
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        # Log exception securely internally
        import logging
        logging.getLogger("uvicorn.error").error(f"Unhandled Server Error: {str(exc)}", exc_info=True)

        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "message": "An unexpected server error occurred. Please try again later.",
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "details": None,
                },
            },
        )
