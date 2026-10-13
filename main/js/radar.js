var mapStyle = "mapbox://styles/colster/cmiccqynn00as01s4bt6501il";
//the echo maps only draw radar layers, so they start from an empty style. mapStyle's own layers were all
//hidden there, and three of its tilesets no longer load (the "Ve" 404 errors in the console).
//it's a file rather than an inline object: mapbox finishes an inline style on the next animation frame,
//which a background tab never gets, and the radar layers are added before that
var echoStyle = new URL("maps/empty-style.json", window.location.href).href;
var satZoom = 5;
//local radar variables
var locradar, satmap, satAmenities, locradarAmenities, locradarAmenitiesTrans, radarEchoes, satEchoes, miniradar, miniradarAmenitiesTrans, miniEchoes;
//timestamps
var trafficMap
var locRadarTimestamps, locRadarAnimation;
var satRadarTimestamps, satRadarAnimation;
var miniRadarTimestamps, miniRadarAnimation;
var locradarani, satradani, miniradarani;
//the radar draws above the city names, shields and boundaries; this much opacity lets them show through light echoes
var radarEchoOpacity = 0.85;
//count the doppler and radar/satellite showings, so cleanup from one showing skips a newer one of the same card
var dopplerShowing = 0, satShowing = 0;
mapboxgl.accessToken = "";
//map style from the original web simulator. the basemaps draw it without city labels,
//and the overlays above the radar echoes draw only its boundaries, highways and city labels.
//false goes back to the v2 basemap and amenity lines; set from appearanceSettings.mapLook in initializeRadars
var legacyMaps = true;
//a copy of the original account's style lives in maps/legacy so it doesn't depend on that account.
//loadLegacyStyle() swaps this URL for the loaded style before any map is made
var legacyStyle = "maps/legacy/style.json";
//the "copy" layers are the drop shadows for the labels
var legacyCityLayers = ['settlement-minor-label copy', 'settlement-major-label copy', 'settlement-minor-label', 'settlement-major-label', 'main-city-label'];
var legacyOverlayLayers = legacyCityLayers.concat([
  'admin-2-boundary-bg', 'admin-1-boundary-bg', 'admin-0-boundary-bg',
  'admin-2-boundary', 'admin-1-boundary', 'admin-0-boundary', 'admin-0-boundary-disputed', 'country-boundaries',
  'road-number-shield'
]);
//highway lines stay in the basemap, under the radar echoes; labels, shields and boundaries go over them
function setupLegacyBase(map) {
  //shields are drawn by the overlay; a basemap copy would sit underneath the overlay's highways
  legacyCityLayers.concat(['road-number-shield']).forEach(function (layer) {
    map.setLayoutProperty(layer, 'visibility', 'none');
  });
}
function setupLegacyOverlay(map) {
  map.getStyle().layers.forEach(function (layer) {
    if (!legacyOverlayLayers.includes(layer.id)) {
      map.setLayoutProperty(layer.id, 'visibility', 'none');
    }
  });
  fixLegacyCityLabels(map);
  styleRadarCityLabels(map, map === miniradarAmenitiesTrans ? radarCityLook.mini : radarCityLook.radar);
}
//v2 drew the radar city names as page text: light grey with a dark outline and a drop shadow, 43px Frutiger
//Black on the doppler and 28px Interstate on the mini radar. the style's own labels are made to match:
//sizes by city rank (biggest first), and the "copy" layers under the names become the shadow
var radarCityLook = {
  radar: { sizes: [42, 38, 34], outline: 1.5, shadow: [2, 5] },
  mini: { sizes: [28, 26, 24], outline: 1, shadow: [2, 4] }
};
function styleRadarCityLabels(map, look) {
  var size = ['step', ['get', 'symbolrank'], look.sizes[0], 9, look.sizes[1], 11, look.sizes[2]];
  legacyCityLayers.forEach(function (layer) {
    var shadow = layer.endsWith(' copy');
    map.setLayoutProperty(layer, 'text-size', size);
    map.setPaintProperty(layer, 'text-color', shadow ? 'rgba(20, 20, 20, 1)' : 'rgb(230, 230, 230)');
    map.setPaintProperty(layer, 'text-halo-color', 'rgba(20, 20, 20, 1)');
    map.setPaintProperty(layer, 'text-halo-width', look.outline);
    map.setPaintProperty(layer, 'text-halo-blur', shadow ? 1 : 0);
    map.setPaintProperty(layer, 'text-translate', shadow ? look.shadow : [0, 0]);
  });
}
function fixLegacyCityLabels(map) {
  legacyCityLayers.forEach(function (layer) {
    //the style shifts every dot 20px south of the city; put the dot on the city and the name above it
    map.setPaintProperty(layer, 'icon-translate', [0, 0]);
    map.setLayoutProperty(layer, 'text-anchor', 'bottom');
    map.setLayoutProperty(layer, 'text-justify', 'center');
    map.setLayoutProperty(layer, 'text-offset', [0, -0.5]);
    //bigger cities win label collisions now that every name sits in the same spot above its dot
    map.setLayoutProperty(layer, 'symbol-sort-key', ['get', 'symbolrank']);
  });
  getLegacyDot(map.getStyle().sprite).then(function (dot) {
    if (!map.hasImage('legacy-dot')) { map.addImage('legacy-dot', dot) }
    legacyCityLayers.forEach(function (layer) {
      map.setLayoutProperty(layer, 'icon-image', 'legacy-dot');
      map.setLayoutProperty(layer, 'icon-size', 1);
    });
  }).catch(function (error) {
    console.error("legacy city dot", error);
  });
}

//the style's dot is a 500x500 sprite drawn at 0.13 scale, mostly transparent padding,
//and mapbox draws it up and to the left of the city. trimming it to a 16px image puts it on the city.
var legacyDotPromise;
function getLegacyDot(spriteURL) {
  if (legacyDotPromise) { return legacyDotPromise }
  //the bundled style's sprite is a plain URL; a mapbox:// one is fetched through the styles API
  var spriteFile = function (ext) { return spriteURL + ext };
  if (spriteURL.startsWith("mapbox://")) {
    var base = spriteURL.replace("mapbox://sprites/", "https://api.mapbox.com/styles/v1/");
    spriteFile = function (ext) { return base + "/sprite" + ext + "?access_token=" + map_key };
  }
  legacyDotPromise = fetch(spriteFile(".json"))
    .then(function (response) { return response.json() })
    .then(function (sprite) {
      var rect = sprite['dot (1)'];
      return new Promise(function (resolve, reject) {
        var img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = function () {
          var full = document.createElement('canvas');
          full.width = rect.width;
          full.height = rect.height;
          var fctx = full.getContext('2d');
          fctx.drawImage(img, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);
          //find the opaque part of the sprite
          var alpha = fctx.getImageData(0, 0, rect.width, rect.height).data;
          var minX = rect.width, minY = rect.height, maxX = 0, maxY = 0;
          for (var y = 0; y < rect.height; y++) {
            for (var x = 0; x < rect.width; x++) {
              if (alpha[(y * rect.width + x) * 4 + 3] > 0) {
                minX = Math.min(minX, x); maxX = Math.max(maxX, x);
                minY = Math.min(minY, y); maxY = Math.max(maxY, y);
              }
            }
          }
          var side = Math.max(maxX - minX, maxY - minY) + 1;
          var size = Math.round(side * 0.13);
          var dot = document.createElement('canvas');
          dot.width = size;
          dot.height = size;
          var dctx = dot.getContext('2d');
          dctx.drawImage(full, minX, minY, side, side, 0, 0, size, size);
          resolve(dctx.getImageData(0, 0, size, size));
        };
        img.onerror = reject;
        img.src = spriteFile(".png");
      });
    });
  return legacyDotPromise;
}
function hideAllLayers(map) {
  map.getStyle().layers.forEach(function (layer) {
    map.setLayoutProperty(layer.id, 'visibility', 'none');
  });
}
//mapbox only takes an absolute sprite URL, so the style file's relative one is resolved against this page
//the main city keeps its dot and name when bigger neighbors would crowd it out: a copy of the city label layer
//showing only the map's own label for it, on top of the style so it's placed first and wins any collision.
//same tiles, size and look as every other city. it's in legacyCityLayers, so it's styled and shown with them.
//no shadow copy: the other cities' shadow layers lose the collision with their own names, so none of them show one.
//where the map's tiles leave the town out (small towns on the zoomed-out card maps), there's nothing to show
function addMainCityLabel(style) {
  var name = systemSettings.mainCity.locationName;
  //near the main city too, since names repeat (there's a Natchez in Louisiana as well as Mississippi)
  var lon = Number(systemSettings.mainCity.lon), lat = Number(systemSettings.mainCity.lat), r = 0.2;
  var nearby = { type: 'Polygon', coordinates: [[[lon - r, lat - r], [lon + r, lat - r], [lon + r, lat + r], [lon - r, lat + r], [lon - r, lat - r]]] };
  ['settlement-minor-label'].forEach(function (id) {
    var layer = JSON.parse(JSON.stringify(style.layers.find(function (l) { return l.id == id })));
    layer.id = 'main-city-label';
    //any rank or zoom the tiles have it at, rather than only the ranks the style shows at each zoom
    layer.filter = ['all',
      ['match', ['get', 'class'], ['settlement', 'disputed_settlement'], true, false],
      ['match', ['get', 'worldview'], ['all', 'US'], true, false],
      ['==', ['coalesce', ['get', 'name_en'], ['get', 'name']], name],
      ['within', nearby]
    ];
    delete layer.minzoom;
    delete layer.maxzoom;
    layer.layout['text-allow-overlap'] = true;
    layer.layout['icon-allow-overlap'] = true;
    style.layers.push(layer);
  });
}
function countryLabelsShown() {
  return systemSettings.appearanceSettings.countryLabels == true;
}
async function loadLegacyStyle() {
  if (legacyMaps && typeof legacyStyle == "string") {
    var style = await (await fetch(legacyStyle)).json();
    style.sprite = new URL(style.sprite, window.location.href).href;
    //country names ("United States") only when appearanceSettings.countryLabels is on
    style.layers.filter(function (layer) { return layer.id == 'country-label' }).forEach(function (layer) {
      layer.layout = Object.assign({}, layer.layout, { visibility: countryLabelsShown() ? 'visible' : 'none' });
    });
    addMainCityLabel(style);
    legacyStyle = style;
  }
  //the label maps (and the card maps with either look) draw their text from these page fonts, so they have to be loaded first
  await Promise.all(Object.values(legacyLabelFonts).map(function (family) {
    return Promise.all([document.fonts.load("normal 40px " + family), document.fonts.load("bold 40px " + family)]).catch(function () {});
  }));
}
//every map's text (city, state and water names, shields) in v2's fonts rather than the style's Hind and DIN:
//mapbox draws the labels in the browser from the page's own font (localFontFamily) instead of downloading the
//style's glyphs. the mini radar uses interstate like v2's l-bar; everything else frutiger black
var legacyLabelFonts = { radar: "'Frutiger Black'", mini: "'Interstate'" };
function legacyLabelOptions(font) {
  return legacyMaps ? { localFontFamily: legacyLabelFonts[font] } : {};
}
async function initializeRadars() {
  //appearanceSettings.mapLook "intellistar" goes back to v2's IntelliStar basemap (mapStyle) everywhere.
  //#maplook=intellistar (or legacy) in the URL tries a look for that page load
  var look = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("maplook") || systemSettings.appearanceSettings.mapLook;
  legacyMaps = look != "intellistar";
  await loadLegacyStyle();
  mapboxgl.accessToken = map_key;
  miniradar = new mapboxgl.Map({
    ...legacyLabelOptions('mini'),
    container: 'miniradar-basemap', // container id
    style: legacyMaps ? legacyStyle : mapStyle,
    center: [systemSettings.LBar.radar.lon, systemSettings.LBar.radar.lat],
    zoom: systemSettings.LBar.radar.zoom,
    trackResize: false
  });
  miniradar.on('load', function () {
    if (legacyMaps) { setupLegacyBase(miniradar); return }
    miniradar.setLayoutProperty('background', 'visibility', 'visible');//ocean
    miniradar.setLayoutProperty('hawaii local', 'visibility', 'visible');//hawaii mercator
    miniradar.setLayoutProperty('hawaii regional', 'visibility', 'none');//hawaii lambert
    miniradar.setLayoutProperty('alaska', 'visibility', 'visible');//alaska
    miniradar.setLayoutProperty('conus merc', 'visibility', 'visible');//conus mercator
    miniradar.setLayoutProperty('conus sat', 'visibility', 'none');//conus lambert
    miniradar.setLayoutProperty('i2-county-lines-conus-ak-hi-81h5x4', 'visibility', 'visible');//county lines
    miniradar.setLayoutProperty('cb-2019-us-state-20m-nocoast-7m1rrd', 'visibility', 'visible');//state lines
    miniradar.setLayoutProperty('i2-coastlines-conus-ak-hi-06wtga', 'visibility', 'visible');//coastlines
    miniradar.setLayoutProperty('i2-road-vectors-conus-ak-hi-4r25d3', 'visibility', 'visible');//black roads
    miniradar.setLayoutProperty('i2-road-vectors-conus-ak-hi-4r25d3 copy', 'visibility', 'visible');//gray roads
    miniradar.setLayoutProperty('i2-road-vectors-conus-ak-hi-4r25d3 (2)', 'visibility', 'none');
    miniradar.setLayoutProperty('place-label', 'visibility', 'none');
    miniradar.setLayoutProperty('place-label copy', 'visibility', 'none');
    miniradar.setLayoutProperty('airport-label', 'visibility', 'none');
    miniradar.setLayoutProperty('i2-road-vectors-conus-ak-hi-4r25d3 (4)', 'visibility', 'none');
    miniradar.setLayoutProperty('country-boundaries', 'visibility', 'visible');

    miniradar.setPaintProperty('i2-coastlines-conus-ak-hi-06wtga', "line-width", 2)
    miniradar.setPaintProperty('i2-county-lines-conus-ak-hi-81h5x4', "line-width", 2)
    miniradar.setPaintProperty('cb-2019-us-state-20m-nocoast-7m1rrd', "line-width", 4)
    miniradar.setPaintProperty('i2-road-vectors-conus-ak-hi-4r25d3', "line-width", 12)
    miniradar.setPaintProperty('i2-road-vectors-conus-ak-hi-4r25d3 copy', "line-width", 4)
  });

  miniradarAmenitiesTrans = new mapboxgl.Map({
    ...legacyLabelOptions('mini'),
    container: 'miniradar-amenities-trans', // container id
    style: legacyMaps ? legacyStyle : mapStyle,
    center: [systemSettings.LBar.radar.lon, systemSettings.LBar.radar.lat],
    zoom: systemSettings.LBar.radar.zoom,
    trackResize: false
  });
  miniradarAmenitiesTrans.on('load', function () {
    if (legacyMaps) { setupLegacyOverlay(miniradarAmenitiesTrans); return }
    miniradarAmenitiesTrans.setLayoutProperty('background', 'visibility', 'none');//ocean
    miniradarAmenitiesTrans.setLayoutProperty('hawaii local', 'visibility', 'none');//hawaii mercator
    miniradarAmenitiesTrans.setLayoutProperty('hawaii regional', 'visibility', 'none');//hawaii lambert
    miniradarAmenitiesTrans.setLayoutProperty('alaska', 'visibility', 'none');//alaska
    miniradarAmenitiesTrans.setLayoutProperty('conus merc', 'visibility', 'none');//conus mercator
    miniradarAmenitiesTrans.setLayoutProperty('conus sat', 'visibility', 'none');//conus lambert
    miniradarAmenitiesTrans.setLayoutProperty('i2-county-lines-conus-ak-hi-81h5x4', 'visibility', 'visible');//county lines
    miniradarAmenitiesTrans.setLayoutProperty('cb-2019-us-state-20m-nocoast-7m1rrd', 'visibility', 'visible');//state lines
    miniradarAmenitiesTrans.setLayoutProperty('i2-coastlines-conus-ak-hi-06wtga', 'visibility', 'visible');//coastlines
    miniradarAmenitiesTrans.setLayoutProperty('i2-road-vectors-conus-ak-hi-4r25d3', 'visibility', 'none');//black roads
    miniradarAmenitiesTrans.setLayoutProperty('i2-road-vectors-conus-ak-hi-4r25d3 copy', 'visibility', 'visible');//gray roads
    miniradarAmenitiesTrans.setLayoutProperty('i2-road-vectors-conus-ak-hi-4r25d3 (2)', 'visibility', 'none');
    miniradarAmenitiesTrans.setLayoutProperty('place-label', 'visibility', 'none');
    miniradarAmenitiesTrans.setLayoutProperty('place-label copy', 'visibility', 'none');
    miniradarAmenitiesTrans.setLayoutProperty('airport-label', 'visibility', 'none');
    miniradarAmenitiesTrans.setLayoutProperty('i2-road-vectors-conus-ak-hi-4r25d3 (4)', 'visibility', 'none');
    miniradarAmenitiesTrans.setLayoutProperty('country-boundaries', 'visibility', 'visible');

    miniradarAmenitiesTrans.setPaintProperty('i2-coastlines-conus-ak-hi-06wtga', "line-width", 2)
    miniradarAmenitiesTrans.setPaintProperty('i2-county-lines-conus-ak-hi-81h5x4', "line-width", 2)
    miniradarAmenitiesTrans.setPaintProperty('cb-2019-us-state-20m-nocoast-7m1rrd', "line-width", 4)
    miniradarAmenitiesTrans.setPaintProperty('i2-road-vectors-conus-ak-hi-4r25d3', "line-width", 12)
    miniradarAmenitiesTrans.setPaintProperty('i2-road-vectors-conus-ak-hi-4r25d3 copy', "line-width", 4)
  });

  miniEchoes = new mapboxgl.Map({
    container: 'mini-echoes', // container id
    style: echoStyle,
    center: [systemSettings.LBar.radar.lon, systemSettings.LBar.radar.lat],
    zoom: systemSettings.LBar.radar.zoom,
    trackResize: false
  });
  miniEchoes.on('load', function () {
  });
  miniEchoes.on('error', (e) =>{
    // if(String(e.error).startsWith("Error: IDs can't be empty.")){
    //   return;
    // }
    // console.error(e.error);
    // console.log(String(e.error));
    return;
  })

  mapboxgl.accessToken = map_key
  locradar = new mapboxgl.Map({
    ...legacyLabelOptions('radar'),
    container: 'radar-basemap', // container id
    style: legacyMaps ? legacyStyle : mapStyle,
    center: [systemSettings.mainCity.lon, systemSettings.mainCity.lat],
    zoom: 7.2,
    trackResize: false
  });
  locradar.on('load', function () {
    if (legacyMaps) { setupLegacyBase(locradar); return }
    locradar.setLayoutProperty('background', 'visibility', 'visible');//ocean
    locradar.setLayoutProperty('hawaii local', 'visibility', 'visible');//alaska mercator
    locradar.setLayoutProperty('hawaii regional', 'visibility', 'visible');//hawaii lambert
    locradar.setLayoutProperty('alaska', 'visibility', 'visible');//alaska
    locradar.setLayoutProperty('conus merc', 'visibility', 'visible');//conus mercator
    locradar.setLayoutProperty('conus sat', 'visibility', 'none');//conus lambert
    locradar.setLayoutProperty('i2-county-lines-conus-ak-hi-81h5x4', 'visibility', 'none');//county lines
    locradar.setLayoutProperty('cb-2019-us-state-20m-nocoast-7m1rrd', 'visibility', 'none');//state lines
    locradar.setLayoutProperty('i2-coastlines-conus-ak-hi-06wtga', 'visibility', 'none');//coastlines
    locradar.setLayoutProperty('i2-road-vectors-conus-ak-hi-4r25d3', 'visibility', 'none');//black roads
    locradar.setLayoutProperty('i2-road-vectors-conus-ak-hi-4r25d3 copy', 'visibility', 'none');//gray roads
    locradar.setLayoutProperty('i2-road-vectors-conus-ak-hi-4r25d3 (2)', 'visibility', 'none');
    locradar.setLayoutProperty('place-label', 'visibility', 'none');
    locradar.setLayoutProperty('place-label copy', 'visibility', 'none');
    locradar.setLayoutProperty('airport-label', 'visibility', 'none');
    locradar.setLayoutProperty('i2-road-vectors-conus-ak-hi-4r25d3 (4)', 'visibility', 'none');
    locradar.setLayoutProperty('country-boundaries', 'visibility', 'none');
  });

  satmap = new mapboxgl.Map({
    ...legacyLabelOptions('radar'),
    container: 'sat-basemap', // container id
    style: legacyMaps ? legacyStyle : mapStyle,
    center: [systemSettings.mainCity.lon, systemSettings.mainCity.lat],
    zoom: satZoom,
    trackResize: false,
    projection: {
      name: 'lambertConformalConic',
      center: [-100, 45],
      parallels: [30, 30]
    },
  });
  satmap.on('load', function () {
    if (legacyMaps) { setupLegacyBase(satmap); return }
    satmap.setLayoutProperty('background', 'visibility', 'visible');//ocean
    satmap.setLayoutProperty('hawaii local', 'visibility', 'none');//alaska mercator
    satmap.setLayoutProperty('hawaii regional', 'visibility', 'visible');//hawaii lambert
    satmap.setLayoutProperty('alaska', 'visibility', 'visible');//alaska
    satmap.setLayoutProperty('conus merc', 'visibility', 'none');//conus mercator
    satmap.setLayoutProperty('conus sat', 'visibility', 'visible');//conus lambert
    satmap.setLayoutProperty('i2-county-lines-conus-ak-hi-81h5x4', 'visibility', 'none');//county lines
    satmap.setLayoutProperty('cb-2019-us-state-20m-nocoast-7m1rrd', 'visibility', 'none');//state lines
    satmap.setLayoutProperty('i2-coastlines-conus-ak-hi-06wtga', 'visibility', 'none');//coastlines
    satmap.setLayoutProperty('i2-road-vectors-conus-ak-hi-4r25d3', 'visibility', 'none');//black roads
    satmap.setLayoutProperty('i2-road-vectors-conus-ak-hi-4r25d3 copy', 'visibility', 'none');//gray roads
    satmap.setLayoutProperty('i2-road-vectors-conus-ak-hi-4r25d3 (2)', 'visibility', 'none');
    satmap.setLayoutProperty('place-label', 'visibility', 'none');
    satmap.setLayoutProperty('place-label copy', 'visibility', 'none');
    satmap.setLayoutProperty('airport-label', 'visibility', 'none');
    satmap.setLayoutProperty('i2-road-vectors-conus-ak-hi-4r25d3 (4)', 'visibility', 'none');
    satmap.setLayoutProperty('country-boundaries', 'visibility', 'none');
  });

  radarEchoes = new mapboxgl.Map({
    container: 'radar-echoes', // container id
    style: echoStyle,
    center: [systemSettings.mainCity.lon, systemSettings.mainCity.lat],
    zoom: 7.2,
    trackResize: false
  });
  radarEchoes.on('load', function () {
  });

  satEchoes = new mapboxgl.Map({
    container: 'sat-echoes', // container id
    style: echoStyle,
    center: [systemSettings.mainCity.lon, systemSettings.mainCity.lat],
    zoom: satZoom,
    trackResize: false,
    projection: {
      name: 'lambertConformalConic',
      center: [-100, 45],
      parallels: [30, 30]
    },
  });
  satEchoes.on('load', function () {
  });

  satAmenities = new mapboxgl.Map({
    ...legacyLabelOptions('radar'),
    container: 'sat-amenities', // container id
    style: legacyMaps ? legacyStyle : mapStyle,
    center: [systemSettings.mainCity.lon, systemSettings.mainCity.lat],
    zoom: satZoom,
    trackResize: false,
    projection: {
      name: 'lambertConformalConic',
      center: [-100, 45],
      parallels: [30, 30]
    },
  });

  satAmenities.on('load', function () {
    if (legacyMaps) { setupLegacyOverlay(satAmenities); return }
    satAmenities.setLayoutProperty('background', 'visibility', 'none');//ocean
    satAmenities.setLayoutProperty('hawaii local', 'visibility', 'none');//alaska mercator
    satAmenities.setLayoutProperty('hawaii regional', 'visibility', 'none');//hawaii lambert
    satAmenities.setLayoutProperty('alaska', 'visibility', 'none');//alaska
    satAmenities.setLayoutProperty('conus merc', 'visibility', 'none');//conus mercator
    satAmenities.setLayoutProperty('conus sat', 'visibility', 'none');//conus lambert
    satAmenities.setLayoutProperty('i2-county-lines-conus-ak-hi-81h5x4', 'visibility', 'none');//county lines
    satAmenities.setLayoutProperty('cb-2019-us-state-20m-nocoast-7m1rrd', 'visibility', 'visible');//state lines
    satAmenities.setPaintProperty('cb-2019-us-state-20m-nocoast-7m1rrd', "line-width", 4)
    satAmenities.setLayoutProperty('i2-coastlines-conus-ak-hi-06wtga', 'visibility', 'visible');//coastlines
    satAmenities.setPaintProperty('i2-coastlines-conus-ak-hi-06wtga', "line-width", 4)
    satAmenities.setLayoutProperty('i2-road-vectors-conus-ak-hi-4r25d3', 'visibility', 'none');//black roads
    satAmenities.setLayoutProperty('i2-road-vectors-conus-ak-hi-4r25d3 copy', 'visibility', 'none');//gray roads
    satAmenities.setLayoutProperty('i2-road-vectors-conus-ak-hi-4r25d3 (2)', 'visibility', 'none');
    satAmenities.setLayoutProperty('place-label', 'visibility', 'none');
    satAmenities.setLayoutProperty('place-label copy', 'visibility', 'none');
    satAmenities.setLayoutProperty('airport-label', 'visibility', 'none');
    satAmenities.setLayoutProperty('i2-road-vectors-conus-ak-hi-4r25d3 (4)', 'visibility', 'none');
    satAmenities.setLayoutProperty('country-boundaries', 'visibility', 'visible');
    satAmenities.setPaintProperty('country-boundaries', "line-width", 4)
  });
  locradarAmenities = new mapboxgl.Map({
    container: 'radar-amenities', // container id
    style: legacyMaps ? echoStyle : mapStyle,
    center: [systemSettings.mainCity.lon, systemSettings.mainCity.lat],
    zoom: 7.2,
    trackResize: false
  });
  locradarAmenities.on('load', function () {
    //the legacy basemap already has roads and county lines under the echoes
    if (legacyMaps) { return }
    locradarAmenities.setLayoutProperty('background', 'visibility', 'none');//ocean
    locradarAmenities.setLayoutProperty('hawaii local', 'visibility', 'none');//alaska mercator
    locradarAmenities.setLayoutProperty('hawaii regional', 'visibility', 'none');//hawaii lambert
    locradarAmenities.setLayoutProperty('alaska', 'visibility', 'none');//alaska
    locradarAmenities.setLayoutProperty('conus merc', 'visibility', 'none');//conus mercator
    locradarAmenities.setLayoutProperty('conus sat', 'visibility', 'none');//conus lambert
    locradarAmenities.setLayoutProperty('i2-county-lines-conus-ak-hi-81h5x4', 'visibility', 'visible');//county lines
    locradarAmenities.setLayoutProperty('cb-2019-us-state-20m-nocoast-7m1rrd', 'visibility', 'visible');//state lines
    locradarAmenities.setLayoutProperty('i2-coastlines-conus-ak-hi-06wtga', 'visibility', 'visible');//coastlines
    locradarAmenities.setLayoutProperty('i2-road-vectors-conus-ak-hi-4r25d3', 'visibility', 'visible');//black roads
    locradarAmenities.setLayoutProperty('i2-road-vectors-conus-ak-hi-4r25d3 copy', 'visibility', 'visible');//gray roads
    locradarAmenities.setLayoutProperty('i2-road-vectors-conus-ak-hi-4r25d3 (2)', 'visibility', 'none');
    locradarAmenities.setLayoutProperty('place-label', 'visibility', 'none');
    locradarAmenities.setLayoutProperty('place-label copy', 'visibility', 'none');
    locradarAmenities.setLayoutProperty('airport-label', 'visibility', 'none');
    locradarAmenities.setLayoutProperty('i2-road-vectors-conus-ak-hi-4r25d3 (4)', 'visibility', 'none');
    locradarAmenities.setLayoutProperty('country-boundaries', 'visibility', 'visible');

    locradarAmenities.setPaintProperty('i2-coastlines-conus-ak-hi-06wtga', "line-width", 3)
    locradarAmenities.setPaintProperty('i2-county-lines-conus-ak-hi-81h5x4', "line-width", 3)
    locradarAmenities.setPaintProperty('cb-2019-us-state-20m-nocoast-7m1rrd', "line-width", 7)
    locradarAmenities.setPaintProperty('i2-road-vectors-conus-ak-hi-4r25d3', "line-width", 16)
    locradarAmenities.setPaintProperty('i2-road-vectors-conus-ak-hi-4r25d3 copy', "line-width", 6)
  });

  locradarAmenitiesTrans = new mapboxgl.Map({
    ...legacyLabelOptions('radar'),
    container: 'radar-amenities-trans', // container id
    style: legacyMaps ? legacyStyle : mapStyle,
    center: [systemSettings.mainCity.lon, systemSettings.mainCity.lat],
    zoom: 7.2,
    trackResize: false
  });
  locradarAmenitiesTrans.on('load', function () {
    if (legacyMaps) { setupLegacyOverlay(locradarAmenitiesTrans); return }
    locradarAmenitiesTrans.setLayoutProperty('background', 'visibility', 'none');//ocean
    locradarAmenitiesTrans.setLayoutProperty('hawaii local', 'visibility', 'none');//alaska mercator
    locradarAmenitiesTrans.setLayoutProperty('hawaii regional', 'visibility', 'none');//hawaii lambert
    locradarAmenitiesTrans.setLayoutProperty('alaska', 'visibility', 'none');//alaska
    locradarAmenitiesTrans.setLayoutProperty('conus merc', 'visibility', 'none');//conus mercator
    locradarAmenitiesTrans.setLayoutProperty('conus sat', 'visibility', 'none');//conus lambert
    locradarAmenitiesTrans.setLayoutProperty('i2-county-lines-conus-ak-hi-81h5x4', 'visibility', 'visible');//county lines
    locradarAmenitiesTrans.setLayoutProperty('cb-2019-us-state-20m-nocoast-7m1rrd', 'visibility', 'visible');//state lines
    locradarAmenitiesTrans.setLayoutProperty('i2-coastlines-conus-ak-hi-06wtga', 'visibility', 'visible');//coastlines
    locradarAmenitiesTrans.setLayoutProperty('i2-road-vectors-conus-ak-hi-4r25d3', 'visibility', 'none');//black roads
    locradarAmenitiesTrans.setLayoutProperty('i2-road-vectors-conus-ak-hi-4r25d3 copy', 'visibility', 'visible');//gray roads
    locradarAmenitiesTrans.setLayoutProperty('i2-road-vectors-conus-ak-hi-4r25d3 (2)', 'visibility', 'none');
    locradarAmenitiesTrans.setLayoutProperty('place-label', 'visibility', 'none');
    locradarAmenitiesTrans.setLayoutProperty('place-label copy', 'visibility', 'none');
    locradarAmenitiesTrans.setLayoutProperty('airport-label', 'visibility', 'none');
    locradarAmenitiesTrans.setLayoutProperty('i2-road-vectors-conus-ak-hi-4r25d3 (4)', 'visibility', 'none');
    locradarAmenitiesTrans.setLayoutProperty('country-boundaries', 'visibility', 'visible');

    locradarAmenitiesTrans.setPaintProperty('i2-coastlines-conus-ak-hi-06wtga', "line-width", 3)
    locradarAmenitiesTrans.setPaintProperty('i2-county-lines-conus-ak-hi-81h5x4', "line-width", 3)
    locradarAmenitiesTrans.setPaintProperty('cb-2019-us-state-20m-nocoast-7m1rrd', "line-width", 7)
    locradarAmenitiesTrans.setPaintProperty('i2-road-vectors-conus-ak-hi-4r25d3 copy', "line-width", 6)
  });
  try {
    trafficMap = new mapboxgl.Map({
      container: 'trafmap',
      style: "mapbox://styles/colster/cmrgo0laa007z01s7bpym4u63",
      center: [systemSettings.mainCity.lon, systemSettings.mainCity.lat],
      zoom: 7.2,
      trackResize: false,
      interactive: false
    });
    trafficMap.jumpTo({center: [systemSettings.traffic.lon, systemSettings.traffic.lat]});
    weatherData.trafficMapUnavailable = false
  } catch (error) {
    console.error(error)
    weatherData.trafficMapUnavailable = true
  }  
}

//LOCAL DOPPLER RADAR
async function getLocRadarTimestamps() {
  //36 frames, 3 hours
  var frameCount = 36;
  const response = await fetch(`https://api.weather.com/v3/TileServer/series/productSet/PPAcore?filter=twcRadarMosaic&apiKey=${api_key}`);
  const data = await response.json();
  locRadarTimestamps = data.seriesInfo.twcRadarMosaic.series.sort((a, b) => a.ts - b.ts).slice(-frameCount)
}
async function addLocRadarLayers() {
  for (let tstamp of locRadarTimestamps) {
    var timestamp = tstamp.ts
    if (!radarEchoes.getSource(`radar_${timestamp}`)) {
      radarEchoes.addSource(`radar_${timestamp}`, {
        type: "raster",
        tiles: [`https://api.weather.com/v3/TileServer/tile/twcRadarMosaic?ts=${timestamp}&xyz={x}:{y}:{z}&apiKey=${api_key}`],
        tileSize: 512,
        minzoom: 5,
        maxzoom: 12
      });
    }
    if (!radarEchoes.getLayer(`radarlayer_${timestamp}`)) {
      radarEchoes.addLayer({
        id: `radarlayer_${timestamp}`,
        type: "raster",
        source: `radar_${timestamp}`,
        layout: { visibility: "none" },
        paint: { "raster-opacity": radarEchoOpacity, "raster-fade-duration": 0, "raster-brightness-max": 0.9 }
      });
    }
  }
}
async function animateLocalRadar() {
  var validLayers = locRadarTimestamps.map((tss) => `radarlayer_${tss.ts}`);
  if (validLayers.length === 0) {
    throw new Error("No radar layers available for animation.");
  }
  //a loop still running from an earlier showing would step past the last frame
  clearInterval(locradarani);
  clearInterval(locRadarAnimation);

  validLayers.forEach((layerId) => radarEchoes.setLayoutProperty(layerId, "visibility", "none"));
  let frameidx = 0;
  //one pass through the frames. each pass stops the one before it and clears its own interval, since
  //in a throttled background tab a pass can outlast the 4 second restart and the two would share frameidx
  function playLoop() {
    clearInterval(locradarani);
    var pass = locradarani = setInterval(() => {
      radarEchoes.setLayoutProperty(validLayers[frameidx], "visibility", "none");
      frameidx = (frameidx + 1) % validLayers.length;
      radarEchoes.setLayoutProperty(validLayers[frameidx], "visibility", "visible");
      if (frameidx == validLayers.length - 1) {
        clearInterval(pass);
      }
    }, 90)
  }
  playLoop();
  locRadarAnimation = setInterval(playLoop, 4000);
}
async function cleanupLocRadarLayers() {
  if (locRadarTimestamps == undefined) return;
  var lcts = locRadarTimestamps.map((item) => item.ts);
  radarEchoes.getStyle().layers.filter((layer) => layer.id.startsWith("radarlayer_"))
    .forEach((layer) => {
      const timestamp = layer.id.split("_")[1];
      if (!lcts.includes(Number(timestamp))) {
        radarEchoes.removeLayer(layer.id);
        radarEchoes.removeSource(layer.source);
      }
    })
}

async function startLocalRadar() {
  await cleanupLocRadarLayers();
  await getLocRadarTimestamps();
  await addLocRadarLayers();
  await animateLocalRadar();
}
async function stopLocalRadar() {
  var validLayers = locRadarTimestamps.map((tss) => `radarlayer_${tss.ts}`);
  clearInterval(locradarani);
  clearInterval(locRadarAnimation);
  validLayers.forEach((layerId) => radarEchoes.setLayoutProperty(layerId, "visibility", "none"));
}

//RADAR/SATELLITE
async function getSatRadarTimestamps() {
  //60 frames, 5 hours
  var frameCount = 60;
  const response = await fetch(`https://api.weather.com/v3/TileServer/series/productSet/PPAcore?filter=satrad&apiKey=${api_key}`);
  const data = await response.json();
  satRadarTimestamps = data.seriesInfo.satrad.series.sort((a, b) => a.ts - b.ts).slice(-frameCount)
}
async function addSatRadarLayers() {
  for (let tstamp of satRadarTimestamps) {
    var timestamp = tstamp.ts
    if (!satEchoes.getSource(`radar_${timestamp}`)) {
      satEchoes.addSource(`radar_${timestamp}`, {
        type: "raster",
        tiles: [`https://api.weather.com/v3/TileServer/tile/satrad?ts=${timestamp}&xyz={x}:{y}:{z}&apiKey=${api_key}`],
        tileSize: 512,
        minzoom: 5,
        maxzoom: 12
      });
    }
    if (!satEchoes.getLayer(`radarlayer_${timestamp}`)) {
      satEchoes.addLayer({
        id: `radarlayer_${timestamp}`,
        type: "raster",
        source: `radar_${timestamp}`,
        layout: { visibility: "none" },
        paint: { "raster-opacity": radarEchoOpacity, "raster-fade-duration": 0, "raster-brightness-max": 0.9 }
      });
    }
  }
}
async function animateSatRadar() {
  var validLayers = satRadarTimestamps.map((tss) => `radarlayer_${tss.ts}`);
  if (validLayers.length === 0) {
    throw new Error("No radar layers available for animation.");
  }

  validLayers.forEach((layerId) => satEchoes.setLayoutProperty(layerId, "visibility", "none"));
  //spread the loop over about 3.2 seconds like the local doppler, however many frames come back
  //(the API currently returns 16 frames, 15 minutes apart), leaving a pause on the last frame
  var frameTime = Math.round(3200 / validLayers.length);
  let frameidx = 0;
  //one pass through the frames, stopping the previous pass first (see animateLocalRadar)
  function playLoop() {
    clearInterval(satradani);
    var pass = satradani = setInterval(() => {
      satEchoes.setLayoutProperty(validLayers[frameidx], "visibility", "none");
      frameidx = (frameidx + 1) % validLayers.length;
      satEchoes.setLayoutProperty(validLayers[frameidx], "visibility", "visible");
      if (frameidx == validLayers.length - 1) {
        clearInterval(pass);
      }
    }, frameTime)
  }
  clearInterval(satRadarAnimation);
  playLoop();
  satRadarAnimation = setInterval(playLoop, 4100);
}
async function cleanupSatRadarLayers() {
  if (satRadarTimestamps == undefined) return;
  var lcts = satRadarTimestamps.map((item) => item.ts);
  satEchoes.getStyle().layers.filter((layer) => layer.id.startsWith("radarlayer_"))
    .forEach((layer) => {
      const timestamp = layer.id.split("_")[1];
      if (!lcts.includes(Number(timestamp))) {
        satEchoes.removeLayer(layer.id);
        satEchoes.removeSource(layer.source);
      }
    })
}

async function startSatRadar() {
  await cleanupSatRadarLayers();
  await getSatRadarTimestamps();
  await addSatRadarLayers();
  await animateSatRadar();
}
async function stopSatRadar() {
  var validLayers = satRadarTimestamps.map((tss) => `radarlayer_${tss.ts}`);
  clearInterval(satradani);
  clearInterval(satRadarAnimation);
  validLayers.forEach((layerId) => satEchoes.setLayoutProperty(layerId, "visibility", "none"));
}

//MINI RADAR
async function getMiniRadarTimestamps() {
  //36 frames, 3 hours
  var frameCount = 36;
  const response = await fetch(`https://api.weather.com/v3/TileServer/series/productSet/PPAcore?filter=twcRadarMosaic&apiKey=${api_key}`);
  const data = await response.json();
  miniRadarTimestamps = data.seriesInfo.twcRadarMosaic.series.sort((a, b) => a.ts - b.ts).slice(-frameCount)
}
async function addMiniRadarLayers() {
  for (let tstamp of miniRadarTimestamps) {
    var timestamp = tstamp.ts
    if (!miniEchoes.getSource(`radar_${timestamp}`)) {
      miniEchoes.addSource(`radar_${timestamp}`, {
        type: "raster",
        tiles: [`https://api.weather.com/v3/TileServer/tile/twcRadarMosaic?ts=${timestamp}&xyz={x}:{y}:{z}&apiKey=${api_key}`],
        tileSize: 512,
        minzoom: 5,
        maxzoom: 12
      });
    }
    if (!miniEchoes.getLayer(`radarlayer_${timestamp}`)) {
      miniEchoes.addLayer({
        id: `radarlayer_${timestamp}`,
        type: "raster",
        source: `radar_${timestamp}`,
        layout: { visibility: "none" },
        paint: { "raster-opacity": radarEchoOpacity, "raster-fade-duration": 0, "raster-brightness-max": 0.9 }
      });
    }
  }
}
async function animateMiniRadar() {
  if(miniradarani != undefined && miniRadarAnimation != undefined){
    clearInterval(miniradarani);
    clearInterval(miniRadarAnimation);
  }
  var validLayers = miniRadarTimestamps.map((tss) => `radarlayer_${tss.ts}`);
  if (validLayers.length === 0) {
    throw new Error("No radar layers available for animation.");
  }

  validLayers.forEach((layerId) => miniEchoes.setLayoutProperty(layerId, "visibility", "none"));
  miniEchoes.setLayoutProperty(validLayers[0], "visibility", "visible");
  let frameidx = 0;
  miniradarani = setInterval(() => {
    miniEchoes.setLayoutProperty(validLayers[frameidx], "visibility", "none");
    frameidx++;
    miniEchoes.setLayoutProperty(validLayers[frameidx], "visibility", "visible");
    miniEchoes.setLayoutProperty(validLayers[0], "visibility", "none");
    if (frameidx == validLayers.length - 1) {
      clearInterval(miniradarani);
    }
  }, 144)
  // miniRadarAnimation = setInterval(() => {
  //   miniradarani = setInterval(() => {
  //     miniEchoes.setLayoutProperty(validLayers[frameidx], "visibility", "none");
  //     frameidx = (frameidx + 1) % validLayers.length;
  //     miniEchoes.setLayoutProperty(validLayers[frameidx], "visibility", "visible");
  //     if (frameidx == validLayers.length - 1) {
  //       clearInterval(miniradarani);
  //     }
  //   }, 144)
  // }, 6000);
}
async function cleanupMiniRadarLayers() {
  if (miniRadarTimestamps == undefined) return;
  var lcts = miniRadarTimestamps.map((item) => item.ts);
  miniEchoes.getStyle().layers.filter((layer) => layer.id.startsWith("radarlayer_"))
    .forEach((layer) => {
      const timestamp = layer.id.split("_")[1];
      if (!lcts.includes(Number(timestamp))) {
        miniEchoes.removeLayer(layer.id);
        miniEchoes.removeSource(layer.source);
      }
    })
}

async function startMiniRadar(newSlide) {
  try {
    if(newSlide){
      await cleanupMiniRadarLayers();
      await getMiniRadarTimestamps();
      await addMiniRadarLayers();
      await animateMiniRadar();
    }else{
      await animateMiniRadar();
    }
    lBarData.radarUnavailable = false
  } catch (error) {
    console.error(error)
    lBarData.radarUnavailable = true
  }
  
}
async function stopMiniRadar() {
  var validLayers = miniRadarTimestamps.map((tss) => `radarlayer_${tss.ts}`);
  clearInterval(miniradarani);
  //clearInterval(miniRadarAnimation);
  //stop this BEFORE the interval ends
  validLayers.forEach((layerId) => miniEchoes.setLayoutProperty(layerId, "visibility", "none"));
}

//i would recommend stopping this 3 seconds before the sim starts
async function preloadRadars(){
  try {
    await startLocalRadar();
  } catch (error) {
    console.log("startLocalRadar Error")
    console.error(error)
    weatherData.dopplerUnavailable = true
  }

  try {
    await startSatRadar();
  } catch (error) {
    console.log("startSatRadar Error")
    console.error(error)
    weatherData.satUnavailable = true
  }

  try {
    await startMiniRadar(true);
  } catch (error) {
    console.log("startMiniRadar Error")
    console.error(error)
    lBarData.radarUnavailable = true
  }

  stopMiniRadar();
  stopLocalRadar();
  stopSatRadar();
}
