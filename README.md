<div align="center">

# Tagboard

[![Electron](https://img.shields.io/badge/Electron-47848F?style=for-the-badge&logo=electron&logoColor=white)](https://www.electronjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20Linux-0078D6?style=for-the-badge&logo=windows&logoColor=white)]()
[![GitHub release](https://img.shields.io/github/v/release/gabszap/tagboard?include_prereleases&style=for-the-badge&logo=github)](https://github.com/gabszap/tagboard/releases)
[![Made with Claude](https://img.shields.io/badge/Built%20with-Claude-D97757?style=for-the-badge&logo=claude&logoColor=white)](https://claude.ai)

Manage and copy character hashtags for game fan art in one click.

[Portugues](README.pt-BR.md)

</div>

---

### About

Tagboard is a desktop app for managing hashtags for game characters. Select a character, click, and the hashtags are copied to your clipboard -- ready to paste on Twitter/X, Instagram, or anywhere else.

Built-in support for **Honkai: Star Rail**, **Genshin Impact**, **Honkai Impact 3rd**, **Zenless Zone Zero**, **Wuthering Waves**, **Blue Archive**, and **Girls' Frontline 2**. You can also create your own custom categories and characters.

### Features

- **One-click copy** -- click a character to copy their hashtags
- **Multiple layouts** -- Columns, Grid, or Icon view
- **Custom categories** -- add any game or group you want
- **Batch add** -- add multiple characters at once
- **Search** -- find characters instantly
- **Drag & drop** -- reorder characters to your liking
- **Usage stats** -- track your most-used tags with charts
- **Themes** -- Catppuccin Mocha, Latte, Legacy + Acrylic mode
- **Compact mode** -- small always-on-top window
- **Import/Export** -- backup and restore your data
- **Portable build** -- no installation required

### Installation

**Download** the latest release from [Releases](https://github.com/gabszap/tagboard/releases):
- `Tagboard-x.x.x-setup.exe` -- Windows installer
- `Tagboard-x.x.x-portable.exe` -- Windows portable (no install)
- `Tagboard-x.x.x.AppImage` -- Linux

### Development

```bash
# Install dependencies
bun install

# Run in dev mode
bun run dev

# Build
bun run build:win            # Windows (installer + portable)
bun run build:win:portable   # Windows portable only
bun run build:linux          # Linux AppImage
```

### User Data

Data is stored at:
- **Windows**: `%USERPROFILE%\tagboard\`
- **Linux**: `~/tagboard/`

Files: `custom_data.json`, `config.json`, `usage_stats.json`, `cache/`

---

### Tech Stack

| | |
|---|---|
| **Runtime** | Electron 28 |
| **Language** | Vanilla JavaScript |
| **UI** | HTML5 + CSS3 |
| **Theme** | Catppuccin |
| **Charts** | Canvas API |
| **Build** | electron-builder |

### Project Structure

```
tagboard/
├── src/
│   ├── main.js          # Electron main process
│   ├── preload.js       # Context bridge
│   ├── renderer.js      # UI logic
│   ├── index.html       # Interface
│   ├── styles.css       # Styles
│   └── data/
│       └── hashtags.js  # Hashtag database
├── assets/              # Icons and images
└── package.json
```

### License

[MIT](LICENSE)