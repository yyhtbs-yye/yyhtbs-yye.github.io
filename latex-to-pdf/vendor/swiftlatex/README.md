# SwiftLaTeX pdfTeX runtime

`swiftlatexpdftex.js` and `swiftlatexpdftex.wasm` are unmodified files from
[SwiftLaTeX v20022022](https://github.com/SwiftLaTeX/SwiftLaTeX/releases/tag/v20022022),
release asset `20-02-2022.zip`.

Upstream source (including build instructions):
<https://github.com/SwiftLaTeX/SwiftLaTeX/tree/v20022022>.

Copyright SwiftLab and the SwiftLaTeX contributors. The upstream repository's
AGPL-3.0 license is reproduced in `LICENSE`; upstream source files also carry
their respective copyright and license notices.

The application configures the runtime to fetch TeX Live resources from
`https://texlive.texlyre.org/` through the worker's `settexliveurl` message.
No application patch is applied to the vendored runtime. The TeX Live packages
and fonts served by that mirror retain their upstream licenses.

SHA-256 checksums:

```text
019ccf66c2981cc3a371ca8983f8a0f191952e28b5df3c0b41c2e3ed80f9be65  swiftlatexpdftex.js
154d08cbb298191cefe1bdd9e47a909d60fc7a96fce5f2319bfc6878c5b61cf1  swiftlatexpdftex.wasm
```
