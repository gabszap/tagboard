"""
Script de execução do aplicativo
"""

import os
import time
import tkinter as tk
from tkinter import ttk

try:
    import tomllib
except ImportError:
    import tomli as tomllib

import flet as ft
from PIL import Image, ImageTk

from src.main import main


def get_app_version():
    """Lê a versão do app do pyproject.toml"""
    try:
        pyproject_path = os.path.join(
            os.path.dirname(os.path.abspath(__file__)), "pyproject.toml"
        )
        if os.path.exists(pyproject_path):
            with open(pyproject_path, "rb") as f:
                data = tomllib.load(f)
                return data.get("project", {}).get("version", "1.0")
    except Exception:
        pass
    return "1.0"


def get_asset_path(relative_path):
    """Retorna o caminho absoluto para um asset"""
    base_path = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base_path, relative_path)


def show_splash_screen():
    """Mostra uma tela de splash moderna usando tkinter"""
    # Cores do tema (Catppuccin Mocha)
    colors = {
        "bg": "#1e1e2e",
        "surface": "#313244",
        "overlay": "#45475a",
        "text": "#cdd6f4",
        "subtext": "#a6adc8",
        "muted": "#6c7086",
        "blue": "#89b4fa",
        "lavender": "#b4befe",
        "green": "#a6e3a1",
    }

    # Criar janela principal
    root = tk.Tk()
    root.title("Tag App")
    root.geometry("420x300")
    root.resizable(False, False)
    root.configure(bg=colors["bg"])

    # Remover bordas da janela para visual moderno
    root.overrideredirect(True)

    # Centralizar na tela
    screen_width = root.winfo_screenwidth()
    screen_height = root.winfo_screenheight()
    x = (screen_width - 420) // 2
    y = (screen_height - 300) // 2
    root.geometry(f"420x300+{x}+{y}")

    # Adicionar sombra/borda sutil
    root.attributes("-topmost", True)

    # Frame principal
    main_frame = tk.Frame(root, bg=colors["surface"], relief="flat")
    main_frame.pack(expand=True, fill=tk.BOTH)

    # Conteúdo interno com padding
    content_frame = tk.Frame(main_frame, bg=colors["bg"])
    content_frame.pack(expand=True, fill=tk.BOTH, padx=2, pady=2)

    # Tentar carregar ícone com PIL
    icon_label = None
    try:
        icon_path = get_asset_path("src/assets/icon_orig.png")
        if os.path.exists(icon_path):
            # Carregar e redimensionar com PIL
            pil_image = Image.open(icon_path)
            pil_image = pil_image.resize((80, 80), Image.Resampling.LANCZOS)
            icon_image = ImageTk.PhotoImage(pil_image)
            icon_label = tk.Label(content_frame, image=icon_image, bg=colors["bg"])
            icon_label.image = icon_image  # Manter referência
            icon_label.pack(pady=(30, 10))
    except Exception:
        pass

    # Se não conseguiu carregar ícone, usar emoji
    if icon_label is None:
        icon_label = tk.Label(
            content_frame,
            text="🎮",
            font=("Segoe UI Emoji", 40),
            fg=colors["blue"],
            bg=colors["bg"],
        )
        icon_label.pack(pady=(30, 10))

    # Título do app
    title_label = tk.Label(
        content_frame,
        text="Tag App",
        font=("Segoe UI", 24, "bold"),
        fg=colors["blue"],
        bg=colors["bg"],
    )
    title_label.pack(pady=(0, 3))

    # Subtítulo
    subtitle_label = tk.Label(
        content_frame,
        text="Gerenciador de Hashtags",
        font=("Segoe UI", 10),
        fg=colors["subtext"],
        bg=colors["bg"],
    )
    subtitle_label.pack(pady=(0, 20))

    # Container para barra de progresso
    progress_container = tk.Frame(content_frame, bg=colors["bg"])
    progress_container.pack(fill=tk.X, padx=50)

    # Estilo customizado para barra de progresso
    style = ttk.Style()
    style.theme_use("default")

    # Configurar estilo da barra de progresso
    style.configure(
        "Custom.Horizontal.TProgressbar",
        background=colors["blue"],
        troughcolor=colors["surface"],
        borderwidth=0,
        lightcolor=colors["blue"],
        darkcolor=colors["blue"],
    )

    # Barra de progresso
    progress = ttk.Progressbar(
        progress_container,
        orient="horizontal",
        length=320,
        mode="determinate",
        style="Custom.Horizontal.TProgressbar",
    )
    progress.pack(pady=(0, 12))

    # Texto de status
    status_label = tk.Label(
        content_frame,
        text="Inicializando...",
        font=("Segoe UI", 9),
        fg=colors["muted"],
        bg=colors["bg"],
    )
    status_label.pack()

    # Versão do app
    app_version = get_app_version()
    version_label = tk.Label(
        content_frame,
        text=f"v{app_version}",
        font=("Segoe UI", 8),
        fg=colors["overlay"],
        bg=colors["bg"],
    )
    version_label.pack(side=tk.BOTTOM, pady=(0, 10))

    # Forçar atualização da interface
    root.update()

    # Etapas de carregamento com mensagens
    loading_steps = [
        (20, "Carregando módulos..."),
        (40, "Carregando dados..."),
        (60, "Organizando categorias..."),
        (80, "Preparando interface..."),
        (100, "Iniciando..."),
    ]

    # Animação de progresso suave
    current_progress = 0
    for target_progress, message in loading_steps:
        status_label.config(text=message)

        # Animação suave até o target
        while current_progress < target_progress:
            current_progress += 3
            if current_progress > target_progress:
                current_progress = target_progress
            progress["value"] = current_progress
            root.update()
            time.sleep(0.02)

        time.sleep(0.1)

    # Pequena pausa antes de fechar
    time.sleep(0.15)

    # Fechar splash screen
    root.destroy()


if __name__ == "__main__":
    # Mostrar splash screen
    show_splash_screen()

    # Iniciar app Flet
    ft.app(target=main)
