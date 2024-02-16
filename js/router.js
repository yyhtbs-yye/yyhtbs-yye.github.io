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
    if (!dataURL) {
        alert('URL parameter not provided or invalid!');
        return;
    }

    // Now, dataURL is the URL passed from the router, no need to parse it from the window.location
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
