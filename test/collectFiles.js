const { collectFiles } = require('../build/index.js');
const assert = require('node:assert');

const files = collectFiles('../build/*.ts');
assert(files.length === 2, `Invalid number of files. Expected 2, got ${files.length}`);
files.forEach(item => {
    assert(item.base === '../build', `Invalid base. Expected "../build", got ${item.base}`);
    assert(item.name.endsWith('.ts'), `Invalid file. Expected "*.ts", got ${item.name}`);
});
