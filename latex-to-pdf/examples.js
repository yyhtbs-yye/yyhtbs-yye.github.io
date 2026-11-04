export const examples = {
    basic: {
        name: 'Basic document',
        filename: 'document',
        sourceName: 'main.tex',
        source: String.raw`\documentclass[11pt,a4paper]{article}
\usepackage[margin=1in]{geometry}
\usepackage{amsmath,amssymb}
\usepackage{hyperref}

\title{A little LaTeX goes a long way}
\author{Your name}
\date{\today}

\begin{document}
\maketitle

\section{Hello, world}
This is your first PDF, compiled right in your browser.
Edit this document, make it your own, and download the result.

\section{Something elegant}
Euler's identity brings five fundamental constants together:
\[
  e^{i\pi} + 1 = 0.
\]
The Gaussian integral is another favourite:
\begin{equation}
  \int_{-\infty}^{\infty} e^{-x^2}\,dx = \sqrt{\pi}.
\end{equation}

\section{What's next?}
\begin{itemize}
  \item Replace this text with your own ideas.
  \item Add equations, tables, or a new section.
  \item Select \textbf{Compile PDF}, then download your document.
\end{itemize}

\end{document}
`
    },
    tikz: {
        name: 'TikZ diagram',
        filename: 'tikz-diagram',
        sourceName: 'tikz-diagram.tex',
        source: String.raw`\documentclass[11pt,a4paper]{article}
\usepackage[margin=1in]{geometry}
\usepackage{tikz}
\usetikzlibrary{arrows.meta,positioning,calc}
\pagestyle{empty}

\begin{document}
\section*{A diagram with TikZ}
TikZ packages and libraries load automatically as needed.

\begin{center}
\begin{tikzpicture}[
  node distance=1.2cm,
  block/.style={draw=blue!60!black, fill=blue!5,
    rounded corners, minimum width=3cm, minimum height=1cm},
  >={Stealth}
]
  \node[block] (source) {LaTeX source};
  \node[block, below=of source] (compile) {Compile in browser};
  \node[block, below=of compile] (pdf) {Download PDF};
  \draw[->, thick] (source) -- (compile);
  \draw[->, thick] (compile) -- (pdf);
  \draw[->, dashed] (pdf.east) -- ++(1,0)
    |- (source.east) node[pos=0.25, right] {edit};
\end{tikzpicture}
\end{center}
\end{document}
`
    },
    optics: {
        name: 'TikZ optics',
        filename: 'tikz-optics',
        sourceName: 'tikz-optics.tex',
        source: String.raw`\documentclass[11pt,a4paper]{article}
\usepackage[margin=1in]{geometry}
\usepackage{tikz}
% tikz-optics is a TikZ library, loaded as "optics".
% shapes.misc supplies the cross-out markers used by draw focal points.
\usetikzlibrary{optics,shapes.misc,arrows.meta,calc}
\pagestyle{empty}

\begin{document}
\section*{An optical setup with TikZ-optics}
Parallel rays pass through a converging lens and meet at its focus.
The optics library draws the lens; ray paths are specified explicitly.

\begin{center}
% "use optics" makes the library's lens and mirror styles available.
\begin{tikzpicture}[use optics, >={Stealth}]
  \draw[gray!50, dashed] (-3,0) -- (4,0)
    node[right, text=black] {optical axis};
  \node[lens, object height=3cm, focal length=2cm,
    draw focal points] (L) at (0,0) {};
  \node[below] at (0,-1.9) {Converging lens};
  \fill (2,0) circle (1.5pt) node[below=5pt] {$F$};
  \foreach \height in {-1,0,1} {
    \draw[red!75!black, thick, ->] (-3,\height) -- (0,\height);
    \draw[red!75!black, thick, ->] (0,\height) -- (2,0);
  }
\end{tikzpicture}
\end{center}
\end{document}
`
    }
};
