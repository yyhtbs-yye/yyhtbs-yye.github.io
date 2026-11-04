import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { SvgExporter } from '../latex-to-pdf/svg-exporter.js';

const OriginalWorker = globalThis.Worker;
const exporters = [];
const pdf = () => new TextEncoder().encode('%PDF-1.5\n');
const result = { result: 'ok', svg: '<svg xmlns="http://www.w3.org/2000/svg"></svg>', pageCount: 2 };

class FakeWorker {
    constructor(url, options) {
        this.url = url;
        this.options = options;
        this.terminated = false;
        FakeWorker.last = this;
    }
    postMessage(message, transfer) {
        this.message = structuredClone(message, { transfer });
    }
    emit(data) {
        this.onmessage({ data });
    }
    terminate() {
        this.terminated = true;
    }
}

function makeExporter() {
    globalThis.Worker = FakeWorker;
    const exporter = new SvgExporter();
    exporters.push(exporter);
    return exporter;
}

afterEach(() => {
    exporters.splice(0).forEach((exporter) => exporter.cancel());
    globalThis.Worker = OriginalWorker;
});

test('transfers a copy for the chosen page, preserving the PDF and freeing the worker afterward', async () => {
    const exporter = makeExporter();
    const bytes = pdf();
    const original = bytes.slice();
    const exporting = exporter.export(bytes, 2);
    const worker = FakeWorker.last;
    assert.deepEqual(bytes, original);
    assert.deepEqual(worker.message.bytes, original);
    assert.equal(worker.message.page, 2);
    assert.equal(worker.options.type, 'module');
    worker.emit(result);
    assert.equal((await exporting).pageCount, 2);
    assert.equal(worker.terminated, true);
    assert.equal(exporter.worker, null);
    assert.deepEqual(bytes, original);
});

test('cancellation cannot let an old response finish a later export', async () => {
    const exporter = makeExporter();
    const first = exporter.export(pdf(), 1);
    const oldWorker = FakeWorker.last;
    const cancelled = assert.rejects(first, /cancelled/);
    exporter.cancel();
    await cancelled;
    const second = exporter.export(pdf(), 2);
    const newWorker = FakeWorker.last;
    oldWorker.emit({ ...result, svg: 'stale response' });
    assert.equal(newWorker.terminated, false);
    assert.notEqual(exporter.pending, null);
    newWorker.emit(result);
    assert.equal((await second).svg, result.svg);
});

test('network errors and conversion errors release resources and permit retry', async () => {
    const exporter = makeExporter();
    const first = exporter.export(pdf(), 1);
    const failed = assert.rejects(first, /Could not load/);
    const worker = FakeWorker.last;
    worker.onerror({ preventDefault() {} });
    await failed;
    assert.equal(worker.terminated, true);
    const second = exporter.export(pdf(), 1);
    const rejected = assert.rejects(second, /invalid PDF/);
    FakeWorker.last.emit({ result: 'error', message: 'invalid PDF' });
    await rejected;
    const third = exporter.export(pdf(), 1);
    FakeWorker.last.emit(result);
    await third;
});

test('timeouts terminate a stalled export and concurrent requests cannot replace it', async (context) => {
    context.mock.timers.enable({ apis: ['setTimeout'] });
    const exporter = makeExporter();
    const exporting = exporter.export(pdf(), 1);
    const worker = FakeWorker.last;
    await assert.rejects(exporter.export(pdf(), 2), /already running/);
    const timedOut = assert.rejects(exporting, /timed out/);
    context.mock.timers.tick(90001);
    await timedOut;
    assert.equal(worker.terminated, true);
    assert.equal(exporter.pending, null);
});
