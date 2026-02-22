"""
Parser registry for bank statement parsers.

Each parser module self-registers by calling `register()` at module level.
The `app/transactions/parser/__init__.py` imports all parser modules, so
registration happens automatically when the package is first imported.

Registry entries: (detect_fn, parse_fn, source)
  detect_fn  – callable(text: str) -> bool
  parse_fn   – callable(text: str, year: int) -> list[dict]
  source     – str: 'chequing' | 'credit_card'
"""

from typing import Callable, List, Optional, Tuple

_REGISTRY: List[Tuple[Callable, Callable, str]] = []


def register(
    detect_fn: Callable[[str], bool],
    parse_fn: Callable,
    source: str,
) -> None:
    """Add a parser to the registry. Called at module level in each parser file."""
    _REGISTRY.append((detect_fn, parse_fn, source))


def get_parser(text: str) -> Tuple[Optional[Callable], Optional[str]]:
    """
    Return (parse_fn, source) for the first registry entry whose detect_fn matches,
    or (None, None) if no registered parser recognises the statement.

    Parsers are tested in registration order, so more-specific parsers should be
    registered before more-general ones.
    """
    for detect_fn, parse_fn, source in _REGISTRY:
        if detect_fn(text):
            return parse_fn, source
    return None, None
