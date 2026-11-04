import { convertPdfPageToSvg } from './svg-conversion.js';

self.onmessage = async ({ data }) => {
    try {
        // Load the pinned converter only when SVG export is requested. PDF bytes
        // stay in this worker; the CDN receives requests for library files only.
        const mupdf = await import('https://cdn.jsdelivr.net/npm/mupdf@1.28.1/dist/mupdf.js');
        self.postMessage({ result: 'ok', ...convertPdfPageToSvg(mupdf, data.bytes, data.page) });
    } catch (error) {
        self.postMessage({ result: 'error', message: error instanceof Error ? error.message : 'SVG conversion failed.' });
    }
};
