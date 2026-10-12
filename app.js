const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');
const app = express();
//settings like PORT=3003 can go in a .env file next to app.js (node 20.12+); a variable already set in the
//environment wins over the file
try {
    if (process.loadEnvFile) { process.loadEnvFile(path.join(__dirname, '.env')) }
} catch (error) {
    if (error.code != 'ENOENT') { console.error(".env:", error.message) }
}
const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'main')));

app.listen(port, '0.0.0.0', () => {
    console.log("Weatherscan V2 by Mist Weather Media")
    console.log(`Main serving on http://127.0.0.1:${port}`);
  });

app.get('/airports', async (req, res) => {
    try {
        const response = await fetch('https://nasstatus.faa.gov/api/airport-events');
        const airportData = await response.json();
        res.json(airportData);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch airport data' });
    }
})

//npm i http-proxy-middleware
//  ^ THIS IS IMPORTANT ^
app.use('/surf', createProxyMiddleware({
    target: 'https://www.ndbc.noaa.gov/data/latest_obs',
    changeOrigin: true,
    pathRewrite: {'^/latest_obs': '/surf/'},
}));
app.use('/coastalwaters', createProxyMiddleware({
    target: 'https://api.weather.gov/products/types/CWF/locations',
    changeOrigin: true,
    pathRewrite: {'^/locations': '/coastalwaters/'}
}));
//the Great Lakes get a nearshore marine forecast (NSH) instead of a coastal waters forecast
app.use('/nearshore', createProxyMiddleware({
    target: 'https://api.weather.gov/products/types/NSH/locations',
    changeOrigin: true
}));
//NDBC station list, for finding the nearest buoy (NDBC sends no CORS headers)
app.use('/ndbcstations', createProxyMiddleware({
    target: 'https://www.ndbc.noaa.gov',
    changeOrigin: true,
    pathRewrite: () => '/activestations.xml'
}));
app.use('/cwf', createProxyMiddleware({
    target: 'https://api.weather.gov/products',
    changeOrigin: true,
    pathRewrite: {'^/products':'/cwf/'}
}))