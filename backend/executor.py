"""Execution engine for the Forge compiler backend."""

from __future__ import annotations

import logging
import os
import shutil
import subprocess
import tempfile
import time
import uuid
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

try:
    from backend.config import ExecutionSettings, LANGUAGE_CONFIGS, LanguageConfig, get_execution_settings, IS_WINDOWS
except ImportError:
    from config import ExecutionSettings, LANGUAGE_CONFIGS, LanguageConfig, get_execution_settings, IS_WINDOWS  # type: ignore[no-redef]


CSHARP_PROJECT_TEMPLATE = """<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>
</Project>
"""


KNOWN_WINDOWS_PATHS: dict[str, list[str]] = {
    "g++": [r"C:\msys64\ucrt64\bin\g++.exe", r"C:\msys64\mingw64\bin\g++.exe"],
    "gcc": [r"C:\msys64\ucrt64\bin\gcc.exe", r"C:\msys64\mingw64\bin\gcc.exe"],
    "go": [r"C:\Program Files\Go\bin\go.exe"],
    "rustc": [r"C:\Users\srini\.cargo\bin\rustc.exe"],
    "dotnet": [r"C:\Program Files\dotnet\dotnet.exe"],
    "php": [r"C:\Program Files\php\php.exe"],
}

JAVA_SEARCH_ROOTS = [
    Path(os.environ.get("LOCALAPPDATA", "")) / "Java",
    Path("C:\\Program Files\\Eclipse Adoptium"),
    Path("C:\\Program Files\\Java"),
    Path("C:\\Program Files\\Microsoft"),
]


def _find_executable(name: str) -> str | None:
    """Find an executable on PATH, returns full path or None."""
    exe = shutil.which(name)
    if exe is not None:
        return exe
    if IS_WINDOWS:
        fixed = KNOWN_WINDOWS_PATHS.get(name, [])
        for candidate in fixed:
            if Path(candidate).exists():
                return candidate
        # Scan Java installation directories
        for root in JAVA_SEARCH_ROOTS:
            if root.is_dir():
                for jdk_dir in root.iterdir():
                    bin_path = jdk_dir / "bin" / f"{name}.exe"
                    if bin_path.exists():
                        return str(bin_path)
    return None


def _check_compiler_works(executable: str, version_flag: str = "--version") -> bool:
    """Verify a compiler actually works, not just exists on PATH."""
    exe_path = _find_executable(executable)
    if exe_path is None:
        return False
    try:
        result = subprocess.run(
            [exe_path, version_flag],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=10,
        )
        return result.returncode == 0
    except (FileNotFoundError, OSError, subprocess.TimeoutExpired):
        return False


class CodeExecutor:
    """Execute source code using Docker or locally installed runtimes."""

    def __init__(self, settings: ExecutionSettings | None = None):
        self.settings = settings or get_execution_settings()

    def execute(
        self,
        language: str,
        code: str,
        stdin: str = "",
        timeout: int | None = None,
    ) -> dict[str, Any]:
        """Run code and return a normalized execution result."""
        language_config = LANGUAGE_CONFIGS.get(language)
        if language_config is None:
            return self._error_response(
                stderr=f"Unsupported language: {language}",
                compilation_output=f"Language '{language}' is not supported.",
                status="runtime_error",
            )

        available, reason = self.is_language_available(language)
        if not available:
            return self._error_response(
                stderr=reason or "Runtime not available on this server.",
                compilation_output=reason or "Runtime unavailable.",
                status="runtime_error",
            )

        timeout_seconds = timeout or self.settings.default_timeout_seconds
        timeout_seconds = max(1, min(timeout_seconds, self.settings.max_timeout_seconds))
        engine = self.resolve_engine()

        with tempfile.TemporaryDirectory(prefix="forge-") as temp_dir:
            workspace = Path(temp_dir)
            source_file = workspace / language_config.source_filename
            source_file.write_text(code, encoding="utf-8")

            compilation_output = ""
            compile_command = self._get_command(language_config, engine, stage="compile")
            if compile_command is not None:
                compile_result = self._run_command(
                    language_config=language_config,
                    workspace=workspace,
                    command=compile_command,
                    timeout_seconds=timeout_seconds,
                    stdin="",
                    engine=engine,
                )

                if compile_result["timed_out"]:
                    return self._timeout_response(timeout_seconds)

                compilation_output = self._combine_streams(
                    compile_result["stdout"],
                    compile_result["stderr"],
                )

                if compile_result["exitCode"] != 0:
                    return {
                        "stdout": "",
                        "stderr": compile_result["stderr"],
                        "exitCode": compile_result["exitCode"],
                        "executionTime": compile_result["executionTime"],
                        "memoryUsage": 0,
                        "status": "compile_error",
                        "compilationOutput": compilation_output or "Compilation failed.",
                    }

            run_result = self._run_command(
                language_config=language_config,
                workspace=workspace,
                command=self._get_command(language_config, engine, stage="run"),
                timeout_seconds=timeout_seconds,
                stdin=stdin,
                engine=engine,
            )

            if run_result["timed_out"]:
                return self._timeout_response(timeout_seconds)

            status = "success" if run_result["exitCode"] == 0 else "runtime_error"
            return {
                "stdout": run_result["stdout"],
                "stderr": run_result["stderr"],
                "exitCode": run_result["exitCode"],
                "executionTime": run_result["executionTime"],
                "memoryUsage": 0,
                "status": status,
                "compilationOutput": compilation_output,
            }

    def resolve_engine(self) -> str:
        """Resolve the active execution engine."""
        if self.settings.engine == "docker":
            return "docker" if self._docker_available() else "unavailable"
        if self.settings.engine == "local":
            return "local"
        return "docker" if self._docker_available() else "local"

    def is_language_available(self, language: str) -> tuple[bool, str | None]:
        """Check whether the requested language can run on this machine."""
        language_config = LANGUAGE_CONFIGS.get(language)
        if language_config is None:
            return False, f"Language '{language}' is not supported."

        engine = self.resolve_engine()
        if engine == "unavailable":
            return False, "Docker execution was requested but Docker is unavailable."

        if engine == "docker":
            if not language_config.docker_image:
                return False, f"{language_config.label} has no Docker image configured."
            return True, None

        missing = [
            req for req in language_config.local_requirements
            if not self._check_requirement(req)
        ]
        if missing:
            tools = ", ".join(missing)
            return False, f"Missing local runtime(s) for {language_config.label}: {tools}."

        return True, None

    @staticmethod
    def _check_requirement(requirement: str) -> bool:
        """Check if a runtime requirement is available and functional."""
        exe_path = _find_executable(requirement)
        if exe_path is None:
            return False
        # For rustc (rustup proxy), verify the compiler actually works
        if requirement == "rustc":
            try:
                result = subprocess.run(
                    [exe_path, "--version"],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    timeout=10,
                )
                return result.returncode == 0
            except (FileNotFoundError, OSError, subprocess.TimeoutExpired):
                return False
        return True

    def get_runtime_status(self) -> dict[str, Any]:
        """Describe the current runtime and supported languages."""
        engine = self.resolve_engine()
        languages = []
        for key, config in LANGUAGE_CONFIGS.items():
            available, reason = self.is_language_available(key)
            languages.append({
                "key": config.key,
                "label": config.label,
                "version": config.version,
                "available": available,
                "reason": reason,
            })

        return {
            "engine": engine,
            "dockerAvailable": self._docker_available(),
            "languages": languages,
        }

    def _run_command(
        self,
        language_config: LanguageConfig,
        workspace: Path,
        command: tuple[str, ...],
        timeout_seconds: int,
        stdin: str,
        engine: str,
    ) -> dict[str, Any]:
        if engine == "docker":
            return self._run_docker_command(language_config, workspace, command, timeout_seconds, stdin)
        return self._run_local_command(language_config, workspace, command, timeout_seconds, stdin)

    def _run_local_command(
        self,
        language_config: LanguageConfig,
        workspace: Path,
        command: tuple[str, ...],
        timeout_seconds: int,
        stdin: str,
    ) -> dict[str, Any]:
        # Special handling for C#: create a minimal project file for dotnet run
        if language_config.key == "csharp" and not command:
            csproj_path = workspace / f"{workspace.name}.csproj"
            csproj_path.write_text(CSHARP_PROJECT_TEMPLATE, encoding="utf-8")
            resolved_command = ["dotnet", "run", "--project", str(workspace), "--no-build"]
            # First try to restore/build
            build_cmd = ["dotnet", "run", "--project", str(workspace)]
            build_result = self._spawn_process(
                command=build_cmd,
                cwd=workspace,
                timeout_seconds=timeout_seconds + 30,
                stdin=stdin,
            )
            return build_result
        resolved_command = list(command)
        if resolved_command:
            first = resolved_command[0]
            if first.startswith(("./", ".\\")):
                program_name = first[2:]
                target = workspace / program_name
                if target.exists():
                    resolved_command[0] = str(target)
                else:
                    resolved_command[0] = program_name

        return self._spawn_process(
            command=resolved_command,
            cwd=workspace,
            timeout_seconds=timeout_seconds,
            stdin=stdin,
        )

    def _run_docker_command(
        self,
        language_config: LanguageConfig,
        workspace: Path,
        command: tuple[str, ...],
        timeout_seconds: int,
        stdin: str,
    ) -> dict[str, Any]:
        container_name = f"forge-{language_config.key}-{uuid.uuid4().hex[:12]}"
        docker_command = [
            "docker",
            "run",
            "--rm",
            "--name", container_name,
            "--network", "none",
            "--memory", f"{self.settings.memory_limit_mb}m",
            "--cpus", str(self.settings.cpu_limit),
            "--pids-limit", str(self.settings.pid_limit),
            "--read-only",
            "--tmpfs", "/tmp:rw,noexec,nosuid,size=64m",
            "--workdir", "/workspace",
            "--volume", f"{workspace.resolve()}:/workspace",
            "--security-opt", "no-new-privileges",
            "--cap-drop", "ALL",
            language_config.docker_image or "",
            *command,
        ]

        try:
            return self._spawn_process(
                command=docker_command,
                cwd=workspace,
                timeout_seconds=timeout_seconds,
                stdin=stdin,
            )
        finally:
            subprocess.run(
                ["docker", "rm", "-f", container_name],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                check=False,
                timeout=5,
            )

    MSYS2_PATHS = [r"C:\msys64\ucrt64\bin", r"C:\msys64\usr\bin"]

    def _spawn_process(
        self,
        command: list[str],
        cwd: Path,
        timeout_seconds: int,
        stdin: str,
    ) -> dict[str, Any]:
        started_at = time.perf_counter()
        # Resolve the executable path if it's just a bare name
        if command and "/" not in command[0] and "\\" not in command[0]:
            resolved = _find_executable(command[0])
            if resolved:
                command[0] = resolved

        # Ensure MSYS2 binaries are on PATH so GCC can find its DLLs
        proc_env = None
        if IS_WINDOWS:
            proc_env = os.environ.copy()
            cur_path = proc_env.get("PATH", "")
            for p in self.MSYS2_PATHS:
                if p not in cur_path:
                    cur_path = f"{p};{cur_path}"
            proc_env["PATH"] = cur_path

        try:
            process = subprocess.Popen(
                command,
                cwd=cwd,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                env=proc_env,
            )
        except FileNotFoundError as error:
            return {
                "stdout": "",
                "stderr": f"Command not found: {error}",
                "exitCode": 127,
                "executionTime": 0,
                "timed_out": False,
            }
        except OSError as error:
            return {
                "stdout": "",
                "stderr": str(error),
                "exitCode": 1,
                "executionTime": 0,
                "timed_out": False,
            }

        try:
            stdout, stderr = process.communicate(input=stdin, timeout=timeout_seconds)
            elapsed_ms = int((time.perf_counter() - started_at) * 1000)
            return {
                "stdout": stdout or "",
                "stderr": stderr or "",
                "exitCode": process.returncode,
                "executionTime": elapsed_ms,
                "timed_out": False,
            }
        except subprocess.TimeoutExpired:
            process.kill()
            stdout, stderr = process.communicate()
            elapsed_ms = int((time.perf_counter() - started_at) * 1000)
            return {
                "stdout": stdout or "",
                "stderr": stderr or "",
                "exitCode": 124,
                "executionTime": elapsed_ms,
                "timed_out": True,
            }
        except Exception as error:
            process.kill()
            process.wait()
            return {
                "stdout": "",
                "stderr": f"Unexpected error during execution: {error}",
                "exitCode": 1,
                "executionTime": int((time.perf_counter() - started_at) * 1000),
                "timed_out": False,
            }

    def _get_command(
        self,
        language_config: LanguageConfig,
        engine: str,
        stage: str,
    ) -> tuple[str, ...] | None:
        if engine == "docker":
            return (
                language_config.docker_compile_cmd
                if stage == "compile"
                else language_config.docker_run_cmd
            )
        return (
            language_config.local_compile_cmd
            if stage == "compile"
            else language_config.local_run_cmd
        )

    def _docker_available(self) -> bool:
        try:
            result = subprocess.run(
                ["docker", "info"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                check=False,
                timeout=5,
            )
            return result.returncode == 0
        except (FileNotFoundError, OSError, subprocess.TimeoutExpired):
            return False

    def _timeout_response(self, timeout_seconds: int) -> dict[str, Any]:
        return self._error_response(
            stderr=f"Execution exceeded {timeout_seconds} seconds.",
            compilation_output="Code execution timed out.",
            status="tle",
        )

    def _error_response(
        self,
        stderr: str,
        compilation_output: str,
        status: str,
    ) -> dict[str, Any]:
        return {
            "stdout": "",
            "stderr": stderr,
            "exitCode": 1,
            "executionTime": 0,
            "memoryUsage": 0,
            "status": status,
            "compilationOutput": compilation_output,
        }

    def _combine_streams(self, stdout: str, stderr: str) -> str:
        parts = [p for p in (stdout.strip(), stderr.strip()) if p]
        return "\n".join(parts).strip()
