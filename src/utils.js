/**
 * Funções utilitárias para organização de personagens e jogos
 */

// Hashtags padrão por jogo
const GAME_HASHTAGS = {
  "HSR": "#HonkaiStarRail #崩壊スターレイル",
  "GI": "#GenshinImpact #原神",
  "HI3": "#HonkaiImpact3rd #崩壊3rd",
  "ZZZ": "#zzzero #ゼンゼロ #ZenlessZoneZero",
  "WW": "#WutheringWaves #鳴潮",
  "BA": "#BlueArchive #ブルアカ",
  "GF2": "#GirlsFrontline2 #ドルフロ2"
};

// Jogos padrão
const DEFAULT_GAMES = {
  "HSR": "Honkai: Star Rail",
  "GI": "Genshin Impact",
  "HI3": "Honkai Impact 3rd",
  "ZZZ": "Zenless Zone Zero",
  "WW": "Wuthering Waves",
  "BA": "Blue Archive",
  "GF2": "Girls' Frontline 2"
};

/**
 * Normaliza o nome do personagem: primeira letra maiúscula, resto minúscula
 * @param {string} name - Nome do personagem
 * @returns {string} Nome normalizado
 */
function normalizeCharName(name) {
  return name.trim().replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}

/**
 * Adiciona as hashtags do jogo às tags customizadas
 * @param {string} customTags - Hashtags do personagem
 * @param {string} gameCode - Código do jogo/categoria
 * @param {Object} customCategoryHashtags - Dicionário com hashtags de categorias customizadas
 * @returns {string} String com as hashtags completas
 */
function addGameHashtags(customTags, gameCode, customCategoryHashtags = null) {
  // Primeiro tentar hashtags padrão, depois customizadas
  let gameTags = GAME_HASHTAGS[gameCode] || "";

  // Se não encontrou nas padrão, tentar nas customizadas
  if (!gameTags && customCategoryHashtags) {
    gameTags = customCategoryHashtags[gameCode] || "";
  }

  // Se não há hashtags do jogo, retornar apenas as tags do personagem
  if (!gameTags) {
    return customTags;
  }

  // Se já tiver as hashtags do jogo, não adicionar novamente
  if (gameCode === "HSR" && customTags.includes("#HonkaiStarRail")) {
    return customTags;
  } else if (gameCode === "ZZZ" && customTags.includes("#ZenlessZoneZero")) {
    return customTags;
  } else if (gameCode === "WW" && customTags.includes("#WutheringWaves")) {
    return customTags;
  } else if (gameCode === "HI3" && customTags.includes("#HonkaiImpact3rd")) {
    return customTags;
  } else if (gameCode === "BA" && customTags.includes("#BlueArchive")) {
    return customTags;
  } else if (gameCode === "GF2" && customTags.includes("#GirlsFrontline2")) {
    return customTags;
  } else if (gameCode === "GI" && customTags.includes("#GenshinImpact")) {
    return customTags;
  }

  // Para categorias customizadas, verificar se já tem a primeira hashtag
  if (customCategoryHashtags && customCategoryHashtags[gameCode]) {
    const firstHashtag = gameTags.split(" ")[0];
    if (firstHashtag && customTags.includes(firstHashtag)) {
      return customTags;
    }
  }

  // Adicionar as hashtags do jogo no início
  return `${gameTags} ${customTags}`.trim();
}

/**
 * Identifica o jogo com base no mapeamento customizado ou hashtags como fallback
 * @param {string} charName - Nome do personagem
 * @param {Object} hashtagsDict - Dicionário de hashtags por personagem
 * @param {Object} customGamesMap - Mapeamento de personagens para categorias/jogos
 * @returns {string} Código do jogo
 */
function getGame(charName, hashtagsDict, customGamesMap) {
  // Se há um mapeamento customizado e o personagem está nele, usar ele (PRINCIPAL)
  if (customGamesMap && customGamesMap[charName]) {
    return customGamesMap[charName];
  }

  // Fallback: tentar identificar pelas hashtags (para tags antigas ou padrão)
  const tags = hashtagsDict[charName] || "";

  if (tags.includes("#HonkaiStarRail") || tags.includes("#崩壊スターレイル")) {
    return "HSR";
  } else if (tags.includes("#ZenlessZoneZero") || tags.includes("#ゼンレスゾーンゼロ") || tags.includes("#zzzero")) {
    return "ZZZ";
  } else if (tags.includes("#WutheringWaves") || tags.includes("#鳴潮")) {
    return "WW";
  } else if (tags.includes("#HonkaiImpact3rd") || tags.includes("#崩壊3rd")) {
    return "HI3";
  } else if (tags.includes("#BlueArchive") || tags.includes("#ブルアカ")) {
    return "BA";
  } else if (tags.includes("#GirlsFrontline2") || tags.includes("#ドルフロ2")) {
    return "GF2";
  } else if (tags.includes("#GenshinImpact") || tags.includes("#原神")) {
    return "GI";
  } else {
    // Padrão: Genshin Impact
    return "GI";
  }
}

/**
 * Organiza personagens por jogo e ordena alfabeticamente
 * @param {Object} hashtagsDict - Dicionário de hashtags por personagem
 * @param {Object} customGamesMap - Mapeamento de personagens para categorias/jogos
 * @param {Object} customCategories - Dicionário de categorias personalizadas {código: nome}
 * @returns {Object} Dicionário com jogos e seus personagens organizados
 */
function organizeCharacters(hashtagsDict, customGamesMap, customCategories) {
  customCategories = customCategories || {};

  // Iniciar com jogos padrão
  const games = {};
  for (const [code, name] of Object.entries(DEFAULT_GAMES)) {
    games[code] = { name: name, chars: [] };
  }

  // Adicionar categorias personalizadas
  for (const [code, name] of Object.entries(customCategories)) {
    if (!games[code]) {
      games[code] = { name: name, chars: [] };
    }
  }

  // Organizar personagens
  for (const charName of Object.keys(hashtagsDict)) {
    const game = getGame(charName, hashtagsDict, customGamesMap);
    // Garantir que a categoria existe (pode ser uma categoria customizada)
    if (!games[game]) {
      // Se a categoria não existe, criar uma nova com o código como nome
      games[game] = { name: game, chars: [] };
    }
    games[game].chars.push(charName);
  }

  // Ordenar alfabeticamente (case insensitive)
  for (const game of Object.values(games)) {
    game.chars.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  }

  return games;
}

/**
 * Valida um código de categoria
 * @param {string} code - Código a validar
 * @param {string[]} existingCodes - Lista de códigos já existentes
 * @returns {[boolean, string]} Tupla (válido, mensagem de erro se inválido)
 */
function validateCategoryCode(code, existingCodes) {
  if (!code || !code.trim()) {
    return [false, "Código da categoria é obrigatório"];
  }

  code = code.trim().toUpperCase();

  if (code.length < 2) {
    return [false, "Código deve ter pelo menos 2 caracteres"];
  }

  if (code.length > 10) {
    return [false, "Código deve ter no máximo 10 caracteres"];
  }

  if (!/^[A-Z0-9]+$/.test(code)) {
    return [false, "Código deve conter apenas letras e números"];
  }

  if (existingCodes.includes(code)) {
    return [false, `Código '${code}' já existe`];
  }

  return [true, ""];
}

/**
 * Gera um código de categoria baseado no nome
 * @param {string} name - Nome da categoria
 * @param {string[]} existingCodes - Lista de códigos já existentes
 * @returns {string} Código gerado único
 */
function generateCategoryCode(name, existingCodes) {
  const words = name.trim().split(/\s+/);
  let baseCode;
  
  if (words.length >= 2) {
    baseCode = words.slice(0, 4).map(w => w[0].toUpperCase()).join("");
  } else {
    baseCode = name.trim().substring(0, 4).toUpperCase();
  }

  if (!baseCode) {
    baseCode = "CAT";
  }

  let code = baseCode;
  let counter = 1;
  while (existingCodes.includes(code)) {
    code = `${baseCode}${counter}`;
    counter++;
  }

  return code;
}

module.exports = {
  GAME_HASHTAGS,
  DEFAULT_GAMES,
  normalizeCharName,
  addGameHashtags,
  getGame,
  organizeCharacters,
  validateCategoryCode,
  generateCategoryCode
};
