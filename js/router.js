window.addEventListener('load', router);
window.addEventListener('hashchange', router);

function router() {
    // Get the full hash fragment, minus the leading '#'
    let hashFragment = window.location.hash.slice(1);
    // Separate the path from the query string
    let [path, queryString] = hashFragment.split('?');
    // Parse query string into an object
    let queryParams = new URLSearchParams(queryString);

    switch(path) {
        case '/plotlyrender':
            // Pass queryParams or its specific value to the function as needed
            plotlyRenderPage(queryParams.get('data'));
            break;
        case '/latex-to-pdf':
            window.location.replace('latex-to-pdf/');
            break;
        // Define other cases as needed
        default:
            mainPage();
            break;
    }
}

function mainPage() {
    document.getElementById('content').innerHTML = `
        <main class="home">
            <p class="eyebrow">YYHTBS-YYE / TOOLS</p>
            <h1>A few useful things.</h1>
            <p class="home-intro">Simple tools for documents and data, right in your browser.</p>
            <a class="tool-card" href="latex-to-pdf/">
                <span class="tool-symbol" aria-hidden="true">T<sub>E</sub>X</span>
                <h2>LaTeX to PDF <span aria-hidden="true">↗</span></h2>
                <p>Write or upload a LaTeX document, compile it, and download your PDF.</p>
                <span class="tool-link">Open converter <span aria-hidden="true">→</span></span>
            </a>
            <a class="tool-card" href="interactive-optics/">
                <span class="tool-symbol" aria-hidden="true">↗</span>
                <h2>Interactive optics <span aria-hidden="true">↗</span></h2>
                <p>Explore a thin-lens experiment and embed it in Notion or a webpage.</p>
                <span class="tool-link">Open experiment <span aria-hidden="true">→</span></span>
            </a>
        </main>`;
}

function plotlyRenderPage(dataURL) {
    // Ensure the 'content' div includes an element for Plotly to target
    // This line dynamically creates the div where the Plotly chart will be rendered
    document.getElementById('content').innerHTML = '<div id="plotly-chart"></div>';

    if (!dataURL) {
        alert('URL parameter not provided or invalid!');
        return;
    }

    // Assuming jQuery is used to fetch the Plotly data
    $.get(dataURL, function(data) {
        let plotData = JSON.parse(data);
        // Make sure this ID matches the one you've just added to the innerHTML
        Plotly.newPlot('plotly-chart', plotData.data, plotData.layout);
    }).fail(function() {
        alert('Failed to fetch data from the provided URL. Please check the URL and try again.');
    });
}

function errorPage() {
    document.getElementById('content').innerHTML = '<h1>404 Not Found</h1>';
}
