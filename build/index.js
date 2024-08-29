"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFoldersRecursive = deleteFoldersRecursive;
exports.readDirRecursive = readDirRecursive;
exports.collectFiles = collectFiles;
exports.copyFiles = copyFiles;
exports.npmInstall = npmInstall;
exports.buildCraco = buildCraco;
const node_fs_1 = require("node:fs");
const node_child_process_1 = require("node:child_process");
const node_path_1 = require("node:path");
function deleteFoldersRecursive(path, exceptions) {
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
function readDirRecursive(path, _list) {
    _list = _list || [];
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
    return _list;
}
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
function copyFiles(patterns, dest) {
    const files = collectFiles(patterns);
    for (let f = 0; f < files.length; f++) {
        const destName = `${dest}/${files[f].name}`;
        const folder = (0, node_path_1.dirname)(destName);
        if (!(0, node_fs_1.existsSync)(folder)) {
            (0, node_fs_1.mkdirSync)(folder, { recursive: true });
        }
        console.log(`Copy "${files[f].base}/${files[f].name}" to "${destName}"`);
        (0, node_fs_1.copyFileSync)(`${files[f].base}/${files[f].name}`, destName);
    }
}
function npmInstall(src) {
    if (src.endsWith('/')) {
        src = src.substring(0, src.length - 1);
    }
    return new Promise((resolve, reject) => {
        var _a, _b;
        // Install node modules
        const cwd = src.replace(/\\/g, '/');
        const cmd = `npm install -f`;
        console.log(`"${cmd} in ${cwd}`);
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
function buildCraco(rootDir, src) {
    if (src.endsWith('/')) {
        src = src.substring(0, src.length - 1);
    }
    if (rootDir.endsWith('/')) {
        rootDir = rootDir.substring(0, rootDir.length - 1);
    }
    const version = JSON.parse((0, node_fs_1.readFileSync)(`${rootDir}/package.json`).toString('utf8')).version;
    const data = JSON.parse((0, node_fs_1.readFileSync)(`${src}/package.json`).toString('utf8'));
    data.version = version;
    (0, node_fs_1.writeFileSync)(`${src}/package.json`, JSON.stringify(data, null, 4));
    return new Promise((resolve, reject) => {
        var _a, _b;
        const options = {
            stdio: 'pipe',
            cwd: src,
        };
        console.log(options.cwd);
        let script = `${src}/node_modules/@craco/craco/dist/bin/craco.js`;
        if (!(0, node_fs_1.existsSync)(script)) {
            script = `${rootDir}/node_modules/@craco/craco/dist/bin/craco.js`;
        }
        if (!(0, node_fs_1.existsSync)(script)) {
            console.error(`Cannot find execution file: ${script}`);
            reject(`Cannot find execution file: ${script}`);
        }
        else {
            const child = (0, node_child_process_1.fork)(script, ['build'], options);
            (_a = child === null || child === void 0 ? void 0 : child.stdout) === null || _a === void 0 ? void 0 : _a.on('data', data => console.log(data.toString()));
            (_b = child === null || child === void 0 ? void 0 : child.stderr) === null || _b === void 0 ? void 0 : _b.on('data', data => console.log(data.toString()));
            child.on('close', code => {
                console.log(`child process exited with code ${code}`);
                code ? reject(`Exit code: ${code}`) : resolve();
            });
        }
    });
}
//# sourceMappingURL=index.js.map