"""Sandboxed code runner — executes student code in an isolated subprocess."""

import os
import sys
import uuid
import shutil
import subprocess
import tempfile
import platform
from dataclasses import dataclass

from app.code_runner.languages import get_language, LanguageConfig
from app.config import get_settings

settings = get_settings()
IS_WINDOWS = platform.system() == "Windows"


@dataclass
class ExecutionResult:
    stdout: str = ""
    stderr: str = ""
    exit_code: int = 0
    timed_out: bool = False
    error: str | None = None


def run_code(
    source_code: str,
    language: str,
    stdin: str = "",
    timeout: int | None = None,
) -> ExecutionResult:
    """Execute source code in a sandboxed subprocess.

    Creates a temp directory, writes the source file, compiles (if needed),
    and runs with resource limits.
    """
    lang_config = get_language(language)
    if lang_config is None:
        return ExecutionResult(error=f"Unsupported language: {language}")

    if timeout is None:
        timeout = settings.CODE_EXECUTION_TIMEOUT

    workdir = tempfile.mkdtemp(prefix="coderun_")
    try:
        return _execute_in_sandbox(source_code, lang_config, stdin, timeout, workdir)
    finally:
        # Clean up temp directory
        try:
            shutil.rmtree(workdir, ignore_errors=True)
        except Exception:
            pass


def _execute_in_sandbox(
    source_code: str,
    lang: LanguageConfig,
    stdin: str,
    timeout: int,
    workdir: str,
) -> ExecutionResult:
    """Internal: compile and run code inside the work directory."""

    # For Java, the class name must be Main
    if lang.name == "Java":
        # Ensure the public class is named Main
        source_file = os.path.join(workdir, f"Main{lang.extension}")
    else:
        source_file = os.path.join(workdir, f"solution{lang.extension}")

    output_file = os.path.join(workdir, "solution.exe" if IS_WINDOWS else "solution")

    # Write source code
    with open(source_file, "w", encoding="utf-8") as f:
        f.write(source_code)

    # Compile if needed
    if lang.compile_cmd is not None:
        compile_cmd = [
            c.format(source=source_file, output=output_file, workdir=workdir)
            for c in lang.compile_cmd
        ]
        try:
            result = subprocess.run(
                compile_cmd,
                capture_output=True,
                text=True,
                timeout=30,
                cwd=workdir,
                env=_get_safe_env(),
            )
            if result.returncode != 0:
                return ExecutionResult(
                    stderr=result.stderr,
                    exit_code=result.returncode,
                    error="Compilation Error",
                )
        except subprocess.TimeoutExpired:
            return ExecutionResult(
                timed_out=True,
                error="Compilation timed out",
            )
        except FileNotFoundError as e:
            return ExecutionResult(
                error=f"Compiler not found: {e}",
            )

    # Run
    run_cmd = [
        c.format(source=source_file, output=output_file, workdir=workdir)
        for c in lang.run_cmd
    ]

    try:
        # On Windows we can't use preexec_fn, but we use CREATE_NO_WINDOW
        kwargs = {}
        if IS_WINDOWS:
            kwargs["creationflags"] = subprocess.CREATE_NO_WINDOW
        else:
            import resource

            def set_limits():
                # Memory limit
                mem_bytes = settings.CODE_MEMORY_LIMIT_MB * 1024 * 1024
                resource.setrlimit(resource.RLIMIT_AS, (mem_bytes, mem_bytes))
                # No new processes
                resource.setrlimit(resource.RLIMIT_NPROC, (0, 0))

            kwargs["preexec_fn"] = set_limits

        result = subprocess.run(
            run_cmd,
            input=stdin,
            capture_output=True,
            text=True,
            timeout=timeout,
            cwd=workdir,
            env=_get_safe_env(),
            **kwargs,
        )

        return ExecutionResult(
            stdout=result.stdout,
            stderr=result.stderr,
            exit_code=result.returncode,
        )

    except subprocess.TimeoutExpired:
        return ExecutionResult(
            timed_out=True,
            error="Time Limit Exceeded",
        )
    except FileNotFoundError as e:
        return ExecutionResult(error=f"Runtime not found: {e}")
    except Exception as e:
        return ExecutionResult(error=f"Runtime Error: {str(e)}")


def _get_safe_env() -> dict:
    """Return a minimal environment without application secrets."""
    safe_keys = {"PATH", "SYSTEMROOT", "TEMP", "TMP", "HOME", "LANG", "JAVA_HOME"}
    env = {k: v for k, v in os.environ.items() if k.upper() in safe_keys}
    # Ensure PATH is always set
    if "PATH" not in env and "Path" not in env:
        env["PATH"] = os.environ.get("PATH", os.environ.get("Path", ""))
    return env
