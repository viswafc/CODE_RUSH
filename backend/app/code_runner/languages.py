"""Language configurations for the code runner."""

import os
import platform

IS_WINDOWS = platform.system() == "Windows"


class LanguageConfig:
    """Configuration for a supported programming language."""

    def __init__(
        self,
        name: str,
        extension: str,
        compile_cmd: list[str] | None,
        run_cmd: list[str],
    ):
        self.name = name
        self.extension = extension
        self.compile_cmd = compile_cmd
        self.run_cmd = run_cmd


LANGUAGES: dict[str, LanguageConfig] = {
    "python": LanguageConfig(
        name="Python",
        extension=".py",
        compile_cmd=None,
        run_cmd=["python", "{source}"] if IS_WINDOWS else ["python3", "{source}"],
    ),
    "c": LanguageConfig(
        name="C",
        extension=".c",
        compile_cmd=["gcc", "-o", "{output}", "{source}", "-lm"],
        run_cmd=["{output}"],
    ),
    "cpp": LanguageConfig(
        name="C++",
        extension=".cpp",
        compile_cmd=["g++", "-o", "{output}", "{source}", "-lm"],
        run_cmd=["{output}"],
    ),
    "java": LanguageConfig(
        name="Java",
        extension=".java",
        compile_cmd=["javac", "{source}"],
        run_cmd=["java", "-cp", "{workdir}", "Main"],
    ),
}


def get_language(lang: str) -> LanguageConfig | None:
    """Get language config by name (case-insensitive)."""
    return LANGUAGES.get(lang.lower())


def get_supported_languages() -> list[str]:
    """Return list of supported language keys."""
    return list(LANGUAGES.keys())
