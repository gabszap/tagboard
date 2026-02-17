# AGENTS.md - Guidelines for AI Coding Agents

## Project Overview

A Flet-based desktop application for managing and copying hashtags for game characters. Built with Python 3.11+ and Flet UI framework.

## Build/Run Commands

```bash
# Run the desktop app
uv run flet run

# Run as web app
uv run flet run --web

# Using Poetry (alternative)
poetry install
poetry run flet run

# Build for distribution
flet build apk -v      # Android
flet build windows -v  # Windows
flet build macos -v    # macOS
flet build linux -v    # Linux
```

## Testing

No test suite configured. Add tests in a `tests/` directory using pytest:

```bash
# Install pytest
uv add --dev pytest

# Run all tests
pytest

# Run single test file
pytest tests/test_utils.py

# Run single test
pytest tests/test_utils.py::test_function_name -v
```

## Code Style Guidelines

### Python Style

- **Version**: Python 3.11+ with type hints
- **Line length**: 88 characters (Black default)
- **Quotes**: Double quotes for strings
- **Docstrings**: Use triple quotes with descriptive text

### Imports

Order imports in this sequence:
1. `from __future__ import annotations` (first line)
2. Standard library imports
3. Third-party imports
4. Local module imports (use relative imports within package)

Example:
```python
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

import flet as ft
import pyperclip

from .data import HASHTAGS
from .utils import DEFAULT_GAMES
```

### Naming Conventions

- **Constants**: `UPPER_SNAKE_CASE` (e.g., `DEFAULT_GAMES`, `HASHTAGS`)
- **Functions/Methods**: `snake_case` (e.g., `load_custom_data()`, `organize_characters()`)
- **Classes**: `PascalCase` (e.g., `CustomDataManager`)
- **Type aliases**: `PascalCase` ending with descriptive suffix (e.g., `CustomTags`, `ConfigDict`)
- **Private functions**: `_leading_underscore` (e.g., `_background_downloader()`)
- **Variables**: `snake_case` (e.g., `custom_tags`, `game_code`)

### Type Hints

Always use type hints for:
- Function parameters
- Return types
- Complex data structures

Use type aliases for repeated complex types:
```python
CustomTags = dict[str, str]
ConfigDict = dict[str, Any]
```

### Error Handling

- Use specific exceptions (e.g., `PermissionError`, `OSError`)
- Log errors with descriptive messages
- Return error information when appropriate (tuples for success/error)
- Use `try/except` blocks with minimal scope

Example:
```python
try:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return True, ""
except PermissionError:
    return False, "Sem permissão para salvar o arquivo"
except OSError as e:
    return False, f"Erro de sistema: {e}"
```

### File Operations

- Always specify `encoding="utf-8"` for text files
- Use `pathlib.Path` for path operations
- Handle file permissions gracefully

### Documentation

- Use docstrings for all public functions (Google style)
- Include Args, Returns, and Raises sections
- Keep comments in Portuguese (project convention)
- Module-level docstrings explain purpose

Example:
```python
def organize_characters(
    hashtags_dict: HashtagsDict | None = None,
    custom_games_map: CustomGamesMap | None = None,
) -> GamesDict:
    """Organiza personagens por jogo e ordena alfabeticamente.
    
    Args:
        hashtags_dict: Dicionário de hashtags por personagem.
        custom_games_map: Mapeamento de personagens para categorias/jogos.
    
    Returns:
        Dicionário com jogos e seus personagens organizados.
    """
```

### UI Code (Flet)

- Use `ft.` prefix for Flet components
- Store UI state in dictionaries for mutability (e.g., `sort_mode = {"value": "alfabetica"}`)
- Group related controls in containers
- Use consistent spacing and padding values

### Data Storage

- User data: `C:/tag-app/` directory
- Config files: JSON format with indentation
- Assets: `src/assets/` directory
- Never commit user data or cache files

### Git Conventions

- User data ignored: `config.json`, `storage/`, `C:/tag-app/`
- Keep `pyproject.toml` version updated
- Assets and data files should be tracked

### Adding New Characters/Hashtags

Edit `src/data/hashtags.py`:
```python
"CharacterName": "#GameHashtag #CharacterHashtag #OtherHashtags",
```

Follow existing patterns with game-specific hashtags first, then character-specific ones.

## Project Structure

```
tag-app/
├── pyproject.toml          # Project config (uv/Poetry)
├── README.md               # User documentation
├── run.py                  # Entry point with splash screen
├── src/
│   ├── __init__.py
│   ├── main.py            # Main Flet app logic
│   ├── utils.py           # Helper functions
│   ├── precache_icons.py  # Icon caching utility
│   ├── assets/            # Images, icons, SVGs
│   └── data/
│       ├── __init__.py
│       └── hashtags.py    # Character hashtag database
└── Hoyo pfps/             # Character images (gitignored)
```
