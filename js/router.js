window.addEventListener('load', router);
window.addEventListener('hashchange', router);

function router() {
    const routes = {
        '/': mainPage,
        '/plotlyrender': plotlyRenderPage
    };

    let path = window.location.hash.slice(1) || '/';
    let page = routes[path] ? routes[path] : errorPage;
    page();
}

function mainPage() {
    document.getElementById('content').innerHTML = '<h1>Main Page</h1>';
}

function plotlyRenderPage() {
    // Ensure the 'content' div includes an element for Plotly to target
    document.getElementById('content').innerHTML = '<h1>Plotly Render Page</h1><div id="plotly-chart"></div>';

    // Assuming jQuery and Plotly have been loaded in the HTML file
    // Extract the 'url' parameter from the URL
    let dataURL = new URLSearchParams(window.location.search).get('url');

    if (!dataURL) {
        alert('URL parameter not provided or invalid!');
        return;
    }

    // Fetch the chart data and render the Plotly chart
    $.get(dataURL, function(data) {
        let plotData = JSON.parse(data);
        Plotly.newPlot('plotly-chart', plotData.data, plotData.layout);
    }).fail(function() {
        alert('Failed to fetch data from the provided URL. Please check the URL and try again.');
    });
}

function errorPage() {
    document.getElementById('content').innerHTML = '<h1>404 Not Found</h1>';
}
