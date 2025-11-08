"""
Script de execução do aplicativo
"""

import time
import tkinter as tk
from tkinter import ttk

import flet as ft

from src.main import main


def show_splash_screen():
    """Mostra uma tela de splash externa usando tkinter"""
    # Criar janela principal
    root = tk.Tk()
    root.title("TagApp - Carregando...")
    root.geometry("450x250")
    root.resizable(False, False)
    root.configure(bg="#1e1e2e")  # Fundo escuro

    # Remover bordas da janela (opcional, para look mais moderno)
    root.overrideredirect(True)

    # Centralizar na tela
    root.eval("tk::PlaceWindow . center")

    # Frame principal com fundo
    frame = tk.Frame(root, bg="#1e1e2e")
    frame.pack(expand=True, fill=tk.BOTH, padx=30, pady=30)

    # Título com cor
    title_label = tk.Label(
        frame,
        text="🎮 Tag App",
        font=("Segoe UI", 24, "bold"),
        fg="#89b4fa",
        bg="#1e1e2e",
    )
    title_label.pack(pady=(0, 15))

    # Texto de loading
    loading_label = tk.Label(
        frame,
        text="Carregando dados...",
        font=("Segoe UI", 14),
        fg="#cdd6f4",
        bg="#1e1e2e",
    )
    loading_label.pack(pady=(0, 25))

    # Estilo para barra de progresso
    style = ttk.Style()
    style.theme_use("default")
    style.configure(
        "Custom.Horizontal.TProgressbar",
        background="#89b4fa",
        troughcolor="#313244",
        borderwidth=0,
        lightcolor="#89b4fa",
        darkcolor="#89b4fa",
    )

    # Barra de progresso determinística
    progress = ttk.Progressbar(
        frame,
        orient="horizontal",
        length=350,
        mode="determinate",
        style="Custom.Horizontal.TProgressbar",
    )
    progress.pack()

    # Texto de status
    status_label = tk.Label(
        frame,
        text="Preparando interface...",
        font=("Segoe UI", 11),
        fg="#6c7086",
        bg="#1e1e2e",
    )
    status_label.pack(pady=(15, 0))

    # Forçar atualização da interface
    root.update()

    # Simular loading com progresso real
    messages = [
        "Carregando dados...",
        "Organizando hashtags...",
        "Preparando interface...",
        "Quase pronto...",
    ]

    for i, msg in enumerate(messages):
        loading_label.config(text=msg)
        progress["value"] = (i + 1) * 25  # 25% por etapa
        root.update()
        time.sleep(0.5)

    # Completar progresso
    progress["value"] = 100
    root.update()
    time.sleep(0.3)

    # Fechar splash screen
    root.destroy()


if __name__ == "__main__":
    # Mostrar splash screen
    show_splash_screen()

    # Iniciar app Flet
    ft.app(target=main)
