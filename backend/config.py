"""Runtime configuration for the Forge execution backend."""

from __future__ import annotations

import os
import platform
import sys
from dataclasses import dataclass
from typing import Literal

IS_WINDOWS = platform.system() == "Windows"

ExecutionEngine = Literal["auto", "docker", "local"]

DEFAULT_ALLOWED_ORIGINS = (
    "http://localhost:4028",
    "http://127.0.0.1:4028",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://forge-ide-0-khaki.vercel.app",
)


def _exe(name: str) -> str:
    """Append .exe on Windows if not already present."""
    return f"{name}.exe" if IS_WINDOWS and not name.endswith(".exe") else name


def _program_path(name: str = "program") -> str:
    """Return a platform-appropriate relative path for a compiled binary."""
    return _exe(name)


def _run_prefix() -> str:
    """Return the appropriate local-run prefix for compiled binaries."""
    return ".\\" if IS_WINDOWS else "./"


@dataclass(frozen=True)
class LanguageConfig:
    """Execution metadata for one supported language."""

    key: str
    label: str
    extension: str
    source_filename: str
    monaco_language: str
    version: str
    local_compile_cmd: tuple[str, ...] | None
    local_run_cmd: tuple[str, ...]
    docker_compile_cmd: tuple[str, ...] | None
    docker_run_cmd: tuple[str, ...]
    docker_image: str | None
    local_requirements: tuple[str, ...]


@dataclass(frozen=True)
class ExecutionSettings:
    """Global execution settings loaded from environment variables."""

    engine: ExecutionEngine
    default_timeout_seconds: int
    max_timeout_seconds: int
    memory_limit_mb: int
    cpu_limit: float
    pid_limit: int


def _env_int(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return int(value)
    except ValueError:
        return default


def _env_float(name: str, default: float) -> float:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return float(value)
    except ValueError:
        return default


def _env_engine(name: str, default: ExecutionEngine) -> ExecutionEngine:
    value = os.getenv(name, default).strip().lower()
    if value in {"auto", "docker", "local"}:
        return value
    return default


def get_allowed_origins() -> list[str]:
    """Return the CORS allow-list for the backend."""
    raw = os.getenv("BACKEND_ALLOWED_ORIGINS", ",".join(DEFAULT_ALLOWED_ORIGINS))
    origins = [o.strip() for o in raw.split(",") if o.strip()]
    return origins or list(DEFAULT_ALLOWED_ORIGINS)


def get_execution_settings() -> ExecutionSettings:
    """Load execution settings from environment variables."""
    return ExecutionSettings(
        engine=_env_engine("EXECUTION_ENGINE", "auto"),
        default_timeout_seconds=max(1, _env_int("EXECUTION_TIMEOUT_SECONDS", 30)),
        max_timeout_seconds=max(1, _env_int("EXECUTION_MAX_TIMEOUT_SECONDS", 60)),
        memory_limit_mb=max(128, _env_int("EXECUTION_MEMORY_LIMIT_MB", 512)),
        cpu_limit=max(0.5, _env_float("EXECUTION_CPU_LIMIT", 2.0)),
        pid_limit=max(64, _env_int("EXECUTION_PID_LIMIT", 512)),
    )


# --- Language definitions ---

PROG = _program_path()  # "program.exe" or "program"
RUN_PREFIX = _run_prefix()  # "." or "./"
RUN_PROG = f"{RUN_PREFIX}{PROG}"  # ".\\program.exe" or "./program"

LANGUAGE_CONFIGS: dict[str, LanguageConfig] = {
    "cpp": LanguageConfig(
        key="cpp",
        label="C++",
        extension="cpp",
        source_filename="main.cpp",
        monaco_language="cpp",
        version="C++17 (GCC)",
        local_compile_cmd=("g++", "-std=c++17", "-O2", "-pipe", "-o", PROG, "main.cpp"),
        local_run_cmd=(RUN_PROG,),
        docker_compile_cmd=("g++", "-std=c++17", "-O2", "-pipe", "-o", "program", "main.cpp"),
        docker_run_cmd=("./program",),
        docker_image="gcc:14",
        local_requirements=("g++",),
    ),
    "c": LanguageConfig(
        key="c",
        label="C",
        extension="c",
        source_filename="main.c",
        monaco_language="c",
        version="C17 (GCC)",
        local_compile_cmd=("gcc", "-std=c17", "-O2", "-pipe", "-o", PROG, "main.c"),
        local_run_cmd=(RUN_PROG,),
        docker_compile_cmd=("gcc", "-std=c17", "-O2", "-pipe", "-o", "program", "main.c"),
        docker_run_cmd=("./program",),
        docker_image="gcc:14",
        local_requirements=("gcc",),
    ),
    "python": LanguageConfig(
        key="python",
        label="Python 3",
        extension="py",
        source_filename="main.py",
        monaco_language="python",
        version="Python 3",
        local_compile_cmd=None,
        local_run_cmd=(sys.executable, "main.py"),
        docker_compile_cmd=None,
        docker_run_cmd=("python3", "main.py"),
        docker_image="python:3.12-alpine",
        local_requirements=(),
    ),
    "java": LanguageConfig(
        key="java",
        label="Java",
        extension="java",
        source_filename="Main.java",
        monaco_language="java",
        version="OpenJDK 21",
        local_compile_cmd=("javac", "Main.java"),
        local_run_cmd=("java", "Main"),
        docker_compile_cmd=("javac", "Main.java"),
        docker_run_cmd=("java", "Main"),
        docker_image="eclipse-temurin:21-jdk",
        local_requirements=("javac", "java"),
    ),
    "javascript": LanguageConfig(
        key="javascript",
        label="JavaScript",
        extension="js",
        source_filename="main.js",
        monaco_language="javascript",
        version="Node.js 20",
        local_compile_cmd=None,
        local_run_cmd=("node", "main.js"),
        docker_compile_cmd=None,
        docker_run_cmd=("node", "main.js"),
        docker_image="node:20-alpine",
        local_requirements=("node",),
    ),
    "go": LanguageConfig(
        key="go",
        label="Go",
        extension="go",
        source_filename="main.go",
        monaco_language="go",
        version="Go 1.22",
        local_compile_cmd=("go", "build", "-o", PROG, "main.go"),
        local_run_cmd=(RUN_PROG,),
        docker_compile_cmd=("go", "build", "-o", "program", "main.go"),
        docker_run_cmd=("./program",),
        docker_image="golang:1.22-alpine",
        local_requirements=("go",),
    ),
    "rust": LanguageConfig(
        key="rust",
        label="Rust",
        extension="rs",
        source_filename="main.rs",
        monaco_language="rust",
        version="Rust 1.79",
        local_compile_cmd=("rustc", "-O", "main.rs", "-o", PROG),
        local_run_cmd=(RUN_PROG,),
        docker_compile_cmd=("rustc", "-O", "main.rs", "-o", "program"),
        docker_run_cmd=("./program",),
        docker_image="rust:1.79-slim",
        local_requirements=("rustc",),
    ),
    "php": LanguageConfig(
        key="php",
        label="PHP",
        extension="php",
        source_filename="main.php",
        monaco_language="php",
        version="PHP 8.3",
        local_compile_cmd=None,
        local_run_cmd=("php", "main.php"),
        docker_compile_cmd=None,
        docker_run_cmd=("php", "main.php"),
        docker_image="php:8.3-cli-alpine",
        local_requirements=("php",),
    ),
    "csharp": LanguageConfig(
        key="csharp",
        label="C#",
        extension="cs",
        source_filename="Program.cs",
        monaco_language="csharp",
        version="C# 12 (.NET 8)",
        local_compile_cmd=None,
        local_run_cmd=(),
        docker_compile_cmd=None,
        docker_run_cmd=(),
        docker_image="mcr.microsoft.com/dotnet/sdk:8.0",
        local_requirements=("dotnet",),
    ),
}

LANGUAGE_ORDER = tuple(LANGUAGE_CONFIGS.keys())
