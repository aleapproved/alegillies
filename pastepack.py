#!/usr/bin/env python3
"""
PastePack — bundle multiple source files into a single, clearly delimited paste.

Why:
  Quickly paste multi-file projects (including subfolders) into ChatGPT with
  robust file headers and language-aware code fences.

Features:
  • Recursively walks any number of files/folders you pass in
  • Generates explicit file boundaries + metadata ChatGPT can parse
  • Infers code-fence language (```lang) from filename extension
  • Sensible defaults for exclusions (node_modules, .git, dist, __pycache__, etc.)
  • Limits per-file and total size; warns when limits are hit
  • Copies the result to your clipboard (with fallbacks) and/or writes to a file

Usage:
  python pastepack.py <path> [<path> ...]

  Examples
    # Everything under current folder, to clipboard
    python pastepack.py .

    # Only src and package.json, save to a file as well
    python pastepack.py src package.json --out bundle.txt

    # Include only certain extensions, exclude build outputs
    python pastepack.py . --ext .ts,.tsx,.js,.jsx,.json --exclude dist --exclude build

    # Raise the limits
    python pastepack.py . --max-total-bytes 3000000 --max-file-bytes 400000

Exit status:
  0 on success; non-zero if nothing bundled or a fatal error occurred.
"""
from __future__ import annotations

import argparse
import fnmatch
import hashlib
import io
import os
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable, List, Optional, Tuple

# ---------------------------- Configuration -----------------------------
DEFAULT_EXCLUDES = [
    ".git", "node_modules", "dist", "build", "out", "coverage", ".venv", "venv",
    "__pycache__", ".DS_Store", "*.pyc", "*.pyo", "*.class",
    "pastepack.py",   # exclude the tool itself
]

# Reasonable default extension allow-list (empty means all text files)
DEFAULT_EXTS = [
    # web
    ".html", ".htm", ".css", ".scss", ".sass", ".less",
    ".js", ".jsx", ".ts", ".tsx", ".json", ".mjs", ".cjs",
    # python
    ".py", ".pyi", ".toml", ".ini", ".cfg", ".yml", ".yaml",
    # compiled langs
    ".java", ".kt", ".kts", ".scala", ".go", ".rs", ".c", ".h", ".cpp", ".hpp",
    # scripting
    ".sh", ".bash", ".zsh", ".ps1", ".bat",
    # data & markup
    ".md", ".txt", ".csv", ".xml", ".env", ".sql",
]

# Map extensions to code-fence languages
LANG_BY_EXT = {
    ".py": "python", ".pyi": "python", ".toml": "toml", ".ini": "ini",
    ".json": "json", ".yml": "yaml", ".yaml": "yaml",
    ".js": "javascript", ".mjs": "javascript", ".cjs": "javascript",
    ".ts": "ts", ".tsx": "tsx", ".jsx": "jsx",
    ".html": "html", ".htm": "html", ".css": "css", ".scss": "scss", ".less": "less",
    ".md": "md", ".txt": "text", ".csv": "csv", ".xml": "xml",
    ".java": "java", ".kt": "kotlin", ".kts": "kotlin", ".scala": "scala",
    ".go": "go", ".rs": "rust", ".c": "c", ".h": "c",
    ".cpp": "cpp", ".hpp": "cpp", ".sql": "sql",
    ".sh": "bash", ".bash": "bash", ".zsh": "zsh", ".ps1": "powershell", ".bat": "bat",
    ".env": "bash",
}

# ------------------------------ Data types ------------------------------
@dataclass
class FileEntry:
    root: Path
    path: Path
    rel: Path
    size: int
    mtime: float

# ----------------------------- Helper funcs -----------------------------

def is_text_file(p: Path, sample_size: int = 1024) -> bool:
    """Cheap text/binary heuristic to avoid pasting binaries by mistake."""
    try:
        with open(p, "rb") as f:
            chunk = f.read(sample_size)
        if b"\x00" in chunk:
            return False
        # Allow UTF-8 BOM
        return True
    except Exception:
        return False


def sha256_bytes(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def infer_lang(ext: str) -> str:
    return LANG_BY_EXT.get(ext.lower(), "")


def normalise_newlines(s: str) -> str:
    return s.replace("\r\n", "\n").replace("\r", "\n")


def matches_any(name: str, patterns: List[str]) -> bool:
    for pat in patterns:
        if pat.startswith("/"):
            # Absolute path style exclude: normalise and compare prefix
            if os.path.abspath(name).startswith(os.path.abspath(pat)):
                return True
        else:
            if fnmatch.fnmatch(name, pat):
                return True
    return False


def walk_inputs(paths: List[Path], ex_patterns: List[str], include_hidden: bool) -> Iterable[FileEntry]:
    for p in paths:
        p = p.resolve()
        if p.is_file():
            if not include_hidden and any(part.startswith(".") for part in p.parts[1:]):
                continue
            if matches_any(p.name, ex_patterns) or matches_any(str(p), ex_patterns):
                continue
            if is_text_file(p):
                st = p.stat()
                yield FileEntry(root=p.parent, path=p, rel=Path(p.name), size=st.st_size, mtime=st.st_mtime)
            continue
        if p.is_dir():
            for dirpath, dirnames, filenames in os.walk(p):
                pruned = []
                for d in list(dirnames):
                    full = os.path.join(dirpath, d)
                    base = d
                    if (not include_hidden and d.startswith(".")) or matches_any(base, ex_patterns) or matches_any(full, ex_patterns):
                        pruned.append(d)
                for d in pruned:
                    dirnames.remove(d)
                for f in filenames:
                    full = Path(dirpath) / f
                    if not include_hidden and f.startswith("."):
                        continue
                    if matches_any(f, ex_patterns) or matches_any(str(full), ex_patterns):
                        continue
                    if is_text_file(full):
                        st = full.stat()
                        rel = full.relative_to(p)
                        yield FileEntry(root=p, path=full, rel=rel, size=st.st_size, mtime=st.st_mtime)


def filter_by_ext(entries: Iterable[FileEntry], allowed_exts: Optional[List[str]]) -> List[FileEntry]:
    if not allowed_exts or allowed_exts == ["*"]:
        return list(entries)
    allowed = {e.lower().strip() for e in allowed_exts}
    out: List[FileEntry] = []
    for fe in entries:
        if fe.path.suffix.lower() in allowed:
            out.append(fe)
    return out

# ------------------------------ Bundling -------------------------------
HEADER_LINE = "=" * 78

INTRO_TEMPLATE = (
    "PASTE‑PACK BUNDLE — multi‑file paste for ChatGPT\n"
    f"Generated: {{generated_iso}}\n"
    f"Paths: {{roots}}\n"
    f"Files included: {{file_count}}; Total bytes: {{total_bytes}}\n"
    "Notes: Each file starts with a <<<FILE ...>>> header and ends with <<<END FILE>>>.\n"
    "Please treat each file separately when reviewing.\n"
)


def build_header(fe: FileEntry, lang: str, sha256: str, bytes_len: int) -> str:
    ts = datetime.fromtimestamp(fe.mtime, tz=timezone.utc).isoformat()
    meta = {
        "path": str(fe.rel).replace("\\", "/"),
        "abspath": str(fe.path),
        "size": bytes_len,
        "mtime": ts,
        "sha256": sha256,
        "lang": lang,
    }
    parts = [f'{k}="{v}"' if isinstance(v, str) else f'{k}={v}' for k, v in meta.items()]
    return f"<<<FILE {' '.join(parts)}>>>\n"


def bundle(entries: List[FileEntry], max_file_bytes: int, max_total_bytes: int) -> Tuple[str, List[str]]:
    out = io.StringIO()
    warnings: List[str] = []

    total = 0
    included = 0

    entries = sorted(entries, key=lambda e: (str(e.rel).lower()))

    for fe in entries:
        try:
            raw = fe.path.read_bytes()
        except Exception as e:
            warnings.append(f"Skipping {fe.path} — read error: {e}")
            continue

        if max_file_bytes > 0 and len(raw) > max_file_bytes:
            warnings.append(f"Skipping {fe.rel} — {len(raw)} bytes exceeds --max-file-bytes={max_file_bytes}")
            continue

        if max_total_bytes > 0 and (total + len(raw)) > max_total_bytes:
            warnings.append(
                f"Stopped before {fe.rel} — adding it would exceed --max-total-bytes={max_total_bytes}"
            )
            break

        text = normalise_newlines(raw.decode("utf-8", errors="replace"))
        lang = infer_lang(fe.path.suffix)
        digest = sha256_bytes(raw)

        header = build_header(fe, lang, digest, len(raw))
        fence_lang = lang if lang else ""

        out.write(HEADER_LINE + "\n")
        out.write(header)
        out.write(f"```{fence_lang}\n")
        out.write(text)
        if not text.endswith("\n"):
            out.write("\n")
        out.write("```\n")
        out.write("<<<END FILE>>>\n")
        out.write(HEADER_LINE + "\n\n")

        total += len(raw)
        included += 1

    intro = INTRO_TEMPLATE.format(
        generated_iso=datetime.now(timezone.utc).isoformat(),
        roots=", ".join(sorted({str(e.root) for e in entries})),
        file_count=included,
        total_bytes=total,
    )

    final = intro + "\n" + out.getvalue()
    return final, warnings

# ------------------------------ Clipboard ------------------------------
def copy_to_clipboard(text: str) -> Tuple[bool, Optional[str]]:
    try:
        import pyperclip  # type: ignore
        pyperclip.copy(text)
        return True, None
    except Exception as e:
        last_err = f"pyperclip failed: {e}"
    try:
        if sys.platform == "darwin":
            import subprocess
            p = subprocess.Popen(["pbcopy"], stdin=subprocess.PIPE)
            p.communicate(input=text.encode("utf-8"))
            if p.returncode == 0:
                return True, None
        elif os.name == "nt":
            import subprocess
            p = subprocess.Popen(["clip"], stdin=subprocess.PIPE)
            p.communicate(input=text.encode("utf-16le"))
            if p.returncode == 0:
                return True, None
        else:
            import subprocess
            for cmd in ("xclip", "xsel"):
                try:
                    p = subprocess.Popen([cmd, "-selection", "clipboard"], stdin=subprocess.PIPE)
                    p.communicate(input=text.encode("utf-8"))
                    if p.returncode == 0:
                        return True, None
                except FileNotFoundError:
                    continue
    except Exception as e2:
        last_err = f"Clipboard fallback failed: {e2}"
        return False, last_err
    return False, last_err

# --------------------------------- CLI ----------------------------------
def parse_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Bundle multiple files/folders into a single clipboard-ready paste with clear file headers.",
    )
    p.add_argument("paths", nargs="+", help="Files and/or directories to include")
    p.add_argument("--ext", default=",".join(DEFAULT_EXTS),
                   help="Comma-separated list of file extensions to include (e.g., .py,.ts). Use * for all text files.")
    p.add_argument("--exclude", action="append", default=list(DEFAULT_EXCLUDES),
                   help="Glob patterns or folder names to exclude. Repeatable. Default sensible ignores are included.")
    p.add_argument("--include-hidden", action="store_true", help="Include dotfiles and dotfolders")
    p.add_argument("--max-file-bytes", type=int, default=250_000, help="Skip any single file larger than this")
    p.add_argument("--max-total-bytes", type=int, default=1_500_000, help="Stop when total raw bytes would exceed this")
    p.add_argument("--out", type=str, default=None, help="Also write the bundle to this file path")
    p.add_argument("--no-clip", action="store_true", help="Do not copy to clipboard; just print/write to file")
    p.add_argument("--quiet", action="store_true", help="Suppress non-error logs")
    return p.parse_args(argv)

def main(argv: Optional[List[str]] = None) -> int:
    args = parse_args(argv)
    roots = [Path(p) for p in args.paths]
    for r in roots:
        if not r.exists():
            print(f"Error: path not found: {r}", file=sys.stderr)
            return 2
    entries = list(walk_inputs(roots, args.exclude, include_hidden=args.include_hidden))
    if args.ext.strip() == "*":
        allowed_exts = ["*"]
    else:
        allowed_exts = [e.strip() for e in args.ext.split(",") if e.strip()]
    entries = filter_by_ext(entries, allowed_exts)
    if not entries:
        print("No files matched your criteria.", file=sys.stderr)
        return 3
    bundle_text, warnings = bundle(entries, args.max_file_bytes, args.max_total_bytes)
    if args.out:
        try:
            Path(args.out).write_text(bundle_text, encoding="utf-8")
            if not args.quiet:
                print(f"Wrote {len(bundle_text)} chars to {args.out}")
        except Exception as e:
            print(f"Failed to write to {args.out}: {e}", file=sys.stderr)
    if not args.no_clip:
        ok, err = copy_to_clipboard(bundle_text)
        if ok and not args.quiet:
            print("Copied bundle to clipboard ✓")
        elif not ok:
            print(f"Clipboard copy failed: {err or 'unknown error'}", file=sys.stderr)
            print(bundle_text)
    else:
        print(bundle_text)
    if warnings and not args.quiet:
        print("\nWarnings:")
        for w in warnings:
            print(f"  - {w}")
    return 0

if __name__ == "__main__":
    sys.exit(main())