"""
Funções utilitárias para organização de personagens e jogos
"""

from .data import HASHTAGS

# Hashtags padrão por jogo
GAME_HASHTAGS = {
    "HSR": "#HonkaiStarRail #崩壊スターレイル",
    "GI": "#GenshinImpact #原神",
    "HI3": "#HonkaiImpact3rd #崩壊3rd",
    "ZZZ": "#zzzero #ゼンゼロ #ZenlessZoneZero",
    "WW": "#WutheringWaves #鳴潮",
    "BA": "#BlueArchive #ブルアカ",
    "GF2": "#GirlsFrontline2 #ドルフロ2",
}

# Jogos padrão
DEFAULT_GAMES = {
    "HSR": "Honkai: Star Rail",
    "GI": "Genshin Impact",
    "HI3": "Honkai Impact 3rd",
    "ZZZ": "Zenless Zone Zero",
    "WW": "Wuthering Waves",
    "BA": "Blue Archive",
    "GF2": "Girls' Frontline 2",
}


def normalize_char_name(name: str) -> str:
    """Normaliza o nome do personagem: primeira letra maiúscula, resto minúscula"""
    return name.strip().title()


def add_game_hashtags(
    custom_tags: str, game_code: str, custom_category_hashtags: dict = None
) -> str:
    """Adiciona as hashtags do jogo às tags customizadas

    Args:
        custom_tags: Hashtags do personagem
        game_code: Código do jogo/categoria
        custom_category_hashtags: Dicionário com hashtags de categorias customizadas {código: hashtags}
    """
    # Primeiro tentar hashtags padrão, depois customizadas
    game_tags = GAME_HASHTAGS.get(game_code, "")

    # Se não encontrou nas padrão, tentar nas customizadas
    if not game_tags and custom_category_hashtags:
        game_tags = custom_category_hashtags.get(game_code, "")

    # Se não há hashtags do jogo, retornar apenas as tags do personagem
    if not game_tags:
        return custom_tags

    # Se já tiver as hashtags do jogo, não adicionar novamente
    if game_code == "HSR" and "#HonkaiStarRail" in custom_tags:
        return custom_tags
    elif game_code == "ZZZ" and "#ZenlessZoneZero" in custom_tags:
        return custom_tags
    elif game_code == "WW" and "#WutheringWaves" in custom_tags:
        return custom_tags
    elif game_code == "HI3" and "#HonkaiImpact3rd" in custom_tags:
        return custom_tags
    elif game_code == "BA" and "#BlueArchive" in custom_tags:
        return custom_tags
    elif game_code == "GF2" and "#GirlsFrontline2" in custom_tags:
        return custom_tags
    elif game_code == "GI" and "#GenshinImpact" in custom_tags:
        return custom_tags

    # Para categorias customizadas, verificar se já tem a primeira hashtag
    if custom_category_hashtags and game_code in custom_category_hashtags:
        first_hashtag = game_tags.split()[0] if game_tags else ""
        if first_hashtag and first_hashtag in custom_tags:
            return custom_tags

    # Adicionar as hashtags do jogo no início
    return f"{game_tags} {custom_tags}".strip()


def get_game(char_name: str, hashtags_dict=None, custom_games_map=None) -> str:
    """Identifica o jogo com base no mapeamento customizado ou hashtags como fallback"""
    # Se há um mapeamento customizado e o personagem está nele, usar ele (PRINCIPAL)
    if custom_games_map and char_name in custom_games_map:
        return custom_games_map[char_name]

    # Fallback: tentar identificar pelas hashtags (para tags antigas ou padrão)
    if hashtags_dict is None:
        hashtags_dict = HASHTAGS
    tags = hashtags_dict.get(char_name, "")

    if "#HonkaiStarRail" in tags or "#崩壊スターレイル" in tags:
        return "HSR"
    elif (
        "#ZenlessZoneZero" in tags or "#ゼンレスゾーンゼロ" in tags or "#zzzero" in tags
    ):
        return "ZZZ"
    elif "#WutheringWaves" in tags or "#鳴潮" in tags:
        return "WW"
    elif "#HonkaiImpact3rd" in tags or "#崩壊3rd" in tags:
        return "HI3"
    elif "#BlueArchive" in tags or "#ブルアカ" in tags:
        return "BA"
    elif "#GirlsFrontline2" in tags or "#ドルフロ2" in tags:
        return "GF2"
    elif "#GenshinImpact" in tags or "#原神" in tags:
        return "GI"
    else:
        # Padrão: Genshin Impact
        return "GI"


def organize_characters(
    hashtags_dict=None, custom_games_map=None, custom_categories=None
):
    """Organiza personagens por jogo e ordena alfabeticamente

    Args:
        hashtags_dict: Dicionário de hashtags por personagem
        custom_games_map: Mapeamento de personagens para categorias/jogos
        custom_categories: Dicionário de categorias personalizadas {código: nome}
    """
    if hashtags_dict is None:
        hashtags_dict = HASHTAGS

    if custom_categories is None:
        custom_categories = {}

    # Iniciar com jogos padrão
    games = {}
    for code, name in DEFAULT_GAMES.items():
        games[code] = {"name": name, "chars": []}

    # Adicionar categorias personalizadas
    for code, name in custom_categories.items():
        if code not in games:
            games[code] = {"name": name, "chars": []}

    for char_name in hashtags_dict.keys():
        game = get_game(char_name, hashtags_dict, custom_games_map)
        # Garantir que a categoria existe (pode ser uma categoria customizada)
        if game not in games:
            # Se a categoria não existe, criar uma nova com o código como nome
            games[game] = {"name": game, "chars": []}
        games[game]["chars"].append(char_name)

    # Ordenar alfabeticamente (case insensitive)
    for game in games.values():
        game["chars"].sort(key=lambda x: x.lower())

    return games


def validate_category_code(code: str, existing_codes: list[str]) -> tuple[bool, str]:
    """
    Valida um código de categoria.

    Args:
        code: Código a validar.
        existing_codes: Lista de códigos já existentes.

    Returns:
        Tupla (válido, mensagem de erro se inválido).
    """
    if not code or not code.strip():
        return False, "Código da categoria é obrigatório"

    code = code.strip().upper()

    if len(code) < 2:
        return False, "Código deve ter pelo menos 2 caracteres"

    if len(code) > 10:
        return False, "Código deve ter no máximo 10 caracteres"

    if not code.isalnum():
        return False, "Código deve conter apenas letras e números"

    if code in existing_codes:
        return False, f"Código '{code}' já existe"

    return True, ""


def generate_category_code(name: str, existing_codes: list[str]) -> str:
    """
    Gera um código de categoria baseado no nome.

    Args:
        name: Nome da categoria.
        existing_codes: Lista de códigos já existentes.

    Returns:
        Código gerado único.
    """
    words = name.strip().split()
    if len(words) >= 2:
        base_code = "".join(w[0].upper() for w in words[:4])
    else:
        base_code = name.strip()[:4].upper()

    if not base_code:
        base_code = "CAT"

    code = base_code
    counter = 1
    while code in existing_codes:
        code = f"{base_code}{counter}"
        counter += 1

    return code
