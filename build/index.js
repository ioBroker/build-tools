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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFoldersRecursive = deleteFoldersRecursive;
exports.copyFiles = copyFiles;
exports.npmInstall = npmInstall;
exports.buildCraco = buildCraco;
exports.patchHtmlFile = patchHtmlFile;
const node_fs_1 = __importStar(require("node:fs"));
const node_child_process_1 = require("node:child_process");
const node_path_1 = require("node:path");
// Delete all folders recursive (sync function)
function deleteFoldersRecursive(
/** Path to the folder */
path, 
/** List of exceptions */
exceptions) {
    if ((0, node_fs_1.existsSync)(path)) {
        const files = (0, node_fs_1.readdirSync)(path);
        for (const file of files) {
            const curPath = `${path}/${file}`;
            if (exceptions === null || exceptions === void 0 ? void 0 : exceptions.find(e => curPath.endsWith(e))) {
                continue;
            }
            const stat = (0, node_fs_1.statSync)(curPath);
            if (stat.isDirectory()) {
                deleteFoldersRecursive(curPath);
                (0, node_fs_1.rmdirSync)(curPath);
            }
            else {
                (0, node_fs_1.unlinkSync)(curPath);
            }
        }
    }
}
// Read all files in directory and subdirectories as one list (sync function)
function readDirRecursive(path, _list) {
    _list = _list || [];
    if ((0, node_fs_1.existsSync)(path)) {
        const files = (0, node_fs_1.readdirSync)(path);
        files.forEach((file) => {
            const fullPath = `${path}/${file}`;
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
        const files = readDirRecursive(folder);
        // convert pattern "src-admin/build/static/js/*.js" to regex "src-admin/build/static/js/[^\.]+\.js"
        if (_patterns[i].endsWith('*')) {
            _patterns[i] = _patterns[i].replace(/\./g, '\\.').replace(/\*/g, '[^\/]+');
        }
        else {
            _patterns[i] = `${_patterns[i].replace(/\./g, '\\.').replace(/\*/g, '[^\/]+')}$`;
        }
        _patterns[i] = `^${_patterns[i]}`;
        const regex = new RegExp(_patterns[i]);
        for (let f = 0; f < files.length; f++) {
            if (regex.test(files[f])) {
                if (add) {
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
    }
    return result.map(it => ({ name: it.name.substring(it.base.length + 1), base: it.base }));
}
// Copy files by pattern to destination (sync function)
function copyFiles(patterns, dest, options) {
    const files = collectFiles(patterns);
    for (let f = 0; f < files.length; f++) {
        const destName = `${dest}/${files[f].name}`;
        const folder = (0, node_path_1.dirname)(destName);
        if (!(0, node_fs_1.existsSync)(folder)) {
            (0, node_fs_1.mkdirSync)(folder, { recursive: true });
        }
        console.log(`Copy "${files[f].base}/${files[f].name}" to "${destName}"`);
        if (options) {
            let data = (0, node_fs_1.readFileSync)(`${files[f].base}/${files[f].name}`).toString('utf8');
            if (options.replace) {
                for (let r = 0; r < options.replace.length; r++) {
                    data = data.replace(options.replace[r].find, options.replace[r].text);
                }
            }
            if (options.process) {
                data = options.process(data);
            }
            (0, node_fs_1.writeFileSync)(destName, data);
        }
        else {
            (0, node_fs_1.copyFileSync)(`${files[f].base}/${files[f].name}`, destName);
        }
    }
}
// run npm install in directory (async function)
function npmInstall(src, options) {
    if (src.endsWith('/')) {
        src = src.substring(0, src.length - 1);
    }
    return new Promise((resolve, reject) => {
        var _a, _b;
        // Install node modules
        const cwd = src.replace(/\\/g, '/');
        const cmd = `npm install${(options === null || options === void 0 ? void 0 : options.force) !== false ? ' --force' : ''}`;
        // System call used for update of js-controller itself,
        // because during an installation the npm packet will be deleted too, but some files must be loaded even during the install process.
        const child = (0, node_child_process_1.exec)(cmd, { cwd });
        (_a = child === null || child === void 0 ? void 0 : child.stderr) === null || _a === void 0 ? void 0 : _a.pipe(process.stderr);
        (_b = child === null || child === void 0 ? void 0 : child.stdout) === null || _b === void 0 ? void 0 : _b.pipe(process.stdout);
        child.on('exit', (code /* , signal */) => {
            // code 1 is a strange error that cannot be explained. Everything is installed but error :(
            if (code && code !== 1) {
                reject(`Cannot install: ${code}`);
            }
            else {
                console.log(`"${cmd} in ${cwd} finished.`);
                // command succeeded
                resolve();
            }
        });
    });
}
function buildCraco(
/** React directory to build */
src, options) {
    if (src.endsWith('/')) {
        src = src.substring(0, src.length - 1);
    }
    let rootDir;
    // Copy version number from root directory to src directory
    if (options === null || options === void 0 ? void 0 : options.rootDir) {
        rootDir = options.rootDir;
        if (rootDir.endsWith('/')) {
            rootDir = rootDir.substring(0, options.rootDir.length - 1);
        }
        const version = JSON.parse((0, node_fs_1.readFileSync)(`${rootDir}/package.json`).toString('utf8')).version;
        const data = JSON.parse((0, node_fs_1.readFileSync)(`${src}/package.json`).toString('utf8'));
        data.version = version;
        (0, node_fs_1.writeFileSync)(`${src}/package.json`, JSON.stringify(data, null, 4));
    }
    return new Promise((resolve, reject) => {
        var _a, _b;
        const cpOptions = {
            stdio: 'pipe',
            cwd: src,
        };
        let script = `${src}/node_modules/@craco/craco/dist/bin/craco.js`;
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
        if (!(0, node_fs_1.existsSync)(script)) {
            console.error(`Cannot find execution file: ${script}`);
            reject(`Cannot find execution file: ${script}`);
        }
        else {
            let child;
            if ((options === null || options === void 0 ? void 0 : options.ramSize) || (options === null || options === void 0 ? void 0 : options.exec)) {
                const cmd = `node ${script}${options.ramSize ? ` --max-old-space-size=${options.ramSize}` : ''} build`;
                child = (0, node_child_process_1.exec)(cmd, cpOptions);
            }
            else {
                child = (0, node_child_process_1.fork)(script, ['build'], cpOptions);
            }
            (_a = child === null || child === void 0 ? void 0 : child.stdout) === null || _a === void 0 ? void 0 : _a.on('data', data => console.log(data.toString()));
            (_b = child === null || child === void 0 ? void 0 : child.stderr) === null || _b === void 0 ? void 0 : _b.on('data', data => console.log(data.toString()));
            child.on('close', code => {
                console.log(`child process exited with code ${code}`);
                code ? reject(`Exit code: ${code}`) : resolve();
            });
        }
    });
}
function _patchHtmlFile(fileName) {
    let changed = false;
    if (node_fs_1.default.existsSync(fileName)) {
        let code = node_fs_1.default.readFileSync(fileName).toString('utf8');
        // replace code
        if (code.match(/<script>const script=document[^<]+<\/script>/)) {
            code = code.replace(/<script>const script=document[^<]+<\/script>/, `<script type="text/javascript" onerror="setTimeout(function(){window.location.reload()}, 5000)" src="./lib/js/socket.io.js"></script>`);
            changed = true;
        }
        if (code.match(/<script>var script=document[^<]+<\/script>/)) {
            code = code.replace(/<script>var script=document[^<]+<\/script>/, `<script type="text/javascript" onerror="setTimeout(function(){window.location.reload()}, 5000)" src="./lib/js/socket.io.js"></script>`);
            changed = true;
        }
        if (changed) {
            node_fs_1.default.writeFileSync(fileName, code);
        }
    }
    return changed;
}
function patchHtmlFile(fileName) {
    return new Promise(resolve => {
        if (node_fs_1.default.existsSync(fileName)) {
            resolve(_patchHtmlFile(fileName));
        }
        else {
            // wait till finished
            setTimeout(() => resolve(_patchHtmlFile(fileName)), 2000);
        }
    });
}
//# sourceMappingURL=index.js.map