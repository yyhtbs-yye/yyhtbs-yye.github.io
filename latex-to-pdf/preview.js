let pdfjsPromise;

function loadPdfJs() {
    if (!pdfjsPromise) {
        pdfjsPromise = import('./vendor/pdfjs/pdf.min.mjs').then((pdfjs) => {
            pdfjs.GlobalWorkerOptions.workerSrc = new URL('./vendor/pdfjs/pdf.worker.min.mjs', import.meta.url).href;
            return pdfjs;
        }).catch((error) => {
            pdfjsPromise = null;
            throw error;
        });
    }
    return pdfjsPromise;
}

export class PdfPreview {
    constructor(container, previous, next, label) {
        this.container = container;
        this.previous = previous;
        this.next = next;
        this.label = label;
        this.document = null;
        this.loadingTask = null;
        this.renderTask = null;
        this.version = 0;
        this.renderId = 0;
        this.page = 1;
        this.width = 0;
        previous.addEventListener('click', () => this.turnPage(-1));
        next.addEventListener('click', () => this.turnPage(1));
        if (typeof ResizeObserver === 'function') {
            this.resizeObserver = new ResizeObserver(([entry]) => {
                const width = Math.round(entry.contentRect.width);
                if (width !== this.width) {
                    this.width = width;
                    if (this.document && width > 0) this.render().catch(() => this.renderError());
                }
            });
            this.resizeObserver.observe(container);
        }
    }

    clear() {
        ++this.version;
        ++this.renderId;
        this.renderTask?.cancel();
        this.renderTask = null;
        this.loadingTask?.destroy().catch(() => {});
        this.loadingTask = null;
        this.document = null;
        this.page = 1;
        this.container.replaceChildren();
        this.previous.disabled = true;
        this.next.disabled = true;
        this.label.textContent = 'Loading preview…';
    }

    async show(bytes) {
        this.clear();
        const version = this.version;
        const pdfjs = await loadPdfJs();
        if (version !== this.version) return;
        this.loadingTask = pdfjs.getDocument({ data: bytes.slice(), isEvalSupported: false });
        const document = await this.loadingTask.promise;
        if (version !== this.version) return;
        this.document = document;
        await this.render();
    }

    async turnPage(direction) {
        if (!this.document) return;
        this.page = Math.max(1, Math.min(this.document.numPages, this.page + direction));
        try {
            await this.render();
            this.container.scrollTop = 0;
        } catch {
            this.renderError();
        }
    }

    async render() {
        const renderId = ++this.renderId;
        this.renderTask?.cancel();
        this.previous.disabled = true;
        this.next.disabled = true;
        const page = await this.document.getPage(this.page);
        if (renderId !== this.renderId) return;
        const original = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: Math.max(140, this.container.clientWidth - 40) / original.width });
        const density = Math.min(window.devicePixelRatio || 1, 2);
        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width * density);
        canvas.height = Math.floor(viewport.height * density);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        canvas.setAttribute('role', 'img');
        canvas.setAttribute('aria-label', `PDF page ${this.page} of ${this.document.numPages}. Download or open the PDF to read its text.`);
        this.renderTask = page.render({
            canvasContext: canvas.getContext('2d'),
            viewport,
            transform: density === 1 ? null : [density, 0, 0, density, 0, 0]
        });
        try {
            await this.renderTask.promise;
        } catch (error) {
            if (error.name === 'RenderingCancelledException' || renderId !== this.renderId) return;
            throw error;
        }
        if (renderId !== this.renderId) return;
        this.renderTask = null;
        this.container.replaceChildren(canvas);
        this.label.textContent = `Page ${this.page} of ${this.document.numPages}`;
        this.previous.disabled = this.page === 1;
        this.next.disabled = this.page === this.document.numPages;
    }

    renderError() {
        if (this.document) this.label.textContent = 'Preview unavailable. Download or open the PDF.';
    }
}
