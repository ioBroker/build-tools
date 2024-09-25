const { deleteFoldersRecursive, copyFiles, npmInstall, buildCraco } = require('@iobroker/build-tools');

const srcAdmin = `${__dirname}/src-admin/`;
const destAdmin = `${__dirname}/admin/custom`;

function admin0CleanSync() {
    deleteFoldersRecursive(destAdmin);
    deleteFoldersRecursive(`${destAdmin}/build`);
}

function copyAllFilesSync() {
    copyFiles(
        [
            'src-admin/build/static/js/*.js',
            '!src-admin/build/static/js/vendors*.js',
            '!src-admin/build/static/js/src_bootstrap_*.js',
        ],
        'admin/custom/static/js',
    );
    copyFiles(
        [
            'src-admin/build/static/js/*.map',
            '!src-admin/build/static/js/vendors*.map',
            '!src-admin/build/static/js/src_bootstrap_*.map',
        ],
        'admin/custom/static/js',
    );
    copyFiles(['src-admin/build/customComponents.js'], 'admin/custom');
    copyFiles(['src-admin/build/customComponents.js.map'], 'admin/custom');
    copyFiles(['src-admin/src/i18n/*.json'], 'admin/custom/i18n');
}

if (process.argv.find(arg => arg.replace(/^--/, '') === '0-clean')) {
    admin0CleanSync();
} else if (process.argv.find(arg => arg.replace(/^--/, '') === '1-npm')) {
    npmInstall().catch(e => console.error(`Cannot install: ${e}`));
} else if (process.argv.find(arg => arg.replace(/^--/, '') === '2-compile')) {
    buildCraco().catch(e => console.error(`Cannot compile: ${e}`));
} else if (process.argv.find(arg => arg.replace(/^--/, '') === '3-copy')) {
    copyAllFilesSync();
} else {
    admin0CleanSync();

    npmInstall(srcAdmin).then(async () => {
        await buildCraco();
        copyAllFilesSync();
    });
}
