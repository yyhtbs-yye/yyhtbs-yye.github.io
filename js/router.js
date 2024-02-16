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
        // Define other cases as needed
        default:
            // Handle default case
            break;
    }
}

function mainPage() {
    document.getElementById('content').innerHTML = '<h1>Main Page</h1>';
}

function plotlyRenderPage(dataURL) {
    // Ensure the 'content' div includes an element for Plotly to target
    // This line dynamically creates the div where the Plotly chart will be rendered
    document.getElementById('content').innerHTML = '<h1>Plotly Render Page</h1><div id="plotly-chart"></div>';

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
