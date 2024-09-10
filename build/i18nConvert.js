"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
// convert i18n/lang/translations.json to i18n/lang.json
function convert(rootDir) {
    if ((0, node_fs_1.existsSync)((0, node_path_1.join)(rootDir, "i18n"))) {
        rootDir = (0, node_path_1.join)(rootDir, "i18n");
    }
    else if ((0, node_fs_1.existsSync)((0, node_path_1.join)(rootDir, "lib", "i18n"))) {
        rootDir = (0, node_path_1.join)(rootDir, "lib", "i18n");
    }
    else if ((0, node_fs_1.existsSync)((0, node_path_1.join)(rootDir, "admin", "i18n"))) {
        rootDir = (0, node_path_1.join)(rootDir, "admin", "i18n");
    }
    else if (rootDir.endsWith("i18n")) {
        // already the correct directory
    }
    const langs = (0, node_fs_1.readdirSync)(rootDir);
    for (const lang of langs) {
        if ((lang.match(/^[a-z]{2}$/) || lang === "zh-cn") &&
            (0, node_fs_1.existsSync)((0, node_path_1.join)(rootDir, lang, "translations.json"))) {
            (0, node_fs_1.renameSync)((0, node_path_1.join)(rootDir, lang, "translations.json"), (0, node_path_1.join)(rootDir, `${lang}.json`));
            (0, node_fs_1.unlinkSync)((0, node_path_1.join)(rootDir, lang));
        }
    }
}
if (process.argv.length < 3) {
    console.warn("Usage: node i18nConvert <path>");
    convert(".");
}
else {
    convert(process.argv[2]);
}
//# sourceMappingURL=i18nConvert.js.map