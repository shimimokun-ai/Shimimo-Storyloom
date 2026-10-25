const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { withExecutableRetry } = require('../build.cjs');
test('Windows generated-executable writes retry temporary locks and retain the original data', async () => {
    const output = path.resolve('dist');
    const payload = Buffer.from('executable');
    let attempts = 0;
    const delays = [];
    const write = withExecutableRetry(async (_file, data) => {
        assert.equal(data, payload);
        if (++attempts < 3) throw Object.assign(new Error('locked'), { code: 'UNKNOWN' });
    }, output, 'win32', async delay => delays.push(delay));
    await write(path.join(output, 'win-unpacked', 'Example.exe'), payload);
    assert.equal(attempts, 3);
    assert.deepEqual(delays, [250, 500]);
});
test('unrelated paths and persistent failures are surfaced', async () => {
    const output = path.resolve('dist');
    let attempts = 0;
    const error = Object.assign(new Error('locked'), { code: 'EPERM' });
    const write = withExecutableRetry(async () => { attempts++; throw error; }, output, 'win32', async () => {});
    await assert.rejects(write(path.resolve('main.js'), ''), value => value === error);
    assert.equal(attempts, 1);
    attempts = 0;
    await assert.rejects(write(path.join(output, 'Example.exe'), ''), value => value === error);
    assert.equal(attempts, 9);
});
