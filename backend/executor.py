"""Execution engine for the Forge compiler backend."""

from __future__ import annotations

import logging
import os
import shutil
import subprocess
import tempfile
import time
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

try:
    from backend.config import LANGUAGE_CONFIGS, get_execution_settings, IS_WINDOWS
    from backend.config import ExecutionSettings  # noqa: F401
except ImportError:
    from config import LANGUAGE_CONFIGS, get_execution_settings, IS_WINDOWS  # type: ignore[no-redef]
    from config import ExecutionSettings  # type: ignore[no-redef] # noqa: F401


def _find_exe(name: str) -> str | None:
    exe = shutil.which(name)
    if exe is not None:
        return exe
    if not IS_WINDOWS:
        for candidate in [f"/usr/bin/{name}", f"/usr/local/bin/{name}"]:
            if Path(candidate).exists():
                return candidate
    return None


def _check_tool(name: str) -> bool:
    path = _find_exe(name)
    if path is None:
        return False
    try:
        result = subprocess.run([path, "--version"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=10)
        return result.returncode == 0
    except (FileNotFoundError, OSError, subprocess.TimeoutExpired):
        return False


def _spawn(
    cmd: list[str],
    cwd: str | Path,
    stdin_data: str,
    timeout_sec: int,
) -> dict[str, Any]:
    started = time.perf_counter()

    if cmd and "/" not in cmd[0] and "\\" not in cmd[0]:
        resolved = _find_exe(cmd[0])
        if resolved:
            cmd[0] = resolved

    try:
        proc = subprocess.Popen(
            cmd,
            cwd=cwd,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
    except FileNotFoundError as e:
        return _result("", f"Command not found: {e}", 127, 0, False)
    except OSError as e:
        return _result("", str(e), 1, 0, False)

    try:
        stdout, stderr = proc.communicate(input=stdin_data, timeout=timeout_sec)
        elapsed = int((time.perf_counter() - started) * 1000)
        return _result(stdout or "", stderr or "", proc.returncode, elapsed, False)
    except subprocess.TimeoutExpired:
        proc.kill()
        stdout, stderr = proc.communicate()
        elapsed = int((time.perf_counter() - started) * 1000)
        return _result(stdout or "", stderr or "", 124, elapsed, True)
    except Exception as e:
        proc.kill()
        proc.wait()
        elapsed = int((time.perf_counter() - started) * 1000)
        return _result("", f"Unexpected error: {e}", 1, elapsed, False)


def _result(
    stdout: str,
    stderr: str,
    exit_code: int,
    exec_time: int,
    timed_out: bool,
) -> dict[str, Any]:
    return {
        "stdout": stdout,
        "stderr": stderr,
        "exitCode": exit_code,
        "executionTime": exec_time,
        "timed_out": timed_out,
    }


class CodeExecutor:
    """Execute source code using locally installed runtimes."""

    def __init__(self, settings: ExecutionSettings | None = None):
        self.settings = settings or get_execution_settings()

    def execute(
        self,
        language: str,
        code: str,
        stdin: str = "",
        timeout: int | None = None,
    ) -> dict[str, Any]:
        cfg = LANGUAGE_CONFIGS.get(language)
        if cfg is None:
            return self._err(f"Language '{language}' is not supported.")

        available, reason = self.is_language_available(language)
        if not available:
            return self._err(reason or "Runtime not available.")

        timeout_sec = timeout or self.settings.default_timeout_seconds
        timeout_sec = max(1, min(timeout_sec, self.settings.max_timeout_seconds))

        with tempfile.TemporaryDirectory(prefix="forge-") as tmp:
            work = Path(tmp)
            src = work / cfg.source_filename
            src.write_text(code, encoding="utf-8")

            if cfg.key in ("cpp", "c", "java", "go", "rust"):
                return self._compile_and_run(cfg, work, src, stdin, timeout_sec)

            return self._run_only(cfg, work, src, stdin, timeout_sec)

    def _compile_and_run(
        self,
        cfg: Any,
        work: Path,
        src: Path,
        stdin: str,
        timeout_sec: int,
    ) -> dict[str, Any]:
        compile_cmd = self._compile_command(cfg, work, src.name)
        if not compile_cmd:
            return self._err(f"No compile command for {cfg.label}")

        compile_timeout = timeout_sec + 10
        c_result = _spawn(compile_cmd, work, "", compile_timeout)

        if c_result["timed_out"]:
            return self._timeout_resp(compile_timeout)

        compile_out = _join(c_result["stdout"], c_result["stderr"])

        if c_result["exitCode"] != 0:
            return {
                "stdout": "",
                "stderr": c_result["stderr"],
                "exitCode": c_result["exitCode"],
                "executionTime": c_result["executionTime"],
                "memoryUsage": 0,
                "status": "compile_error",
                "compilationOutput": compile_out or "Compilation failed.",
            }

        run_cmd = self._run_command(cfg, work)
        if not run_cmd:
            return self._err(f"No run command for {cfg.label}")

        r_result = _spawn(run_cmd, work, stdin, timeout_sec)

        if r_result["timed_out"]:
            return self._timeout_resp(timeout_sec)

        status = "success" if r_result["exitCode"] == 0 else "runtime_error"
        return {
            "stdout": r_result["stdout"],
            "stderr": r_result["stderr"],
            "exitCode": r_result["exitCode"],
            "executionTime": r_result["executionTime"],
            "memoryUsage": 0,
            "status": status,
            "compilationOutput": compile_out,
        }

    def _run_only(
        self,
        cfg: Any,
        work: Path,
        src: Path,
        stdin: str,
        timeout_sec: int,
    ) -> dict[str, Any]:
        run_cmd = self._run_command(cfg, work)
        if not run_cmd:
            return self._err(f"No run command for {cfg.label}")

        r_result = _spawn(run_cmd, work, stdin, timeout_sec)

        if r_result["timed_out"]:
            return self._timeout_resp(timeout_sec)

        if cfg.key == "csharp":
            compile_out = _join(r_result["stdout"], r_result["stderr"])
            if r_result["exitCode"] == 0:
                return {
                    "stdout": r_result["stdout"],
                    "stderr": r_result["stderr"],
                    "exitCode": 0,
                    "executionTime": r_result["executionTime"],
                    "memoryUsage": 0,
                    "status": "success",
                    "compilationOutput": compile_out,
                }
            return {
                "stdout": "",
                "stderr": r_result["stderr"],
                "exitCode": r_result["exitCode"],
                "executionTime": r_result["executionTime"],
                "memoryUsage": 0,
                "status": "compile_error" if r_result["exitCode"] != 0 else "runtime_error",
                "compilationOutput": compile_out,
            }

        status = "success" if r_result["exitCode"] == 0 else "runtime_error"
        return {
            "stdout": r_result["stdout"],
            "stderr": r_result["stderr"],
            "exitCode": r_result["exitCode"],
            "executionTime": r_result["executionTime"],
            "memoryUsage": 0,
            "status": status,
            "compilationOutput": "",
        }

    def _compile_command(self, cfg: Any, work: Path, src_name: str) -> list[str] | None:
        if cfg.key == "cpp":
            return ["g++", "-std=c++17", "-O2", "-o", str(work / "program"), str(work / src_name)]
        if cfg.key == "c":
            return ["gcc", "-std=c17", "-O2", "-o", str(work / "program"), str(work / src_name)]
        if cfg.key == "java":
            return ["javac", "-d", str(work), str(work / src_name)]
        if cfg.key == "go":
            return ["go", "build", "-o", str(work / "program"), str(work / src_name)]
        if cfg.key == "rust":
            return ["rustc", "-O", "-o", str(work / "program"), str(work / src_name)]
        return None

    def _run_command(self, cfg: Any, work: Path) -> list[str] | None:
        if cfg.key == "cpp":
            return [str(work / "program")]
        if cfg.key == "c":
            return [str(work / "program")]
        if cfg.key == "java":
            return ["java", "-cp", str(work), "Main"]
        if cfg.key == "go":
            return [str(work / "program")]
        if cfg.key == "rust":
            return [str(work / "program")]
        if cfg.key == "python":
            return [shutil.which("python3") or shutil.which("python") or "python3", str(work / src_name := cfg.source_filename)]
        if cfg.key == "javascript":
            return ["node", str(work / cfg.source_filename)]
        if cfg.key == "php":
            return ["php", str(work / cfg.source_filename)]
        return None

    def _resolve_csharp(self, cfg: Any, work: Path, stdin: str, timeout_sec: int) -> dict[str, Any]:
        csproj = work / f"{work.name}.csproj"
        csproj.write_text(
            '<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><OutputType>Exe</OutputType>'
            '<TargetFramework>net8.0</TargetFramework><Nullable>enable</Nullable>'
            '<ImplicitUsings>enable</ImplicitUsings></PropertyGroup></Project>',
            encoding="utf-8",
        )
        return _spawn(["dotnet", "run", "--project", str(work)], work, stdin, timeout_sec + 30)

    def resolve_engine(self) -> str:
        if self.settings.engine == "docker":
            return "unavailable"
        return "local"

    def is_language_available(self, language: str) -> tuple[bool, str | None]:
        cfg = LANGUAGE_CONFIGS.get(language)
        if cfg is None:
            return False, f"Language '{language}' is not supported."

        special: dict[str, list[str]] = {
            "cpp": ["g++"],
            "c": ["gcc"],
            "java": ["javac", "java"],
            "go": ["go"],
            "rust": ["rustc"],
            "javascript": ["node"],
            "php": ["php"],
            "csharp": ["dotnet"],
            "python": [],
        }

        reqs = special.get(language, [])
        missing = [t for t in reqs if not _check_tool(t)]
        if missing:
            return False, f"Missing: {', '.join(missing)}"
        return True, None

    def get_runtime_status(self) -> dict[str, Any]:
        engine = self.resolve_engine()
        langs = []
        for key, cfg in LANGUAGE_CONFIGS.items():
            avail, reason = self.is_language_available(key)
            langs.append({
                "key": cfg.key,
                "label": cfg.label,
                "version": cfg.version,
                "available": avail,
                "reason": reason,
            })
        return {"engine": engine, "dockerAvailable": False, "languages": langs}

    def _timeout_resp(self, seconds: int) -> dict[str, Any]:
        return {
            "stdout": "",
            "stderr": f"Execution exceeded {seconds} seconds.",
            "exitCode": 124,
            "executionTime": 0,
            "memoryUsage": 0,
            "status": "tle",
            "compilationOutput": "Code execution timed out.",
        }

    def _err(self, msg: str) -> dict[str, Any]:
        return {
            "stdout": "",
            "stderr": msg,
            "exitCode": 1,
            "executionTime": 0,
            "memoryUsage": 0,
            "status": "runtime_error",
            "compilationOutput": msg,
        }


def _join(a: str, b: str) -> str:
    return "\n".join(p for p in (a.strip(), b.strip()) if p)
