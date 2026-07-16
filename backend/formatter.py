from __future__ import annotations

import re
from typing import Protocol


class Formatter(Protocol):
    def format(self, code: str) -> str: ...


class CLikeFormatter:
    indent_size: int

    def __init__(self, indent_size: int = 4) -> None:
        self.indent_size = indent_size

    def format(self, code: str) -> str:
        lines = code.split("\n")
        result: list[str] = []
        brace_depth = 0

        for raw in lines:
            stripped = raw.strip()
            if not stripped:
                if result and result[-1] != "":
                    result.append("")
                continue

            line = stripped
            line = self._space_operators(line)
            line = self._space_keywords(line)
            line = self._space_braces(line)

            leading_close = len(line) - len(line.lstrip("}"))
            depth = max(0, brace_depth - leading_close)
            indent = " " * (depth * self.indent_size)

            result.append(f"{indent}{line}")
            open_c = line.count("{")
            close_c = line.count("}")
            brace_depth = max(0, brace_depth + open_c - close_c)

        while result and result[-1] == "":
            result.pop()
        result.append("")
        return "\n".join(result)

    def _space_operators(self, line: str) -> str:
        s = line
        s = re.sub(r"(\S)(==|!=|<=|>=|&&|\|\||<<|>>|\+=|-=|\*=|/=|%=|&=|\^=|\|=|<<=|>>=|::)(\S)", r"\1 \2 \3", s)
        s = re.sub(r"(\S)([=+\-*/%&|^<>!?])(\S)", r"\1 \2 \3", s)
        s = re.sub(r"#\s*include\s+", "#include ", s)
        s = re.sub(r"  +", " ", s)
        return s

    def _space_keywords(self, line: str) -> str:
        s = line
        for kw in ("if", "else", "while", "for", "do", "switch", "case", "return", "throw", "catch", "try", "finally", "sizeof", "typeof"):
            s = re.sub(rf"\b{kw}\((?!\))", f"{kw} (", s)
        s = re.sub(r"\)(\s*\{)", r") {", s)
        s = re.sub(r"else(\s*\{)", r"else {", s)
        s = re.sub(r"do(\s*\{)", r"do {", s)
        return s

    @staticmethod
    def _space_braces(line: str) -> str:
        s = re.sub(r"\}\s*else", r"} else", line)
        s = re.sub(r"\}\s*catch", r"} catch", s)
        s = re.sub(r"\}\s*finally", r"} finally", s)
        return s


class PythonFormatter:
    def format(self, code: str) -> str:
        lines = code.split("\n")
        result: list[str] = []
        indent_level = 0
        indent_size = 4

        for raw in lines:
            stripped = raw.strip()
            line = stripped

            if not line:
                result.append("")
                continue

            line = re.sub(r"(\S)([=+\-*/%&|^<>!])(\S)", r"\1 \2 \3", line)
            line = re.sub(r"  +", " ", line)
            line = re.sub(r"\s+$", "", line)

            dedent_keywords = ("pass", "return", "break", "continue", "raise")
            if any(line.startswith(kw) for kw in dedent_keywords):
                pass

            if line.startswith("except") or line.startswith("elif") or line.startswith("finally"):
                indent_level = max(0, indent_level - 1)

            indent = " " * (indent_level * indent_size)
            result.append(f"{indent}{line}")

            if line.endswith(":"):
                indent_level += 1
            elif line.startswith("class ") or line.startswith("def "):
                pass

        while result and result[-1] == "":
            result.pop()
        result.append("")
        return "\n".join(result)


_CL_LIKE = {"cpp", "c", "java", "javascript", "go", "rust", "php", "csharp"}

_INDENT_MAP: dict[str, int] = {
    "cpp": 2,
    "c": 2,
    "java": 4,
    "javascript": 2,
    "go": 1,
    "rust": 4,
    "php": 4,
    "csharp": 4,
}


def get_formatter(language: str) -> Formatter:
    if language == "python":
        return PythonFormatter()
    indent = _INDENT_MAP.get(language, 4)
    return CLikeFormatter(indent_size=indent)


def format_code(language: str, code: str) -> str:
    formatter = get_formatter(language)
    return formatter.format(code)
