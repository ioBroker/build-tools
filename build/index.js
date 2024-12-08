"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFoldersRecursive = deleteFoldersRecursive;
exports.copyFolderRecursiveSync = copyFolderRecursiveSync;
exports.readDirRecursive = readDirRecursive;
exports.collectFiles = collectFiles;
exports.copyFiles = copyFiles;
exports.npmInstall = npmInstall;
exports.tsc = tsc;
exports.buildReact = buildReact;
exports.buildCraco = buildCraco;
exports.ignoreWidgetFiles = ignoreWidgetFiles;
exports.copyWidgetsFiles = copyWidgetsFiles;
exports.patchHtmlFile = patchHtmlFile;
const node_fs_1 = __importStar(require("node:fs"));
const glob_1 = require("glob");
const node_child_process_1 = require("node:child_process");
const node_path_1 = require("node:path");
/**
 * Delete all folders recursive (sync function)
 */
function deleteFoldersRecursive(
/** Path to the folder */
path, 
/** List of exceptions */
exceptions) {
    if ((0, node_fs_1.existsSync)(path)) {
        const files = (0, node_fs_1.readdirSync)(path);
        for (const file of files) {
            const curPath = (0, node_path_1.join)(path, file);
            if (exceptions === null || exceptions === void 0 ? void 0 : exceptions.find(e => curPath.endsWith(e))) {
                continue;
            }
            const stat = (0, node_fs_1.statSync)(curPath);
            if (stat.isDirectory()) {
                deleteFoldersRecursive(curPath);
                try {
                    (0, node_fs_1.rmdirSync)(curPath);
                }
                catch (e) {
                    console.warn(`[${new Date().toISOString()}] Cannot delete "${curPath}: ${e}`);
                }
            }
            else {
                try {
                    (0, node_fs_1.unlinkSync)(curPath);
                }
                catch (e) {
                    console.warn(`[${new Date().toISOString()}] Cannot delete "${curPath}: ${e}`);
                }
            }
        }
    }
}
/**
 * Copies folder recursive (sync function)
 */
function copyFolderRecursiveSync(
/** Source folder */
src, 
/** Destination folder */
dest, 
/** List of files to exclude */
exclude) {
    const stats = (0, node_fs_1.existsSync)(src) ? (0, node_fs_1.statSync)(src) : null;
    if (stats === null || stats === void 0 ? void 0 : stats.isDirectory()) {
        !node_fs_1.default.existsSync(dest) && node_fs_1.default.mkdirSync(dest);
        node_fs_1.default.readdirSync(src).forEach(childItemName => {
            copyFolderRecursiveSync((0, node_path_1.join)(src, childItemName), (0, node_path_1.join)(dest, childItemName));
        });
    }
    else if (!exclude || !exclude.find(ext => src.endsWith(ext))) {
        (0, node_fs_1.copyFileSync)(src, dest);
    }
}
// Read all files in directory and subdirectories as one list (sync function)
function readDirRecursive(path, _list) {
    _list = _list || [];
    if ((0, node_fs_1.existsSync)(path)) {
        const files = (0, node_fs_1.readdirSync)(path);
        files.forEach((file) => {
            const fullPath = (0, node_path_1.join)(path, file).replace(/\\/g, '/');
            if ((0, node_fs_1.statSync)(fullPath).isDirectory()) {
                readDirRecursive(fullPath, _list);
            }
            else {
                _list.push(fullPath);
            }
        });
    }
    return _list;
}
// Collect files by mask (sync function)
function collectFiles(patterns) {
    const _patterns = typeof patterns === 'string' ? [patterns] : patterns;
    const result = [];
    for (let i = 0; i < _patterns.length; i++) {
        let add = true;
        if (_patterns[i].startsWith('!')) {
            _patterns[i] = _patterns[i].substring(1);
            add = false;
        }
        _patterns[i] = _patterns[i].replace(/\\/g, '/');
        let folder = _patterns[i].split('*')[0];
        if (folder[folder.length - 1] === '/') {
            folder = folder.substring(0, folder.length - 1);
        }
        else {
            const folderParts = folder.split('/');
            folderParts.pop();
            folder = folderParts.join('/');
        }
        const files = (0, glob_1.globSync)(_patterns[i]);
        for (let f = 0; f < files.length; f++) {
            files[f] = files[f].replace(/\\/g, '/');
            if (folder && files[f].startsWith(folder)) {
                files[f] = files[f].substring(folder.length + 1);
            }
            if (add) {
                // ignore folders
                const isDirectory = folder
                    ? (0, node_fs_1.statSync)((0, node_path_1.join)(folder, files[f])).isDirectory()
                    : (0, node_fs_1.statSync)(files[f]).isDirectory();
                if (isDirectory) {
                    continue;
                }
                result.push({ name: files[f], base: folder });
            }
            else {
                const pos = result.findIndex(it => it.name === files[f]);
                if (pos !== -1) {
                    result.splice(pos, 1);
                }
            }
        }
    }
    return result;
}
// Copy files by pattern to destination (sync function)
function copyFiles(patterns, dest, options) {
    const files = collectFiles(patterns);
    for (let f = 0; f < files.length; f++) {
        const destName = (0, node_path_1.join)(dest, files[f].name);
        const folder = (0, node_path_1.dirname)(destName);
        if (!(0, node_fs_1.existsSync)(folder)) {
            (0, node_fs_1.mkdirSync)(folder, { recursive: true });
        }
        console.log(`[${new Date().toISOString()}] Copy "${files[f].base}/${files[f].name}" to "${destName}"`);
        if (options) {
            let data = (0, node_fs_1.readFileSync)(files[f].base ? `${files[f].base}/${files[f].name}` : files[f].name);
            if (options.replace) {
                data = data.toString('utf8');
                for (let r = 0; r < options.replace.length; r++) {
                    data = data.replace(options.replace[r].find, options.replace[r].text);
                }
            }
            if (options.process) {
                const newData = options.process(data, files[f].base ? `${files[f].base}/${files[f].name}` : files[f].name);
                // if null, skip this fila
                if (newData === null || newData === false) {
                    continue;
                }
                else if (newData !== undefined) {
                    data = newData;
                }
            }
            (0, node_fs_1.writeFileSync)(destName, data);
        }
        else {
            (0, node_fs_1.copyFileSync)(files[f].base ? `${files[f].base}/${files[f].name}` : files[f].name, destName);
        }
    }
}
// run npm install in directory (async function)
function npmInstall(
/** Path to the folder where npm must be executed */
src, 
/** Options */
options) {
    if (src.endsWith('/')) {
        src = src.substring(0, src.length - 1);
    }
    return new Promise((resolve, reject) => {
        var _a, _b;
        // Install node modules
        const cwd = src.replace(/\\/g, '/');
        const start = Date.now();
        const cmd = `npm install${(options === null || options === void 0 ? void 0 : options.force) !== false ? ' --force' : ''}`;
        // System call used for update of js-controller itself,
        // because during an installation the npm packet will be deleted too, but some files must be loaded even during the install process.
        console.log(`[${new Date().toISOString()}] executing: "${cmd}" in "${cwd}"`);
        const child = (0, node_child_process_1.exec)(cmd, { cwd });
        (_a = child === null || child === void 0 ? void 0 : child.stderr) === null || _a === void 0 ? void 0 : _a.pipe(process.stderr);
        (_b = child === null || child === void 0 ? void 0 : child.stdout) === null || _b === void 0 ? void 0 : _b.pipe(process.stdout);
        child.on('exit', (code /* , signal */) => {
            // code 1 is a strange error that cannot be explained. Everything is installed but error :(
            if (code && code !== 1) {
                reject(new Error(`Cannot install: ${code}`));
            }
            else {
                console.log(`[${new Date().toISOString()}] "${cmd}" in "${cwd}" finished in ${Date.now() - start}ms.`);
                // command succeeded
                resolve();
            }
        });
    });
}
function tsc(
/** React directory to build */
src, options) {
    if (src.endsWith('/')) {
        src = src.substring(0, src.length - 1);
    }
    let rootDir;
    if (options === null || options === void 0 ? void 0 : options.rootDir) {
        rootDir = options.rootDir;
        if (rootDir.endsWith('/')) {
            rootDir = rootDir.substring(0, options.rootDir.length - 1);
        }
    }
    return new Promise((resolve, reject) => {
        var _a, _b;
        const cpOptions = {
            stdio: 'pipe',
            cwd: src,
        };
        const start = Date.now();
        let script;
        script = `${src}/node_modules/typescript/bin/tsc`;
        if (rootDir && !(0, node_fs_1.existsSync)(script)) {
            script = `${rootDir}/node_modules/typescript/bin/tsc`;
            if (!(0, node_fs_1.existsSync)(script)) {
                // admin could have another structure
                script = `${rootDir}/../node_modules/typescript/bin/tsc`;
                if (!(0, node_fs_1.existsSync)(script)) {
                    script = `${rootDir}/../../node_modules/typescript/bin/tsc`;
                }
            }
        }
        if (!(0, node_fs_1.existsSync)(script)) {
            console.error(`[${new Date().toISOString()}] Cannot find execution file: ${script}`);
            reject(new Error(`Cannot find execution file: ${script}`));
        }
        else {
            const child = (0, node_child_process_1.fork)(script, [], cpOptions);
            (_a = child === null || child === void 0 ? void 0 : child.stdout) === null || _a === void 0 ? void 0 : _a.on('data', data => console.log(`[${new Date().toISOString()}] ${data.toString()}`));
            (_b = child === null || child === void 0 ? void 0 : child.stderr) === null || _b === void 0 ? void 0 : _b.on('data', data => console.log(`[${new Date().toISOString()}] ${data.toString()}`));
            child.on('close', code => {
                console.log(`[${new Date().toISOString()}] child process exited with code ${code} after ${Date.now() - start}ms.`);
                code ? reject(new Error(`Exit code: ${code}`)) : resolve();
            });
        }
    });
}
function buildReact(
/** React directory to build */
src, 
/** Options */
options) {
    if (src.endsWith('/')) {
        src = src.substring(0, src.length - 1);
    }
    let rootDir;
    const start = Date.now();
    // Copy version number from root directory to src directory
    if (options === null || options === void 0 ? void 0 : options.rootDir) {
        rootDir = options.rootDir;
        if (rootDir.endsWith('/')) {
            rootDir = rootDir.substring(0, options.rootDir.length - 1);
        }
        const version = JSON.parse((0, node_fs_1.readFileSync)(`${rootDir}/package.json`).toString('utf8')).version;
        const data = JSON.parse((0, node_fs_1.readFileSync)(`${src}/package.json`).toString('utf8'));
        if (data.version !== version) {
            console.log(`[${new Date().toISOString()}] updated version in "${src}/package.json to "${version}"`);
            data.version = version;
            (0, node_fs_1.writeFileSync)(`${src}/package.json`, JSON.stringify(data, null, 4));
        }
    }
    const reactPromise = new Promise((resolve, reject) => {
        var _a, _b, _c, _d;
        const cpOptions = {
            stdio: 'pipe',
            cwd: src,
        };
        // cpOptions.env = {
        //     DANGEROUSLY_DISABLE_HOST_CHECK: 'true',
        // };
        let script;
        if (options === null || options === void 0 ? void 0 : options.craco) {
            script = `${src}/node_modules/@craco/craco/dist/bin/craco.js`;
            if (rootDir && !(0, node_fs_1.existsSync)(script)) {
                script = `${rootDir}/node_modules/@craco/craco/dist/bin/craco.js`;
                if (!(0, node_fs_1.existsSync)(script)) {
                    // admin could have another structure
                    script = `${rootDir}/../node_modules/@craco/craco/dist/bin/craco.js`;
                    if (!(0, node_fs_1.existsSync)(script)) {
                        script = `${rootDir}/../../node_modules/@craco/craco/dist/bin/craco.js`;
                    }
                }
            }
        }
        else if (options === null || options === void 0 ? void 0 : options.vite) {
            script = `${src}/node_modules/vite/bin/vite.js`;
            if (rootDir && !(0, node_fs_1.existsSync)(script)) {
                script = `${rootDir}/node_modules/vite/bin/vite.js`;
                if (!(0, node_fs_1.existsSync)(script)) {
                    // admin could have another structure
                    script = `${rootDir}/../node_modules/vite/bin/vite.js`;
                    if (!(0, node_fs_1.existsSync)(script)) {
                        script = `${rootDir}/../../node_modules/vite/bin/vite.js`;
                    }
                }
            }
        }
        else {
            script = `${src}/node_modules/react-scripts/scripts/build.js`;
            if (rootDir && !(0, node_fs_1.existsSync)(script)) {
                script = `${rootDir}/node_modules/react-scripts/scripts/build.js`;
                if (!(0, node_fs_1.existsSync)(script)) {
                    // admin could have another structure
                    script = `${rootDir}/../node_modules/react-scripts/scripts/build.js`;
                    if (!(0, node_fs_1.existsSync)(script)) {
                        script = `${rootDir}/../../node_modules/react-scripts/scripts/build.js`;
                    }
                }
            }
        }
        if (!(0, node_fs_1.existsSync)(script)) {
            console.error(`[${new Date().toISOString()}] Cannot find execution file: ${script}`);
            reject(new Error(`Cannot find execution file: ${script}`));
        }
        else {
            cpOptions.cwd = src;
            let child;
            if ((options === null || options === void 0 ? void 0 : options.ramSize) || (options === null || options === void 0 ? void 0 : options.exec) || (options === null || options === void 0 ? void 0 : options.craco)) {
                delete cpOptions.stdio;
                const cmd = 'node';
                const args = [script, options.ramSize ? `--max-old-space-size=${options.ramSize}` : '', 'build'].filter(a => a);
                const child = (0, node_child_process_1.execFile)(cmd, args, cpOptions);
                console.log(`[${new Date().toISOString()}] Execute: "${cmd} ${args.join(' ')}" ${JSON.stringify(cpOptions)}`);
                (_a = child.stderr) === null || _a === void 0 ? void 0 : _a.pipe(process.stderr);
                (_b = child.stdout) === null || _b === void 0 ? void 0 : _b.pipe(process.stdout);
                child.on('exit', (code /* , signal */) => {
                    // code 1 is a strange error that cannot be explained. Everything is done but error :(
                    if (code) {
                        if (code === 1 && options.ignoreCode1) {
                            console.log(`"${cmd} in ${src} finished.`);
                            // command succeeded
                            resolve();
                        }
                        else {
                            if (options.ignoreErrors) {
                                reject(new Error(`Cannot build: ${code}`));
                            }
                            else {
                                console.error(`Cannot build: ${code}`);
                                process.exit(2);
                            }
                        }
                    }
                    else {
                        console.log(`"${cmd} in ${src} finished.`);
                        // command succeeded
                        resolve();
                    }
                });
            }
            else {
                console.log(`[${new Date().toISOString()}] fork: "${script} build" ${JSON.stringify(cpOptions)}`);
                child = (0, node_child_process_1.fork)(script, ['build'], cpOptions);
                (_c = child === null || child === void 0 ? void 0 : child.stdout) === null || _c === void 0 ? void 0 : _c.on('data', data => console.log(`[${new Date().toISOString()}] ${data.toString()}`));
                (_d = child === null || child === void 0 ? void 0 : child.stderr) === null || _d === void 0 ? void 0 : _d.on('data', data => console.log(`[${new Date().toISOString()}] ${data.toString()}`));
                child.on('close', code => {
                    console.log(`[${new Date().toISOString()}] child process exited with code ${code} after ${Date.now() - start}ms.`);
                    if (code) {
                        if (code === 1 && (options === null || options === void 0 ? void 0 : options.ignoreCode1)) {
                            resolve();
                        }
                        else {
                            if (options === null || options === void 0 ? void 0 : options.ignoreErrors) {
                                reject(new Error(`Cannot build: ${code}`));
                            }
                            else {
                                console.error(`Cannot build: ${code}`);
                                process.exit(2);
                            }
                        }
                    }
                    else {
                        // command succeeded
                        resolve();
                    }
                });
            }
        }
    });
    if (options === null || options === void 0 ? void 0 : options.tsc) {
        return tsc(src, options).then(() => reactPromise);
    }
    return reactPromise;
}
/** @deprecated use buildReact with the craco flag */
function buildCraco(
/** React directory to build */
src, 
/** Options */
options) {
    console.warn(`[${new Date().toISOString()}] buildCraco deprecated: Please use buildReact with craco option`);
    return buildReact(src, { craco: true, ...options });
}
function _patchHtmlFile(fileName, rootDir) {
    let changed = false;
    if (node_fs_1.default.existsSync(fileName)) {
        let code = node_fs_1.default.readFileSync(fileName).toString('utf8');
        // replace code
        if (code.match(/<script>\n?\s*const script\s?=\s?document[^<]+<\/script>/)) {
            code = code.replace(/<script>\n?\s*const script\s?=\s?document[^<]+<\/script>/, `<script type="text/javascript" onerror="setTimeout(function(){window.location.reload()}, 5000)" src="${rootDir || '.'}/lib/js/socket.io.js"></script>`);
            changed = true;
        }
        if (code.match(/<script>\n?\s*var script\s?=\s?document[^<]+<\/script>/)) {
            code = code.replace(/<script>\n?\s*var script\s?=\s?document[^<]+<\/script>/, `<script type="text/javascript" onerror="setTimeout(function(){window.location.reload()}, 5000)" src="${rootDir || '.'}/lib/js/socket.io.js"></script>`);
            changed = true;
        }
        if (changed) {
            node_fs_1.default.writeFileSync(fileName, code);
        }
    }
    return changed;
}
function ignoreWidgetFiles(src, doNotIgnoreMap) {
    src = src || './src-widgets/';
    if (!src.endsWith('/')) {
        src += '/';
    }
    let list = [
        `!${src}build/static/js/node_modules*.*`,
        `!${src}build/static/js/vendors-node_modules*.*`,
        `!${src}build/static/js/main*.*`,
        `!${src}build/static/js/src_bootstrap*.*`,
    ];
    if (!doNotIgnoreMap) {
        list = list.concat([`!${src}build/static/*.map`, `!${src}build/static/**/*.map`]);
    }
    return list;
}
function copyWidgetsFiles(src) {
    src = src || './src-widgets/';
    if (!src.endsWith('/')) {
        src += '/';
    }
    return [
        `${src}build/static/js/*fast-xml*.*`,
        `${src}build/static/js/*react-swipeable*.*`,
        `${src}build/static/js/*moment_*.*`,
        `${src}build/static/js/*react-beautiful-dnd*.*`,
        `${src}build/static/js/*vis-2-widgets-react-dev_index_jsx*.*`,
        `${src}build/static/js/*vis-2-widgets-react-dev_node_modules_babel_runtime_helpers*.*`,
        `${src}build/static/js/*runtime_helpers_asyncToGenerator*.*`,
        `${src}build/static/js/*modules_color*.*`,
        `${src}build/static/js/*echarts-for-react_lib_core_js-node_modules_echarts_core_js-*.chunk.*`,
        `${src}build/static/js/*echarts_lib*.*`,
        `${src}build/static/js/*vis-2-widgets-react-dev_node_modules_babel_runtime_helpers*.*`,
        `${src}build/static/js/*leaflet*.*`,
        `${src}build/static/js/*react-circular*.*`,
        `${src}build/static/js/*d3-array_src_index_js-node_modules_d3-collection_src_index_js-*.*`,
        `${src}build/static/js/*d3-dispatch_*.*`,
        `${src}build/static/js/*lodash_*.*`,
        `${src}build/static/js/*react-battery-gauge_dist_react-battery-gauge*.*`,
        `${src}build/static/js/*react-gauge-chart*.*`,
        `${src}build/static/js/*react-liquid-gauge*.*`,
        `${src}build/static/js/*helpers_esm_asyncToGener*.*`,
        `${src}build/static/js/*emotion_styled_dist*.*`,
        `${src}build/static/js/*mui_system_colorManipulator*.*`,
    ];
}
/**
 * Patch an HTML file (async function)
 *
 * @param fileName File name to be patched. Normally `${__dirname}/src-admin/build/index.html` or `${__dirname}/src/build/index.html`
 * @param rootDir for admin. Admin has '.' and all other adapters '../..'
 */
function patchHtmlFile(fileName, rootDir) {
    return new Promise(resolve => {
        if (node_fs_1.default.existsSync(fileName)) {
            resolve(_patchHtmlFile(fileName, rootDir));
        }
        else {
            // wait till finished
            setTimeout(() => resolve(_patchHtmlFile(fileName, rootDir)), 2000);
        }
    });
}
//# sourceMappingURL=index.js.map