import fs, {
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
import {
    type ChildProcess,
    exec, fork,
    type IOType,
} from 'node:child_process';
import { dirname } from 'node:path';

// Delete all folders recursive (sync function)
export function deleteFoldersRecursive(
    /** Path to the folder */
    path: string,
    /** List of exceptions */
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

// Read all files in directory and subdirectories as one list (sync function)
function readDirRecursive(path: string, _list?: string[]): string[] {
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

// Collect files by mask (sync function)
function collectFiles(patterns: string[] | string): { name: string; base: string }[] {
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

// Copy files by pattern to destination (sync function)
export function copyFiles(
    patterns: string[] | string,
    dest: string,
) {
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

// run npm install in directory (async function)
export function npmInstall(
    src: string,
    options?: {
        /** Set to false if you want to execute without `--force` flag */
        force?: boolean,
    }
): Promise<void> {
    if (src.endsWith('/')) {
        src = src.substring(0, src.length - 1);
    }
    return new Promise((resolve, reject) => {
        // Install node modules
        const cwd = src.replace(/\\/g, '/');

        const cmd = `npm install${options?.force !== false ? ' --force' : ''}`;

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

export function buildCraco(
    /** React directory to build */
    src: string,
    options?: {
        /** Root directory to copy the version from */
        rootDir?: string,
        /** Use exec and not fork */
        exec?: boolean,
        /** Max memory size for exec */
        ramSize?: number,
    },
): Promise<void> {
    if (src.endsWith('/')) {
        src = src.substring(0, src.length - 1);
    }
    let rootDir: string | undefined;

    // Copy version number from root directory to src directory
    if (options?.rootDir) {
        rootDir = options.rootDir;
        if (rootDir.endsWith('/')) {
            rootDir = rootDir.substring(0, options.rootDir.length - 1);
        }
        const version = JSON.parse(readFileSync(`${rootDir}/package.json`).toString('utf8')).version;
        const data    = JSON.parse(readFileSync(`${src}/package.json`).toString('utf8'));

        data.version = version;

        writeFileSync(`${src}/package.json`, JSON.stringify(data, null, 4));
    }

    return new Promise((resolve, reject) => {
        const cpOptions = {
            stdio: 'pipe' as IOType,
            cwd: src,
        };

        let script = `${src}/node_modules/@craco/craco/dist/bin/craco.js`;
        if (rootDir && !existsSync(script)) {
            script = `${rootDir}/node_modules/@craco/craco/dist/bin/craco.js`;
        }
        if (!existsSync(script)) {
            console.error(`Cannot find execution file: ${script}`);
            reject(`Cannot find execution file: ${script}`);
        } else {
            let child: ChildProcess;
            if (options?.ramSize || options?.exec) {
                const cmd = `node ${script}${options.ramSize ? ` --max-old-space-size=${options.ramSize}` : ''} build`;
                child = exec(cmd, cpOptions);
            } else {
                child = fork(script, ['build'], cpOptions);
            }
            child?.stdout?.on('data', data => console.log(data.toString()));
            child?.stderr?.on('data', data => console.log(data.toString()));

            child.on('close', code => {
                console.log(`child process exited with code ${code}`);
                code ? reject(`Exit code: ${code}`) : resolve();
            });
        }
    });
}

function _patchHtmlFile(fileName: string): boolean {
    let changed = false;
    if (fs.existsSync(fileName)) {
        let code = fs.readFileSync(fileName).toString('utf8');
        // replace code
        if (code.match(/<script>const script=document[^<]+<\/script>/)) {
            code = code.replace(
                /<script>const script=document[^<]+<\/script>/,
                `<script type="text/javascript" onerror="setTimeout(function(){window.location.reload()}, 5000)" src="./lib/js/socket.io.js"></script>`
            );
            changed = true;
        }
        if (code.match(/<script>var script=document[^<]+<\/script>/)) {
            code = code.replace(
                /<script>var script=document[^<]+<\/script>/,
                `<script type="text/javascript" onerror="setTimeout(function(){window.location.reload()}, 5000)" src="./lib/js/socket.io.js"></script>`
            );
            changed = true;
        }
        if (changed) {
            fs.writeFileSync(fileName, code);
        }
    }
    return changed;
}

export function patchHtmlFile(fileName: string): Promise<boolean> {
    return new Promise(resolve => {
        if (fs.existsSync(fileName)) {
            resolve(_patchHtmlFile(fileName));
        } else {
            // wait till finished
            setTimeout(() => resolve(_patchHtmlFile(fileName)), 2000);
        }
    });
}
