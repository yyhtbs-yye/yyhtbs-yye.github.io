import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { LatexEngine } from '../latex-to-pdf/engine.js';

const OriginalWorker = globalThis.Worker;
const engines = [];

class FakeWorker {
    constructor(url) {
        this.url = url;
        this.messages = [];
        this.terminated = false;
        FakeWorker.last = this;
    }
    postMessage(message) {
        this.messages.push(message);
    }
    emit(data) {
        this.onmessage({ data });
    }
    terminate() {
        this.terminated = true;
    }
}

function makeEngine() {
    globalThis.Worker = FakeWorker;
    const engine = new LatexEngine();
    engines.push(engine);
    return engine;
}

async function load(engine) {
    const loading = engine.load();
    FakeWorker.last.emit({ result: 'ok' });
    await loading;
    return FakeWorker.last;
}

afterEach(() => {
    engines.splice(0).forEach((engine) => engine.dispose());
    globalThis.Worker = OriginalWorker;
});

test('loads once, isolates document files, and preserves binary PDF output across two passes', async () => {
    const engine = makeEngine();
    const worker = await load(engine);
    assert.equal(engine.ready, true);
    await engine.load();
    assert.deepEqual(worker.messages, [
        { cmd: 'settexliveurl', url: 'https://texlive.texlyre.org/' },
        { cmd: 'setmainfile', url: 'main.tex' }
    ]);
    const writing = engine.setSource('first document');
    assert.deepEqual(worker.messages.slice(-2), [
        { cmd: 'flushcache' },
        { cmd: 'writefile', url: 'main.tex', src: 'first document' }
    ]);
    worker.emit({ cmd: 'writefile', result: 'ok' });
    await writing;
    const pdf = new TextEncoder().encode('%PDF-1.7\n').buffer;
    for (let pass = 0; pass < 2; pass++) {
        const compiling = engine.compile();
        // Unrelated acknowledgements must not finish a compile prematurely.
        worker.emit({ cmd: 'writefile', result: 'ok' });
        assert.equal(engine.pending.command, 'compile');
        worker.emit({ cmd: 'compile', result: 'ok', status: 0, log: 'Done', pdf });
        assert.equal((await compiling).pdf, pdf);
    }
    const replacement = engine.setSource('a different document');
    assert.equal(worker.messages.at(-2).cmd, 'flushcache');
    worker.emit({ cmd: 'writefile', result: 'ok' });
    await replacement;
});

test('cancelling startup or compilation rejects pending work and permits a fresh worker', async () => {
    const engine = makeEngine();
    const loading = engine.load();
    const firstWorker = FakeWorker.last;
    const startupRejection = assert.rejects(loading, /cancelled/);
    engine.dispose();
    await startupRejection;
    assert.equal(firstWorker.terminated, true);
    const secondWorker = await load(engine);
    const compiling = engine.compile();
    const compileRejection = assert.rejects(compiling, /cancelled/);
    engine.dispose();
    await compileRejection;
    assert.equal(secondWorker.terminated, true);
    assert.equal(engine.ready, false);
    await load(engine);
    assert.equal(engine.ready, true);
});

test('a worker crash clears pending work and allows retry instead of hanging', async () => {
    const engine = makeEngine();
    const worker = await load(engine);
    const compiling = engine.compile();
    const rejection = assert.rejects(compiling, /could not run/);
    worker.onerror({ preventDefault() {} });
    await rejection;
    assert.equal(worker.terminated, true);
    assert.equal(engine.worker, null);
    await load(engine);
    assert.equal(engine.ready, true);
});

test('timeouts terminate a stuck worker and release the busy state', async (context) => {
    context.mock.timers.enable({ apis: ['setTimeout'] });
    const engine = makeEngine();
    const worker = await load(engine);
    const compiling = engine.compile();
    const rejection = assert.rejects(compiling, /timed out/);
    context.mock.timers.tick(120001);
    await rejection;
    assert.equal(worker.terminated, true);
    assert.equal(engine.pending, null);
    assert.equal(engine.ready, false);
});

test('rejects overlapping work and failed writes; returns TeX errors for the UI log', async () => {
    const engine = makeEngine();
    const worker = await load(engine);
    const writing = engine.setSource('source');
    await assert.rejects(engine.compile(), /already busy/);
    const rejection = assert.rejects(writing, /Could not load/);
    worker.emit({ cmd: 'writefile', result: 'failed' });
    await rejection;
    const compiling = engine.compile();
    worker.emit({ cmd: 'compile', result: 'failed', status: 1, log: '! Undefined control sequence.' });
    assert.equal((await compiling).log, '! Undefined control sequence.');
});
