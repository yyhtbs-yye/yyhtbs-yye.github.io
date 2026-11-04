# yyhtbs-yye.github.io

Static tools hosted on GitHub Pages. No build or server deployment is required.

## LaTeX to PDF

The converter lives at `/latex-to-pdf/`, linked from the homepage. The hash route
`/#/latex-to-pdf` also redirects there. The existing `/#/plotlyrender?data=…`
route remains available.

- Paste a complete LaTeX document or open a UTF-8 `.tex` file (maximum 2 MB).
- Compile with the button or Ctrl/Cmd + Enter. Two passes resolve cross-references.
- Preview, open, or download the PDF with a custom filename.
- Download the current preview page as SVG, preserving vector paths and outlining fonts.
- View compiler warnings/errors in the log, cancel a run, and retry.
- Choose a basic document, TikZ diagram, or TikZ-optics setup from the example
  selector, then click **Load example**.

Compilation uses a vendored SwiftLaTeX pdfTeX WebAssembly engine in a Web Worker.
Source and generated PDFs stay in browser memory; the application does not
upload the document, save it to browser storage, or call a PDF compilation API.
The engine downloads packages/fonts from `https://texlive.texlyre.org/` as
needed. The mirror receives resource requests (including resource names), and
must be reachable. Its TeX Live package versions determine package compatibility.
The initial compile can take longer while these resources load.

### SVG export

After compiling, click **Download SVG** to export the page currently shown in the
preview. For multi-page documents, navigate to the desired page first; filenames
include the page number (for example, `document-page-2.svg`). PDF download still
exports the complete document.

SVG export runs MuPDF **1.28.1** in a separate, short-lived browser worker. It
loads the pinned `mupdf` npm distribution from jsDelivr on demand (about 10 MB on
first use). The CDN receives library requests only; the PDF stays on the device.
TikZ paths remain vectors, and text becomes font-independent vector outlines.
Existing raster images in a document remain raster images. SVG output uses the
PDF page size; use a `standalone` document if you want tightly cropped diagrams.
Editing the source or starting a new compile cancels any pending SVG export.
PDF and SVG downloads become available as soon as compilation succeeds; they do
not wait for the PDF preview to render. The page versions its entry script and
stylesheet URLs to avoid reusing older cached code after deployment.

MuPDF source and AGPL-3.0-or-later license:
<https://www.npmjs.com/package/mupdf/v/1.28.1> and
<https://github.com/ArtifexSoftware/mupdf/tree/1.28.1>.

### TikZ and TikZ-optics

Both are available through the package mirror, with no installation or compiler
setting required. Include these lines in your document preamble:

```tex
\usepackage{tikz}
\usetikzlibrary{optics,shapes.misc}
```

`optics` is the library provided by the tikz-optics package; `shapes.misc` supplies
the default cross-out markers used by `draw focal points`.
Use `\begin{tikzpicture}[use optics]` for the optics library's lens and mirror
styles. Other TikZ libraries can be requested in the usual way, for example
`\usetikzlibrary{arrows.meta,positioning,calc}`. The built-in **TikZ diagram** and
**TikZ optics** examples provide complete documents to start from. First use can
take longer because PGF/TikZ has several package dependencies.

TikZ-optics draws optical components; ray paths are specified by your source,
rather than computed by a ray-tracing engine. See the
[upstream TikZ-optics documentation](https://ctan.org/pkg/tikz-optics).

Supports single-file **pdfLaTeX** documents with packages available on the mirror.
Additional project files, uploaded images, system fonts, XeLaTeX, and LuaLaTeX
are not supported. Refreshing or leaving the page discards the source and output.
Use a current browser with WebAssembly and Web Workers. A vendored PDF.js renderer
provides a responsive preview with page navigation. The download and new-tab link
remain available if preview rendering fails.

## Local development

Use Node.js 20.11 or later; there are no npm dependencies to install.

```sh
npm run dev
```

Open <http://127.0.0.1:4173/latex-to-pdf/>. Serve through HTTP; opening the HTML
as a `file://` URL cannot load the module/worker correctly.

```sh
npm test
```

Deploy by publishing these files through the repository's GitHub Pages setup.
Keep the `latex-to-pdf/vendor/swiftlatex/` directory, including the `.wasm` file.
The local preview server is for development only.

## Third-party code

See [the vendored runtime notice](latex-to-pdf/vendor/swiftlatex/README.md) for
SwiftLaTeX's pinned release, source, and license. The [PDF.js notice](latex-to-pdf/vendor/pdfjs/README.md)
documents the preview renderer and its Apache-2.0 license. MuPDF provides SVG
conversion under AGPL-3.0-or-later and is loaded from its pinned npm distribution.
TeXlyre provides the
on-demand TeX Live package mirror. The existing chart route uses Plotly and jQuery.
