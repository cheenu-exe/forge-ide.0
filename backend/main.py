"""FastAPI backend for Forge compiler execution."""

from __future__ import annotations

import logging
import os
import sys

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

# Support running from both project root and backend/ directory
try:
    from backend.config import LANGUAGE_CONFIGS, get_allowed_origins, get_execution_settings
    from backend.executor import CodeExecutor
    from backend.formatter import format_code as fmt
except ImportError:
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from backend.config import LANGUAGE_CONFIGS, get_allowed_origins, get_execution_settings  # type: ignore[no-redef, import-untyped]
    from backend.executor import CodeExecutor  # type: ignore[no-redef, import-untyped]
    from backend.formatter import format_code as fmt  # type: ignore[no-redef, import-untyped]

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

settings = get_execution_settings()
executor = CodeExecutor(settings=settings)

app = FastAPI(title="Forge Compiler Backend", version="1.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ExecuteRequest(BaseModel):
    language: str
    code: str = Field(..., min_length=1, max_length=100_000)
    stdin: str = Field(default="", max_length=50_000)
    timeLimit: int = Field(
        default=settings.default_timeout_seconds,
        ge=1,
        le=settings.max_timeout_seconds,
    )


class ExecuteResponse(BaseModel):
    stdout: str
    stderr: str
    exitCode: int
    executionTime: int
    memoryUsage: int
    status: str
    compilationOutput: str


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error("Unhandled error on %s %s: %s", request.method, request.url.path, exc)
    return JSONResponse(
        status_code=500,
        content={
            "detail": f"Internal server error: {exc}",
            "stdout": "",
            "stderr": str(exc),
            "exitCode": 1,
            "executionTime": 0,
            "memoryUsage": 0,
            "status": "runtime_error",
            "compilationOutput": "",
        },
    )


@app.get("/")
async def root() -> dict:
    runtime_status = executor.get_runtime_status()
    available = [lang for lang in runtime_status["languages"] if lang["available"]]
    return {
        "status": "ok",
        "service": "forge-compiler-backend",
        "version": app.version,
        "engine": runtime_status["engine"],
        "availableLanguageCount": len(available),
    }


@app.get("/api/health")
async def health() -> dict:
    runtime_status = executor.get_runtime_status()
    available = [lang for lang in runtime_status["languages"] if lang["available"]]
    return {
        "status": "ok",
        "version": app.version,
        "engine": runtime_status["engine"],
        "dockerAvailable": runtime_status["dockerAvailable"],
        "availableLanguageCount": len(available),
        "languages": runtime_status["languages"],
    }


@app.get("/api/languages")
async def get_languages() -> dict:
    return executor.get_runtime_status()


@app.post("/api/execute", response_model=ExecuteResponse)
async def execute_code(request: ExecuteRequest) -> ExecuteResponse:
    logger.info("Executing %s code (%d chars)", request.language, len(request.code))
    result = executor.execute(
        language=request.language,
        code=request.code,
        stdin=request.stdin,
        timeout=request.timeLimit,
    )
    logger.info("Execution finished: status=%s, time=%dms", result["status"], result["executionTime"])
    return ExecuteResponse(**result)


class FormatRequest(BaseModel):
    language: str
    code: str = Field(..., min_length=0, max_length=100_000)


class FormatResponse(BaseModel):
    formattedCode: str


@app.post("/api/format", response_model=FormatResponse)
async def format_code_endpoint(request: FormatRequest) -> FormatResponse:
    logger.info("Formatting %s code (%d chars)", request.language, len(request.code))
    try:
        result = fmt(request.language, request.code)
        return FormatResponse(formattedCode=result)
    except Exception as exc:
        logger.error("Format failed for %s: %s", request.language, exc)
        return FormatResponse(formattedCode=request.code)


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("BACKEND_PORT", "8000"))
    logger.info("Starting Forge compiler backend on http://0.0.0.0:%s", port)
    logger.info("Available languages: %s", ", ".join(LANGUAGE_CONFIGS.keys()))

    # Log which languages are actually available
    status = executor.get_runtime_status()
    for lang in status["languages"]:
        if lang["available"]:
            logger.info("  ✓ %s (%s)", lang["label"], lang["version"])
        else:
            logger.info("  ✗ %s - %s", lang["label"], lang["reason"])

    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=port,
        reload=False,
        log_level="info",
    )
