const express = require('express');
const fs = require('fs');
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

//the page's code and styles are checked with the server on every load (an unchanged file is a quick 304), so a
//browser doesn't keep running an old copy after an update. phones especially hold on to cached scripts
app.use(express.static(path.join(__dirname, 'main'), {
    setHeaders: (res, file) => {
        if (/\.(html|js|css|json)$/.test(file)) { res.setHeader('Cache-Control', 'no-cache') }
    }
}));

//appearanceSettings.intellistarTiles: a folder of the IntelliStar artwork as z/x/y.png tiles, served at
///intellistar-tiles. the maps get its tiles.json in place of the online tileset's. read when the server starts
function intellistarTilesFolder() {
    for (const name of ['yourConfig.json', 'yourConfig.example.json']) {
        try {
            const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'main', 'configs', name), 'utf8'));
            const folder = config.jsonSystemSettings.appearanceSettings.intellistarTiles;
            return folder ? path.resolve(__dirname, folder) : null;
        } catch (error) {
            if (error.code != 'ENOENT') { console.error(name + ":", error.message); return null }
        }
    }
    return null;
}
const intellistarTiles = intellistarTilesFolder();
if (intellistarTiles) {
    if (fs.existsSync(intellistarTiles)) {
        const zooms = fs.readdirSync(intellistarTiles).filter((name) => /^\d+$/.test(name)).map(Number);
        app.get('/intellistar-tiles/tiles.json', (req, res) => {
            res.json({
                tilejson: '2.2.0',
                tiles: [`${req.protocol}://${req.get('host')}/intellistar-tiles/{z}/{x}/{y}.png`],
                minzoom: Math.min(...zooms),
                maxzoom: Math.max(...zooms),
                tileSize: 256
            });
        });
        app.use('/intellistar-tiles', express.static(intellistarTiles, { maxAge: '1d' }));
        console.log(`IntelliStar artwork from ${intellistarTiles}`);
    } else {
        console.error(`intellistarTiles: ${intellistarTiles} not found`);
    }
}

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