# TagApp - Gerenciador de Hashtags para Jogos

Aplicativo para gerenciar e copiar hashtags de personagens de diversos jogos.

## 💾 Sistema de Armazenamento

O app salva suas tags personalizadas em **dois lugares**:

1. **client_storage** (navegador/app) - Para compatibilidade com Flet
2. **custom_data.json** - Arquivo local permanente

### Localização do arquivo

O arquivo `custom_data.json` fica na raiz do projeto e contém:
- `custom_tags`: Suas tags personalizadas
- `custom_tags_games`: Categorias (jogos) de cada tag
- `custom_order`: Ordem personalizada por jogo (drag-and-drop)

**Importante**: Este arquivo é ignorado pelo git (`.gitignore`) para não versionar dados pessoais.

### Backup e Portabilidade

Para fazer backup ou transferir suas tags para outro computador:
1. Copie o arquivo `custom_data.json`
2. Cole na raiz do projeto no novo local
3. Execute o app normalmente

## Run the app

### uv

Run as a desktop app:

```
uv run flet run
```

Run as a web app:

```
uv run flet run --web
```

### Poetry

Install dependencies from `pyproject.toml`:

```
poetry install
```

Run as a desktop app:

```
poetry run flet run
```

Run as a web app:

```
poetry run flet run --web
```

For more details on running the app, refer to the [Getting Started Guide](https://flet.dev/docs/getting-started/).

## Build the app

### Android

```
flet build apk -v
```

For more details on building and signing `.apk` or `.aab`, refer to the [Android Packaging Guide](https://flet.dev/docs/publish/android/).

### iOS

```
flet build ipa -v
```

For more details on building and signing `.ipa`, refer to the [iOS Packaging Guide](https://flet.dev/docs/publish/ios/).

### macOS

```
flet build macos -v
```

For more details on building macOS package, refer to the [macOS Packaging Guide](https://flet.dev/docs/publish/macos/).

### Linux

```
flet build linux -v
```

For more details on building Linux package, refer to the [Linux Packaging Guide](https://flet.dev/docs/publish/linux/).

### Windows

```
flet build windows -v
```

For more details on building Windows package, refer to the [Windows Packaging Guide](https://flet.dev/docs/publish/windows/).