/**
 * TagApp - Renderer Process
 * UI moderna inspirada no app Python
 */

// App state
let appState = {
  hashtags: {},
  charsData: {},
  customData: { games: {}, category_order: ['HSR', 'GI', 'HI3', 'ZZZ', 'WW', 'BA', 'GF2'] },
  config: { theme_mode: 'dark', sort_mode: 'alphabetical', acrylic_mode: false, compact_mode: false },
  usageStats: { total_clicks: 0, by_game: {}, by_char: {} },
  games: {},
  currentGame: 'HSR',
  searchTerm: ''
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

// DOM Elements
const elements = {
  searchInput: document.getElementById('search-input'),
  btnClearSearch: document.getElementById('btn-clear-search'),
  sortSelect: document.getElementById('sort-select'),
  gameTabs: document.getElementById('game-tabs'),
  charactersGrid: document.getElementById('characters-grid'),
  snackbar: document.getElementById('snackbar'),
  btnPin: document.getElementById('btn-pin'),
  btnStats: document.getElementById('btn-stats'),
  btnAddMenu: document.getElementById('btn-add-menu'),
  btnCategories: document.getElementById('btn-categories'),
  btnRefresh: document.getElementById('btn-refresh'),
  btnAbout: document.getElementById('btn-about'),
  btnConfig: document.getElementById('btn-config'),
  btnClearClipboard: document.getElementById('btn-clear-clipboard'),
  testInput: document.getElementById('test-input')
};

const _fancySelectClosers = new Set();

let _toastSeq = 0;

let _activeConfirm = null;

let _renderCharsSeq = 0;

const _iconFileUrlByRemote = new Map();
const _iconInflight = new Map();
const _iconQueue = [];
let _iconActive = 0;
const ICON_CACHE_CONCURRENCY = 4;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  setupEventListeners();
  ensureSnackbarInBody();
  syncCategorySelectOptions();
  initFancySelects();
  renderGameTabs();
  renderCharacters();
});

function getCategoryCodes() {
  const order = Array.isArray(appState.customData?.category_order) && appState.customData.category_order.length
    ? appState.customData.category_order
    : Object.keys(DEFAULT_GAMES);

  const codes = [];
  const add = (code) => {
    if (!code) return;
    if (!codes.includes(code)) codes.push(code);
  };

  order.forEach(add);
  Object.keys(DEFAULT_GAMES).forEach(add);
  Object.keys(appState.customData?.games || {}).forEach(add);
  return codes;
}

function getCategoryLabel(code) {
  if (DEFAULT_GAMES[code]) return DEFAULT_GAMES[code];
  return (
    appState.customData?.games?.[code]?.category ||
    appState.games?.[code]?.name ||
    code
  );
}

function syncCategorySelectOptions() {
  const ids = ['new-char-game', 'batch-char-game', 'edit-char-game'];
  const codes = getCategoryCodes();

  ids.forEach((id) => {
    const selectEl = document.getElementById(id);
    if (!selectEl) return;

    const prevValue = selectEl.value;
    selectEl.innerHTML = '';

    codes.forEach((code) => {
      const opt = document.createElement('option');
      opt.value = code;
      opt.textContent = getCategoryLabel(code);
      selectEl.appendChild(opt);
    });

    if (codes.includes(prevValue)) {
      selectEl.value = prevValue;
    } else if (codes.length) {
      selectEl.value = codes[0];
    }

    selectEl.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

function ensureSnackbarInBody() {
  // Mantem o snackbar sempre acima dos modais (evita stacking context)
  if (!elements.snackbar) return;
  elements.snackbar.classList.add('snackbar-stack');
  if (elements.snackbar.parentElement === document.body) return;
  document.body.appendChild(elements.snackbar);
}

function initFancySelects() {
  enhanceNativeSelect(document.getElementById('sort-select'), { withIcons: false });
  enhanceNativeSelect(document.getElementById('new-char-game'), { withIcons: true });
  enhanceNativeSelect(document.getElementById('batch-char-game'), { withIcons: true });
  enhanceNativeSelect(document.getElementById('edit-char-game'), { withIcons: true });
}

function enhanceNativeSelect(selectEl, { withIcons }) {
  if (!selectEl) return;
  if (selectEl.dataset.fancySelect === '1') return;
  selectEl.dataset.fancySelect = '1';

  const GAME_ICONS = {
    HSR: '../assets/hsr.png',
    GI: '../assets/gi.png',
    HI3: '../assets/hi3.png',
    ZZZ: '../assets/zzz.png',
    WW: '../assets/wuwa.png',
    BA: '../assets/bluearchive.png',
    GF2: '../assets/gf2.png',
  };

  const wrapper = document.createElement('div');
  wrapper.className = 'custom-select';
  selectEl.parentNode.insertBefore(wrapper, selectEl);
  wrapper.appendChild(selectEl);
  selectEl.classList.add('native-select-hidden');

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'custom-select-btn';
  btn.setAttribute('aria-haspopup', 'listbox');
  btn.setAttribute('aria-expanded', 'false');
  wrapper.appendChild(btn);

  const menu = document.createElement('div');
  menu.className = 'custom-select-menu';
  menu.setAttribute('role', 'listbox');
  document.body.appendChild(menu);

  let isOpen = false;
  let activeIndex = -1;

  function arrowSvg() {
    return `
      <svg class="cs-arrow" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
  }

  function getSelectedOption() {
    return selectEl.options[selectEl.selectedIndex] || null;
  }

  function setButtonFromSelect() {
    const opt = getSelectedOption();
    const value = opt?.value || '';
    const label = opt?.textContent || '';
    const iconSrc = withIcons ? GAME_ICONS[value] : null;
    btn.innerHTML = `
      <span class="cs-left">
        ${iconSrc ? `<img class="cs-icon" src="${iconSrc}" alt="">` : ''}
        <span class="cs-label">${escapeHtml(label || value)}</span>
      </span>
      ${arrowSvg()}
    `;
  }

  function renderMenu() {
    const selectedValue = selectEl.value;
    menu.innerHTML = '';
    Array.from(selectEl.options).forEach((opt, idx) => {
      const item = document.createElement('div');
      item.className = 'custom-select-item';
      item.setAttribute('role', 'option');
      item.dataset.value = opt.value;
      item.dataset.index = String(idx);

      if (opt.value === selectedValue) item.classList.add('selected');

      const iconSrc = withIcons ? GAME_ICONS[opt.value] : null;
      item.innerHTML = `
        ${iconSrc ? `<img class="cs-icon" src="${iconSrc}" alt="">` : ''}
        <span class="cs-item-label">${escapeHtml(opt.textContent || opt.value)}</span>
      `;

      item.addEventListener('mouseenter', () => {
        setActiveIndex(idx);
      });

      item.addEventListener('mousedown', (e) => {
        // Evita perder o foco do botão e piscar/fechar antes do click
        e.preventDefault();
      });

      item.addEventListener('click', () => {
        selectEl.value = opt.value;
        selectEl.dispatchEvent(new Event('change', { bubbles: true }));
        close();
      });

      menu.appendChild(item);
    });
  }

  function positionMenu() {
    const rect = btn.getBoundingClientRect();
    menu.style.minWidth = `${rect.width}px`;
    menu.style.width = `${rect.width}px`;
    menu.style.left = `${Math.max(8, rect.left)}px`;
    menu.style.top = `${rect.bottom + 8}px`;

    requestAnimationFrame(() => {
      const m = menu.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      let left = rect.left;
      let top = rect.bottom + 8;
      if (left + m.width > vw - 8) left = vw - m.width - 8;
      if (left < 8) left = 8;

      // Se nao cabe pra baixo, abre pra cima
      if (top + m.height > vh - 8) {
        top = rect.top - m.height - 8;
      }
      if (top < 8) top = 8;

      menu.style.left = `${left}px`;
      menu.style.top = `${top}px`;
    });
  }

  function setActiveIndex(idx) {
    const items = menu.querySelectorAll('.custom-select-item');
    items.forEach((it) => it.classList.remove('active'));
    const clamped = Math.max(0, Math.min(idx, items.length - 1));
    const target = items[clamped];
    if (target) {
      target.classList.add('active');
      target.scrollIntoView({ block: 'nearest' });
      activeIndex = clamped;
    }
  }

  function open() {
    if (isOpen) return;
    closeAllFancySelectMenus();
    isOpen = true;
    btn.setAttribute('aria-expanded', 'true');
    renderMenu();
    menu.classList.add('show');
    positionMenu();

    // Ativa o selecionado por padrao
    const idx = Array.from(selectEl.options).findIndex((o) => o.value === selectEl.value);
    setActiveIndex(idx >= 0 ? idx : 0);
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    btn.setAttribute('aria-expanded', 'false');
    menu.classList.remove('show');
    activeIndex = -1;
  }

  _fancySelectClosers.add(close);

  btn.addEventListener('click', () => {
    if (isOpen) close();
    else open();
  });

  btn.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) open();
      else setActiveIndex(activeIndex + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) open();
      else setActiveIndex(activeIndex - 1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!isOpen) open();
      else {
        const opt = selectEl.options[activeIndex];
        if (opt) {
          selectEl.value = opt.value;
          selectEl.dispatchEvent(new Event('change', { bubbles: true }));
        }
        close();
      }
    } else if (e.key === 'Escape') {
      if (isOpen) {
        e.preventDefault();
        close();
      }
    }
  });

  document.addEventListener(
    'click',
    (e) => {
      if (!isOpen) return;
      if (wrapper.contains(e.target) || menu.contains(e.target)) return;
      close();
    },
    true
  );

  window.addEventListener('resize', () => {
    if (isOpen) positionMenu();
  });

  // Scroll dentro do modal tambem reposiciona (capture)
  window.addEventListener(
    'scroll',
    () => {
      if (isOpen) positionMenu();
    },
    true
  );

  selectEl.addEventListener('change', () => {
    setButtonFromSelect();
    if (isOpen) renderMenu();
  });

  setButtonFromSelect();
}

function closeAllFancySelectMenus() {
  _fancySelectClosers.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      // ignore
    }
  });
}

async function loadData() {
  try {
    const [hashtagsResult, charsResult, customResult, configResult, statsResult] = await Promise.all([
      window.electronAPI.loadHashtags(),
      window.electronAPI.loadCharsData(),
      window.electronAPI.loadCustomData(),
      window.electronAPI.loadConfig(),
      window.electronAPI.loadUsageStats()
    ]);

    if (hashtagsResult.success) appState.hashtags = hashtagsResult.data;
    if (charsResult.success) appState.charsData = charsResult.data;
    if (customResult.success) appState.customData = { ...appState.customData, ...customResult.data };
    if (configResult.success) appState.config = { ...appState.config, ...configResult.data };
    if (statsResult.success) appState.usageStats = statsResult.data;

    organizeGames();

    // Apply persisted UI modes
    applyThemeMode();
    applyAcrylicMode();
    applyCompactMode();
    // Persisted always-on-top (best effort)
    try {
      await window.electronAPI.setAlwaysOnTop(!!appState.config.compact_mode);
    } catch {
      // Ignorar (ex: API indisponivel em algum contexto)
    }
  } catch (error) {
    console.error('Error loading data:', error);
    showSnackbar('Erro ao carregar dados', 'error');
  }
}

function applyThemeMode() {
  const mode = appState.config.theme_mode || 'mocha';
  document.documentElement.dataset.theme = mode;
}

function applyAcrylicMode() {
  const container = document.getElementById('app-container');
  if (!container) return;
  container.classList.toggle('acrylic', !!appState.config.acrylic_mode);
}

function applyCompactMode() {
  const enabled = !!appState.config.compact_mode;
  elements.btnPin?.classList.toggle('active', enabled);
  document.getElementById('app-container')?.classList.toggle('compact', enabled);
  if (elements.btnPin) {
    elements.btnPin.title = enabled ? 'Desafixar do Topo' : 'Manter no Topo';
  }

  const pinImg = elements.btnPin?.querySelector('img');
  if (pinImg) {
    pinImg.src = enabled ? '../assets/disabled-pushpin.svg' : '../assets/pushpin.svg';
  }
}

function normalizeSearchText(value) {
  const lower = String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  // Mantem letras/numeros (inclui unicode quando suportado)
  try {
    return lower.replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  } catch {
    // Fallback sem unicode property escapes
    return lower.replace(/[^a-z0-9]+/g, " ").trim();
  }
}

function buildSearchQuery(value) {
  const norm = normalizeSearchText(String(value || "").trim());
  const tokens = norm ? norm.split(/\s+/).filter(Boolean) : [];
  return {
    norm,
    tokens,
    isSingleLetter: tokens.length === 1 && tokens[0].length === 1,
  };
}

function getFirstCategoryCode() {
  const order = Array.isArray(appState.customData?.category_order)
    ? appState.customData.category_order
    : [];

  for (const code of order) {
    if (code) return code;
  }
  const fallback = Object.keys(DEFAULT_GAMES)[0];
  return fallback || 'HSR';
}

function doesNameMatchSearch(name, searchQuery) {
  if (!searchQuery || searchQuery.tokens.length === 0) return true;

  const nameNorm = normalizeSearchText(name);
  if (!nameNorm) return false;

  const nameTokens = nameNorm.split(/\s+/).filter(Boolean);
  const joined = nameTokens.join("");

  // Quando o usuario digita apenas 1 letra, filtra pela primeira letra do nome
  if (searchQuery.isSingleLetter) {
    const letter = searchQuery.tokens[0];
    return (nameTokens[0] || '').startsWith(letter);
  }

  // Para termos maiores: prefixo de palavra OU substring em qualquer lugar
  return searchQuery.tokens.every((qt) => {
    return (
      nameTokens.some((nt) => nt.startsWith(qt)) ||
      joined.includes(qt)
    );
  });
}

function isHttpUrl(value) {
  return /^https?:\/\//i.test(String(value || ''));
}

function fnv1aHash(value) {
  let hash = 2166136261;
  const str = String(value || '');
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function getUrlExtension(url) {
  try {
    const u = new URL(String(url));
    const last = u.pathname.split('/').pop() || '';
    const match = last.match(/\.([a-zA-Z0-9]{1,5})$/);
    if (match) return match[1].toLowerCase();
  } catch {
    // ignore
  }

  const clean = String(url || '').split(/[?#]/)[0];
  const match = clean.match(/\.([a-zA-Z0-9]{1,5})$/);
  if (match) return match[1].toLowerCase();
  return 'img';
}

function filePathToFileUrl(pathValue) {
  const raw = String(pathValue || '').replace(/\\/g, '/');
  if (!raw) return '';
  const prefixed = /^[A-Za-z]:\//.test(raw) ? `file:///${raw}` : `file://${raw}`;
  return encodeURI(prefixed);
}

function getIconCacheFilename(remoteUrl) {
  const ext = getUrlExtension(remoteUrl);
  const hash = fnv1aHash(remoteUrl);
  return `icon_${hash}.${ext}`;
}

async function getCachedIconFileUrl(remoteUrl) {
  if (!isHttpUrl(remoteUrl)) return null;
  const key = String(remoteUrl);
  if (_iconFileUrlByRemote.has(key)) return _iconFileUrlByRemote.get(key);

  const filename = getIconCacheFilename(key);
  const res = await window.electronAPI.getCachePath(filename);
  if (res?.success && res.path) {
    const fileUrl = filePathToFileUrl(res.path);
    _iconFileUrlByRemote.set(key, fileUrl);
    return fileUrl;
  }
  return null;
}

function processIconQueue() {
  while (_iconActive < ICON_CACHE_CONCURRENCY && _iconQueue.length > 0) {
    const job = _iconQueue.shift();
    _iconActive++;

    downloadIconToCache(job.remoteUrl)
      .then((fileUrl) => job.resolve(fileUrl))
      .catch(() => job.resolve(null))
      .finally(() => {
        _iconActive--;
        processIconQueue();
      });
  }
}

async function downloadIconToCache(remoteUrl) {
  const key = String(remoteUrl);
  const cached = await getCachedIconFileUrl(key);
  if (cached) return cached;

  const filename = getIconCacheFilename(key);
  const res = await window.electronAPI.downloadIcon(key, filename);
  if (res?.success && res.path) {
    const fileUrl = filePathToFileUrl(res.path);
    _iconFileUrlByRemote.set(key, fileUrl);
    return fileUrl;
  }
  return null;
}

function ensureIconCached(remoteUrl) {
  if (!isHttpUrl(remoteUrl)) return Promise.resolve(null);
  const key = String(remoteUrl);
  if (_iconInflight.has(key)) return _iconInflight.get(key);

  const promise = new Promise((resolve) => {
    _iconQueue.push({ remoteUrl: key, resolve });
    processIconQueue();
  }).finally(() => {
    _iconInflight.delete(key);
  });

  _iconInflight.set(key, promise);
  return promise;
}

function setImageSrcWithCache(imgEl, remoteUrl) {
  if (!imgEl || !remoteUrl) return;
  const url = String(remoteUrl);

  if (!isHttpUrl(url)) {
    imgEl.src = url;
    return;
  }

  const knownLocal = _iconFileUrlByRemote.get(url);
  if (knownLocal) {
    if (imgEl.src !== knownLocal) {
      imgEl.src = knownLocal;
    }
    if (imgEl.complete) {
      setTimeout(() => imgEl.onload?.(), 0);
    }
    return;
  }

  // Mostra imediatamente (geralmente vem do cache de memória do Chromium)
  if (imgEl.src !== url) {
    imgEl.src = url;
  }
  if (imgEl.complete) {
    setTimeout(() => imgEl.onload?.(), 0);
  }

  // Em paralelo, tenta usar cache local persistente
  getCachedIconFileUrl(url)
    .then((fileUrl) => {
      if (fileUrl) {
        _iconFileUrlByRemote.set(url, fileUrl);
        if (imgEl.src !== fileUrl) {
          imgEl.src = fileUrl;
        }
        if (imgEl.complete) {
          setTimeout(() => imgEl.onload?.(), 0);
        }
        return;
      }

      // Nao cacheado ainda: baixa e troca para local quando terminar
      ensureIconCached(url).then((cachedUrl) => {
        if (!cachedUrl) return;
        _iconFileUrlByRemote.set(url, cachedUrl);
        if (imgEl.src !== cachedUrl) {
          imgEl.src = cachedUrl;
        }
        if (imgEl.complete) {
          setTimeout(() => imgEl.onload?.(), 0);
        }
      });
    })
    .catch(() => {
      // Keep remote src
    });
}

function organizeGames() {
  const allHashtags = { ...appState.hashtags };
  const hiddenChars = appState.customData.hidden_chars || [];

  // Add custom characters
  if (appState.customData.games) {
    Object.values(appState.customData.games).forEach(gameData => {
      if (gameData.characters) {
        Object.entries(gameData.characters).forEach(([name, hashtags]) => {
          allHashtags[name] = hashtags;
        });
      }
    });
  }

  // Initialize games
  appState.games = {};
  Object.entries(DEFAULT_GAMES).forEach(([code, name]) => {
    appState.games[code] = { name, chars: [] };
  });

  // Add custom categories (even if empty)
  if (appState.customData.games) {
    Object.entries(appState.customData.games).forEach(([code, gameData]) => {
      if (DEFAULT_GAMES[code]) return;
      const name = gameData?.category || code;
      if (!appState.games[code]) {
        appState.games[code] = { name, chars: [] };
      }
    });
  }

  // Ensure anything in category_order exists
  getCategoryCodes().forEach((code) => {
    if (!appState.games[code]) {
      appState.games[code] = { name: getCategoryLabel(code), chars: [] };
    }
  });

  // Assign characters
  Object.entries(allHashtags).forEach(([charName, hashtags]) => {
    // Skip hidden characters
    if (hiddenChars.includes(charName)) return;

    const gameCode = getGameFromHashtags(charName, hashtags);
    if (!appState.games[gameCode]) {
      appState.games[gameCode] = { name: getCategoryLabel(gameCode), chars: [] };
    }
    if (!appState.games[gameCode].chars.includes(charName)) {
      appState.games[gameCode].chars.push(charName);
    }
  });

  // Sort characters
  Object.values(appState.games).forEach(game => {
    game.chars.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  });
}

function getGameFromHashtags(charName, hashtags) {
  // Check custom data first
  if (appState.customData.games) {
    for (const [gameCode, gameData] of Object.entries(appState.customData.games)) {
      if (gameData.characters?.[charName]) return gameCode;
    }
  }

  // Check hashtags content
  if (hashtags.includes('#HonkaiStarRail')) return 'HSR';
  if (hashtags.includes('#GenshinImpact')) return 'GI';
  if (hashtags.includes('#HonkaiImpact3rd')) return 'HI3';
  if (hashtags.includes('#ZenlessZoneZero') || hashtags.includes('#zzzero')) return 'ZZZ';
  if (hashtags.includes('#WutheringWaves')) return 'WW';
  if (hashtags.includes('#BlueArchive')) return 'BA';
  if (hashtags.includes('#GirlsFrontline2')) return 'GF2';

  return 'GI';
}

function getBaseGameFromHashtagsOnly(hashtags) {
  if (!hashtags) return null;
  if (hashtags.includes('#HonkaiStarRail')) return 'HSR';
  if (hashtags.includes('#GenshinImpact')) return 'GI';
  if (hashtags.includes('#HonkaiImpact3rd')) return 'HI3';
  if (hashtags.includes('#ZenlessZoneZero') || hashtags.includes('#zzzero')) return 'ZZZ';
  if (hashtags.includes('#WutheringWaves')) return 'WW';
  if (hashtags.includes('#BlueArchive')) return 'BA';
  if (hashtags.includes('#GirlsFrontline2')) return 'GF2';
  return null;
}

function getHashtagsForChar(charName) {
  if (appState.customData.games) {
    for (const gameData of Object.values(appState.customData.games)) {
      if (gameData.characters?.[charName]) {
        return gameData.characters[charName];
      }
    }
  }

  return appState.hashtags[charName];
}

function removeCharacterFromCustomGames(charName) {
  let removed = 0;
  if (!appState.customData.games) return removed;

  Object.values(appState.customData.games).forEach((gameData) => {
    if (gameData?.characters?.[charName]) {
      delete gameData.characters[charName];
      removed++;
    }
  });

  return removed;
}

function normalizeCharNameForMatch(value) {
  return String(value || '').toLowerCase().replace(/[\s\-_.]/g, '');
}

function findCharDataForName(charName, preferredGameCode) {
  const normalizedCharName = normalizeCharNameForMatch(charName);

  const matches = (c) => {
    if (!c?.nome) return false;
    const normalizedDataName = normalizeCharNameForMatch(c.nome);
    return (
      normalizedDataName === normalizedCharName ||
      String(c.nome).toLowerCase() === String(charName).toLowerCase() ||
      c.nome === charName
    );
  };

  const tryGame = (code) => {
    if (!code) return null;
    const list = appState.charsData?.[code] || [];
    return list.find(matches) || null;
  };

  const foundPreferred = tryGame(preferredGameCode);
  if (foundPreferred) return foundPreferred;

  const foundCurrent = tryGame(appState.currentGame);
  if (foundCurrent) return foundCurrent;

  // Fallback: procurar em todos os jogos (para categorias customizadas/mistas)
  for (const list of Object.values(appState.charsData || {})) {
    const found = (Array.isArray(list) ? list : []).find(matches);
    if (found) return found;
  }

  return null;
}

function setupEventListeners() {
  // Search
  elements.searchInput.addEventListener('input', (e) => {
    const prev = buildSearchQuery(appState.searchTerm);
    appState.searchTerm = e.target.value;
    const next = buildSearchQuery(appState.searchTerm);

    // Ao limpar a busca, volta para a primeira categoria
    if (prev.tokens.length && next.tokens.length === 0) {
      appState.currentGame = getFirstCategoryCode();
    }
    renderGameTabs();
    renderCharacters();
  });

  elements.btnClearSearch.addEventListener('click', () => {
    elements.searchInput.value = '';
    appState.searchTerm = '';
    appState.currentGame = getFirstCategoryCode();
    renderGameTabs();
    renderCharacters();
  });

  document.getElementById('btn-empty-clear')?.addEventListener('click', async () => {
    elements.searchInput.value = '';
    appState.searchTerm = '';
    appState.currentGame = getFirstCategoryCode();
    elements.searchInput.focus();
    renderGameTabs();
    await renderCharacters({ animate: true });
  });

  // Sort
  elements.sortSelect.addEventListener('change', () => {
    renderCharacters();
  });

  setupGameTabsScrolling();

  // Pin button
  elements.btnPin.addEventListener('click', toggleCompactMode);

  // Stats
  elements.btnStats.addEventListener('click', showStatsModal);

  const btnCopyStats = document.getElementById('btn-copy-stats');
  btnCopyStats?.addEventListener('click', copyStatsSummaryToClipboard);

  const btnResetStats = document.getElementById('btn-reset-stats');
  btnResetStats?.addEventListener('click', resetUsageStats);

  // Add menu
  elements.btnAddMenu.addEventListener('click', () => showModal('add-menu-modal'));

  // Refresh button
  elements.btnRefresh?.addEventListener('click', async () => {
    await loadData();
    syncCategorySelectOptions();
    renderGameTabs();
    renderCharacters();
    showSnackbar('🔄 Dados atualizados!', 'success');
  });

  // About button
  elements.btnAbout?.addEventListener('click', () => {
    const totalChars = Object.keys(appState.hashtags).length +
      Object.values(appState.customData.games || {}).reduce((acc, game) =>
        acc + Object.keys(game.characters || {}).length, 0);
    const totalGames = Object.keys(appState.games).length;

    document.getElementById('about-total-chars').textContent = totalChars;
    document.getElementById('about-total-games').textContent = totalGames;

    showModal('about-modal');
  });

  // Config button (settings)
  elements.btnConfig?.addEventListener('click', () => {
    showModal('settings-modal');
    loadSettingsValues();
    setSettingsPanel('appearance');
  });

  // Categories button
  elements.btnCategories?.addEventListener('click', () => {
    showModal('categories-modal');
    renderCategoriesList();
  });

  // Clear clipboard button
  elements.btnClearClipboard?.addEventListener('click', () => {
    window.electronAPI.copyToClipboard('');
    showSnackbar('📋 Clipboard limpo!', 'success');
  });

  // Close modals
  document.querySelectorAll('.close-btn, .close-modal-btn').forEach(btn => {
    btn.addEventListener('click', closeTopModal);
  });

  // Theme toggle UI (settings)
  const themeToggle = document.getElementById('theme-toggle');
  themeToggle?.addEventListener('change', () => {
    syncThemeToggleUi();
  });

  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeTopModal();
    });
  });

  initConfirmModal();

  // Test area
  elements.testInput.addEventListener('paste', (e) => {
    setTimeout(() => {
      elements.testInput.value = processHashtags(elements.testInput.value);
    }, 0);
  });

  // Stats tabs
  document.querySelectorAll('.stats-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.stats-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.stats-content').forEach(c => c.style.display = 'none');

      btn.classList.add('active');
      const tabId = btn.dataset.statsTab;
      document.getElementById(`stats-tab-${tabId}`).style.display = 'block';

      // Re-render chart when panel becomes visible
      requestAnimationFrame(() => {
        refreshStatsActiveTabCharts();
      });
    });
  });

  // Modal buttons
  const btnAddChar = document.getElementById('btn-add-char');
  const btnSaveTag = document.getElementById('btn-save-tag');
  const btnDeleteTag = document.getElementById('btn-delete-tag');
  const btnBatchAdd = document.getElementById('btn-batch-add');
  const btnAddCategory = document.getElementById('btn-add-category');
  const btnSaveSettings = document.getElementById('btn-save-settings');
  const btnResetOrder = document.getElementById('btn-reset-order');

  btnAddChar?.addEventListener('click', async () => {
    const name = document.getElementById('new-char-name')?.value.trim();
    const game = document.getElementById('new-char-game')?.value;
    const hashtags = document.getElementById('new-char-hashtags')?.value.trim();

    const errors = [];
    if (!name) errors.push('Nome do personagem é obrigatório');
    if (!hashtags) errors.push('Hashtags são obrigatórias');
    if (errors.length) {
      showSnackbar(errors, 'error');
      return;
    }

    if (!appState.customData.games[game]) {
      appState.customData.games[game] = { characters: {} };
    }

    appState.customData.games[game].characters[name] = hashtags;
    await window.electronAPI.saveCustomData(appState.customData);

    organizeGames();
    renderGameTabs();
    renderCharacters();
    closeAllModals();

    document.getElementById('new-char-name').value = '';
    document.getElementById('new-char-hashtags').value = '';
    showSnackbar('Personagem adicionado!', 'success');
  });

  btnSaveTag?.addEventListener('click', async () => {
    const charName = document.getElementById('edit-char-name')?.value;
    const hashtags = document.getElementById('edit-hashtags')?.value.trim();
    const gameCode = document.getElementById('edit-char-game')?.value || appState.currentGame;

    if (!charName || !hashtags || !gameCode) return;

    // Remove versão anterior em qualquer categoria para evitar duplicata
    removeCharacterFromCustomGames(charName);

    if (!appState.customData.games[gameCode]) {
      appState.customData.games[gameCode] = { characters: {} };
    }

    appState.customData.games[gameCode].characters[charName] = hashtags;
    await window.electronAPI.saveCustomData(appState.customData);

    organizeGames();
    appState.currentGame = gameCode;
    renderGameTabs();
    renderCharacters();
    closeAllModals();
    showSnackbar('Tag salva!', 'success');
  });

  btnDeleteTag?.addEventListener('click', async () => {
    const charName = document.getElementById('edit-char-name')?.value;
    if (!charName) return;

    const ok = await confirmDialog({
      title: 'Deletar tag',
      message: `Deletar ${charName}?`,
      confirmText: 'Deletar',
      cancelText: 'Cancelar',
      variant: 'danger',
    });
    if (!ok) return;

    const removed = removeCharacterFromCustomGames(charName);
    if (removed > 0) {
      await window.electronAPI.saveCustomData(appState.customData);

      organizeGames();
      renderGameTabs();
      renderCharacters();
      closeAllModals();
      showSnackbar('Tag deletada!', 'success');
    } else {
      showSnackbar('Somente tags custom podem ser deletadas', 'info');
    }
  });

  // Batch add
  btnBatchAdd?.addEventListener('click', async () => {
    const game = document.getElementById('batch-char-game')?.value;
    const batchText = document.getElementById('batch-tags-input')?.value.trim();

    if (!batchText) {
      showSnackbar('Insira pelo menos uma tag!', 'error');
      return;
    }

    const lines = batchText.split('\n');
    let addedCount = 0;

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      let charName, hashtagsRaw;
      if (trimmedLine.includes(',')) {
        const parts = trimmedLine.split(',');
        charName = parts[0].trim();
        hashtagsRaw = parts[1]?.trim() || charName;
      } else {
        charName = trimmedLine;
        hashtagsRaw = trimmedLine;
      }

      if (!charName) continue;

      // Normalize name
      charName = charName.replace(/\w\S*/g, (txt) =>
        txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
      );

      const hashtags = processHashtags(hashtagsRaw);

      if (!appState.customData.games[game]) {
        appState.customData.games[game] = { characters: {} };
      }

      appState.customData.games[game].characters[charName] = hashtags;
      addedCount++;
    }

    if (addedCount === 0) {
      showSnackbar('Nenhuma tag válida encontrada!', 'error');
      return;
    }

    await window.electronAPI.saveCustomData(appState.customData);
    organizeGames();
    renderGameTabs();
    renderCharacters();
    closeAllModals();

    document.getElementById('batch-tags-input').value = '';
    showSnackbar(`✅ ${addedCount} tag(s) adicionada(s)!`, 'success');
  });

  // Add category
  btnAddCategory?.addEventListener('click', async () => {
    const name = document.getElementById('new-category-name')?.value.trim();
    const code = document.getElementById('new-category-code')?.value.trim().toUpperCase();
    const hashtags = document.getElementById('new-category-hashtags')?.value.trim();

    if (!name) {
      showSnackbar('Nome da categoria é obrigatório', 'error');
      return;
    }

    // Generate code if not provided
    const categoryCode = code || name.substring(0, 4).toUpperCase();

    // Check if code already exists
    if (appState.customData.games[categoryCode] || DEFAULT_GAMES[categoryCode]) {
      showSnackbar(`Código ${categoryCode} já existe!`, 'error');
      return;
    }

    appState.customData.games[categoryCode] = {
      custom_category: true,
      category: name,
      category_hashtags: hashtags,
      characters: {}
    };

    // Add to order
    if (!appState.customData.category_order.includes(categoryCode)) {
      appState.customData.category_order.push(categoryCode);
    }

    await window.electronAPI.saveCustomData(appState.customData);
    organizeGames();
    syncCategorySelectOptions();
    renderGameTabs();
    renderCategoriesList();
    closeAllModals();

    document.getElementById('new-category-name').value = '';
    document.getElementById('new-category-code').value = '';
    document.getElementById('new-category-hashtags').value = '';
    showSnackbar('Categoria criada!', 'success');
  });

  // Save settings
  btnSaveSettings?.addEventListener('click', async () => {
    // Get theme
    const selectedTheme = document.querySelector('input[name="theme-style"]:checked');
    if (selectedTheme) appState.config.theme_mode = selectedTheme.value;

    // Get acrylic mode
    const acrylicToggle = document.getElementById('acrylic-toggle');
    if (acrylicToggle) appState.config.acrylic_mode = acrylicToggle.checked;

    // Get advanced mode
    const advancedToggle = document.getElementById('advanced-mode-toggle');
    if (advancedToggle) appState.config.advanced_mode = advancedToggle.checked;

    await window.electronAPI.saveConfig(appState.config);

    applyThemeMode();

    // Apply acrylic
    applyAcrylicMode();

    closeAllModals();
    showSnackbar('Configurações salvas!', 'success');
  });

  // Reset order
  btnResetOrder?.addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'Resetar ordem',
      message: 'Resetar ordem personalizada?',
      confirmText: 'Resetar',
      cancelText: 'Cancelar',
      variant: 'danger',
    });
    if (!ok) return;

    appState.customData.category_order = Object.keys(DEFAULT_GAMES);
    await window.electronAPI.saveCustomData(appState.customData);

    renderGameTabs();
    renderCategoriesList();
    showSnackbar('Ordem resetada!', 'success');
  });

  // Export/Import data
  document.getElementById('btn-export-data')?.addEventListener('click', async () => {
    const result = await window.electronAPI.showSaveDialog({
      title: 'Exportar Custom Data',
      defaultPath: 'custom_data_backup.json',
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });

    if (!result.canceled && result.filePath) {
      const dataStr = JSON.stringify(appState.customData, null, 2);
      await window.electronAPI.copyToClipboard(dataStr);
      showSnackbar('📋 Dados copiados para clipboard!', 'success');
    }
  });

  document.getElementById('btn-import-data')?.addEventListener('click', async () => {
    const result = await window.electronAPI.showOpenDialog({
      title: 'Importar Custom Data',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile']
    });

    if (!result.canceled && result.filePaths.length > 0) {
      showSnackbar('📁 Função de importação em desenvolvimento', 'info');
    }
  });

  // Export/Import config
  document.getElementById('btn-export-config')?.addEventListener('click', async () => {
    const result = await window.electronAPI.showSaveDialog({
      title: 'Exportar Configurações',
      defaultPath: 'config_backup.json',
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });

    if (!result.canceled && result.filePath) {
      const configStr = JSON.stringify(appState.config, null, 2);
      await window.electronAPI.copyToClipboard(configStr);
      showSnackbar('📋 Configurações copiadas!', 'success');
    }
  });

  document.getElementById('btn-import-config')?.addEventListener('click', async () => {
    showSnackbar('📁 Função de importação em desenvolvimento', 'info');
  });

  // Icon cache controls
  document.getElementById('btn-open-icon-cache')?.addEventListener('click', async () => {
    const res = await window.electronAPI.openIconCacheDir();
    if (!res?.success) {
      showSnackbar(res?.error || 'Erro ao abrir pasta do cache', 'error');
    }
  });

  document.getElementById('btn-clear-icon-cache')?.addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'Limpar cache de ícones',
      message: 'Isso remove os ícones baixados. Eles serão baixados novamente quando necessários.',
      confirmText: 'Limpar',
      cancelText: 'Cancelar',
      variant: 'danger',
    });
    if (!ok) return;

    const res = await window.electronAPI.clearIconCache();
    if (!res?.success) {
      showSnackbar(res?.error || 'Erro ao limpar cache', 'error');
      return;
    }

    _iconFileUrlByRemote.clear();
    showSnackbar(`Cache limpo: ${res.deleted || 0} arquivo(s)`, 'success');
  });

  // Settings navigation (categories)
  setupSettingsNavigation();
}

function setupGameTabsScrolling() {
  if (!elements.gameTabs) return;
  if (elements.gameTabs.dataset.scrollBound === '1') return;
  elements.gameTabs.dataset.scrollBound = '1';
  elements.gameTabs.classList.add('drag-scroll');

  // Mouse wheel -> horizontal scroll
  elements.gameTabs.addEventListener(
    'wheel',
    (e) => {
      const tabs = elements.gameTabs;
      if (!tabs) return;
      const canScroll = tabs.scrollWidth > tabs.clientWidth + 2;
      if (!canScroll) return;

      const delta = e.deltaX !== 0 ? e.deltaX : e.deltaY;
      if (!delta) return;
      tabs.scrollLeft += delta;
      e.preventDefault();
    },
    { passive: false }
  );

  // Drag to scroll (pointer)
  let isDown = false;
  let startX = 0;
  let startScrollLeft = 0;
  let dragged = false;

  elements.gameTabs.addEventListener('pointerdown', (e) => {
    // Apenas botao esquerdo
    if (e.button !== 0) return;
    const tabs = elements.gameTabs;
    const canScroll = tabs.scrollWidth > tabs.clientWidth + 2;
    if (!canScroll) return;

    isDown = true;
    dragged = false;
    startX = e.clientX;
    startScrollLeft = tabs.scrollLeft;
  });

  elements.gameTabs.addEventListener('pointermove', (e) => {
    if (!isDown) return;
    const tabs = elements.gameTabs;
    const dx = e.clientX - startX;

    // Só entra em modo "arrasto" depois de passar o limiar
    if (!dragged && Math.abs(dx) > 8) {
      dragged = true;
      tabs.classList.add('dragging');
      try {
        tabs.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }

    if (!dragged) return;
    tabs.scrollLeft = startScrollLeft - dx;
    e.preventDefault();
  });

  elements.gameTabs.addEventListener('pointercancel', (e) => {
    if (!isDown) return;
    isDown = false;
    elements.gameTabs.classList.remove('dragging');
    try {
      elements.gameTabs.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  });

  elements.gameTabs.addEventListener('pointerup', (e) => {
    if (!isDown) return;
    isDown = false;
    elements.gameTabs.classList.remove('dragging');
    try {
      elements.gameTabs.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  });

  // Se o usuario arrastou, evita clicar na aba acidentalmente
  elements.gameTabs.addEventListener(
    'click',
    (e) => {
      if (!dragged) return;
      e.preventDefault();
      e.stopPropagation();
      dragged = false;
    },
    true
  );
}

function scrollActiveGameTabIntoView({ smooth } = {}) {
  const tabs = elements.gameTabs;
  if (!tabs) return;
  const active = tabs.querySelector('.game-tab.active');
  if (!active) return;

  try {
    active.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
      block: 'nearest',
      inline: 'center',
    });
  } catch {
    // ignore
  }
}

function setSettingsPanel(panelId) {
  const navButtons = document.querySelectorAll('#settings-modal [data-settings-tab]');
  const panels = document.querySelectorAll('#settings-modal [data-settings-panel]');
  if (navButtons.length === 0 || panels.length === 0) return;

  navButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.settingsTab === panelId);
  });

  panels.forEach((panel) => {
    panel.classList.toggle('active', panel.dataset.settingsPanel === panelId);
  });
}

function setupSettingsNavigation() {
  const navButtons = document.querySelectorAll('#settings-modal [data-settings-tab]');
  if (navButtons.length === 0) return;

  navButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      setSettingsPanel(btn.dataset.settingsTab);
    });
  });
}

function syncThemeToggleUi() {
  const themeToggle = document.getElementById('theme-toggle');
  const iconEl = document.getElementById('theme-switch-icon');
  if (!themeToggle || !iconEl) return;

  // Checked = dark mode
  iconEl.setAttribute('src', themeToggle.checked ? '../assets/moon.svg' : '../assets/sun.svg');
}

function renderGameTabs() {
  const categoryOrder = appState.customData.category_order || Object.keys(DEFAULT_GAMES);
  const search = buildSearchQuery(appState.searchTerm);

  const tabItems = categoryOrder
    .map((gameCode) => {
      const game = appState.games[gameCode];
      if (!game || game.chars.length === 0) return null;

      const count = search.tokens.length
        ? game.chars.filter((name) => doesNameMatchSearch(name, search)).length
        : game.chars.length;

      // Em modo de busca, esconde categorias sem resultados
      if (search.tokens.length && count === 0) return null;

      return { gameCode, game, count };
    })
    .filter(Boolean);

  // Se a categoria atual nao tem resultados na busca, muda para a primeira visivel
  if (search.tokens.length && tabItems.length) {
    const hasCurrent = tabItems.some((t) => t.gameCode === appState.currentGame);
    if (!hasCurrent) {
      appState.currentGame = tabItems[0].gameCode;
    }
  }

  elements.gameTabs.innerHTML = tabItems
    .map(({ gameCode, game, count }) => {
      const isActive = gameCode === appState.currentGame;
      return `
        <button class="game-tab ${isActive ? 'active' : ''}" data-game="${gameCode}">
          ${game.name}
          <span class="badge">${count}</span>
        </button>
      `;
    })
    .join('');

  // Add click handlers
  elements.gameTabs.querySelectorAll('.game-tab').forEach(tab => {
    tab.addEventListener('click', async () => {
      const next = tab.dataset.game;
      if (!next || next === appState.currentGame) return;
      appState.currentGame = next;
      renderGameTabs();
      await renderCharacters({ animate: true });
    });
  });

  // Keep active tab visible when there are many
  requestAnimationFrame(() => {
    scrollActiveGameTabIntoView({ smooth: true });
  });
}

async function renderCharacters({ animate = false } = {}) {
  const seq = ++_renderCharsSeq;

  const game = appState.games[appState.currentGame];
  if (!game) return;

  let chars = game.chars;
  const search = buildSearchQuery(appState.searchTerm);

  // Filter by search
  if (search.tokens.length) {
    chars = chars.filter((char) => doesNameMatchSearch(char, search));
  }

  const grid = elements.charactersGrid;
  if (!grid) return;

  const emptyWrap = document.getElementById('characters-empty');
  const emptyTitle = document.getElementById('characters-empty-title');
  const emptySubtitle = document.getElementById('characters-empty-subtitle');
  const emptyClearBtn = document.getElementById('btn-empty-clear');

  if (chars.length === 0) {
    // Animate fade-out of previous results (if any)
    if (animate) {
      grid.classList.add('grid-switching');
      await new Promise((r) => requestAnimationFrame(r));
      await new Promise((r) => window.setTimeout(r, 130));
      if (seq !== _renderCharsSeq) return;
    }

    grid.innerHTML = '';
    grid.classList.remove('grid-switching');
    grid.style.display = 'none';

    if (emptyWrap) {
      emptyWrap.style.display = 'flex';

      if (search.tokens.length) {
        if (emptyTitle) emptyTitle.textContent = 'Nenhum resultado';
        const raw = String(appState.searchTerm || '').trim();
        const msg = search.isSingleLetter
          ? `Nenhum personagem começa com "${search.tokens[0].toUpperCase()}".`
          : `Nenhum personagem encontrado para "${raw}".`;
        if (emptySubtitle) emptySubtitle.textContent = `${msg} Tente outro termo ou limpe a busca.`;
        if (emptyClearBtn) emptyClearBtn.style.display = '';
      } else {
        if (emptyTitle) emptyTitle.textContent = 'Nada por aqui';
        if (emptySubtitle) emptySubtitle.textContent = 'Essa categoria ainda não tem personagens.';
        if (emptyClearBtn) emptyClearBtn.style.display = 'none';
      }
    }
    return;
  }

  // There are results
  grid.style.display = '';
  if (emptyWrap) emptyWrap.style.display = 'none';

  // Se algum render anterior deixou a grade oculta, garante visibilidade
  if (!animate) {
    grid.classList.remove('grid-switching');
  }

  if (animate) {
    grid.classList.add('grid-switching');
    // Garante que a classe "pega" antes do clear
    await new Promise((r) => requestAnimationFrame(r));
    await new Promise((r) => window.setTimeout(r, 130));
    if (seq !== _renderCharsSeq) return;
  }

  grid.innerHTML = '';

  if (animate) {
    // Volta a aparecer antes de terminar de montar tudo (fica mais responsivo)
    requestAnimationFrame(() => grid.classList.remove('grid-switching'));
  }

  for (let i = 0; i < chars.length; i++) {
    if (seq !== _renderCharsSeq) return;
    const charName = chars[i];
    const charEl = await createCharacterElement(charName);
    if (seq !== _renderCharsSeq) return;

    if (animate) {
      const delay = Math.min(i, 18) * 18;
      charEl.classList.add('char-enter');
      charEl.style.setProperty('--enter-delay', `${delay}ms`);
    }

    grid.appendChild(charEl);
  }
}

async function createCharacterElement(charName) {
  const div = document.createElement('div');
  div.className = 'character-item';
  div.dataset.char = charName;

  // Find character data in chars.json
  const hashtags = getHashtagsForChar(charName) || '';
  const preferredGameCode = DEFAULT_GAMES[appState.currentGame]
    ? appState.currentGame
    : (getBaseGameFromHashtagsOnly(hashtags) || null);

  const charData = findCharDataForName(charName, preferredGameCode);

  // Create avatar container
  const avatarDiv = document.createElement('div');
  avatarDiv.className = 'character-avatar';

  if (charData?.icon) {
    // Create image element
    const img = document.createElement('img');
    img.alt = '';
    img.loading = 'eager'; // Changed to eager to ensure immediate loading
    img.referrerPolicy = 'no-referrer';
    img.decoding = 'sync'; // Changed to sync for faster rendering
    img.style.opacity = '0'; // Use opacity instead of display:none to avoid layout issues during load
    img.style.transition = 'opacity 0.2s ease-in-out';

    const loadingPlaceholder = document.createElement('div');
    loadingPlaceholder.className = 'placeholder';
    loadingPlaceholder.textContent = '🎮';
    avatarDiv.appendChild(loadingPlaceholder);

    // Handle load success
    img.onload = () => {
      loadingPlaceholder.remove();
      img.style.opacity = '1';
    };

    // Handle load error
    img.onerror = () => {
      console.error(`[DEBUG] Image error for ${charName}`);
      if (!loadingPlaceholder.parentElement) {
        avatarDiv.appendChild(loadingPlaceholder);
      }
      img.remove();
    };

    avatarDiv.appendChild(img);
    setImageSrcWithCache(img, charData.icon);

    // Double check if already complete (e.g. from browser cache)
    if (img.complete) {
      img.onload();
    }
  } else {
    avatarDiv.innerHTML = '<div class="placeholder">🎮</div>';
  }

  // Create name element
  const nameDiv = document.createElement('div');
  nameDiv.className = 'character-name';
  nameDiv.textContent = charName;

  div.appendChild(avatarDiv);
  div.appendChild(nameDiv);

  div.addEventListener('click', () => copyHashtags(charName));
  div.addEventListener('contextmenu', (e) => showContextMenu(e, charName));

  return div;
}

async function copyHashtags(charName) {
  const hashtags = getHashtagsForChar(charName);

  if (!hashtags) {
    showSnackbar('Hashtags não encontradas', 'error');
    return;
  }

  try {
    await window.electronAPI.copyToClipboard(hashtags);
    showSnackbar(`✓ ${charName} copiado!`, 'success');
    incrementUsage(charName);
  } catch (error) {
    showSnackbar('Erro ao copiar', 'error');
  }
}

async function incrementUsage(charName) {
  appState.usageStats.total_clicks++;
  const gameCode = appState.currentGame;

  appState.usageStats.by_game[gameCode] = (appState.usageStats.by_game[gameCode] || 0) + 1;
  appState.usageStats.by_char[charName] = (appState.usageStats.by_char[charName] || 0) + 1;

  await window.electronAPI.saveUsageStats(appState.usageStats);
}

function showContextMenu(e, charName) {
  e.preventDefault();

  document.querySelectorAll('.context-menu').forEach(m => m.remove());

  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.style.left = `${e.clientX}px`;
  menu.style.top = `${e.clientY}px`;

  menu.innerHTML = `
    <div class="context-menu-item" onclick="window.editCharacter('${charName}')">
      <img src="../assets/pencil.svg" style="width:16px;height:16px;filter:invert(100%);"> Editar
    </div>
    <div class="context-menu-item" onclick="window.cloneCharacter('${charName}')">
      <img src="../assets/clone.svg" style="width:16px;height:16px;filter:invert(100%);"> Clonar
    </div>
    <div class="context-menu-item" style="color:var(--red);" onclick="window.deleteCharacter('${charName}')">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: currentColor;">
        <path d="M3 6h18"/>
        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
        <line x1="10" x2="10" y1="11" y2="17"/>
        <line x1="14" x2="14" y1="11" y2="17"/>
      </svg>
      Deletar
    </div>
  `;

  document.body.appendChild(menu);

  setTimeout(() => {
    document.addEventListener('click', function close() {
      menu.remove();
      document.removeEventListener('click', close);
    });
  }, 0);
}

window.editCharacter = function (charName) {
  document.querySelectorAll('.context-menu').forEach(m => m.remove());
  
  const isDefault = !!appState.hashtags[charName];
  const isDevMode = !!appState.config.advanced_mode;

  // Se for padrao e nao estiver em modo dev, bloqueia
  if (isDefault && !isDevMode) {
    showSnackbar('⚠️ Tags padrões são protegidas. Ative o Modo Desenvolvedor.', 'error');
    return;
  }

  const nameInput = document.getElementById('edit-char-name');
  nameInput.value = charName;
  // Nome so pode ser editado em modo dev (mesmo para custom)
  nameInput.readOnly = !isDevMode;
  nameInput.classList.toggle('locked', !isDevMode);

  const hashtags = getHashtagsForChar(charName);
  document.getElementById('edit-hashtags').value = hashtags || '';

  const gameCode = getGameFromHashtags(charName, hashtags || '');
  const gameSelect = document.getElementById('edit-char-game');
  if (gameSelect && gameCode) {
    gameSelect.value = gameCode;
    gameSelect.dispatchEvent(new Event('change', { bubbles: true }));
  }

  showModal('edit-modal');
};

window.deleteCharacter = async function (charName) {
  document.querySelectorAll('.context-menu').forEach(m => m.remove());
  
  const isDefault = !!appState.hashtags[charName];
  const isDevMode = !!appState.config.advanced_mode;

  if (isDefault && !isDevMode) {
    showSnackbar('⚠️ Não é possível deletar tags padrões sem o Modo Desenvolvedor.', 'error');
    return;
  }

  const ok = await confirmDialog({
    title: 'Deletar personagem',
    message: `Deletar ${charName}?`,
    confirmText: 'Deletar',
    cancelText: 'Cancelar',
    variant: 'danger',
  });
  if (!ok) return;

  // Se for customizado, salva os dados antes de apagar para a lixeira
  if (!isDefault) {
    const hashtags = getHashtagsForChar(charName);
    const gameCode = getGameFromHashtags(charName, hashtags || '');
    
    if (!appState.customData.deleted_custom_data) {
      appState.customData.deleted_custom_data = {};
    }
    appState.customData.deleted_custom_data[charName] = { hashtags, gameCode };
  }

  // Remove dos dados customizados
  if (appState.customData.games) {
    Object.values(appState.customData.games).forEach(gameData => {
      if (gameData.characters?.[charName]) {
        delete gameData.characters[charName];
      }
    });
  }

  // Se for padrão, adiciona à lista de ocultos
  if (isDefault) {
    if (!appState.customData.hidden_chars) {
      appState.customData.hidden_chars = [];
    }
    if (!appState.customData.hidden_chars.includes(charName)) {
      appState.customData.hidden_chars.push(charName);
    }
  }

  await window.electronAPI.saveCustomData(appState.customData);
  organizeGames();
  renderGameTabs();
  renderCharacters();
  showSnackbar('Enviado para a lixeira!', 'success');
};

async function toggleCompactMode() {
  appState.config.compact_mode = !appState.config.compact_mode;
  applyCompactMode();

  await window.electronAPI.setAlwaysOnTop(appState.config.compact_mode);

  if (appState.config.compact_mode) {
    await window.electronAPI.setWindowSize(450, 600);
    showSnackbar('📌 Modo Compacto', 'success');
  } else {
    await window.electronAPI.setWindowSize(1200, 800);
    showSnackbar('📌 Modo Normal', 'success');
  }

  await window.electronAPI.saveConfig(appState.config);
}

function showStatsModal() {
  showModal('stats-modal');
  requestAnimationFrame(() => {
    updateStatsModalUI();
    refreshStatsActiveTabCharts();
  });
}

async function copyStatsSummaryToClipboard() {
  const total = appState.usageStats?.total_clicks || 0;
  if (total <= 0) return;

  const text = buildStatsSummaryText();
  const result = await window.electronAPI.copyToClipboard(text);
  if (result?.success) {
    showSnackbar('Resumo copiado!', 'success');
  } else {
    showSnackbar('Erro ao copiar resumo', 'error');
  }
}

function buildStatsSummaryText() {
  const total = appState.usageStats?.total_clicks || 0;
  const sortedChars = getSortedStatsEntries(appState.usageStats?.by_char);
  const sortedGames = getSortedStatsEntries(appState.usageStats?.by_game);

  const topChar = sortedChars[0];
  const topGame = sortedGames[0];

  const lines = [];
  lines.push('TagApp - Estatisticas de Uso');
  lines.push('');
  lines.push(`Total de copias: ${total}`);
  if (topChar) lines.push(`Top personagem: ${topChar[0]} (${topChar[1]})`);
  if (topGame) lines.push(`Top jogo: ${getGameDisplayName(topGame[0])} (${topGame[1]})`);

  if (sortedChars.length) {
    lines.push('');
    lines.push('Ranking de personagens:');
    sortedChars.slice(0, 10).forEach(([name, count], idx) => {
      lines.push(`${idx + 1}) ${name} - ${count}`);
    });
  }

  if (sortedGames.length) {
    lines.push('');
    lines.push('Ranking de jogos:');
    sortedGames.forEach(([code, count], idx) => {
      lines.push(`${idx + 1}) ${getGameDisplayName(code)} - ${count}`);
    });
  }

  return lines.join('\n');
}

async function resetUsageStats() {
  const total = appState.usageStats?.total_clicks || 0;
  if (total <= 0) return;
  const ok = await confirmDialog({
    title: 'Limpar estatisticas',
    message: 'Limpar todas as estatisticas de uso?',
    confirmText: 'Limpar',
    cancelText: 'Cancelar',
    variant: 'danger',
  });
  if (!ok) return;

  appState.usageStats = { total_clicks: 0, by_game: {}, by_char: {} };
  const result = await window.electronAPI.saveUsageStats(appState.usageStats);
  if (!result?.success) {
    showSnackbar('Erro ao limpar estatisticas', 'error');
    return;
  }

  updateStatsModalUI();
  showSnackbar('Estatisticas limpas!', 'success');
}

function updateStatsModalUI() {
  const total = appState.usageStats?.total_clicks || 0;

  const emptyEl = document.getElementById('stats-empty');
  const shellEl = document.getElementById('stats-shell');
  if (emptyEl && shellEl) {
    emptyEl.style.display = total > 0 ? 'none' : 'flex';
    shellEl.style.display = total > 0 ? 'block' : 'none';
  }

  const totalEl = document.getElementById('stat-total-copies');
  if (totalEl) totalEl.textContent = total;

  const sortedChars = getSortedStatsEntries(appState.usageStats?.by_char);
  const sortedGames = getSortedStatsEntries(appState.usageStats?.by_game);

  const topChar = sortedChars[0];
  const topGame = sortedGames[0];

  const topCharEl = document.getElementById('stat-top-char');
  const topCharSubEl = document.getElementById('stat-top-char-sub');
  if (topCharEl) topCharEl.textContent = topChar ? topChar[0] : '—';
  if (topCharSubEl) {
    topCharSubEl.textContent = topChar
      ? `${topChar[1]} (${formatPercent(topChar[1], total)})`
      : '';
  }

  const topGameEl = document.getElementById('stat-top-game');
  const topGameSubEl = document.getElementById('stat-top-game-sub');
  if (topGameEl) topGameEl.textContent = topGame ? getGameDisplayName(topGame[0]) : '—';
  if (topGameSubEl) {
    topGameSubEl.textContent = topGame
      ? `${topGame[1]} (${formatPercent(topGame[1], total)})`
      : '';
  }

  const btnCopy = document.getElementById('btn-copy-stats');
  if (btnCopy) btnCopy.disabled = total <= 0;
  const btnReset = document.getElementById('btn-reset-stats');
  if (btnReset) btnReset.disabled = total <= 0;

  // Charts + rankings
  if (total > 0) {
    renderStatsRankings(sortedChars.slice(0, 10), sortedGames, total);
  } else {
    clearStatsVisuals();
  }
}

function getSortedStatsEntries(map) {
  const safe = map && typeof map === 'object' ? map : {};
  return Object.entries(safe)
    .filter(([, v]) => typeof v === 'number' && v > 0)
    .sort((a, b) => b[1] - a[1]);
}

function formatPercent(part, total) {
  if (!total || total <= 0) return '0%';
  return `${Math.round((part / total) * 100)}%`;
}

function getGameDisplayName(gameCode) {
  const code = String(gameCode || '').trim();
  const name = appState.games?.[code]?.name || DEFAULT_GAMES[code];
  if (!code) return '—';
  if (!name) return code;
  return `${code} - ${name}`;
}

function getCssVar(name, fallback) {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || fallback;
}

function prepareCanvas(canvas, widthPx, heightPx) {
  const dpr = window.devicePixelRatio || 1;
  const w = Math.max(1, Math.floor(widthPx));
  const h = Math.max(1, Math.floor(heightPx));

  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;

  const ctx = canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

function clearStatsVisuals() {
  const charsRank = document.getElementById('stats-chars-ranking');
  if (charsRank) charsRank.innerHTML = '';

  const gamesRank = document.getElementById('stats-games-ranking');
  if (gamesRank) gamesRank.innerHTML = '';

  const legend = document.getElementById('games-legend');
  if (legend) legend.innerHTML = '';

  const barCanvas = document.getElementById('chars-chart');
  if (barCanvas) {
    const ctx = barCanvas.getContext('2d');
    ctx.clearRect(0, 0, barCanvas.width, barCanvas.height);
  }

  const pieCanvas = document.getElementById('games-chart');
  if (pieCanvas) {
    const ctx = pieCanvas.getContext('2d');
    ctx.clearRect(0, 0, pieCanvas.width, pieCanvas.height);
  }
}

function renderStatsRankings(sortedChars, sortedGames, total) {
  const charsRank = document.getElementById('stats-chars-ranking');
  if (charsRank) {
    const max = sortedChars[0]?.[1] || 1;
    charsRank.innerHTML = sortedChars
      .map(([name, count], idx) => {
        const pctMax = Math.round((count / max) * 100);
        return `
          <div class="stats-rank-item">
            <div class="stats-rank-top">
              <div class="stats-rank-name">${idx + 1}. ${escapeHtml(name)}</div>
              <div class="stats-rank-meta">${count} <span class="stats-rank-sep">•</span> ${formatPercent(count, total)}</div>
            </div>
            <div class="stats-rank-bar"><span style="width:${pctMax}%"></span></div>
          </div>
        `;
      })
      .join('');
  }

  const gamesRank = document.getElementById('stats-games-ranking');
  if (gamesRank) {
    const max = sortedGames[0]?.[1] || 1;
    gamesRank.innerHTML = sortedGames
      .map(([code, count], idx) => {
        const pctMax = Math.round((count / max) * 100);
        return `
          <div class="stats-rank-item">
            <div class="stats-rank-top">
              <div class="stats-rank-name">${idx + 1}. ${escapeHtml(getGameDisplayName(code))}</div>
              <div class="stats-rank-meta">${count} <span class="stats-rank-sep">•</span> ${formatPercent(count, total)}</div>
            </div>
            <div class="stats-rank-bar"><span style="width:${pctMax}%"></span></div>
          </div>
        `;
      })
      .join('');
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderStatsCharts(sortedChars, sortedGames) {
  const tabId = getActiveStatsTabId();
  if (tabId === 'games') {
    renderGamesDonutChart(sortedGames);
  } else {
    renderCharsBarChart(sortedChars);
  }
}

function getActiveStatsTabId() {
  const btn = document.querySelector('.stats-tab-btn.active');
  return btn?.dataset?.statsTab || 'chars';
}

function refreshStatsActiveTabCharts() {
  const total = appState.usageStats?.total_clicks || 0;
  if (total <= 0) return;
  const sortedChars = getSortedStatsEntries(appState.usageStats?.by_char).slice(0, 10);
  const sortedGames = getSortedStatsEntries(appState.usageStats?.by_game);
  renderStatsCharts(sortedChars, sortedGames);
}

function renderCharsBarChart(sortedChars) {
  const canvas = document.getElementById('chars-chart');
  if (!canvas) return;
  if (!sortedChars.length) return;

  const parent = canvas.parentElement;
  const parentRect = parent?.getBoundingClientRect();
  const width = Math.min(760, Math.max(320, parentRect?.width || 600));
  const preferredH = (parentRect?.height || 0) - 24;
  const height = Math.min(320, Math.max(210, preferredH || 250));
  const { ctx, w, h } = prepareCanvas(canvas, width, height);

  const text = getCssVar('--text', '#cdd6f4');
  const subtext = getCssVar('--subtext', '#a6adc8');
  const border = getCssVar('--border', '#313244');
  const fill = getCssVar('--yellow', '#f9e2af');

  const paddingLeft = 44;
  const paddingRight = 16;
  const paddingTop = 18;
  const paddingBottom = 30;
  const chartW = w - paddingLeft - paddingRight;
  const chartH = h - paddingTop - paddingBottom;

  const maxCount = sortedChars[0][1] || 1;

  // Grid
  ctx.strokeStyle = border;
  ctx.lineWidth = 1;
  const gridLines = 4;
  for (let i = 0; i <= gridLines; i++) {
    const y = paddingTop + (chartH / gridLines) * i;
    ctx.beginPath();
    ctx.moveTo(paddingLeft, y);
    ctx.lineTo(paddingLeft + chartW, y);
    ctx.stroke();

    const value = Math.round(maxCount - (maxCount / gridLines) * i);
    ctx.fillStyle = subtext;
    ctx.font = '12px Segoe UI';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(value), paddingLeft - 8, y);
  }

  // Bars
  const count = sortedChars.length;
  const gap = Math.max(10, Math.floor(chartW * 0.02));
  const barW = Math.max(18, Math.floor((chartW - gap * (count - 1)) / count));
  const baseY = paddingTop + chartH;

  // Hitboxes for tooltip
  canvas._statsHitboxes = [];
  bindStatsBarTooltip(canvas);

  sortedChars.forEach(([name, value], i) => {
    const x = paddingLeft + i * (barW + gap);
    const barH = Math.round((value / maxCount) * chartH);
    const y = baseY - barH;

    // Bar (rounded)
    ctx.fillStyle = fill;
    roundRect(ctx, x, y, barW, barH, 8);
    ctx.fill();

    canvas._statsHitboxes.push({
      name,
      value,
      index: i,
      x,
      y,
      w: barW,
      h: barH,
    });

    // Value
    ctx.fillStyle = text;
    ctx.font = '600 12px Segoe UI';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(String(value), x + barW / 2, y - 6);

    // Label (index only to avoid overlap)
    ctx.fillStyle = subtext;
    ctx.font = '12px Segoe UI';
    ctx.textBaseline = 'top';
    ctx.fillText(String(i + 1), x + barW / 2, baseY + 8);
  });
}

let _statsTooltipEl = null;

function ensureStatsTooltip() {
  if (_statsTooltipEl) return _statsTooltipEl;
  const el = document.createElement('div');
  el.className = 'stats-tooltip';
  el.innerHTML = '<div class="tt-title"></div><div class="tt-sub"></div>';
  document.body.appendChild(el);
  _statsTooltipEl = el;
  return el;
}

function bindStatsBarTooltip(canvas) {
  if (canvas.dataset.statsTooltipBound === '1') return;
  canvas.dataset.statsTooltipBound = '1';

  const tooltip = ensureStatsTooltip();

  function hide() {
    tooltip.classList.remove('show');
  }

  canvas.addEventListener('mouseleave', hide);
  canvas.addEventListener('mousemove', (e) => {
    const hitboxes = canvas._statsHitboxes || [];
    if (!hitboxes.length) {
      hide();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const hit = hitboxes.find((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
    if (!hit) {
      hide();
      return;
    }

    const total = appState.usageStats?.total_clicks || 0;
    const title = `${hit.index + 1}. ${hit.name}`;
    const sub = `${hit.value} copias (${formatPercent(hit.value, total)})`;

    tooltip.querySelector('.tt-title').textContent = title;
    tooltip.querySelector('.tt-sub').textContent = sub;

    const offsetX = 14;
    const offsetY = 16;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    tooltip.style.left = `${Math.min(e.clientX + offsetX, vw - 12)}px`;
    tooltip.style.top = `${Math.min(e.clientY + offsetY, vh - 12)}px`;

    // Clamp after content paint
    tooltip.classList.add('show');
    requestAnimationFrame(() => {
      const ttRect = tooltip.getBoundingClientRect();
      let left = e.clientX + offsetX;
      let top = e.clientY + offsetY;
      if (left + ttRect.width > vw - 8) left = vw - ttRect.width - 8;
      if (top + ttRect.height > vh - 8) top = vh - ttRect.height - 8;
      tooltip.style.left = `${Math.max(8, left)}px`;
      tooltip.style.top = `${Math.max(8, top)}px`;
    });
  });
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function renderGamesDonutChart(sortedGames) {
  const canvas = document.getElementById('games-chart');
  if (!canvas) return;
  if (!sortedGames.length) return;

  const parent = canvas.parentElement;
  const size = Math.min(360, Math.max(260, parent?.getBoundingClientRect().width || 320));
  const { ctx, w } = prepareCanvas(canvas, size, size);

  const surface = getCssVar('--surface', '#181825');
  const text = getCssVar('--text', '#cdd6f4');

  const colors = [
    getCssVar('--blue', '#89b4fa'),
    getCssVar('--red', '#ef4444'),
    getCssVar('--green', '#a6e3a1'),
    getCssVar('--yellow', '#f9e2af'),
    getCssVar('--lavender', '#b4befe'),
    getCssVar('--peach', '#fab387'),
    '#94e2d5'
  ];

  const total = sortedGames.reduce((acc, [, v]) => acc + v, 0);
  if (!total) return;

  const centerX = w / 2;
  const centerY = w / 2;
  const radius = Math.floor(w * 0.38);
  const hole = Math.floor(radius * 0.55);

  let angle = -Math.PI / 2;
  sortedGames.forEach(([code, value], i) => {
    const slice = (value / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, angle, angle + slice);
    ctx.closePath();
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();

    // Percent label
    const pct = Math.round((value / total) * 100);
    if (pct >= 7) {
      const mid = angle + slice / 2;
      const lx = centerX + Math.cos(mid) * (radius * 0.7);
      const ly = centerY + Math.sin(mid) * (radius * 0.7);
      ctx.fillStyle = text;
      ctx.font = '700 12px Segoe UI';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${pct}%`, lx, ly);
    }

    angle += slice;
  });

  // Center hole
  ctx.beginPath();
  ctx.arc(centerX, centerY, hole, 0, 2 * Math.PI);
  ctx.fillStyle = surface;
  ctx.fill();

  // Legend
  const legend = document.getElementById('games-legend');
  if (legend) {
    legend.innerHTML = sortedGames
      .map(([code, value], i) => {
        return `
          <div class="legend-item">
            <div class="legend-color" style="background:${colors[i % colors.length]}"></div>
            <span>${escapeHtml(getGameDisplayName(code))}: ${value}</span>
          </div>
        `;
      })
      .join('');
  }
}

function initConfirmModal() {
  const modal = document.getElementById('confirm-modal');
  if (!modal) return;
  if (modal.dataset.bound === '1') return;
  modal.dataset.bound = '1';

  modal.addEventListener('modal:close', () => {
    if (_activeConfirm) {
      const { resolve } = _activeConfirm;
      _activeConfirm = null;
      resolve(false);
    }
  });

  const btnCancel = document.getElementById('confirm-cancel');
  btnCancel?.addEventListener('click', () => {
    if (_activeConfirm) {
      const { resolve } = _activeConfirm;
      _activeConfirm = null;
      resolve(false);
    }
    closeTopModal();
  });

  const btnOk = document.getElementById('confirm-ok');
  btnOk?.addEventListener('click', () => {
    if (_activeConfirm) {
      const { resolve } = _activeConfirm;
      _activeConfirm = null;
      resolve(true);
    }
    closeTopModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!modal.classList.contains('show')) return;
    // ESC cancela
    closeTopModal();
  });
}

function confirmDialog({
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
} = {}) {
  initConfirmModal();

  // Fechar menus flutuantes para nao ficarem "perdidos" atras do overlay
  closeAllFancySelectMenus();
  document.querySelectorAll('.context-menu').forEach((m) => m.remove());

  const modal = document.getElementById('confirm-modal');
  const titleEl = document.getElementById('confirm-title');
  const messageEl = document.getElementById('confirm-message');
  const dangerNoteEl = document.getElementById('confirm-danger-note');
  const btnCancel = document.getElementById('confirm-cancel');
  const btnOk = document.getElementById('confirm-ok');

  if (!modal || !titleEl || !messageEl || !btnCancel || !btnOk) {
    // Fallback (nao esperado)
    return Promise.resolve(false);
  }

  if (_activeConfirm) {
    try {
      _activeConfirm.resolve(false);
    } catch {
      // ignore
    }
    _activeConfirm = null;
  }

  titleEl.textContent = String(title || 'Confirmar');
  messageEl.textContent = String(message || '');
  if (dangerNoteEl) {
    dangerNoteEl.style.display = variant === 'danger' ? 'block' : 'none';
  }
  btnCancel.textContent = String(cancelText || 'Cancelar');
  btnOk.textContent = String(confirmText || 'Confirmar');

  btnOk.classList.remove('btn-danger', 'btn-primary', 'btn-secondary', 'btn-outline', 'btn-red-outline');
  if (variant === 'primary') btnOk.classList.add('btn-primary');
  else if (variant === 'secondary') btnOk.classList.add('btn-secondary');
  else btnOk.classList.add('btn-danger');

  // Abre sem fechar o modal atual (permite confirm em cima)
  modal.classList.add('show');

  // Foco seguro no cancelar (evita Enter deletar por acidente)
  requestAnimationFrame(() => {
    btnCancel.focus();
  });

  return new Promise((resolve) => {
    _activeConfirm = { resolve };
  });
}

function dispatchModalClose(modalEl) {
  if (!modalEl) return;
  modalEl.dispatchEvent(new CustomEvent('modal:close'));
}

function showModal(modalId) {
  closeAllModals();
  document.getElementById(modalId).classList.add('show');
}

function closeTopModal() {
  const open = Array.from(document.querySelectorAll('.modal.show'));
  const top = open[open.length - 1];
  if (top) {
    dispatchModalClose(top);
    top.classList.remove('show');
  }
  document.querySelectorAll('.context-menu').forEach(m => m.remove());
}

function closeAllModals() {
  document.querySelectorAll('.modal.show').forEach(m => {
    dispatchModalClose(m);
    m.classList.remove('show');
  });
  document.querySelectorAll('.context-menu').forEach(m => m.remove());
}

function showSnackbar(message, type = '') {
  ensureSnackbarInBody();
  const stack = elements.snackbar;
  if (!stack) return;

  const lines = normalizeToastMessages(message);
  if (!lines.length) return;

  lines.forEach((line, idx) => {
    window.setTimeout(() => pushToast(stack, line, type), idx * 80);
  });
}

function normalizeToastMessages(message) {
  const raw = Array.isArray(message) ? message : [message];
  return raw
    .flatMap((m) => String(m ?? '').split('\n'))
    .map((s) => s.trim())
    .filter(Boolean);
}

function pushToast(stack, text, type) {
  const toast = document.createElement('div');
  toast.className = 'snackbar-toast';
  if (type) toast.classList.add(type);
  toast.dataset.toastId = String(++_toastSeq);
  toast.textContent = text;
  stack.appendChild(toast);

  const maxToasts = 4;
  while (stack.children.length > maxToasts) {
    stack.removeChild(stack.firstChild);
  }

  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  const ttlMs = 3200;
  window.setTimeout(() => {
    toast.classList.remove('show');
    toast.addEventListener(
      'transitionend',
      () => {
        toast.remove();
      },
      { once: true }
    );
    window.setTimeout(() => toast.remove(), 700);
  }, ttlMs);
}

function processHashtags(text) {
  if (!text.trim()) return '';
  return text.split(/\s+/).map(p => p.trim() && !p.startsWith('#') ? `#${p}` : p).filter(Boolean).join(' ');
}

window.showModal = showModal;

window.closeAllModalsExcept = function (modalId) {
  document.querySelectorAll('.modal').forEach(m => {
    if (m.id !== modalId && m.classList.contains('show')) {
      dispatchModalClose(m);
      m.classList.remove('show');
    }
  });
};

// Load settings values
function loadSettingsValues() {
  // Theme
  const themeMode = appState.config.theme_mode || 'mocha';
  const themeRadio = document.querySelector(`input[name="theme-style"][value="${themeMode}"]`);
  if (themeRadio) themeRadio.checked = true;

  // Acrylic mode
  const acrylicToggle = document.getElementById('acrylic-toggle');
  if (acrylicToggle) acrylicToggle.checked = appState.config.acrylic_mode;

  // Advanced mode
  const advancedToggle = document.getElementById('advanced-mode-toggle');
  if (advancedToggle) advancedToggle.checked = appState.config.advanced_mode || false;

  // Hidden tags
  updateHiddenTagsUI();

  // Icon cache path
  const cachePathEl = document.getElementById('icon-cache-path');
  if (cachePathEl && window.electronAPI.getIconCacheDir) {
    window.electronAPI.getIconCacheDir().then((res) => {
      if (res?.success && res.path) {
        cachePathEl.textContent = `Local: ${res.path}`;
      }
    });
  }
}

function captureOrderPositions(container) {
  const map = new Map();
  if (!container) return map;
  container.querySelectorAll('.order-item:not(.dragging)').forEach((el) => {
    const key = el.dataset.game;
    if (!key) return;
    map.set(key, el.getBoundingClientRect());
  });
  return map;
}

function animateOrderFlip(container, prevPositions) {
  if (!container || !prevPositions || prevPositions.size === 0) return;
  const items = Array.from(container.querySelectorAll('.order-item:not(.dragging)'));
  const moving = [];

  items.forEach((el) => {
    const key = el.dataset.game;
    const prev = prevPositions.get(key);
    if (!prev) return;
    const next = el.getBoundingClientRect();
    const dx = prev.left - next.left;
    const dy = prev.top - next.top;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
    el.style.transform = `translate(${dx}px, ${dy}px) scale(0.985)`;
    el.style.transition = 'transform 0s';
    moving.push(el);
  });

  if (moving.length === 0) return;

  requestAnimationFrame(() => {
    moving.forEach((el) => {
      el.style.transition = 'transform 340ms cubic-bezier(0.16, 1, 0.3, 1)';
      el.style.transform = '';
      el.addEventListener(
        'transitionend',
        () => {
          el.style.transition = '';
          el.style.transform = '';
        },
        { once: true }
      );
    });
  });
}

function getOrderDragAfterElement(container, y) {
  const items = Array.from(container.querySelectorAll('.order-item:not(.dragging)'));
  let closest = { offset: Number.NEGATIVE_INFINITY, element: null };

  items.forEach((child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      closest = { offset, element: child };
    }
  });

  return closest.element;
}

// Render categories list
function renderCategoriesList(prevOrderPositions = null) {
  const customList = document.getElementById('custom-categories-list');
  const orderList = document.getElementById('categories-order-list');

  if (!customList || !orderList) return;

  // Custom categories
  let customHtml = '';
  const categoryOrder = appState.customData.category_order || Object.keys(DEFAULT_GAMES);

  categoryOrder.forEach(gameCode => {
    const game = appState.games[gameCode];
    if (!game) return;

    const isCustom = appState.customData.games?.[gameCode]?.custom_category;
    const badge = isCustom ?
      '<span class="badge-custom">Custom</span>' :
      '<span class="badge-default">Padrão</span>';

    if (isCustom) {
      customHtml += `
        <div class="category-item">
          <span>${gameCode} - ${game.name}</span>
          <div style="display:flex;gap:8px;align-items:center;">
            ${badge}
            <button onclick="deleteCategory('${gameCode}')" style="background:none;border:none;color:var(--red);cursor:pointer;padding:4px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: currentColor;">
                <path d="M3 6h18"/>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                <line x1="10" x2="10" y1="11" y2="17"/>
                <line x1="14" x2="14" y1="11" y2="17"/>
              </svg>
            </button>
          </div>
        </div>
      `;
    }
  });

  customList.innerHTML = customHtml || '<p style="color:var(--muted);font-size:0.9rem;">Nenhuma categoria customizada</p>';

  // Order list
  let orderHtml = '';
  categoryOrder.forEach(gameCode => {
    const game = appState.games[gameCode];
    if (!game) return;

    const isCustom = appState.customData.games?.[gameCode]?.custom_category;
    const badge = isCustom ?
      '<span class="badge-custom">Custom</span>' :
      '<span class="badge-default">Padrão</span>';

    orderHtml += `
      <div class="order-item" draggable="true" data-game="${gameCode}">
        <span>${game.name}</span>
        <div style="display:flex;gap:8px;align-items:center;">
          ${badge}
          <img src="../assets/drag_handle.svg" class="drag-handle" style="width:16px;height:16px;filter:invert(60%);">
        </div>
      </div>
    `;
  });

  orderList.innerHTML = orderHtml;

  // FLIP animation when reordering
  if (prevOrderPositions) {
    requestAnimationFrame(() => {
      animateOrderFlip(orderList, prevOrderPositions);
    });
  }

  // Add drag and drop event listeners
  const orderItems = orderList.querySelectorAll('.order-item');

  // Container-level dragover for realtime swap
  if (orderList.dataset.realtimeSwapBound !== '1') {
    orderList.dataset.realtimeSwapBound = '1';

    orderList.addEventListener('dragover', (e) => {
      e.preventDefault();
      const dragged = orderList._draggedItem;
      if (!dragged || !dragged.isConnected) return;

      const afterEl = getOrderDragAfterElement(orderList, e.clientY);

      const isEnd = afterEl == null;
      const alreadyAtEnd = isEnd && orderList.lastElementChild === dragged;
      const alreadyBeforeAfter = !isEnd && dragged.nextElementSibling === afterEl;
      if (alreadyAtEnd || alreadyBeforeAfter) return;

      const prevPositions = captureOrderPositions(orderList);
      if (afterEl == null) {
        orderList.appendChild(dragged);
      } else {
        orderList.insertBefore(dragged, afterEl);
      }
      animateOrderFlip(orderList, prevPositions);
    });

    orderList.addEventListener('drop', (e) => {
      e.preventDefault();
    });
  }

  // Item-level drag handlers
  orderItems.forEach((item) => {
    item.addEventListener('dragstart', (e) => {
      orderList._draggedItem = item;
      item.classList.add('dragging');
      item.style.opacity = '0.55';
      e.dataTransfer.effectAllowed = 'move';
      try {
        e.dataTransfer.setData('text/plain', item.dataset.game || '');
      } catch {
        // ignore
      }
    });

    item.addEventListener('dragend', async () => {
      item.classList.remove('dragging');
      item.style.opacity = '1';
      orderList._draggedItem = null;

      const newOrder = Array.from(orderList.querySelectorAll('.order-item'))
        .map((el) => el.dataset.game)
        .filter(Boolean);

      if (newOrder.length) {
        appState.customData.category_order = newOrder;
        await window.electronAPI.saveCustomData(appState.customData);
        renderGameTabs();
      }
    });
  });
}

window.deleteCategory = async function (gameCode) {
  const ok = await confirmDialog({
    title: 'Deletar categoria',
    message: `Deletar categoria ${gameCode}? Isso também removerá todas as tags associadas.`,
    confirmText: 'Deletar',
    cancelText: 'Cancelar',
    variant: 'danger',
  });
  if (!ok) return;

  if (appState.customData.games[gameCode]) {
    delete appState.customData.games[gameCode];

    // Remove from order
    const idx = appState.customData.category_order.indexOf(gameCode);
    if (idx > -1) {
      appState.customData.category_order.splice(idx, 1);
    }

    await window.electronAPI.saveCustomData(appState.customData);
    organizeGames();
    syncCategorySelectOptions();
    renderGameTabs();
    renderCharacters();
    renderCategoriesList();
    showSnackbar('Categoria deletada!', 'success');
  }
};

function updateHiddenTagsUI() {
  const hiddenSection = document.getElementById('hidden-tags-section');
  const hiddenList = document.getElementById('hidden-tags-list');
  if (!hiddenSection || !hiddenList) return;

  const hiddenDefault = appState.customData.hidden_chars || [];
  const hiddenCustom = Object.keys(appState.customData.deleted_custom_data || {});
  
  const allHidden = [...new Set([...hiddenDefault, ...hiddenCustom])];

  if (allHidden.length === 0) {
    hiddenSection.style.display = 'none';
    return;
  }

  hiddenSection.style.display = 'block';
  hiddenList.innerHTML = '';

  allHidden.sort().forEach(charName => {
    const isCustom = hiddenCustom.includes(charName);
    const item = document.createElement('div');
    item.className = 'hidden-tag-item';
    item.innerHTML = `
      <div style="display:flex; flex-direction:column;">
        <span style="font-weight:600;">${charName}</span>
        <small style="font-size:0.7rem; color:var(--muted);">${isCustom ? 'Customizado' : 'Padrão'}</small>
      </div>
      <button onclick="restoreHiddenChar('${charName}')" class="restore-btn" title="Restaurar">
        <img src="../assets/plus.svg" style="width:14px;height:14px;filter:invert(100%);">
      </button>
    `;
    hiddenList.appendChild(item);
  });

  const btnRestoreAll = document.getElementById('btn-restore-all-hidden');
  if (btnRestoreAll) {
    btnRestoreAll.onclick = restoreAllHiddenTags;
  }

  const btnEmptyTrash = document.getElementById('btn-empty-trash');
  if (btnEmptyTrash) {
    btnEmptyTrash.onclick = emptyTrash;
  }
}

window.cloneCharacter = function(charName) {
  document.querySelectorAll('.context-menu').forEach(m => m.remove());
  
  const hashtags = getHashtagsForChar(charName) || '';
  const gameCode = getGameFromHashtags(charName, hashtags);

  document.getElementById('new-char-name').value = `${charName} (Copy)`;
  document.getElementById('new-char-hashtags').value = hashtags;
  document.getElementById('new-char-game').value = gameCode;
  
  showModal('add-tag-modal');
};

async function emptyTrash() {
  const ok = await confirmDialog({
    title: 'Esvaziar Lixeira',
    message: 'Isso apagará permanentemente todos os itens na lixeira. Esta ação não pode ser desfeita!',
    confirmText: 'Apagar Tudo',
    cancelText: 'Cancelar',
    variant: 'danger',
  });
  if (!ok) return;

  appState.customData.hidden_chars = [];
  appState.customData.deleted_custom_data = {};
  
  await window.electronAPI.saveCustomData(appState.customData);
  updateHiddenTagsUI();
  showSnackbar('Lixeira esvaziada permanentemente!', 'success');
}

window.restoreHiddenChar = async function(charName) {
  let restored = false;

  // Tenta restaurar se for padrão
  if (appState.customData.hidden_chars) {
    const originalLen = appState.customData.hidden_chars.length;
    appState.customData.hidden_chars = appState.customData.hidden_chars.filter(c => c !== charName);
    if (appState.customData.hidden_chars.length !== originalLen) restored = true;
  }

  // Tenta restaurar se for customizado
  if (appState.customData.deleted_custom_data && appState.customData.deleted_custom_data[charName]) {
    const { hashtags, gameCode } = appState.customData.deleted_custom_data[charName];
    
    if (!appState.customData.games[gameCode]) {
      appState.customData.games[gameCode] = { characters: {}, order: [] };
    }
    appState.customData.games[gameCode].characters[charName] = hashtags;
    
    delete appState.customData.deleted_custom_data[charName];
    restored = true;
  }
  
  if (restored) {
    await window.electronAPI.saveCustomData(appState.customData);
    organizeGames();
    updateHiddenTagsUI();
    renderGameTabs();
    renderCharacters();
    showSnackbar(`${charName} restaurado!`, 'success');
  }
};

async function restoreAllHiddenTags() {
  const ok = await confirmDialog({
    title: 'Restaurar tudo',
    message: 'Deseja restaurar todas as tags (padrões e customizadas) da lixeira?',
    confirmText: 'Restaurar Tudo',
    cancelText: 'Cancelar',
    variant: 'primary',
  });
  if (!ok) return;

  // Restaurar padrões
  appState.customData.hidden_chars = [];

  // Restaurar customizadas
  if (appState.customData.deleted_custom_data) {
    Object.entries(appState.customData.deleted_custom_data).forEach(([charName, data]) => {
      const { hashtags, gameCode } = data;
      if (!appState.customData.games[gameCode]) {
        appState.customData.games[gameCode] = { characters: {}, order: [] };
      }
      appState.customData.games[gameCode].characters[charName] = hashtags;
    });
    appState.customData.deleted_custom_data = {};
  }
  
  await window.electronAPI.saveCustomData(appState.customData);
  organizeGames();
  updateHiddenTagsUI();
  renderGameTabs();
  renderCharacters();
  showSnackbar('Lixeira restaurada com sucesso!', 'success');
}
