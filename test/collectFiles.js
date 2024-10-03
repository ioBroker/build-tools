const { collectFiles } = require('../build/index.js');

const files = collectFiles('../build/*.ts');
if (files.length !== 2) {
    throw new Error(`Invalid number of files. Expected 2, got ${files.length}`);
}
files.forEach(item => {
    if (item.base !== '../build') {
        throw new Error(`Invalid base. Expected "../build", got ${item.base}`);
    }
    if (!item.name.endsWith('.ts')) {
        throw new Error(`Invalid file. Expected "*.ts", got ${item.name}`);
    }
});
