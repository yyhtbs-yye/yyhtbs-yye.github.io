// SwiftLaTeX's worker protocol is documented in its pdftex.wasm/pre.js source.
// Source: https://github.com/SwiftLaTeX/SwiftLaTeX/tree/v20022022/pdftex.wasm
export class LatexEngine {
    constructor() {
        this.worker = null;
        this.pending = null;
        this.ready = false;
    }

    async load() {
        if (this.ready) return;
        if (this.worker) throw new Error('The compiler is already loading.');
        this.worker = new Worker(new URL('./vendor/swiftlatex/swiftlatexpdftex.js', import.meta.url));
        this.worker.onmessage = ({ data }) => {
            if (this.pending && data.cmd === this.pending.command) {
                this.finish(null, data);
            }
        };
        this.worker.onerror = (event) => {
            event.preventDefault();
            this.dispose(new Error('The compiler could not run. Reload the page and try again.'));
        };
        this.worker.onmessageerror = () => {
            this.dispose(new Error('The compiler returned an unreadable response. Please try again.'));
        };
        const result = await this.request(undefined, null, 30000);
        if (result.result !== 'ok') {
            this.dispose();
            throw new Error('The compiler could not start. Check your connection and try again.');
        }
        this.ready = true;
        // The original SwiftLaTeX package host is no longer reliable. This mirror
        // serves the matching TeX Live files and exposes the worker's fileid header.
        this.worker.postMessage({ cmd: 'settexliveurl', url: 'https://texlive.texlyre.org/' });
        this.worker.postMessage({ cmd: 'setmainfile', url: 'main.tex' });
    }

    async setSource(source) {
        this.assertReady();
        // Start each document with a clean working directory (including aux files).
        // Package/font caches live separately and survive subsequent compilations.
        this.worker.postMessage({ cmd: 'flushcache' });
        const result = await this.request('writefile', { cmd: 'writefile', url: 'main.tex', src: source }, 10000);
        if (result.result !== 'ok') throw new Error('Could not load the source into the compiler.');
    }

    compile() {
        this.assertReady();
        return this.request('compile', { cmd: 'compilelatex' }, 120000);
    }

    assertReady() {
        if (!this.ready || !this.worker) throw new Error('The compiler is not ready.');
    }

    request(command, message, timeout) {
        if (!this.worker) return Promise.reject(new Error('The compiler is not running.'));
        if (this.pending) return Promise.reject(new Error('The compiler is already busy.'));
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.dispose(new Error('The compiler timed out. Check your connection and document, then try again.'));
            }, timeout);
            this.pending = { command, resolve, reject, timer };
            try {
                if (message) this.worker.postMessage(message);
            } catch (error) {
                this.dispose(error);
            }
        });
    }

    finish(error, result) {
        if (!this.pending) return;
        const pending = this.pending;
        this.pending = null;
        clearTimeout(pending.timer);
        if (error) pending.reject(error);
        else pending.resolve(result);
    }

    dispose(error = new Error('Compilation cancelled.')) {
        this.ready = false;
        this.finish(error);
        this.worker?.terminate();
        this.worker = null;
    }
}
