import json
import os
import shutil
import sys
from pathlib import Path

import flet as ft
import pyperclip

from .data import HASHTAGS
from .utils import add_game_hashtags, normalize_char_name, organize_characters

APP_VERSION = "1.0.6"


def resource_path(relative_path):
    """Get absolute path to resource, works for dev and for PyInstaller/Flet pack"""
    # PyInstaller creates a temp folder and stores path in _MEIPASS
    base_path = getattr(sys, "_MEIPASS", None)
    if base_path is None:
        base_path = os.path.abspath(".")

    return os.path.join(base_path, relative_path)


# Arquivo para salvar tags personalizadas
CUSTOM_DATA_FILE = Path("C:/tag-app/custom_data.json")

# Arquivo para salvar configurações da interface
CONFIG_FILE = Path("C:/tag-app/config.json")

# Garantir que o diretório existe
Path("C:/tag-app").mkdir(parents=True, exist_ok=True)


def load_custom_data():
    """Carrega dados personalizados do arquivo JSON."""
    if CUSTOM_DATA_FILE.exists():
        try:
            with open(CUSTOM_DATA_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return (
                    data.get("custom_tags", {}),
                    data.get("custom_tags_games", {}),
                    data.get("custom_order", {}),
                    data.get("custom_categories", {}),
                )
        except Exception as e:
            print(f"Erro ao carregar dados personalizados: {e}")
    return {}, {}, {}, {}


def save_custom_data(custom_tags, custom_tags_games, custom_order, custom_categories):
    """Salva dados personalizados no arquivo JSON."""
    try:
        data = {
            "custom_tags": custom_tags,
            "custom_tags_games": custom_tags_games,
            "custom_order": custom_order,
            "custom_categories": custom_categories,
        }
        with open(CUSTOM_DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Erro ao salvar dados personalizados: {e}")


def load_config():
    """Carrega configurações da interface do arquivo JSON."""
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return {
                    "theme_mode": data.get("theme_mode", "dark"),
                    "layout_mode": data.get("layout_mode", "Colunas"),
                    "sort_mode": data.get("sort_mode", "alfabetica"),
                    "advanced_mode": data.get("advanced_mode", False),
                }
        except Exception as e:
            print(f"Erro ao carregar configurações: {e}")
    return {
        "theme_mode": "dark",
        "layout_mode": "Colunas",
        "sort_mode": "alfabetica",
        "advanced_mode": False,
    }


def save_config(config):
    """Salva configurações da interface no arquivo JSON."""
    try:
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(config, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Erro ao salvar configurações: {e}")


def main(page: ft.Page):
    page.title = "Hashtags por Jogo"
    page.padding = 0  # Removido padding para a AppBar ficar edge-to-edge
    page.window.width = 1000
    page.window.height = 800
    page.window.resizable = True

    # Definir ícone da janela (Windows requer .ico)
    page.window.icon = resource_path("src/assets/icon-256.ico")

    # Carregar dados personalizados
    (
        file_custom_tags,
        file_custom_tags_games,
        file_custom_order,
        file_custom_categories,
    ) = load_custom_data()

    # Carregar configurações da interface
    config = load_config()

    # Aplicar configurações
    page.theme_mode = (
        ft.ThemeMode.DARK if config["theme_mode"] == "dark" else ft.ThemeMode.LIGHT
    )

    # Estados
    advanced_mode = {"value": config["advanced_mode"]}
    custom_tags = file_custom_tags
    custom_tags_games = file_custom_tags_games
    custom_categories = file_custom_categories

    # Mesclar tags customizadas com as padrão
    all_hashtags = {**HASHTAGS, **custom_tags}

    # Organizar personagens
    games = organize_characters(all_hashtags, custom_tags_games, custom_categories)

    # Estado da ordenação (alfabética ou personalizada)
    sort_mode = {
        "value": config["sort_mode"]
    }  # Usar dict para manter referência mutável

    # Estado do layout (7colunas, grid2x4, grid3x3, tabs)
    layout_mode = {"value": config["layout_mode"]}  # Padrão: 7 colunas

    # Mapeamento de ícones dos jogos
    game_icons = {}
    for game, path in {
        "HSR": "src/assets/hsr.png",
        "GI": "src/assets/gi.png",
        "ZZZ": "src/assets/zzz.png",
        "WW": "src/assets/wuwa.png",
        "HI3": "src/assets/hi3.png",
        "BA": "src/assets/bluearchive.png",
        "GF2": "src/assets/gf2.png",
    }.items():
        full_path = resource_path(path)
        if os.path.exists(full_path):
            game_icons[game] = str(full_path)
        else:
            game_icons[game] = None  # Fallback: sem ícone

    # Ordem personalizada por jogo
    custom_order = {}
    for game_code, game_data in games.items():
        if game_code in file_custom_order:
            custom_order[game_code] = file_custom_order[game_code]
        else:
            custom_order[game_code] = game_data["chars"].copy()

    # Snackbar para feedback
    snackbar = ft.SnackBar(
        content=ft.Text(""),
        action="OK",
    )
    page.overlay.append(snackbar)

    # Área de teste para colar
    test_area = ft.TextField(
        label="Área de Teste - Cole aqui (Ctrl+V) para verificar",
        multiline=True,
        min_lines=3,
        max_lines=5,
        read_only=False,
        width=550,
    )

    def copy_hashtags(char_name: str):
        """Copia hashtags para a área de transferência"""
        if char_name in all_hashtags:
            try:
                pyperclip.copy(all_hashtags[char_name])
                snackbar.content.value = f"✓ Hashtags de {char_name} copiadas!"
                snackbar.content.color = ft.Colors.WHITE
                snackbar.bgcolor = ft.Colors.GREEN_700
            except Exception as e:
                snackbar.content.value = f"Erro ao copiar: {str(e)}"
                snackbar.bgcolor = ft.Colors.RED_700
            snackbar.open = True
            page.update()

    def clear_clipboard(e):
        """Limpa a área de transferência"""
        try:
            pyperclip.copy("")
            snackbar.content.value = "🗑️ Área de transferência limpa!"
            snackbar.content.color = ft.Colors.WHITE
            snackbar.bgcolor = ft.Colors.BLUE_700
            snackbar.open = True
            page.update()
        except Exception as ex:
            snackbar.content.value = f"Erro ao limpar: {str(ex)}"
            snackbar.bgcolor = ft.Colors.RED_700
            snackbar.open = True
            page.update()

    def show_context_menu(e, char_name: str):
        """Mostra menu de contexto com opções de editar/deletar"""
        # Criar menu de contexto
        context_menu = ft.AlertDialog(
            content=ft.Column(
                [
                    ft.ListTile(
                        leading=ft.Icon(ft.Icons.EDIT, color=ft.Colors.BLUE_400),
                        title=ft.Text("Editar Tag"),
                        on_click=lambda _: [
                            close_dialog(context_menu),
                            show_edit_tag_dialog(char_name),
                        ],
                    ),
                    ft.ListTile(
                        leading=ft.Icon(ft.Icons.DELETE, color=ft.Colors.RED_400),
                        title=ft.Text("Deletar Tag"),
                        on_click=lambda _: [
                            close_dialog(context_menu),
                            show_delete_tag_dialog(char_name),
                        ],
                    ),
                ],
                tight=True,
                spacing=0,
            ),
            actions=[
                ft.TextButton("Fechar", on_click=lambda _: close_dialog(context_menu)),
            ],
        )
        page.overlay.append(context_menu)
        context_menu.open = True
        page.update()

    def filter_characters(e):
        """Filtra personagens conforme o usuário digita"""
        rebuild_game_sections()

    def rebuild_game_sections():
        """Reconstrói as seções de jogos com a ordenação atual"""
        search_text = search_field.value.lower()

        for game_code, game_data in games.items():
            if game_code not in game_sections:
                continue

            section = game_sections[game_code]
            section["container"].controls.clear()

            # Usar ordem personalizada se estiver nesse modo
            if sort_mode["value"] == "personalizada":
                char_list = custom_order[game_code]
            else:
                char_list = game_data["chars"]

            if not search_text:
                # Mostrar todos os personagens
                filtered = char_list
            else:
                # Filtrar personagens que começam com o texto
                filtered = [c for c in char_list if c.lower().startswith(search_text)]

            # Mostrar/ocultar seção
            if filtered:
                section["column"].visible = True

                # Adicionar botões filtrados
                for idx, char in enumerate(filtered):
                    # Verificar se é tag customizada ou modo avançado
                    is_custom = char in custom_tags
                    can_edit = is_custom or advanced_mode["value"]

                    if sort_mode["value"] == "personalizada":
                        # Modo drag-and-drop
                        if can_edit:
                            # Tag customizada com menu de contexto
                            btn_content = ft.GestureDetector(
                                content=ft.ElevatedButton(
                                    text=char,
                                    width=180,
                                    on_click=lambda e, c=char: copy_hashtags(c),
                                ),
                                on_secondary_tap=lambda e, c=char: show_context_menu(
                                    e, c
                                ),
                            )
                        else:
                            # Tag padrão sem menu
                            btn_content = ft.ElevatedButton(
                                text=char,
                                width=180,
                                on_click=lambda e, c=char: copy_hashtags(c),
                            )

                        draggable = ft.Draggable(
                            group=game_code,
                            content=btn_content,
                            data={"char": char, "game": game_code, "index": idx},
                        )

                        drag_target = ft.DragTarget(
                            group=game_code,
                            content=draggable,
                            on_accept=lambda e, gc=game_code: handle_drag(e, gc),
                        )

                        section["container"].controls.append(drag_target)
                    else:
                        # Modo normal (alfabético)
                        if can_edit:
                            # Tag editável com menu de contexto
                            btn = ft.GestureDetector(
                                content=ft.ElevatedButton(
                                    text=char,
                                    width=180,
                                    on_click=lambda e, c=char: copy_hashtags(c),
                                ),
                                on_secondary_tap=lambda e, c=char: show_context_menu(
                                    e, c
                                ),
                            )
                            section["container"].controls.append(btn)
                        else:
                            # Tag padrão sem menu
                            btn = ft.ElevatedButton(
                                text=char,
                                width=180,
                                on_click=lambda e, c=char: copy_hashtags(c),
                            )
                            section["container"].controls.append(btn)
            else:
                section["column"].visible = False

        page.update()

    def handle_drag(e, game_code: str):
        """Manipula o evento de drag-and-drop para reorganizar personagens"""
        src = e.src_id  # ID do elemento arrastado
        target_data = e.control.content.data
        draggable_data = page.get_control(src).data

        if draggable_data and target_data:
            src_index = draggable_data["index"]
            target_index = target_data["index"]

            # Trocar posições (swap) na ordem personalizada
            chars = custom_order[game_code]

            # Fazer swap real
            chars[src_index], chars[target_index] = (
                chars[target_index],
                chars[src_index],
            )

            # Salvar ordem personalizada no custom_data
            save_custom_data(
                custom_tags, custom_tags_games, custom_order, custom_categories
            )

            # Reconstruir a seção
            rebuild_game_sections()

    def change_sort_mode(e):
        """Altera o modo de ordenação"""
        sort_mode["value"] = sort_dropdown.value

        # Salvar preferência
        config["sort_mode"] = sort_mode["value"]
        save_config(config)

        if sort_mode["value"] == "alfabetica":
            # Não altera custom_order, apenas usa a ordem alfabética para exibir
            snackbar.content.value = "📋 Ordenação alfabética ativada"
            snackbar.bgcolor = ft.Colors.BLUE_700
        else:
            # Restaura a ordem personalizada (já está salva em custom_order)
            snackbar.content.value = "🎯 Modo personalizado: arraste para reorganizar"
            snackbar.bgcolor = ft.Colors.PURPLE_700

        snackbar.content.color = ft.Colors.WHITE
        snackbar.open = True
        rebuild_game_sections()

    def show_about_dialog(e):
        """Mostra diálogo sobre o app"""
        dialog = ft.AlertDialog(
            title=ft.Text("Sobre o App", weight=ft.FontWeight.BOLD),
            content=ft.Column(
                [
                    ft.Text("🎮 Hashtags por Jogo", size=16, weight=ft.FontWeight.BOLD),
                    ft.Text(f"v{APP_VERSION}", size=12, color=ft.Colors.GREY_400),
                    ft.Divider(),
                    ft.Text(
                        "Aplicativo para copiar hashtags de personagens de jogos rapidamente."
                    ),
                    ft.Text("\n📋 Total de personagens: " + str(len(all_hashtags))),
                    ft.Text("🎯 Jogos suportados: " + str(len(games))),
                    ft.Divider(),
                    ft.Text(
                        "Desenvolvido por gabszap com Flet + Python",
                        italic=True,
                        size=12,
                    ),
                ],
                tight=True,
            ),
            actions=[ft.TextButton("Fechar", on_click=lambda e: close_dialog(dialog))],
        )
        page.overlay.append(dialog)
        dialog.open = True
        page.update()

    def close_dialog(dialog):
        """Fecha um diálogo"""
        dialog.open = False
        page.update()

    def create_games_layout():
        """Cria o layout dos jogos baseado no modo selecionado"""
        game_sections.clear()
        game_elements = []

        # Ordem dos jogos padrão + categorias customizadas
        default_order = ["HSR", "GI", "HI3", "ZZZ", "WW", "BA", "GF2"]
        all_game_codes = default_order + [
            code for code in games.keys() if code not in default_order
        ]

        for game_code in all_game_codes:
            game_data = games.get(game_code)
            if not game_data:
                continue

            if not game_data["chars"]:
                continue

            # Container diferente para tabs (horizontal) vs outros modos (vertical)
            if layout_mode["value"] == "tabs":
                # Modo Tabs: layout horizontal com wrap
                char_container = ft.Row(
                    spacing=10,
                    wrap=True,
                    scroll=ft.ScrollMode.AUTO,
                )
            else:
                # Outros modos: layout vertical
                char_container = ft.Column(
                    spacing=10,
                    scroll=ft.ScrollMode.AUTO,
                )

            # Adicionar botões dos personagens
            for char in game_data["chars"]:
                btn = ft.ElevatedButton(
                    text=char, width=200, on_click=lambda e, c=char: copy_hashtags(c)
                )
                char_container.controls.append(btn)

            if layout_mode["value"] == "tabs":
                # Modo Tabs com ícone de imagem
                tab_content = ft.Container(
                    content=char_container,
                    padding=20,
                    expand=True,
                )

                # Tab com nome do jogo e badge de contador
                tab_label = ft.Row(
                    [
                        ft.Text(game_data["name"], size=14),
                        ft.Container(
                            content=ft.Text(
                                str(len(game_data["chars"])),
                                size=11,
                                color=ft.Colors.WHITE,
                                weight=ft.FontWeight.BOLD,
                            ),
                            bgcolor=ft.Colors.BLUE_700,
                            padding=ft.padding.symmetric(horizontal=6, vertical=2),
                            border_radius=10,
                        ),
                    ],
                    spacing=6,
                    alignment=ft.MainAxisAlignment.CENTER,
                )

                game_tab = ft.Tab(
                    tab_content=tab_label,
                    content=tab_content,
                )

                game_sections[game_code] = {
                    "column": game_tab,
                    "container": char_container,
                }

                game_elements.append(game_tab)

            else:
                # Modos Grid e Abas - com ícone no título
                icon_element = (
                    ft.Image(
                        src=game_icons[game_code],
                        width=20,
                        height=20,
                        fit=ft.ImageFit.CONTAIN,
                    )
                    if game_icons.get(game_code)
                    else ft.Icon(
                        ft.Icons.VIDEOGAME_ASSET, size=20, color=ft.Colors.AMBER_400
                    )
                )

                game_title_row = ft.Row(
                    [
                        icon_element,
                        ft.Text(
                            game_data["name"],
                            size=16,
                            weight=ft.FontWeight.BOLD,
                            color=ft.Colors.AMBER_400,
                        ),
                    ],
                    spacing=8,
                    alignment=ft.MainAxisAlignment.START,
                )

                game_card = ft.Container(
                    content=ft.Column(
                        controls=[
                            game_title_row,
                            ft.Container(
                                content=char_container,
                                expand=True,
                            ),
                        ],
                        spacing=10,
                    ),
                    border=ft.border.all(1, ft.Colors.BLUE_GREY_700),
                    border_radius=10,
                    padding=15,
                    expand=True,
                )

                game_sections[game_code] = {
                    "column": game_card,
                    "container": char_container,
                }

                game_elements.append(game_card)

        # Retornar layout baseado no modo
        if layout_mode["value"] == "tabs":
            return ft.Tabs(
                tabs=game_elements,
                expand=True,
                animation_duration=300,
            )
        elif layout_mode["value"] == "Colunas":
            return ft.Row(
                controls=game_elements,
                spacing=15,
                scroll=ft.ScrollMode.AUTO,
                expand=True,
            )
        elif layout_mode["value"] == "grid2x4":
            first_row = ft.Row(controls=game_elements[:4], spacing=15, expand=True)
            second_row = ft.Row(controls=game_elements[4:], spacing=15, expand=True)
            return ft.Column(controls=[first_row, second_row], spacing=15, expand=True)
        elif layout_mode["value"] == "grid3x3":
            first_row = ft.Row(controls=game_elements[:3], spacing=15, expand=True)
            second_row = ft.Row(controls=game_elements[3:6], spacing=15, expand=True)
            third_row = ft.Row(controls=game_elements[6:], spacing=15, expand=True)
            return ft.Column(
                controls=[first_row, second_row, third_row], spacing=15, expand=True
            )

    def rebuild_layout():
        """Reconstrói o layout completo"""
        # Limpar apenas os controles da página, não os overlays
        page.controls.clear()

        # Recriar o layout com o novo modo
        games_layout = create_games_layout()

        # Recriar página
        page.add(
            ft.Container(
                content=ft.Column(
                    [
                        ft.Row(
                            [
                                search_field,
                                sort_dropdown,
                                clear_btn,
                            ],
                            alignment=ft.MainAxisAlignment.START,
                            spacing=10,
                        ),
                        test_area,
                        ft.Divider(height=10),
                        ft.Container(
                            content=games_layout,
                            expand=True,
                        ),
                    ]
                ),
                padding=20,
                expand=True,
            )
        )
        # Atualizar as seções para garantir que tudo está sincronizado
        page.update()
        rebuild_game_sections()
        page.update()

    def show_add_menu(e):
        """Mostra menu para escolher entre adicionar tag ou categoria"""

        menu_dialog = ft.AlertDialog(
            title=ft.Row(
                [
                    ft.Image(
                        src="src/assets/plus.svg",
                        width=32,
                        height=32,
                        color=ft.Colors.WHITE,
                    ),
                    ft.Text("Adicionar Novo", weight=ft.FontWeight.BOLD),
                ],
                spacing=8,
                alignment=ft.MainAxisAlignment.START,
            ),
            content=ft.Column(
                [
                    ft.Text(
                        "O que você deseja adicionar?",
                        size=14,
                        weight=ft.FontWeight.W_500,
                    ),
                    ft.Divider(),
                    ft.ListTile(
                        leading=ft.Image(
                            src="src/assets/hashtag.svg",
                            width=32,
                            height=32,
                            color=ft.Colors.WHITE,
                        ),
                        title=ft.Text("Nova Tag", weight=ft.FontWeight.BOLD),
                        subtitle=ft.Text("Adicionar personagem a uma categoria"),
                        on_click=lambda _: [
                            close_dialog(menu_dialog),
                            show_add_tag_dialog(None),
                        ],
                    ),
                    ft.ListTile(
                        leading=ft.Image(
                            src="src/assets/folder-plus.svg",
                            width=32,
                            height=32,
                            color=ft.Colors.WHITE,
                        ),
                        title=ft.Text("Nova Categoria", weight=ft.FontWeight.BOLD),
                        subtitle=ft.Text("Criar uma nova categoria"),
                        on_click=lambda _: [
                            close_dialog(menu_dialog),
                            show_add_category_dialog(None),
                        ],
                    ),
                ],
                tight=True,
                spacing=5,
            ),
            actions=[
                ft.TextButton("Cancelar", on_click=lambda e: close_dialog(menu_dialog)),
            ],
        )
        page.overlay.append(menu_dialog)
        menu_dialog.open = True
        page.update()

    def show_add_tag_dialog(e):
        """Mostra diálogo para adicionar nova tag"""

        # Campos do formulário
        char_name_field = ft.TextField(
            label="Nome do Personagem",
            hint_text="Ex: Acheron",
            width=400,
        )

        hashtags_field = ft.TextField(
            label="Hashtags",
            hint_text="Ex: #HonkaiStarRail #Acheron #黄泉",
            multiline=True,
            min_lines=2,
            max_lines=4,
            width=400,
        )

        # Obter todas as categorias (padrão + customizadas)
        all_categories = get_all_categories()

        game_dropdown = ft.Dropdown(
            label="Jogo",
            width=400,
            options=[ft.dropdown.Option(code, name) for code, name in all_categories],
            value="HSR",
        )

        def save_new_tag(e):
            char_name = char_name_field.value.strip()
            hashtags = hashtags_field.value.strip()
            game_code = game_dropdown.value

            if not char_name or not hashtags:
                snackbar.content.value = "❌ Preencha todos os campos!"
                snackbar.bgcolor = ft.Colors.RED_700
                snackbar.open = True
                page.update()
                return

            # Normalizar o nome do personagem (primeira letra maiúscula)
            char_name = normalize_char_name(char_name)

            # Adicionar as hashtags do jogo automaticamente
            hashtags_complete = add_game_hashtags(hashtags, game_code)

            # Adicionar ao dicionário de tags customizadas
            custom_tags[char_name] = hashtags_complete
            all_hashtags[char_name] = hashtags_complete

            # Salvar o jogo selecionado para esta tag customizada
            custom_tags_games[char_name] = game_code

            # Salvar no custom_data
            save_custom_data(
                custom_tags, custom_tags_games, custom_order, custom_categories
            )

            # Reorganizar jogos completamente
            nonlocal games
            games = organize_characters(
                all_hashtags, custom_tags_games, custom_categories
            )

            # Atualizar custom_order para TODOS os jogos (reorganizar alfabeticamente)
            for gc, game_data in games.items():
                if gc not in custom_order:
                    custom_order[gc] = []
                custom_order[gc] = game_data["chars"].copy()

            # Salvar custom_order no custom_data
            save_custom_data(
                custom_tags, custom_tags_games, custom_order, custom_categories
            )

            # Reconstruir layout completamente
            rebuild_layout()

            close_dialog(add_tag_dialog)
            snackbar.content.value = f"✅ Tag '{char_name}' adicionada com sucesso!"
            snackbar.bgcolor = ft.Colors.GREEN_700
            snackbar.content.color = ft.Colors.WHITE
            snackbar.open = True
            page.update()

        add_tag_dialog = ft.AlertDialog(
            title=ft.Row(
                [
                    ft.Image(
                        src="src/assets/plus.svg",
                        width=32,
                        height=32,
                        color=ft.Colors.WHITE,
                    ),
                    ft.Text("Adicionar Nova Tag", weight=ft.FontWeight.BOLD),
                ],
                spacing=8,
                alignment=ft.MainAxisAlignment.START,
            ),
            content=ft.Column(
                [
                    char_name_field,
                    hashtags_field,
                    game_dropdown,
                ],
                tight=True,
                scroll=ft.ScrollMode.AUTO,
                width=400,
            ),
            actions=[
                ft.TextButton(
                    "Cancelar", on_click=lambda e: close_dialog(add_tag_dialog)
                ),
                ft.ElevatedButton(
                    "Adicionar", on_click=save_new_tag, icon=ft.Icons.ADD
                ),
            ],
        )
        page.overlay.append(add_tag_dialog)
        add_tag_dialog.open = True
        page.update()

    def show_edit_tag_dialog(char_name: str):
        """Mostra diálogo para editar tag existente"""

        # Se não for modo avançado, verificar se é tag customizada
        if not advanced_mode["value"] and char_name not in custom_tags:
            snackbar.content.value = "⚠️ Só é possível editar tags customizadas! Ative o Modo Avançado nas configurações."
            snackbar.bgcolor = ft.Colors.ORANGE_700
            snackbar.open = True
            page.update()
            return

        # Pegar dados atuais
        current_hashtags = all_hashtags.get(char_name, custom_tags.get(char_name, ""))
        current_game = None
        for game_code, game_data in games.items():
            if char_name in game_data["chars"]:
                current_game = game_code
                break

        # Campos do formulário
        # No modo avançado, permitir editar nome
        char_name_field = ft.TextField(
            label="Nome do Personagem",
            value=char_name,
            width=400,
            read_only=not advanced_mode["value"],
            disabled=not advanced_mode["value"],
            hint_text="Modo Avançado permite alterar o nome"
            if not advanced_mode["value"]
            else "Altere o nome se necessário",
            bgcolor=ft.Colors.GREY_900 if not advanced_mode["value"] else None,
            border_color=ft.Colors.GREY_700 if not advanced_mode["value"] else None,
            opacity=0.7 if not advanced_mode["value"] else 1.0,
        )

        hashtags_field = ft.TextField(
            label="Hashtags",
            value=current_hashtags,
            multiline=True,
            min_lines=2,
            max_lines=4,
            width=400,
        )

        # Obter todas as categorias (padrão + customizadas)
        all_categories = get_all_categories()

        game_dropdown = ft.Dropdown(
            label="Jogo",
            width=400,
            options=[ft.dropdown.Option(code, name) for code, name in all_categories],
            value=current_game,
        )

        def save_edited_tag(e):
            new_char_name = char_name_field.value.strip()
            hashtags = hashtags_field.value.strip()
            new_game = game_dropdown.value

            if not new_char_name or not hashtags:
                snackbar.content.value = "❌ Preencha todos os campos!"
                snackbar.bgcolor = ft.Colors.RED_700
                snackbar.open = True
                page.update()
                return

            # Normalizar o nome do personagem (primeira letra maiúscula)
            new_char_name = normalize_char_name(new_char_name)

            # Se mudou o nome (modo avançado)
            name_changed = new_char_name != char_name

            if name_changed:
                # Remover tag antiga
                if char_name in custom_tags:
                    del custom_tags[char_name]
                if char_name in all_hashtags:
                    del all_hashtags[char_name]
                if char_name in custom_tags_games:
                    del custom_tags_games[char_name]

                # Remover da ordem personalizada
                for game_code in custom_order:
                    if char_name in custom_order[game_code]:
                        custom_order[game_code].remove(char_name)
                        # custom_order será salvo no final

            # Adicionar as hashtags do jogo automaticamente
            hashtags_complete = add_game_hashtags(hashtags, new_game)

            # Atualizar/adicionar tag (com novo nome se mudou)
            custom_tags[new_char_name] = hashtags_complete
            all_hashtags[new_char_name] = hashtags_complete

            # Salvar o jogo selecionado para esta tag
            custom_tags_games[new_char_name] = new_game

            # Salvar no custom_data
            save_custom_data(
                custom_tags, custom_tags_games, custom_order, custom_categories
            )

            # Reorganizar jogos completamente
            nonlocal games
            games = organize_characters(
                all_hashtags, custom_tags_games, custom_categories
            )

            # Atualizar custom_order para TODOS os jogos (reorganizar alfabeticamente)
            for gc, game_data in games.items():
                if gc not in custom_order:
                    custom_order[gc] = []
                custom_order[gc] = game_data["chars"].copy()

            # Salvar custom_order no custom_data
            save_custom_data(
                custom_tags, custom_tags_games, custom_order, custom_categories
            )

            # Reconstruir layout
            rebuild_layout()

            close_dialog(edit_tag_dialog)
            msg = "✅ Tag editada com sucesso!"
            if name_changed:
                msg = f"✅ Tag '{char_name}' renomeada para '{new_char_name}'!"
            snackbar.content.value = msg
            snackbar.bgcolor = ft.Colors.GREEN_700
            snackbar.content.color = ft.Colors.WHITE
            snackbar.open = True
            page.update()

        edit_tag_dialog = ft.AlertDialog(
            title=ft.Row(
                [
                    ft.Image(
                        src="src/assets/pencil.svg",
                        width=32,
                        height=32,
                        color=ft.Colors.WHITE,
                    ),
                    ft.Text("Editar Tag", weight=ft.FontWeight.BOLD),
                ],
                spacing=8,
                alignment=ft.MainAxisAlignment.START,
            ),
            content=ft.Column(
                [
                    char_name_field,
                    hashtags_field,
                    game_dropdown,
                    ft.Text(
                        "⚠️ Só tags customizadas podem ser editadas"
                        if not advanced_mode["value"]
                        else "🔓 Modo Avançado: Você pode editar qualquer tag e alterar o nome",
                        size=11,
                        italic=True,
                        color=ft.Colors.ORANGE_500
                        if not advanced_mode["value"]
                        else ft.Colors.BLUE_500,
                    ),
                ],
                tight=True,
                scroll=ft.ScrollMode.AUTO,
                width=400,
            ),
            actions=[
                ft.TextButton(
                    "Cancelar", on_click=lambda e: close_dialog(edit_tag_dialog)
                ),
                ft.ElevatedButton(
                    "Salvar", on_click=save_edited_tag, icon=ft.Icons.SAVE
                ),
            ],
        )
        page.overlay.append(edit_tag_dialog)
        edit_tag_dialog.open = True
        page.update()

    def show_delete_tag_dialog(char_name: str):
        """Mostra diálogo de confirmação para deletar tag"""

        # Se não for modo avançado, verificar se é tag customizada
        if not advanced_mode["value"] and char_name not in custom_tags:
            snackbar.content.value = "⚠️ Só é possível deletar tags customizadas! Ative o Modo Avançado nas configurações."
            snackbar.bgcolor = ft.Colors.ORANGE_700
            snackbar.open = True
            page.update()
            return

        def confirm_delete(e):
            # Remover da tag customizada
            if char_name in custom_tags:
                del custom_tags[char_name]
            if char_name in all_hashtags:
                del all_hashtags[char_name]
            if char_name in custom_tags_games:
                del custom_tags_games[char_name]

            # Salvar no custom_data
            save_custom_data(
                custom_tags, custom_tags_games, custom_order, custom_categories
            )

            # Reorganizar jogos completamente
            nonlocal games
            games = organize_characters(
                all_hashtags, custom_tags_games, custom_categories
            )

            # Atualizar custom_order para TODOS os jogos (reorganizar alfabeticamente)
            for gc, game_data in games.items():
                if gc not in custom_order:
                    custom_order[gc] = []
                custom_order[gc] = game_data["chars"].copy()

            # Salvar custom_order no custom_data
            save_custom_data(
                custom_tags, custom_tags_games, custom_order, custom_categories
            )

            # Reconstruir layout
            rebuild_layout()

            close_dialog(delete_tag_dialog)
            snackbar.content.value = f"🗑️ Tag '{char_name}' deletada com sucesso!"
            snackbar.bgcolor = ft.Colors.ORANGE_700
            snackbar.content.color = ft.Colors.WHITE
            snackbar.open = True
            page.update()

        delete_tag_dialog = ft.AlertDialog(
            title=ft.Text("⚠️ Confirmar Exclusão", weight=ft.FontWeight.BOLD),
            content=ft.Column(
                [
                    ft.Text(
                        f"Tem certeza que deseja deletar a tag '{char_name}'?", size=16
                    ),
                    ft.Text(
                        "Esta ação não pode ser desfeita.",
                        size=12,
                        italic=True,
                        color=ft.Colors.RED_400,
                    ),
                ],
                tight=True,
            ),
            actions=[
                ft.TextButton(
                    "Cancelar", on_click=lambda e: close_dialog(delete_tag_dialog)
                ),
                ft.ElevatedButton(
                    "Deletar",
                    on_click=confirm_delete,
                    icon=ft.Icons.DELETE_FOREVER,
                    bgcolor=ft.Colors.RED_700,
                    color=ft.Colors.WHITE,
                ),
            ],
        )
        page.overlay.append(delete_tag_dialog)
        delete_tag_dialog.open = True
        page.update()

    def get_all_categories():
        """Retorna lista de todas as categorias (padrão + customizadas)"""
        default_categories = [
            ("HSR", "Honkai: Star Rail"),
            ("GI", "Genshin Impact"),
            ("HI3", "Honkai Impact 3rd"),
            ("ZZZ", "Zenless Zone Zero"),
            ("WW", "Wuthering Waves"),
            ("BA", "Blue Archive"),
            ("GF2", "Girls' Frontline 2"),
        ]

        # Adicionar categorias customizadas
        all_categories = default_categories.copy()
        for code, name in custom_categories.items():
            all_categories.append((code, name))

        return all_categories

    def show_add_category_dialog(e):
        """Mostra diálogo para adicionar nova categoria"""

        # Campos do formulário
        category_code_field = ft.TextField(
            label="Código da Categoria",
            hint_text="Ex: NIKKE (use letras maiúsculas)",
            width=400,
            max_length=10,
        )

        category_name_field = ft.TextField(
            label="Nome da Categoria",
            hint_text="Ex: Goddess of Victory: NIKKE",
            width=400,
        )

        def save_new_category(e):
            code = category_code_field.value.strip().upper()
            name = category_name_field.value.strip()

            if not code or not name:
                snackbar.content.value = "❌ Preencha todos os campos!"
                snackbar.bgcolor = ft.Colors.RED_700
                snackbar.open = True
                page.update()
                return

            # Verificar se já existe
            all_cats = get_all_categories()
            existing_codes = [c[0] for c in all_cats]

            if code in existing_codes:
                snackbar.content.value = f"❌ Categoria '{code}' já existe!"
                snackbar.bgcolor = ft.Colors.RED_700
                snackbar.open = True
                page.update()
                return

            # Adicionar categoria customizada
            custom_categories[code] = name

            # Salvar no custom_data
            save_custom_data(
                custom_tags, custom_tags_games, custom_order, custom_categories
            )

            # Reorganizar jogos para incluir nova categoria vazia
            nonlocal games
            games = organize_characters(
                all_hashtags, custom_tags_games, custom_categories
            )

            # Adicionar categoria vazia se não existir
            if code not in games:
                games[code] = {"name": name, "chars": []}

            # Inicializar custom_order para nova categoria
            if code not in custom_order:
                custom_order[code] = []

            # Salvar custom_order atualizado
            save_custom_data(
                custom_tags, custom_tags_games, custom_order, custom_categories
            )

            # Reconstruir layout
            rebuild_layout()

            close_dialog(add_category_dialog)
            snackbar.content.value = f"✅ Categoria '{name}' adicionada com sucesso!"
            snackbar.bgcolor = ft.Colors.GREEN_700
            snackbar.content.color = ft.Colors.WHITE
            snackbar.open = True
            page.update()

        add_category_dialog = ft.AlertDialog(
            title=ft.Row(
                [
                    ft.Image(
                        src="src/assets/plus.svg",
                        width=32,
                        height=32,
                        color=ft.Colors.WHITE,
                    ),
                    ft.Text("Adicionar Nova Categoria", weight=ft.FontWeight.BOLD),
                ],
                spacing=8,
                alignment=ft.MainAxisAlignment.START,
            ),
            content=ft.Column(
                [
                    category_code_field,
                    category_name_field,
                    ft.Text(
                        "💡 Dica: Use códigos curtos e únicos (ex: NIKKE, AL, AK)",
                        size=11,
                        italic=True,
                        color=ft.Colors.BLUE_500,
                    ),
                ],
                tight=True,
                scroll=ft.ScrollMode.AUTO,
                width=400,
            ),
            actions=[
                ft.TextButton(
                    "Cancelar", on_click=lambda e: close_dialog(add_category_dialog)
                ),
                ft.ElevatedButton(
                    "Adicionar", on_click=save_new_category, icon=ft.Icons.ADD
                ),
            ],
        )
        page.overlay.append(add_category_dialog)
        add_category_dialog.open = True
        page.update()

    def show_manage_categories_dialog(e):
        """Mostra diálogo para gerenciar categorias customizadas"""

        def delete_category(code, name):
            """Deleta uma categoria customizada"""
            if code not in custom_categories:
                snackbar.content.value = (
                    "❌ Só é possível deletar categorias customizadas!"
                )
                snackbar.bgcolor = ft.Colors.RED_700
                snackbar.open = True
                page.update()
                return

            # Verificar se há tags usando esta categoria
            tags_using_category = [
                char for char, cat in custom_tags_games.items() if cat == code
            ]

            if tags_using_category:
                snackbar.content.value = f"❌ Não é possível deletar! {len(tags_using_category)} tag(s) usam esta categoria."
                snackbar.bgcolor = ft.Colors.ORANGE_700
                snackbar.open = True
                page.update()
                return

            # Deletar categoria
            del custom_categories[code]

            # Remover do custom_order se existir
            if code in custom_order:
                del custom_order[code]

            # Salvar
            save_custom_data(
                custom_tags, custom_tags_games, custom_order, custom_categories
            )

            # Reorganizar jogos
            nonlocal games
            games = organize_characters(
                all_hashtags, custom_tags_games, custom_categories
            )

            # Reconstruir layout
            rebuild_layout()

            close_dialog(manage_dialog)
            snackbar.content.value = f"🗑️ Categoria '{name}' deletada com sucesso!"
            snackbar.bgcolor = ft.Colors.ORANGE_700
            snackbar.content.color = ft.Colors.WHITE
            snackbar.open = True
            page.update()

        # Criar lista de categorias customizadas
        category_list = ft.Column(spacing=10)

        if not custom_categories:
            category_list.controls.append(
                ft.Text(
                    "Nenhuma categoria customizada criada ainda.",
                    italic=True,
                    color=ft.Colors.GREY_500,
                )
            )
        else:
            for code, name in custom_categories.items():
                category_list.controls.append(
                    ft.Container(
                        content=ft.Row(
                            [
                                ft.Text(f"{code} - {name}", expand=True),
                                ft.IconButton(
                                    icon=ft.Icons.DELETE,
                                    icon_color=ft.Colors.RED_400,
                                    tooltip="Deletar categoria",
                                    on_click=lambda e, c=code, n=name: delete_category(
                                        c, n
                                    ),
                                ),
                            ],
                            alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                        ),
                        border=ft.border.all(1, ft.Colors.BLUE_GREY_700),
                        border_radius=5,
                        padding=10,
                    )
                )

        manage_dialog = ft.AlertDialog(
            title=ft.Row(
                [
                    ft.Image(
                        src="src/assets/folder.svg",
                        width=32,
                        height=32,
                        color=ft.Colors.WHITE,
                    ),
                    ft.Text("Gerenciar Categorias", weight=ft.FontWeight.BOLD),
                ],
                spacing=8,
                alignment=ft.MainAxisAlignment.START,
            ),
            content=ft.Column(
                [
                    ft.Text(
                        "Categorias Customizadas",
                        size=14,
                        weight=ft.FontWeight.BOLD,
                    ),
                    category_list,
                    ft.Divider(),
                    ft.Text(
                        "⚠️ Só é possível deletar categorias sem tags associadas",
                        size=11,
                        italic=True,
                        color=ft.Colors.ORANGE_500,
                    ),
                ],
                tight=True,
                scroll=ft.ScrollMode.AUTO,
                width=500,
                height=400,
            ),
            actions=[
                ft.TextButton("Fechar", on_click=lambda e: close_dialog(manage_dialog)),
            ],
        )
        page.overlay.append(manage_dialog)
        manage_dialog.open = True
        page.update()

    def show_settings_dialog(e):
        """Mostra diálogo de configurações"""

        # Radio para tema
        theme_radio = ft.RadioGroup(
            content=ft.Column(
                [
                    ft.Radio(value="dark", label="🌙 Escuro"),
                    ft.Radio(value="light", label="☀️ Claro"),
                ]
            ),
            value="dark" if page.theme_mode == ft.ThemeMode.DARK else "light",
        )

        # Radio para layout
        layout_radio = ft.RadioGroup(
            content=ft.Column(
                [
                    ft.Radio(value="Colunas", label="📊 Colunas (Padrão)"),
                    ft.Radio(value="grid2x4", label="📐 Grid 2x4"),
                    ft.Radio(value="grid3x3", label="📐 Grid 3x3"),
                    ft.Radio(value="tabs", label="📑 Abas (Tabs)"),
                ]
            ),
            value=layout_mode["value"],
        )

        # Switch para modo avançado
        advanced_switch = ft.Switch(
            label="🔓 Modo Avançado (Editar todas as tags)",
            value=advanced_mode["value"],
        )

        def reset_custom_order(e):
            """Reseta a ordem personalizada para alfabética"""
            for game_code, game_data in games.items():
                # Resetar para ordem alfabética
                custom_order[game_code] = game_data["chars"].copy()

            # Salvar no custom_data
            save_custom_data(
                custom_tags, custom_tags_games, custom_order, custom_categories
            )

            # Reconstruir se estiver no modo personalizado
            if sort_mode["value"] == "personalizada":
                rebuild_game_sections()

            snackbar.content.value = "🔄 Ordem personalizada!"
            snackbar.bgcolor = ft.Colors.ORANGE_700
            snackbar.content.color = ft.Colors.WHITE
            snackbar.open = True
            page.update()

        def apply_settings(e):
            # Aplicar tema
            if theme_radio.value == "dark":
                page.theme_mode = ft.ThemeMode.DARK
                config["theme_mode"] = "dark"
            else:
                page.theme_mode = ft.ThemeMode.LIGHT
                config["theme_mode"] = "light"

            # Aplicar modo avançado
            advanced_mode["value"] = advanced_switch.value
            config["advanced_mode"] = advanced_mode["value"]

            # Aplicar layout
            layout_mode["value"] = layout_radio.value
            config["layout_mode"] = layout_mode["value"]
            save_config(config)
            rebuild_layout()

            close_dialog(settings_dialog)
            snackbar.content.value = "✅ Configurações aplicadas!"
            snackbar.bgcolor = ft.Colors.GREEN_700
            snackbar.content.color = ft.Colors.WHITE
            snackbar.open = True
            page.update()

        settings_dialog = ft.AlertDialog(
            title=ft.Text("⚙️ Configurações", weight=ft.FontWeight.BOLD),
            content=ft.Column(
                [
                    ft.Text("Tema", size=14, weight=ft.FontWeight.BOLD),
                    theme_radio,
                    ft.Divider(),
                    ft.Text("Layout", size=14, weight=ft.FontWeight.BOLD),
                    layout_radio,
                    ft.Divider(),
                    ft.Text("Edição de Tags", size=14, weight=ft.FontWeight.BOLD),
                    advanced_switch,
                    ft.Text(
                        "Permite editar/deletar todas as tags e alterar nomes",
                        size=11,
                        italic=True,
                        color=ft.Colors.BLUE_500,
                    ),
                    ft.Divider(),
                    ft.Text("Ordem Personalizada", size=14, weight=ft.FontWeight.BOLD),
                    ft.Container(
                        content=ft.ElevatedButton(
                            "🔄 Resetar Ordem Personalizada",
                            icon=ft.Icons.RESTORE,
                            on_click=reset_custom_order,
                            bgcolor=ft.Colors.RED,
                            color=ft.Colors.WHITE,
                        ),
                        padding=ft.padding.only(top=5),
                    ),
                    ft.Text(
                        "Reseta todas as personalizações de arrasto",
                        size=11,
                        italic=True,
                        color=ft.Colors.GREY_500,
                    ),
                    ft.Divider(),
                    ft.Text("Backup e Restauração", size=14, weight=ft.FontWeight.BOLD),
                    ft.Text(
                        "Exporte ou importe suas configurações e dados personalizados",
                        size=11,
                        italic=True,
                        color=ft.Colors.BLUE_500,
                    ),
                    ft.Container(
                        content=ft.Column(
                            [
                                ft.Text(
                                    "Custom Data (Tags)",
                                    size=12,
                                    weight=ft.FontWeight.BOLD,
                                ),
                                ft.Row(
                                    [
                                        ft.ElevatedButton(
                                            "Exportar",
                                            icon=ft.Icons.DOWNLOAD,
                                            on_click=export_custom_data,
                                            width=120,
                                        ),
                                        ft.ElevatedButton(
                                            "Importar",
                                            icon=ft.Icons.UPLOAD,
                                            on_click=import_custom_data,
                                            width=120,
                                        ),
                                    ],
                                    spacing=10,
                                ),
                                ft.Text(
                                    "Config (Interface)",
                                    size=12,
                                    weight=ft.FontWeight.BOLD,
                                ),
                                ft.Row(
                                    [
                                        ft.ElevatedButton(
                                            "Exportar",
                                            icon=ft.Icons.DOWNLOAD,
                                            on_click=export_config,
                                            width=120,
                                        ),
                                        ft.ElevatedButton(
                                            "Importar",
                                            icon=ft.Icons.UPLOAD,
                                            on_click=import_config,
                                            width=120,
                                        ),
                                    ],
                                    spacing=10,
                                ),
                            ],
                            spacing=10,
                        ),
                        padding=ft.padding.only(top=5),
                    ),
                ],
                tight=True,
                scroll=ft.ScrollMode.AUTO,
            ),
            actions=[
                ft.TextButton(
                    "Cancelar", on_click=lambda e: close_dialog(settings_dialog)
                ),
                ft.ElevatedButton("Aplicar", on_click=apply_settings),
            ],
        )
        page.overlay.append(settings_dialog)
        settings_dialog.open = True
        page.update()

    # AppBar
    page.appbar = ft.AppBar(
        leading=ft.Image(
            src="src/assets/icon.png",
            width=32,
            height=32,
        ),
        leading_width=40,
        title=ft.Text("Hashtags por Jogo", size=20, weight=ft.FontWeight.BOLD),
        center_title=False,
        bgcolor=ft.Colors.BLUE_GREY_900,
        actions=[
            ft.IconButton(
                content=ft.Image(
                    src="src/assets/circle-plus.svg",
                    width=24,
                    height=24,
                    color=ft.Colors.WHITE,
                ),
                tooltip="Adicionar Novo",
                on_click=show_add_menu,
            ),
            ft.IconButton(
                content=ft.Image(
                    src="src/assets/folder-cog.svg",
                    width=24,
                    height=24,
                    color=ft.Colors.WHITE,
                ),
                tooltip="Gerenciar Categorias",
                on_click=show_manage_categories_dialog,
            ),
            ft.IconButton(
                content=ft.Image(
                    src="src/assets/rotate-cw.svg",
                    width=24,
                    height=24,
                    color=ft.Colors.WHITE,
                ),
                tooltip="Recarregar",
                on_click=lambda e: rebuild_game_sections(),
            ),
            ft.IconButton(
                content=ft.Image(
                    src="src/assets/info.svg",
                    width=24,
                    height=24,
                    color=ft.Colors.WHITE,
                ),
                tooltip="Sobre",
                on_click=show_about_dialog,
            ),
            ft.IconButton(
                icon=ft.Icons.SETTINGS,
                tooltip="Configurações",
                on_click=show_settings_dialog,
                icon_color=ft.Colors.WHITE,
            ),
        ],
    )

    # Campo de busca
    search_field = ft.TextField(
        label="Pesquisar personagem",
        prefix_icon=ft.Icons.SEARCH,
        width=550,
        on_change=filter_characters,
        autofocus=True,
    )

    # Dropdown de ordenação
    sort_dropdown = ft.Dropdown(
        label="Ordenar por",
        width=180,
        value="alfabetica",
        options=[
            ft.dropdown.Option("alfabetica", "Alfabética"),
            ft.dropdown.Option("personalizada", "Personalizada"),
        ],
        on_change=change_sort_mode,
    )

    # Botão para limpar área de transferência
    clear_btn = ft.ElevatedButton(
        text="Limpar Clipboard",
        icon=ft.Icons.DELETE_SWEEP,
        on_click=clear_clipboard,
        bgcolor=ft.Colors.RED_400,
        color=ft.Colors.WHITE,
        width=180,
    )

    # Não precisa mais de título e subtítulo separados, a AppBar já tem

    # Área de teste para colar
    test_area = ft.TextField(
        label="Área de Teste - Cole aqui (Ctrl+V) para verificar",
        multiline=True,
        min_lines=3,
        max_lines=5,
        read_only=False,
        width=950,
    )

    # Dicionário para armazenar seções dos jogos
    game_sections = {}

    # FilePicker para import/export
    file_picker = ft.FilePicker()
    page.overlay.append(file_picker)

    def export_custom_data(e):
        """Exporta custom_data.json"""

        def save_result(e: ft.FilePickerResultEvent):
            if e.path:
                try:
                    dest_path = Path(e.path)
                    if CUSTOM_DATA_FILE.exists():
                        shutil.copy2(CUSTOM_DATA_FILE, dest_path)
                        snackbar.content.value = (
                            f"✅ custom_data.json exportado para {dest_path}!"
                        )
                        snackbar.bgcolor = ft.Colors.GREEN_700
                    else:
                        snackbar.content.value = (
                            "❌ Arquivo custom_data.json não encontrado!"
                        )
                        snackbar.bgcolor = ft.Colors.ORANGE_700
                except Exception as ex:
                    snackbar.content.value = f"❌ Erro ao exportar: {str(ex)}"
                    snackbar.bgcolor = ft.Colors.RED_700
                snackbar.open = True
                page.update()

        file_picker.on_result = save_result
        file_picker.save_file(
            dialog_title="Exportar Custom Data",
            file_name="custom_data.json",
            allowed_extensions=["json"],
            file_type=ft.FilePickerFileType.CUSTOM,
        )

    def export_config(e):
        """Exporta config.json"""

        def save_result(e: ft.FilePickerResultEvent):
            if e.path:
                try:
                    dest_path = Path(e.path)
                    if CONFIG_FILE.exists():
                        shutil.copy2(CONFIG_FILE, dest_path)
                        snackbar.content.value = (
                            f"✅ config.json exportado para {dest_path}!"
                        )
                        snackbar.bgcolor = ft.Colors.GREEN_700
                    else:
                        snackbar.content.value = (
                            "❌ Arquivo config.json não encontrado!"
                        )
                        snackbar.bgcolor = ft.Colors.ORANGE_700
                except Exception as ex:
                    snackbar.content.value = f"❌ Erro ao exportar: {str(ex)}"
                    snackbar.bgcolor = ft.Colors.RED_700
                snackbar.open = True
                page.update()

        file_picker.on_result = save_result
        file_picker.save_file(
            dialog_title="Exportar Config",
            file_name="config.json",
            allowed_extensions=["json"],
            file_type=ft.FilePickerFileType.CUSTOM,
        )

    def import_custom_data(e):
        """Importa custom_data.json"""

        def load_result(e: ft.FilePickerResultEvent):
            if e.files:
                src_path = Path(e.files[0].path)
                try:
                    shutil.copy2(src_path, CUSTOM_DATA_FILE)

                    # Recarregar dados
                    nonlocal \
                        custom_tags, \
                        custom_tags_games, \
                        custom_order, \
                        custom_categories, \
                        games, \
                        all_hashtags
                    custom_tags, custom_tags_games, custom_order, custom_categories = (
                        load_custom_data()
                    )
                    all_hashtags = {**HASHTAGS, **custom_tags}
                    games = organize_characters(
                        all_hashtags, custom_tags_games, custom_categories
                    )

                    # Recarregar tudo
                    rebuild_layout()

                    snackbar.content.value = (
                        "✅ custom_data.json importado com sucesso!"
                    )
                    snackbar.bgcolor = ft.Colors.GREEN_700
                except Exception as ex:
                    snackbar.content.value = f"❌ Erro ao importar: {str(ex)}"
                    snackbar.bgcolor = ft.Colors.RED_700
                snackbar.open = True
                page.update()

        file_picker.on_result = load_result
        file_picker.pick_files(
            dialog_title="Importar Custom Data",
            allowed_extensions=["json"],
            file_type=ft.FilePickerFileType.CUSTOM,
        )

    def import_config(e):
        """Importa config.json"""

        def load_result(e: ft.FilePickerResultEvent):
            if e.files:
                src_path = Path(e.files[0].path)
                try:
                    shutil.copy2(src_path, CONFIG_FILE)

                    # Recarregar config
                    nonlocal config
                    config = load_config()

                    # Aplicar configurações
                    page.theme_mode = (
                        ft.ThemeMode.DARK
                        if config["theme_mode"] == "dark"
                        else ft.ThemeMode.LIGHT
                    )
                    advanced_mode["value"] = config["advanced_mode"]
                    layout_mode["value"] = config["layout_mode"]
                    sort_mode["value"] = config["sort_mode"]

                    # Recarregar tudo
                    rebuild_layout()

                    snackbar.content.value = "✅ config.json importado com sucesso!"
                    snackbar.bgcolor = ft.Colors.GREEN_700
                except Exception as ex:
                    snackbar.content.value = f"❌ Erro ao importar: {str(ex)}"
                    snackbar.bgcolor = ft.Colors.RED_700
                snackbar.open = True
                page.update()

        file_picker.on_result = load_result
        file_picker.pick_files(
            dialog_title="Importar Config",
            allowed_extensions=["json"],
            file_type=ft.FilePickerFileType.CUSTOM,
        )

    # Criar layout inicial baseado no modo selecionado
    games_layout = create_games_layout()

    # Layout principal
    page.add(
        ft.Container(
            content=ft.Column(
                [
                    ft.Row(
                        [
                            search_field,
                            sort_dropdown,
                            clear_btn,
                        ],
                        alignment=ft.MainAxisAlignment.START,
                        spacing=10,
                    ),
                    test_area,
                    ft.Divider(height=10),
                    ft.Container(
                        content=games_layout,
                        expand=True,
                    ),
                ]
            ),
            padding=20,
            expand=True,
        )
    )

    # Garantir que as seções estão sincronizadas
    page.update()
    rebuild_game_sections()
