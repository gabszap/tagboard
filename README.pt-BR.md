<div align="center">

# Tagboard

[![Electron](https://img.shields.io/badge/Electron-47848F?style=for-the-badge&logo=electron&logoColor=white)](https://www.electronjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20Linux-0078D6?style=for-the-badge&logo=windows&logoColor=white)]()
[![GitHub release](https://img.shields.io/github/v/release/gabszap/tagboard?include_prereleases&style=for-the-badge&logo=github)](https://github.com/gabszap/tagboard/releases)
[![Made with Claude](https://img.shields.io/badge/Built%20with-Claude-D97757?style=for-the-badge&logo=claude&logoColor=white)](https://claude.ai)

Gerencie e copie hashtags de personagens de jogos em um clique.

[English](README.md)

</div>

---

### Sobre

Tagboard e um app desktop para gerenciar hashtags de personagens de jogos. Selecione um personagem, clique, e as hashtags sao copiadas para o clipboard -- prontas para colar no Twitter/X, Instagram ou qualquer lugar.

Suporte nativo para **Honkai: Star Rail**, **Genshin Impact**, **Honkai Impact 3rd**, **Zenless Zone Zero**, **Wuthering Waves**, **Blue Archive** e **Girls' Frontline 2**. Voce tambem pode criar categorias e personagens customizados.

### Funcionalidades

- **Copia em um clique** -- clique em um personagem para copiar as hashtags
- **Multiplos layouts** -- Colunas, Grade ou Icones
- **Categorias customizadas** -- adicione qualquer jogo ou grupo
- **Adicao em lote** -- adicione varios personagens de uma vez
- **Busca** -- encontre personagens instantaneamente
- **Drag & drop** -- reordene personagens como quiser
- **Estatisticas de uso** -- acompanhe suas tags mais usadas com graficos
- **Temas** -- Catppuccin Mocha, Latte, Legacy + modo Acrilico
- **Modo compacto** -- janela pequena sempre no topo
- **Importar/Exportar** -- backup e restauracao dos seus dados
- **Build portable** -- sem necessidade de instalacao

### Instalacao

**Baixe** a ultima versao em [Releases](https://github.com/gabszap/tagboard/releases):
- `Tagboard-x.x.x-setup.exe` -- Instalador Windows
- `Tagboard-x.x.x-portable.exe` -- Windows portable (sem instalar)
- `Tagboard-x.x.x.AppImage` -- Linux

### Desenvolvimento

```bash
# Instalar dependencias
bun install

# Rodar em modo dev
bun run dev

# Build
bun run build:win            # Windows (instalador + portable)
bun run build:win:portable   # Windows somente portable
bun run build:linux          # Linux AppImage
```

### Dados do Usuario

Os dados sao salvos em:
- **Windows**: `%USERPROFILE%\tagboard\`
- **Linux**: `~/tagboard/`

Arquivos: `custom_data.json`, `config.json`, `usage_stats.json`, `cache/`

---

### Tech Stack

| | |
|---|---|
| **Runtime** | Electron 28 |
| **Linguagem** | Vanilla JavaScript |
| **UI** | HTML5 + CSS3 |
| **Tema** | Catppuccin |
| **Graficos** | Canvas API |
| **Build** | electron-builder |

### Estrutura do Projeto

```
tagboard/
├── src/
│   ├── main.js          # Processo principal do Electron
│   ├── preload.js       # Context bridge
│   ├── renderer.js      # Logica da UI
│   ├── index.html       # Interface
│   ├── styles.css       # Estilos
│   └── data/
│       └── hashtags.js  # Banco de hashtags
├── assets/              # Icones e imagens
└── package.json
```

### Licenca

[MIT](LICENSE)