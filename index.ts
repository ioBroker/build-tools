import {
    existsSync,
    readFileSync,
    writeFileSync,
    copyFileSync,
    readdirSync,
    statSync,
    rmdirSync,
    unlinkSync,
    mkdirSync,
} from 'node:fs';
import { exec, fork, type IOType } from 'node:child_process';
import { dirname } from 'node:path';

export function deleteFoldersRecursive(
    path: string,
    exceptions?: string[],
): void {
    if (existsSync(path)) {
        const files = readdirSync(path);
        for (const file of files) {
            const curPath = `${path}/${file}`;
            if (exceptions?.find(e => curPath.endsWith(e))) {
                continue;
            }

            const stat = statSync(curPath);
            if (stat.isDirectory()) {
                deleteFoldersRecursive(curPath);
                rmdirSync(curPath);
            } else {
                unlinkSync(curPath);
            }
        }
    }
}

export function readDirRecursive(path: string, _list?: string[]): string[] {
    _list = _list || [];
    const files = readdirSync(path);
    files.forEach((file: string) => {
        const fullPath = `${path}/${file}`;
        if (statSync(fullPath).isDirectory()) {
            readDirRecursive(fullPath, _list);
        } else {
            _list.push(fullPath);
        }
    });

    return _list;
}

export function collectFiles(patterns: string[] | string): { name: string; base: string }[] {
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
        } else {
            const folderParts = folder.split('/');
            folderParts.pop();
            folder = folderParts.join('/');
        }
        const files = readDirRecursive(folder);
        // convert pattern "src-admin/build/static/js/*.js" to regex "src-admin/build/static/js/[^\.]+\.js"
        if (_patterns[i].endsWith('*')) {
            _patterns[i] = _patterns[i].replace(/\./g, '\\.').replace(/\*/g, '[^\/]+');
        } else {
            _patterns[i] = `${_patterns[i].replace(/\./g, '\\.').replace(/\*/g, '[^\/]+')}$`;
        }
        _patterns[i] = `^${_patterns[i]}`;

        const regex = new RegExp(_patterns[i]);
        for (let f = 0; f < files.length; f++) {
            if (regex.test(files[f])) {
                if (add) {
                    result.push({ name: files[f], base: folder });
                } else {
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

export function copyFiles(patterns: string[] | string, dest: string) {
    const files = collectFiles(patterns);
    for (let f = 0; f < files.length; f++) {
        const destName = `${dest}/${files[f].name}`;
        const folder = dirname(destName);
        if (!existsSync(folder)) {
            mkdirSync(folder, { recursive: true });
        }
        console.log(`Copy "${files[f].base}/${files[f].name}" to "${destName}"`);
        copyFileSync(`${files[f].base}/${files[f].name}`, destName);
    }
}

export function npmInstall(src: string): Promise<void> {
    if (src.endsWith('/')) {
        src = src.substring(0, src.length - 1);
    }
    return new Promise((resolve, reject) => {
        // Install node modules
        const cwd = src.replace(/\\/g, '/');

        const cmd = `npm install -f`;
        console.log(`"${cmd} in ${cwd}`);

        // System call used for update of js-controller itself,
        // because during an installation the npm packet will be deleted too, but some files must be loaded even during the install process.
        const child = exec(cmd, {cwd});

        child?.stderr?.pipe(process.stderr);
        child?.stdout?.pipe(process.stdout);

        child.on('exit', (code /* , signal */) => {
            // code 1 is a strange error that cannot be explained. Everything is installed but error :(
            if (code && code !== 1) {
                reject(`Cannot install: ${code}`);
            } else {
                console.log(`"${cmd} in ${cwd} finished.`);
                // command succeeded
                resolve();
            }
        });
    });
}

export function buildCraco(rootDir: string, src: string): Promise<void> {
    if (src.endsWith('/')) {
        src = src.substring(0, src.length - 1);
    }
    if (rootDir.endsWith('/')) {
        rootDir = rootDir.substring(0, rootDir.length - 1);
    }
    const version = JSON.parse(readFileSync(`${rootDir}/package.json`).toString('utf8')).version;
    const data    = JSON.parse(readFileSync(`${src}/package.json`).toString('utf8'));

    data.version = version;

    writeFileSync(`${src}/package.json`, JSON.stringify(data, null, 4));

    return new Promise((resolve, reject) => {
        const options = {
            stdio: 'pipe' as IOType,
            cwd: src,
        };

        console.log(options.cwd);

        let script = `${src}/node_modules/@craco/craco/dist/bin/craco.js`;
        if (!existsSync(script)) {
            script = `${rootDir}/node_modules/@craco/craco/dist/bin/craco.js`;
        }
        if (!existsSync(script)) {
            console.error(`Cannot find execution file: ${script}`);
            reject(`Cannot find execution file: ${script}`);
        } else {
            const child = fork(script, ['build'], options);
            child?.stdout?.on('data', data => console.log(data.toString()));
            child?.stderr?.on('data', data => console.log(data.toString()));
            child.on('close', code => {
                console.log(`child process exited with code ${code}`);
                code ? reject(`Exit code: ${code}`) : resolve();
            });
        }
    });
}
