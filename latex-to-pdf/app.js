import { LatexEngine } from './engine.js';
import { PdfPreview } from './preview.js';
import { examples } from './examples.js';
import { SvgExporter } from './svg-exporter.js';
import { downloadName, downloadUrl } from './downloads.js';

const example = examples.basic.source;

const byId = (id) => document.getElementById(id);
const source = byId('latex-source');
const compileButton = byId('compile-button');
const cancelButton = byId('cancel-button');
const uploadButton = byId('upload-button');
const exampleButton = byId('example-button');
const exampleSelect = byId('example-select');
const fileInput = byId('file-input');
const downloadButton = byId('download-button');
const svgButton = byId('svg-button');
const svgLabel = byId('svg-button-label');
const svgExporter = new SvgExporter();
const preview = byId('pdf-preview');
const pdfPreview = new PdfPreview(byId('pdf-pages'), byId('previous-page'), byId('next-page'), byId('page-number'));
const empty = byId('preview-empty');
const filename = byId('filename');
const logDetails = byId('log-details');
const log = byId('compile-log');
const openPdf = byId('open-pdf');
const maxBytes = 2 * 1024 * 1024;
let engine = new LatexEngine();
let pdfUrl = null;
let pdfBytes = null;
let busy = false;
let jobId = 0;
let svgBusy = false;
let svgJobId = 0;
const svgUrls = new Set();

function status(message, tone = 'neutral') {
    byId('status-message').textContent = message;
    byId('status-bar').dataset.tone = tone;
}

function setBusy(value) {
    busy = value;
    source.disabled = value;
    compileButton.disabled = value;
    uploadButton.disabled = value;
    exampleButton.disabled = value;
    exampleSelect.disabled = value;
    fileInput.disabled = value;
    svgButton.disabled = value || svgBusy || !pdfBytes;
    cancelButton.hidden = !value;
    byId('preview-content').setAttribute('aria-busy', String(value));
}

function clearPdf() {
    ++svgJobId;
    svgExporter.cancel();
    svgBusy = false;
    svgLabel.textContent = 'Download SVG';
    svgButton.disabled = true;
    svgButton.setAttribute('aria-busy', 'false');
    pdfBytes = null;
    pdfPreview.clear();
    preview.hidden = true;
    openPdf.hidden = true;
    openPdf.removeAttribute('href');
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    pdfUrl = null;
    downloadButton.disabled = true;
    empty.hidden = false;
}

function emptyMessage(title, description, badge) {
    byId('empty-title').textContent = title;
    byId('empty-description').textContent = description;
    byId('preview-state').textContent = badge;
}

function updateSource() {
    clearPdf();
    const lines = source.value.split('\n').length;
    byId('source-stats').textContent = `${lines} ${lines === 1 ? 'line' : 'lines'}`;
    logDetails.hidden = true;
    logDetails.open = false;
    log.textContent = '';
    emptyMessage('Ready for a fresh PDF.', 'Select Compile PDF to preview and download this document.', 'Ready to compile');
    status('Source updated. Compile to create a new PDF.');
}

function showLog(text, open = false) {
    log.textContent = text || 'No compiler output was returned.';
    logDetails.hidden = false;
    logDetails.open = open;
}

function errorSummary(output) {
    const firstError = output.split('\n').find((line) => line.startsWith('!'));
    return firstError ? firstError.replace(/^!\s*/, '') : 'The document could not be compiled.';
}

async function compile() {
    if (busy) return;
    if (!source.value.trim()) {
        status('Add a LaTeX document or load the example before compiling.', 'error');
        source.focus();
        return;
    }
    if (new TextEncoder().encode(source.value).length > maxBytes) {
        status('The document is too large. Use a .tex source smaller than 2 MB.', 'error');
        return;
    }
    if (typeof WebAssembly !== 'object' || typeof Worker !== 'function') {
        status('This tool needs a browser with WebAssembly and Web Workers. Please use a current browser.', 'error');
        return;
    }

    const thisJob = ++jobId;
    const started = performance.now();
    let output = '';
    clearPdf();
    setBusy(true);
    logDetails.hidden = true;
    logDetails.open = false;
    emptyMessage('Typesetting your document…', 'The first compile downloads the engine, packages, and fonts. You can cancel at any time.', 'Compiling');

    try {
        status('Loading the LaTeX compiler…', 'busy');
        await engine.load();
        if (thisJob !== jobId) return;
        await engine.setSource(source.value);
        let result;
        // A second pass resolves document cross-references and table-of-contents entries.
        for (let pass = 1; pass <= 2; pass++) {
            status(`Compiling, pass ${pass} of 2… Packages and fonts download as needed.`, 'busy');
            result = await engine.compile();
            if (thisJob !== jobId) return;
            output += `--- Pass ${pass} ---\n${result.log || ''}\n`;
            if (result.result !== 'ok' || result.status !== 0 || !result.pdf) {
                throw new Error(`${errorSummary(result.log || '')} See the compilation log below.`);
            }
        }
        const bytes = new Uint8Array(result.pdf);
        if (new TextDecoder().decode(bytes.subarray(0, 5)) !== '%PDF-') {
            throw new Error('The compiler did not produce a valid PDF. See the log below.');
        }
        pdfUrl = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
        pdfBytes = bytes;
        preview.hidden = false;
        empty.hidden = true;
        openPdf.href = pdfUrl;
        openPdf.hidden = false;
        downloadButton.disabled = false;
        const warnings = /LaTeX Warning:|Package .+ Warning:|Overfull \\hbox|Underfull \\hbox/.test(result.log || '');
        byId('preview-state').textContent = warnings ? 'Ready · check log' : 'Ready to download';
        showLog(output);
        status(`PDF ready in ${((performance.now() - started) / 1000).toFixed(1)}s · ${Math.max(1, Math.round(bytes.byteLength / 1024))} KB.${warnings ? ' The compiler reported warnings; check the log.' : ' Your download is ready.'}`, 'success');
        try {
            await pdfPreview.show(bytes);
        } catch {
            if (thisJob === jobId) {
                preview.hidden = true;
                empty.hidden = false;
                emptyMessage('Your PDF is ready.', 'The preview could not be displayed. You can still download the PDF or open it in a new tab.', 'Ready to download');
            }
        }
    } catch (error) {
        if (thisJob !== jobId) return;
        const message = error instanceof Error ? error.message : 'Compilation failed. Please try again.';
        showLog(output || message, true);
        emptyMessage('Let’s fix the source.', 'Check the compilation log below, edit your document, and try again.', 'Compilation failed');
        status(message, 'error');
        // Recreate the worker after errors so a crashed TeX run cannot poison a retry.
        engine.dispose();
        engine = new LatexEngine();
    } finally {
        if (thisJob === jobId) setBusy(false);
    }
}

compileButton.addEventListener('click', compile);
cancelButton.addEventListener('click', () => {
    ++jobId;
    engine.dispose();
    engine = new LatexEngine();
    clearPdf();
    setBusy(false);
    emptyMessage('Compilation cancelled.', 'Your source is still here. Select Compile PDF when you’re ready.', 'Cancelled');
    status('Compilation cancelled. You can edit the source or try again.');
});
source.addEventListener('input', updateSource);
document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        compile();
    }
});
uploadButton.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    fileInput.value = '';
    if (!file || busy) return;
    if (!/\.tex$/i.test(file.name)) {
        status('Choose a .tex file containing LaTeX source.', 'error');
        return;
    }
    if (file.size > maxBytes) {
        status('This file is too large. Choose a .tex file smaller than 2 MB.', 'error');
        return;
    }
    // Disable actions while reading too, so a late read cannot overwrite a compile.
    setBusy(true);
    cancelButton.hidden = true;
    try {
        const text = await file.text();
        source.value = text.replace(/^\uFEFF/, '');
        byId('source-name').textContent = file.name;
        filename.value = file.name.replace(/\.tex$/i, '');
        updateSource();
        status(`Opened ${file.name}. Select Compile PDF to convert it.`);
    } catch {
        status('This file could not be read. Try opening it again or paste the source.', 'error');
    } finally {
        setBusy(false);
    }
});
exampleButton.addEventListener('click', () => {
    const selected = examples[exampleSelect.value] || examples.basic;
    source.value = selected.source;
    byId('source-name').textContent = selected.sourceName;
    filename.value = selected.filename;
    updateSource();
    status(`${selected.name} example loaded. Select Compile PDF to try it.`);
});
downloadButton.addEventListener('click', () => {
    if (!pdfUrl || busy) return;
    downloadUrl(pdfUrl, downloadName(filename.value, 'pdf'));
});
svgButton.addEventListener('click', async () => {
    if (!pdfBytes || busy || svgBusy) return;
    const thisExport = ++svgJobId;
    const bytes = pdfBytes;
    const page = pdfPreview.page;
    const name = filename.value;
    svgBusy = true;
    svgButton.disabled = true;
    svgButton.setAttribute('aria-busy', 'true');
    svgLabel.textContent = 'Creating SVG…';
    status(`Creating SVG for page ${page}… The first SVG export downloads a converter (about 10 MB).`, 'busy');
    try {
        const result = await svgExporter.export(bytes, page);
        if (thisExport !== svgJobId || bytes !== pdfBytes) return;
        const url = URL.createObjectURL(new Blob([result.svg], { type: 'image/svg+xml;charset=utf-8' }));
        svgUrls.add(url);
        downloadUrl(url, downloadName(name, 'svg', page, result.pageCount));
        setTimeout(() => {
            URL.revokeObjectURL(url);
            svgUrls.delete(url);
        }, 30000);
        status(`SVG downloaded for page ${page} of ${result.pageCount}. Text is outlined to preserve LaTeX fonts.`, 'success');
    } catch (error) {
        if (thisExport !== svgJobId) return;
        const message = error instanceof Error ? error.message : 'SVG export failed. Please try again.';
        status(`${message} You can still download the PDF.`, 'error');
    } finally {
        if (thisExport === svgJobId) {
            svgBusy = false;
            svgLabel.textContent = 'Download SVG';
            svgButton.setAttribute('aria-busy', 'false');
            svgButton.disabled = busy || !pdfBytes;
        }
    }
});
window.addEventListener('pagehide', () => {
    ++jobId;
    engine.dispose();
    clearPdf();
    svgUrls.forEach((url) => URL.revokeObjectURL(url));
    svgUrls.clear();
    setBusy(false);
});

source.value = example;
byId('source-stats').textContent = `${example.split('\n').length} lines`;
byId('preview-state').textContent = 'Ready to compile';
