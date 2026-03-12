/**
 * Utility functions for organizing characters and games
 */

const GAME_HASHTAGS = {
  "HSR": "#HonkaiStarRail #崩壊スターレイル",
  "GI": "#GenshinImpact #原神",
  "HI3": "#HonkaiImpact3rd #崩壊3rd",
  "ZZZ": "#zzzero #ゼンゼロ #ZenlessZoneZero",
  "WW": "#WutheringWaves #鳴潮",
  "BA": "#BlueArchive #ブルアカ",
  "GF2": "#GirlsFrontline2 #ドルフロ2"
};

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
 * Normalizes a character name: capitalize first letter, lowercase the rest
 * @param {string} name - Character name
 * @returns {string} Normalized name
 */
function normalizeCharName(name) {
  return name.trim().replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}

/**
 * Prepends game hashtags to custom character tags
 * @param {string} customTags - Character hashtags
 * @param {string} gameCode - Game/category code
 * @param {Object} customCategoryHashtags - Dictionary of custom category hashtags
 * @returns {string} Full hashtag string
 */
function addGameHashtags(customTags, gameCode, customCategoryHashtags = null) {
  let gameTags = GAME_HASHTAGS[gameCode] || "";

  if (!gameTags && customCategoryHashtags) {
    gameTags = customCategoryHashtags[gameCode] || "";
  }

  if (!gameTags) {
    return customTags;
  }

  // Avoid adding game hashtags if they're already present
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

  // For custom categories, check if the first hashtag is already present
  if (customCategoryHashtags && customCategoryHashtags[gameCode]) {
    const firstHashtag = gameTags.split(" ")[0];
    if (firstHashtag && customTags.includes(firstHashtag)) {
      return customTags;
    }
  }

  return `${gameTags} ${customTags}`.trim();
}

/**
 * Identifies the game based on custom mapping or hashtags as fallback
 * @param {string} charName - Character name
 * @param {Object} hashtagsDict - Dictionary of hashtags per character
 * @param {Object} customGamesMap - Mapping of characters to categories/games
 * @returns {string} Game code
 */
function getGame(charName, hashtagsDict, customGamesMap) {
  if (customGamesMap && customGamesMap[charName]) {
    return customGamesMap[charName];
  }

  // Fallback: identify by hashtags (for legacy or default tags)
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
    return "GI";
  }
}

/**
 * Organizes characters by game and sorts them alphabetically
 * @param {Object} hashtagsDict - Dictionary of hashtags per character
 * @param {Object} customGamesMap - Mapping of characters to categories/games
 * @param {Object} customCategories - Dictionary of custom categories {code: name}
 * @returns {Object} Dictionary with games and their organized characters
 */
function organizeCharacters(hashtagsDict, customGamesMap, customCategories) {
  customCategories = customCategories || {};

  const games = {};
  for (const [code, name] of Object.entries(DEFAULT_GAMES)) {
    games[code] = { name: name, chars: [] };
  }

  for (const [code, name] of Object.entries(customCategories)) {
    if (!games[code]) {
      games[code] = { name: name, chars: [] };
    }
  }

  for (const charName of Object.keys(hashtagsDict)) {
    const game = getGame(charName, hashtagsDict, customGamesMap);
    if (!games[game]) {
      games[game] = { name: game, chars: [] };
    }
    games[game].chars.push(charName);
  }

  for (const game of Object.values(games)) {
    game.chars.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  }

  return games;
}

/**
 * Validates a category code
 * @param {string} code - Code to validate
 * @param {string[]} existingCodes - List of already existing codes
 * @returns {[boolean, string]} Tuple (valid, error message if invalid)
 */
function validateCategoryCode(code, existingCodes) {
  if (!code || !code.trim()) {
    return [false, "Category code is required"];
  }

  code = code.trim().toUpperCase();

  if (code.length < 2) {
    return [false, "Code must be at least 2 characters"];
  }

  if (code.length > 10) {
    return [false, "Code must be at most 10 characters"];
  }

  if (!/^[A-Z0-9]+$/.test(code)) {
    return [false, "Code must contain only letters and numbers"];
  }

  if (existingCodes.includes(code)) {
    return [false, `Code '${code}' already exists`];
  }

  return [true, ""];
}

/**
 * Generates a category code based on the name
 * @param {string} name - Category name
 * @param {string[]} existingCodes - List of already existing codes
 * @returns {string} Unique generated code
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
