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
//water temps card: NOAA CoastWatch MUR sea surface temperature. that server sends no CORS headers, so the page asks
//here with the map's edges and gets ERDDAP's JSON back. each area is kept and refetched in the background, since the
//analysis only changes once a day and CoastWatch is slow and sometimes down; a failed refetch keeps the last copy
const sstURL = 'https://coastwatch.pfeg.noaa.gov/erddap/griddap/jplMURSST41.json';
const sstRefresh = 6 * 60 * 60 * 1000;
//areas nobody has asked for in this long stop being refetched
const sstForget = 2 * 24 * 60 * 60 * 1000;
const sstCache = new Map();
async function fetchSST(query) {
    let lastError;
    for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) { await new Promise((resolve) => setTimeout(resolve, 5000)) }
        try {
            const response = await fetch(sstURL + '?' + encodeURIComponent(query));
            const text = await response.text();
            if (!response.ok || !text.trim().startsWith('{')) { throw new Error(`ERDDAP ${response.status}: ${text.slice(0, 200)}`) }
            return text;
        } catch (error) {
            lastError = error;
        }
    }
    throw lastError;
}
function refreshSST(entry) {
    if (!entry.pending) {
        entry.pending = fetchSST(entry.query)
            .then((text) => { entry.text = text; entry.fetched = Date.now() })
            .catch((error) => { console.error('water temps:', error.message); if (!entry.text) { throw error } })
            .finally(() => { entry.pending = null });
    }
    return entry.pending;
}
app.get('/water-temps', async (req, res) => {
    const edges = ['south', 'north', 'west', 'east'].map((edge) => Number(req.query[edge]));
    if (edges.some((edge) => !Number.isFinite(edge) || Math.abs(edge) > 180)) {
        return res.status(400).json({ error: 'south, north, west and east are needed' });
    }
    const [south, north, west, east] = edges.map((edge) => edge.toFixed(2));
    //latest MUR analysis (0.01 degree), thinned to every 20th point
    const query = `analysed_sst[(last)][(${south}):20:(${north})][(${west}):20:(${east})]`;
    let entry = sstCache.get(query);
    if (!entry) { entry = { query }; sstCache.set(query, entry) }
    entry.asked = Date.now();
    try {
        if (!entry.text) { await refreshSST(entry) }
        else if (Date.now() - entry.fetched > sstRefresh) { refreshSST(entry).catch(() => {}) }
        res.type('json').send(entry.text);
    } catch (error) {
        res.status(502).json({ error: 'CoastWatch unavailable' });
    }
});
setInterval(() => {
    for (const [query, entry] of sstCache) {
        if (Date.now() - entry.asked > sstForget) { sstCache.delete(query) }
        else if (Date.now() - entry.fetched > sstRefresh) { refreshSST(entry).catch(() => {}) }
    }
}, 15 * 60 * 1000);

app.use('/cwf', createProxyMiddleware({
    target: 'https://api.weather.gov/products',
    changeOrigin: true,
    pathRewrite: {'^/products':'/cwf/'}
}))