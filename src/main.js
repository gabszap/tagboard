const { app, BrowserWindow, ipcMain, dialog, clipboard, shell, net } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const fsNative = require('fs');
const os = require('os');

if (process.env.NODE_ENV === 'development') {
  const isWindows = process.platform === 'win32';
  const electronPath = isWindows
    ? path.join(__dirname, '..', 'node_modules', 'electron', 'dist', 'electron.exe')
    : path.join(__dirname, '..', 'node_modules', '.bin', 'electron');

  require('electron-reload')([__dirname, path.join(__dirname, '..', 'assets')], {
    electron: electronPath,
    hardResetMethod: 'exit'
  });
}

const DATA_DIR = path.join(os.homedir(), 'tagboard');
const CUSTOM_DATA_FILE = path.join(DATA_DIR, 'custom_data.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const USAGE_STATS_FILE = path.join(DATA_DIR, 'usage_stats.json');
const CACHE_DIR = path.join(DATA_DIR, 'cache');

let mainWindow;

const iconDownloadInflight = new Map();

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.mkdir(CACHE_DIR, { recursive: true });
  } catch (err) {
    console.error('Error creating data directory:', err);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    resizable: true,
    frame: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '..', 'assets', 'icon.ico'),
    show: false,
    backgroundColor: '#1e1e2e'
  });

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') {
      return;
    }

    const isF12 = input.key === 'F12';
    const isDevToolsCombo =
      input.key?.toLowerCase() === 'i' &&
      input.control && input.shift;

    if (!isF12 && !isDevToolsCombo) {
      return;
    }

    event.preventDefault();

    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (!focusedWindow || focusedWindow.isDestroyed()) {
      return;
    }

    focusedWindow.webContents.toggleDevTools();
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.removeMenu();

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  await ensureDataDir();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  app.quit();
});

ipcMain.handle('window-minimize', async () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window-maximize', async () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('window-close', async () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('set-always-on-top', async (event, enabled) => {
  if (mainWindow) {
    mainWindow.setAlwaysOnTop(enabled);
    return { success: true };
  }
  return { success: false, error: 'Window not found' };
});

ipcMain.handle('set-window-size', async (event, width, height) => {
  if (mainWindow) {
    mainWindow.setSize(width, height);
    return { success: true };
  }
  return { success: false, error: 'Window not found' };
});

ipcMain.handle('load-hashtags', async () => {
  try {
    const data = require('./data/hashtags.js');
    return { success: true, data: data.HASHTAGS };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('load-chars-data', async () => {
  try {
    const candidates = [
      // Prefer folder at app root
      path.join(__dirname, '..', 'Hoyo pfps', 'chars.json'),
      // Legacy location (backward compatibility)
      path.join(__dirname, '..', '..', 'Hoyo pfps', 'chars.json')
    ];

    let data = null;
    for (const p of candidates) {
      try {
        data = await fs.readFile(p, 'utf-8');
        break;
      } catch {
        // continue
      }
    }

    if (!data) {
      return { success: true, data: {} };
    }

    return { success: true, data: JSON.parse(data) };
  } catch (err) {
    if (err.code === 'ENOENT') {
      return { success: true, data: {} };
    }
    return { success: false, error: err.message };
  }
});

ipcMain.handle('load-custom-data', async () => {
  try {
    const data = await fs.readFile(CUSTOM_DATA_FILE, 'utf-8');
    return { success: true, data: JSON.parse(data) };
  } catch (err) {
    if (err.code === 'ENOENT') {
      return {
        success: true,
        data: {
          games: {},
          category_order: ['HSR', 'GI', 'HI3', 'ZZZ', 'WW', 'BA', 'GF2']
        }
      };
    }
    return { success: false, error: err.message };
  }
});

ipcMain.handle('save-custom-data', async (event, data) => {
  try {
    await fs.writeFile(CUSTOM_DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('load-config', async () => {
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf-8');
    return { success: true, data: JSON.parse(data) };
  } catch (err) {
    if (err.code === 'ENOENT') {
      return {
        success: true,
        data: {
          theme_mode: 'dark',
          layout_mode: 'columns',
          sort_mode: 'alphabetical',
          advanced_mode: false,
          acrylic_mode: false,
          acrylic_opacity: 0.7,
          compact_mode: false
        }
      };
    }
    return { success: false, error: err.message };
  }
});

ipcMain.handle('save-config', async (event, data) => {
  try {
    await fs.writeFile(CONFIG_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('load-usage-stats', async () => {
  try {
    const data = await fs.readFile(USAGE_STATS_FILE, 'utf-8');
    return { success: true, data: JSON.parse(data) };
  } catch (err) {
    if (err.code === 'ENOENT') {
      return {
        success: true,
        data: {
          total_clicks: 0,
          by_game: {},
          by_char: {}
        }
      };
    }
    return { success: false, error: err.message };
  }
});

ipcMain.handle('save-usage-stats', async (event, data) => {
  try {
    await fs.writeFile(USAGE_STATS_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('copy-to-clipboard', async (event, text) => {
  try {
    clipboard.writeText(text);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('show-save-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

ipcMain.handle('show-open-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});

ipcMain.handle('download-icon', async (event, url, filename) => {
  let cachePath = null;
  try {
    if (!url || !filename) return { success: false, error: 'Invalid parameters' };

    await fs.mkdir(CACHE_DIR, { recursive: true });
    cachePath = path.join(CACHE_DIR, filename);

    try {
      await fs.access(cachePath);
      return { success: true, path: cachePath, cached: true };
    } catch {
      // continue
    }

    if (iconDownloadInflight.has(filename)) {
      return await iconDownloadInflight.get(filename);
    }

    const job = (async () => {
      try {
        // May have been created while waiting
        try {
          await fs.access(cachePath);
          return { success: true, path: cachePath, cached: true };
        } catch {
          // continue
        }

        await downloadUrlToFile(url, cachePath);
        return { success: true, path: cachePath };
      } catch (err) {
        try {
          fsNative.unlink(cachePath, () => { });
        } catch { }
        return { success: false, error: err.message };
      } finally {
        iconDownloadInflight.delete(filename);
      }
    })();

    iconDownloadInflight.set(filename, job);
    return await job;
  } catch (err) {
    try {
      if (cachePath) fsNative.unlink(cachePath, () => { });
    } catch { }
    return { success: false, error: err.message };
  }
});

function downloadUrlToFile(url, destPath, redirectsLeft = 2) {
  return new Promise((resolve, reject) => {
    let done = false;

    const finish = (err) => {
      if (done) return;
      done = true;
      if (err) reject(err);
      else resolve();
    };

    let request;
    try {
      request = net.request({ method: 'GET', url: String(url) });
      request.setHeader('User-Agent', 'Tagboard');
      request.setHeader('Accept', '*/*');
    } catch (err) {
      finish(err);
      return;
    }

    const timer = setTimeout(() => {
      try {
        request.abort();
      } catch {
        // ignore
      }
      finish(new Error('Timeout'));
    }, 15000);

    request.on('response', (response) => {
      clearTimeout(timer);

      const status = response.statusCode || 0;
      let location = response.headers?.location;
      if (Array.isArray(location)) location = location[0];

      if (status >= 300 && status < 400 && location && redirectsLeft > 0) {
        response.resume();
        const nextUrl = new URL(location, url).toString();
        downloadUrlToFile(nextUrl, destPath, redirectsLeft - 1)
          .then(() => finish())
          .catch(finish);
        return;
      }

      if (status !== 200) {
        response.resume();
        finish(new Error(`HTTP ${status}`));
        return;
      }

      let file;
      try {
        file = fsNative.createWriteStream(destPath);
      } catch (err) {
        response.resume();
        finish(err);
        return;
      }

      const cleanup = (err) => {
        try {
          file.close(() => {
            try {
              fsNative.unlink(destPath, () => { });
            } catch { }
            finish(err);
          });
        } catch {
          try {
            fsNative.unlink(destPath, () => { });
          } catch { }
          finish(err);
        }
      };

      file.on('error', cleanup);
      response.on('error', cleanup);
      response.on('aborted', () => cleanup(new Error('Response aborted')));

      file.on('finish', () => {
        file.close(() => finish());
      });

      response.pipe(file);
    });

    request.on('error', (err) => {
      clearTimeout(timer);
      try {
        fsNative.unlink(destPath, () => { });
      } catch { }
      finish(err);
    });

    request.end();
  });
}

ipcMain.handle('get-icon-cache-dir', async () => {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    return { success: true, path: CACHE_DIR };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('open-icon-cache-dir', async () => {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    const result = await shell.openPath(CACHE_DIR);
    if (result) return { success: false, error: result };
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('clear-icon-cache', async () => {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    const entries = await fs.readdir(CACHE_DIR, { withFileTypes: true });
    let deleted = 0;
    const errors = [];

    for (const entry of entries) {
      const p = path.join(CACHE_DIR, entry.name);
      try {
        if (entry.isDirectory()) {
          await fs.rm(p, { recursive: true, force: true });
        } else {
          await fs.unlink(p);
        }
        deleted++;
      } catch (err) {
        errors.push({ name: entry.name, error: err.message });
      }
    }

    return { success: true, deleted, errors };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('write-file', async (event, filePath, content) => {
  try {
    await fs.writeFile(filePath, content, 'utf-8');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return { success: true, content };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('export-backup', async (event, filePath) => {
  try {
    const AdmZip = require('adm-zip');
    const zip = new AdmZip();

    const files = ['custom_data.json', 'config.json', 'usage_stats.json'];
    for (const file of files) {
      const filePath_full = path.join(DATA_DIR, file);
      try {
        await fs.access(filePath_full);
        zip.addLocalFile(filePath_full);
      } catch { }
    }

    zip.writeZip(filePath);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('import-backup', async (event, filePath) => {
  try {
    const AdmZip = require('adm-zip');
    const zip = new AdmZip(filePath);

    const validFiles = ['custom_data.json', 'config.json', 'usage_stats.json'];
    const extracted = [];

    zip.getEntries().forEach((entry) => {
      if (validFiles.includes(entry.entryName)) {
        zip.extractEntryTo(entry, DATA_DIR, false, true);
        extracted.push(entry.entryName);
      }
    });

    return { success: true, extracted };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-cache-path', async (event, filename) => {
  const cachePath = path.join(CACHE_DIR, filename);
  try {
    await fs.access(cachePath);
    return { success: true, path: cachePath };
  } catch {
    return { success: false };
  }
});

ipcMain.handle('open-external', async (event, url) => {
  try {
    await shell.openExternal(url);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-app-version', async () => {
  try {
    const packageJson = require('../package.json');
    return { success: true, version: packageJson.version };
  } catch (err) {
    return { success: true, version: '2.0.0' };
  }
});

ipcMain.handle('reorder-characters', async (event, gameCode, newOrder) => {
  try {
    const data = await fs.readFile(CUSTOM_DATA_FILE, 'utf-8');
    const customData = JSON.parse(data);

    if (!customData.games[gameCode]) {
      customData.games[gameCode] = { characters: {}, order: [] };
    }

    customData.games[gameCode].order = newOrder;

    await fs.writeFile(CUSTOM_DATA_FILE, JSON.stringify(customData, null, 2), 'utf-8');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
