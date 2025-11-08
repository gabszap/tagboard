"""
Funções utilitárias para organização de personagens e jogos
"""

from .data import HASHTAGS

# Hashtags padrão por jogo
GAME_HASHTAGS = {
    "HSR": "#HonkaiStarRail #崩壊スターレイル",
    "GI": "#GenshinImpact #原神",
    "HI3": "#HonkaiImpact3rd #崩壊3rd",
    "ZZZ": "#ZenlessZoneZero #zzzero #ゼンレスゾーンゼロ",
    "WW": "#WutheringWaves #鳴潮",
    "BA": "#BlueArchive #ブルアカ",
    "GF2": "#GirlsFrontline2 #ドルフロ2",
}


def normalize_char_name(name: str) -> str:
    """Normaliza o nome do personagem: primeira letra maiúscula, resto minúscula"""
    return name.strip().title()


def add_game_hashtags(custom_tags: str, game_code: str) -> str:
    """Adiciona as hashtags do jogo às tags customizadas"""
    game_tags = GAME_HASHTAGS.get(game_code, "")
    
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
    elif "#ZenlessZoneZero" in tags or "#ゼンレスゾーンゼロ" in tags or "#zzzero" in tags:
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


def organize_characters(hashtags_dict=None, custom_games_map=None):
    """Organiza personagens por jogo e ordena alfabeticamente"""
    if hashtags_dict is None:
        hashtags_dict = HASHTAGS
        
    games = {
        "HSR": {"name": "Honkai: Star Rail", "chars": []},
        "GI": {"name": "Genshin Impact", "chars": []},
        "HI3": {"name": "Honkai Impact 3rd", "chars": []},
        "ZZZ": {"name": "Zenless Zone Zero", "chars": []},
        "WW": {"name": "Wuthering Waves", "chars": []},
        "BA": {"name": "Blue Archive", "chars": []},
        "GF2": {"name": "Girls' Frontline 2", "chars": []}
    }
    
    for char_name in hashtags_dict.keys():
        game = get_game(char_name, hashtags_dict, custom_games_map)
        games[game]["chars"].append(char_name)
    
    # Ordenar alfabeticamente (case insensitive)
    for game in games.values():
        game["chars"].sort(key=lambda x: x.lower())
    
    return games
