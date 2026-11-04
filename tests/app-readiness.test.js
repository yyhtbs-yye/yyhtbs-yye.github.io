import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import vm from 'node:vm';
import { examples } from '../latex-to-pdf/examples.js';
import { downloadName } from '../latex-to-pdf/downloads.js';

const appSource = (await readFile(new URL('../latex-to-pdf/app.js', import.meta.url), 'utf8'))
    .replace(/^import .*;\r?\n/gm, '');

function setup() {
    const elements = new Map();
    const windowEvents = new Map();
    const get = (id) => {
        if (!elements.has(id)) {
            elements.set(id, {
                value: '', textContent: '', dataset: {}, listeners: new Map(),
                disabled: ['download-button', 'svg-button'].includes(id),
                setAttribute() {}, removeAttribute() {}, focus() {},
                addEventListener(event, callback) { this.listeners.set(event, callback); }
            });
        }
        return elements.get(id);
    };
    let preview;
    let started;
    const previewStarted = new Promise((resolve) => { started = resolve; });
    class FakePreview {
        constructor() { preview = this; this.page = 1; }
        clear() { this.page = 1; }
        show() {
            const pending = new Promise((resolve, reject) => {
                this.resolve = resolve;
                this.reject = reject;
            });
            started();
            return pending;
        }
    }
    class FakeEngine {
        async load() {}
        async setSource() {}
        async compile() {
            return { result: 'ok', status: 0, pdf: new TextEncoder().encode('%PDF-1.5\n').buffer, log: 'PDF produced.' };
        }
        dispose() {}
    }
    const context = vm.createContext({
        document: { getElementById: get, addEventListener() {} },
        window: { addEventListener: (event, callback) => windowEvents.set(event, callback) },
        LatexEngine: FakeEngine,
        PdfPreview: FakePreview,
        SvgExporter: class { cancel() {} },
        examples, downloadName, downloadUrl() {},
        TextEncoder, TextDecoder, Uint8Array, Blob, URL, performance,
        WebAssembly, Worker: class {}, setTimeout, clearTimeout
    });
    vm.runInContext(appSource, context, { filename: 'app.js' });
    return {
        get,
        previewStarted,
        preview: () => preview,
        compile: () => get('compile-button').listeners.get('click')(),
        edit: () => get('latex-source').listeners.get('input')(),
        close: () => windowEvents.get('pagehide')()
    };
}

test('PDF and SVG downloads become available while preview rendering is still pending', async () => {
    const ui = setup();
    const compiling = ui.compile();
    await ui.previewStarted;
    await new Promise(setImmediate);
    try {
        assert.equal(ui.get('download-button').disabled, false);
        assert.equal(ui.get('svg-button').disabled, false, 'SVG must not wait for preview rendering');
        assert.equal(ui.get('compile-button').disabled, false);
        assert.equal(ui.get('latex-source').disabled, false);
    } finally {
        ui.preview().resolve();
        await compiling;
        ui.close();
    }
});

test('a late preview error cannot replace the UI after the source has changed', async () => {
    const ui = setup();
    const compiling = ui.compile();
    await ui.previewStarted;
    await new Promise(setImmediate);
    ui.get('latex-source').value = 'A new document';
    ui.edit();
    ui.preview().reject(new Error('Old preview failed'));
    await compiling;
    await new Promise(setImmediate);
    try {
        assert.equal(ui.get('svg-button').disabled, true);
        assert.equal(ui.get('empty-title').textContent, 'Ready for a fresh PDF.');
        assert.equal(ui.get('status-message').textContent, 'Source updated. Compile to create a new PDF.');
    } finally {
        ui.close();
    }
});
