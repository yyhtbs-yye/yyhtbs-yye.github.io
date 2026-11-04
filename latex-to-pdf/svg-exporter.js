export class SvgExporter {
    constructor() {
        this.worker = null;
        this.pending = null;
    }

    export(bytes, page) {
        if (this.pending) return Promise.reject(new Error('An SVG export is already running.'));
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.finish(new Error('SVG export timed out. Check your connection and try again.'));
            }, 90000);
            this.pending = { resolve, reject, timer };
            try {
                const worker = new Worker(new URL('./svg-worker.js', import.meta.url), { type: 'module' });
                this.worker = worker;
                worker.onmessage = ({ data }) => {
                    if (this.worker !== worker) return;
                    if (data.result === 'ok') this.finish(null, data);
                    else this.finish(new Error(data.message || 'SVG conversion failed.'));
                };
                worker.onerror = (event) => {
                    event.preventDefault();
                    if (this.worker !== worker) return;
                    this.finish(new Error('Could not load the SVG converter. Check your connection and try again.'));
                };
                worker.onmessageerror = () => {
                    if (this.worker === worker) this.finish(new Error('The SVG converter returned an unreadable response.'));
                };
                // Transfer a copy, keeping the original PDF available for download
                // and subsequent SVG exports after this worker has been closed.
                const copy = bytes.slice();
                worker.postMessage({ bytes: copy, page }, [copy.buffer]);
            } catch (error) {
                this.finish(error);
            }
        });
    }

    finish(error, result) {
        const pending = this.pending;
        this.pending = null;
        this.worker?.terminate();
        this.worker = null;
        if (!pending) return;
        clearTimeout(pending.timer);
        if (error) pending.reject(error);
        else pending.resolve(result);
    }

    cancel() {
        this.finish(new Error('SVG export cancelled.'));
    }
}
