// MuPDF's SVG writer keeps paths as vectors and outlines embedded LaTeX fonts.
// https://mupdf.readthedocs.io/en/latest/reference/common/document-writer-options.html
export function convertPdfPageToSvg(mupdf, bytes, pageNumber) {
    let pdf, page, output, writer, device;
    try {
        pdf = mupdf.Document.openDocument(bytes, 'application/pdf');
        const pageCount = pdf.countPages();
        if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > pageCount) {
            throw new Error('Choose a valid PDF page to export.');
        }
        page = pdf.loadPage(pageNumber - 1);
        output = new mupdf.Buffer();
        writer = new mupdf.DocumentWriter(output, 'svg', 'text=path');
        device = writer.beginPage(page.getBounds());
        page.run(device, mupdf.Matrix.identity);
        writer.endPage();
        writer.close();
        const svg = output.asString();
        if (!svg.includes('<svg') || !svg.includes('</svg>')) {
            throw new Error('The converter did not produce a complete SVG.');
        }
        return { svg, pageCount };
    } finally {
        device?.destroy();
        writer?.destroy();
        output?.destroy();
        page?.destroy();
        pdf?.destroy();
    }
}
