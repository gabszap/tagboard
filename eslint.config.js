const globals = require("globals");
const js = require("@eslint/js");

module.exports = [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "commonjs",
            globals: {
                ...globals.browser,
                ...globals.node,
                ...globals.commonjs,
                process: "readonly",
                __dirname: "readonly",
                require: "readonly",
                module: "readonly",
                window: "readonly",
                document: "readonly",
                appState: "writable",
                DEFAULT_GAMES: "readonly",
                elements: "readonly",
                ipcMain: "readonly",
                app: "readonly",
                BrowserWindow: "readonly",
                dialog: "readonly",
                clipboard: "readonly",
                shell: "readonly",
                net: "readonly",
                path: "readonly",
                fs: "readonly",
                os: "readonly"
            }
        },
        rules: {
            "no-unused-vars": "warn",
            "no-undef": "warn",
            "no-empty": "warn"
        }
    }
];
