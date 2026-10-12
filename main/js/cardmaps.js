//data maps for the garden (estimated precip, precip forecast, drought monitor, frost/freeze),
//travel (travel weather) and golf (golf index) cards.
//one map is shared by all of them and moved into whichever card is showing,
//since every map costs a WebGL context and browsers only allow about 16 per page.
var cardMap;
var cardMapDiv;
var cardMapZoom = 5;
var cardMapRefresh = 30 * 60 * 1000;
//how far the data is pulled around the main city, in degrees
var cardMapSpan = { lon: 16, lat: 10 };

//national: true shows the whole country with no city labels, otherwise the map centers on the main city
var mapCards = {
  estimatedPrecip: { container: '#estimated-precip-map', layer: 'cardmap-estimated-precip', flag: 'estimatedPrecipMapUnavailable' },
  precipForecast: { container: '#precip-forecast-map', layer: 'cardmap-precip-forecast', flag: 'precipForecastMapUnavailable' },
  droughtMonitor: { container: '#drought-monitor-map', layer: 'cardmap-drought-monitor', flag: 'droughtMonitorMapUnavailable' },
  frostFreeze: { container: '#frost-freeze-map', layer: 'cardmap-frost-freeze', flag: 'frostFreezeMapUnavailable' },
  travelWeather: { container: '#travel-weather-map', layer: 'cardmap-travel-weather', flag: 'travelMapUnavailable', national: true },
  golfIndex: { container: '#golf-index-map', layer: 'cardmap-golf-index', flag: 'golfIndexUnavailable' },
  snowfallForecast: { container: '#snowfall-forecast-map', layer: 'cardmap-snowfall-forecast', flag: 'snowfallForecastMapUnavailable' },
  waterTemps: { container: '#water-temps-map', layer: 'cardmap-water-temps', flag: 'waterTempsMapUnavailable' }
};
var cardMapNationalView = { center: [-97.5, 38.6], zoom: 3.55 };
//the national view uses lambert like a printed weather map. regional views use mercator: image sources are
//stretched corner to corner, and lambert's curved latitude lines would put the image a degree or more off
var cardMapNationalProjection = { name: 'lambertConformalConic', center: [-100, 45], parallels: [30, 30] };

//WPC national forecast chart, day 1 precip areas. the legend's "Sct" is the rain/thunderstorms area
var forecastChartURL = "https://mapservices.weather.noaa.gov/vector/rest/services/outlooks/natl_fcst_wx_chart/MapServer/";
var travelWeatherLayers = [
  { id: 4, kind: 'rain' },
  { id: 3, kind: 'sct' },
  { id: 5, kind: 'mix' },
  { id: 10, kind: 'icy' },
  { id: 6, kind: 'snow' }
];
//golf index is sampled on a grid around the main city and blended into an image
var golfGrid = { cols: 10, rows: 7 };
var golfColors = ["#5a3f1e", "#745f1e", "#8e7f1e", "#a89f1e", "#c2c31d", "#a7c51f", "#82be21", "#5dc323", "#41b120", "#269f1e", "#267e1e"];
//snowfall forecast: weather.com snow amounts summed over the next few dayparts on a grid
var snowGrid = { cols: 16, rows: 10 };
var snowDayparts = 6;
var snowBands = [[12, "#9A3CFF"], [6, "#DAA5FF"], [3, "#E6E6E6"], [1, "#AAAAAA"]];
//water temps: NOAA CoastWatch MUR sea surface temperature. that server sends no CORS headers,
//so it goes through a CORS Anywhere proxy set by "corsProxy" in the config (the card stays unavailable without one)
var sstURL = "https://coastwatch.pfeg.noaa.gov/erddap/griddap/jplMURSST41.json";
var waterTempBands = [[80, "#9A1000"], [70, "#DC9600"], [60, "#C1BE3C"], [50, "#635D65"], [40, "#3459C5"], [-100, "#5AAAFF"]];

//NWS river forecast center 24 hour precip estimate (exported as an image and recolored to the legend)
var qpeExportURL = "https://mapservices.weather.noaa.gov/raster/rest/services/obs/rfc_qpe/MapServer/export";
//WPC 72 hour (day 1-3) precip forecast contours
var wpcQpfURL = "https://mapservices.weather.noaa.gov/vector/rest/services/precip/wpc_qpf/MapServer/9/query";
//US Drought Monitor, current week (Esri Living Atlas copy, which can simplify the shapes server side)
var droughtURL = "https://services9.arcgis.com/RHVPKKiFTONKtxq3/arcgis/rest/services/US_Drought_Intensity_v1/FeatureServer/3/query";
//active NWS watches, warnings and advisories
var wwaURL = "https://mapservices.weather.noaa.gov/eventdriven/rest/services/WWA/watch_warn_adv/MapServer/1/query";

//NWS QPE palette -> estimated precip legend band (0 = not drawn). bands: .25, 1, 3, 6, 10+
var qpePalette = [
  ["#14C8FA", 0], ["#3D85C6", 0],                                 //.01-.25
  ["#001432", 1], ["#00FA14", 1], ["#00A00F", 1],                 //.25-1
  ["#00640A", 2], ["#FAFA00", 2], ["#FFD966", 2], ["#FA9600", 2], //1-3
  ["#FA0000", 3], ["#AF0000", 3], ["#7D0000", 3],                 //3-6
  ["#FA00FA", 4], ["#7D4BE1", 4],                                 //6-10
  ["#DCDCDC", 5],                                                 //10+
  ["#7D7D7D", 0]                                                  //missing data
];
var qpeBandColors = [null, "#46e346", "#208420", "#c8c832", "#e61e1e", "#4f1309"];

function initializeCardMaps() {
  cardMapDiv = document.createElement('div');
  cardMapDiv.id = 'card-map';
  cardMapDiv.style.cssText = 'position:absolute;width:1620px;height:1080px;';
  //sits next to the card's .data-map rather than inside it, since alignDataMaps scales those
  $(mapCards.estimatedPrecip.container).after(cardMapDiv);

  cardMap = new mapboxgl.Map({
    ...legacyLabelOptions('radar'),
    container: cardMapDiv,
    style: legacyStyle,
    center: [systemSettings.mainCity.lon, systemSettings.mainCity.lat],
    zoom: cardMapZoom,
    trackResize: false,
    interactive: false,
    projection: 'mercator'
  });
  //'style.load' rather than 'load': the map starts out inside a hidden card, and 'load' waits for a first
  //frame that a hidden map never draws, which held all of its data back until the first map card showed
  cardMap.once('style.load', function () {
    cardMapReady = true;
    //no road shields, city labels with the dot fix
    cardMap.setLayoutProperty('road-number-shield', 'visibility', 'none');
    fixLegacyCityLabels(cardMap);
    styleRadarCityLabels(cardMap, radarCityLook.radar);
    //travel weather "Sct" pattern, also used for the legend box so they match
    var sct = scatteredPattern();
    var streak = scatteredStreak();
    cardMap.addImage('sct-streak', streak.image, { pixelRatio: streak.pixelRatio });
    //the legend box gets the basemap's land color behind the tint, like it sits on the map
    $(".travel-weather .sct.box").css({ "background-color": "#46553e", "background-image": "url(" + sct.url + ")", "background-size": (sct.size * 0.7) + "px " + (sct.size * 0.7) + "px" });
    loadCardMapData();
    setInterval(loadCardMapData, cardMapRefresh);
    if (activeMapCard) { showCardMap(activeMapCard) }
  });
}

function loadCardMapData() {
  var packages = systemSettings.packageSettings;
  if (packages.includes("garden")) {
    loadEstimatedPrecip();
    loadPrecipForecast();
    loadDroughtMonitor();
    loadFrostFreeze();
  }
  if (packages.includes("travel")) { loadTravelWeather() }
  if (packages.includes("golf")) { loadGolfIndex() }
  if (packages.includes("ski")) { loadSnowfallForecast() }
  if (packages.includes("beach")) { loadWaterTemps() }
}

//the card currently showing, so data that arrives later still lands on it
var activeMapCard = null;
function cardLayerVisibility(card) {
  return card == activeMapCard ? 'visible' : 'none';
}

//called by each map card when it shows
//false until the style has loaded. in a background tab that can be after the first map card starts (the inline
//style finishes on an animation frame), so the card is remembered and shown once it's ready
var cardMapReady = false;
function showCardMap(card) {
  if (!cardMap) { return }
  activeMapCard = card;
  $(mapCards[card].container).after(cardMapDiv);
  if (!cardMapReady) { return }
  //a card can have several layers, all named after its layer id
  cardMap.getStyle().layers.forEach(function (layer) {
    Object.keys(mapCards).forEach(function (name) {
      if (layer.id.startsWith(mapCards[name].layer)) {
        cardMap.setLayoutProperty(layer.id, 'visibility', cardLayerVisibility(name));
      }
    });
  });
  var national = mapCards[card].national == true;
  cardMap.setProjection(national ? cardMapNationalProjection : 'mercator');
  cardMap.jumpTo(national ? cardMapNationalView : { center: [systemSettings.mainCity.lon, systemSettings.mainCity.lat], zoom: cardMapZoom });
  legacyCityLayers.forEach(function (layer) {
    cardMap.setLayoutProperty(layer, 'visibility', national ? 'none' : 'visible');
  });
  cardMap.setLayoutProperty('country-label', 'visibility', !national && countryLabelsShown() ? 'visible' : 'none');
  //maps measure themselves wrong while #slides is scaled
  setTimeout(() => {
    var scale = $("#slides").css("scale");
    $("#slides").css("scale", "none");
    cardMap.resize();
    $("#slides").css("scale", scale);
    if (card == 'travelWeather') { placeScatteredStreaks() }
  }, 50);
}

function cardMapBounds() {
  var lon = Number(systemSettings.mainCity.lon), lat = Number(systemSettings.mainCity.lat);
  return { west: lon - cardMapSpan.lon, east: lon + cardMapSpan.lon, south: lat - cardMapSpan.lat, north: lat + cardMapSpan.lat };
}

//ArcGIS query for the area around the main city, as simplified GeoJSON
//national skips the area filter and simplifies the shapes more
async function queryCardMapFeatures(url, where, outFields, national) {
  var b = cardMapBounds();
  var params = new URLSearchParams({
    where: where,
    outFields: outFields,
    returnGeometry: 'true',
    outSR: '4326',
    maxAllowableOffset: national ? '0.05' : '0.02',
    geometryPrecision: '3',
    f: 'geojson'
  });
  if (!national) {
    params.set('geometry', [b.west, b.south, b.east, b.north].join(','));
    params.set('geometryType', 'esriGeometryEnvelope');
    params.set('inSR', '4326');
    params.set('spatialRel', 'esriSpatialRelIntersects');
  }
  var response = await fetch(url + '?' + params.toString());
  var data = await response.json();
  if (data.error) { throw new Error(JSON.stringify(data.error)) }
  return data;
}

//adds or updates a GeoJSON fill layer under the boundaries and city labels.
//suffix names an extra layer for cards that need more than one
function setCardMapFill(card, data, paint, suffix) {
  var id = mapCards[card].layer + (suffix ? '-' + suffix : '');
  if (cardMap.getSource(id)) {
    cardMap.getSource(id).setData(data);
    return;
  }
  cardMap.addSource(id, { type: 'geojson', data: data });
  cardMap.addLayer({ id: id, type: 'fill', source: id, layout: { visibility: cardLayerVisibility(card) }, paint: paint }, 'admin-2-boundary-bg');
}

async function loadPrecipForecast() {
  try {
    var data = await queryCardMapFeatures(wpcQpfURL, 'qpf >= 0.1', 'qpf');
    //contours are nested, so draw the heavier amounts on top
    data.features.sort(function (a, b) { return a.properties.qpf - b.properties.qpf });
    //legend bands: .1, .5, 1, 1-3 (2 and up), 3-6, 6-12, 12+
    setCardMapFill('precipForecast', data, {
      'fill-color': ['step', ['get', 'qpf'],
        '#64E664', 0.5, '#3CBE3C', 1, '#199619', 2, '#AAAAAA', 3, '#E6E6E6', 6, '#DAA5FF', 12, '#9A3CFF'],
      'fill-opacity': 0.85
    });
    $(".precip-forecast .legend .timestamp").text("Next 3 Days");
    weatherData.precipForecastMapUnavailable = false;
  } catch (error) {
    console.error("precip forecast map", error);
    weatherData.precipForecastMapUnavailable = true;
  }
}

async function loadFrostFreeze() {
  try {
    var data = await queryCardMapFeatures(wwaURL, "prod_type IN ('Freeze Warning','Hard Freeze Warning','Frost Advisory')", 'prod_type');
    setCardMapFill('frostFreeze', data, {
      'fill-color': ['match', ['get', 'prod_type'], 'Frost Advisory', '#e37f94', '#d31d5f'],
      'fill-opacity': 0.85
    });
    $(".frost-freeze .legend .timestamp").text("Current");
    weatherData.frostFreezeMapUnavailable = false;
  } catch (error) {
    console.error("frost/freeze map", error);
    weatherData.frostFreezeMapUnavailable = true;
  }
}

async function loadDroughtMonitor() {
  try {
    var data = await queryCardMapFeatures(droughtURL, '1=1', 'dm,ddate');
    //categories are nested, so draw the worse drought on top
    data.features.sort(function (a, b) { return a.properties.dm - b.properties.dm });
    //US Drought Monitor colors, D0 (abnormally dry) through D4 (exceptional)
    setCardMapFill('droughtMonitor', data, {
      'fill-color': ['match', ['get', 'dm'], 0, '#FFFF00', 1, '#FCD37F', 2, '#FFAA00', 3, '#E60000', '#730000'],
      'fill-opacity': 0.85
    });
    if (data.features.length > 0) {
      //ddate is midnight UTC on the valid day
      $(".drought-monitor .legend .timestamp").text("Valid " + new Date(data.features[0].properties.ddate).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }));
    }
    weatherData.droughtMonitorMapUnavailable = false;
  } catch (error) {
    console.error("drought monitor map", error);
    weatherData.droughtMonitorMapUnavailable = true;
  }
}

async function loadEstimatedPrecip() {
  try {
    var b = cardMapBounds();
    var sw = mapboxgl.MercatorCoordinate.fromLngLat([b.west, b.south]);
    var ne = mapboxgl.MercatorCoordinate.fromLngLat([b.east, b.north]);
    //export in web mercator meters
    var size = 40075016.68557849;
    var x1 = (sw.x - 0.5) * size, x2 = (ne.x - 0.5) * size;
    var y1 = (0.5 - sw.y) * size, y2 = (0.5 - ne.y) * size;
    var width = 1600;
    var height = Math.round(width * (y2 - y1) / (x2 - x1));
    var params = new URLSearchParams({
      bbox: [x1, y1, x2, y2].join(','), bboxSR: '3857', imageSR: '3857',
      size: width + ',' + height, format: 'png32', transparent: 'true', layers: 'show:28', f: 'image'
    });
    var image = await loadCardMapImage(qpeExportURL + '?' + params.toString());
    var url = recolorQpe(image, width, height);
    var coordinates = [[b.west, b.north], [b.east, b.north], [b.east, b.south], [b.west, b.south]];
    var id = mapCards.estimatedPrecip.layer;
    if (cardMap.getSource(id)) {
      cardMap.getSource(id).updateImage({ url: url, coordinates: coordinates });
    } else {
      cardMap.addSource(id, { type: 'image', url: url, coordinates: coordinates });
      cardMap.addLayer({ id: id, type: 'raster', source: id, layout: { visibility: cardLayerVisibility('estimatedPrecip') }, paint: { 'raster-opacity': 0.85, 'raster-fade-duration': 0 } }, 'admin-2-boundary-bg');
    }
    weatherData.estimatedPrecipMapUnavailable = false;
  } catch (error) {
    console.error("estimated precip map", error);
    weatherData.estimatedPrecipMapUnavailable = true;
  }
}

function loadCardMapImage(url) {
  return new Promise(function (resolve, reject) {
    var img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = function () { resolve(img) };
    img.onerror = reject;
    img.src = url;
  });
}

//swaps each NWS palette color for its legend band color
function recolorQpe(image, width, height) {
  var canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  var ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  var pixels = ctx.getImageData(0, 0, width, height);
  var lookup = {};
  qpePalette.forEach(function (entry) {
    var band = qpeBandColors[entry[1]];
    lookup[entry[0].slice(1).toLowerCase()] = band ? [parseInt(band.slice(1, 3), 16), parseInt(band.slice(3, 5), 16), parseInt(band.slice(5, 7), 16)] : null;
  });
  var d = pixels.data;
  for (var i = 0; i < d.length; i += 4) {
    if (d[i + 3] == 0) { continue }
    var key = ((1 << 24) + (d[i] << 16) + (d[i + 1] << 8) + d[i + 2]).toString(16).slice(1);
    var color = lookup[key];
    if (color) {
      d[i] = color[0]; d[i + 1] = color[1]; d[i + 2] = color[2]; d[i + 3] = 255;
    } else {
      d[i + 3] = 0;
    }
  }
  ctx.putImageData(pixels, 0, 0);
  return canvas.toDataURL();
}

async function loadTravelWeather() {
  try {
    var groups = await Promise.all(travelWeatherLayers.map(async function (layer) {
      var data = await queryCardMapFeatures(forecastChartURL + layer.id + '/query', '1=1', 'objectid', true);
      data.features.forEach(function (feature) { feature.properties.kind = layer.kind });
      return data.features;
    }));
    var byKind = {};
    travelWeatherLayers.forEach(function (layer, i) { byKind[layer.kind] = groups[i] });
    var collection = function (features) { return { type: 'FeatureCollection', features: features } };
    //rain, then the scattered pattern over it, then the winter types on top
    setCardMapFill('travelWeather', collection(byKind.rain), { 'fill-color': '#3cbe3c', 'fill-opacity': 0.85 }, 'rain');
    //the scattered tint is a plain fill; its streaks are icons on a screen grid (placeScatteredStreaks) rather than
    //a fill-pattern, which lambert draws at a different size and angle in each part of the map
    travelSctFeatures = byKind.sct;
    setCardMapFill('travelWeather', collection(byKind.sct), { 'fill-color': '#3cbe3c', 'fill-opacity': 0.35 }, 'sct');
    if (!cardMap.getSource(sctStreakLayer)) {
      cardMap.addSource(sctStreakLayer, { type: 'geojson', data: collection([]) });
      cardMap.addLayer({
        id: sctStreakLayer, type: 'symbol', source: sctStreakLayer,
        layout: {
          visibility: cardLayerVisibility('travelWeather'), 'icon-image': 'sct-streak',
          'icon-allow-overlap': true, 'icon-ignore-placement': true,
          'icon-rotation-alignment': 'viewport', 'icon-pitch-alignment': 'viewport'
        }
      }, 'admin-2-boundary-bg');
    }
    placeScatteredStreaks();
    setCardMapFill('travelWeather', collection(byKind.mix.concat(byKind.icy, byKind.snow)), {
      'fill-color': ['match', ['get', 'kind'], 'snow', '#d2d2d2', 'icy', '#d22277', '#d782be'],
      'fill-opacity': 0.85
    }, 'winter');
    weatherData.travelMapUnavailable = false;
  } catch (error) {
    console.error("travel weather map", error);
    weatherData.travelMapUnavailable = true;
  }
}

async function loadGolfIndex() {
  try {
    var b = cardMapBounds();
    var results = await fetchAggregate("v2idxGolfDaypart15", cardMapGridPoints(golfGrid, b));
    //the next daytime period (golf has no nighttime index)
    var first = results[0].v2idxGolfDaypart15.golfIndex12hour;
    var part = first.golfIndex.findIndex(function (value) { return value != null });
    var values = results.map(function (result) {
      var index = result.v2idxGolfDaypart15 && result.v2idxGolfDaypart15.golfIndex12hour.golfIndex[part];
      return index == null ? null : index;
    });
    var url = gridImage(values, golfGrid, b, golfIndexColor);
    var coordinates = [[b.west, b.north], [b.east, b.north], [b.east, b.south], [b.west, b.south]];
    var id = mapCards.golfIndex.layer;
    if (cardMap.getSource(id)) {
      cardMap.getSource(id).updateImage({ url: url, coordinates: coordinates });
    } else {
      cardMap.addSource(id, { type: 'image', url: url, coordinates: coordinates });
      //the style draws its land fill above its water, so the index goes over the land (under the hillshade)
      //and a copy of the water layer goes back on top so only land is colored
      cardMap.addLayer({ id: id, type: 'raster', source: id, layout: { visibility: cardLayerVisibility('golfIndex') }, paint: { 'raster-opacity': 0.9, 'raster-fade-duration': 0 } }, 'hillshade');
      var water = cardMap.getStyle().layers.find(function (layer) { return layer.id == 'water' });
      var waterMask = { id: id + '-water', type: 'fill', source: water.source, 'source-layer': water['source-layer'], layout: { visibility: cardLayerVisibility('golfIndex') }, paint: water.paint };
      if (water.filter) { waterMask.filter = water.filter }
      cardMap.addLayer(waterMask, 'hillshade');
    }
    $(".golf-index .legend .day").text(dateFns.format(new Date(first.fcstValidLocal[part]), "EEEE"));
    weatherData.golfIndexUnavailable = false;
  } catch (error) {
    console.error("golf index map", error);
    weatherData.golfIndexUnavailable = true;
  }
}

//smooth image from a regular lat/lon grid of values (rows north to south), drawn in web mercator to
//line up with the map. colorFor turns a blended value into [r, g, b], or null to leave it clear.
function gridImage(values, grid, b, colorFor) {
  var width = 480, height = 320;
  var canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  var ctx = canvas.getContext('2d');
  var pixels = ctx.createImageData(width, height);
  var mercY = function (lat) { return Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)) };
  var top = mercY(b.north), bottom = mercY(b.south);
  var value = function (r, c) { return values[r * grid.cols + c] };
  for (var y = 0; y < height; y++) {
    var lat = Math.atan(Math.sinh(top - (top - bottom) * (y + 0.5) / height)) * 180 / Math.PI;
    var gy = (b.north - lat) / (b.north - b.south) * (grid.rows - 1);
    var r0 = Math.max(0, Math.min(Math.floor(gy), grid.rows - 2)), fy = gy - r0;
    for (var x = 0; x < width; x++) {
      var gx = (x + 0.5) / width * (grid.cols - 1);
      var c0 = Math.min(Math.floor(gx), grid.cols - 2), fx = gx - c0;
      //weighted average of the four surrounding points that have a value
      var corners = [[r0, c0, (1 - fx) * (1 - fy)], [r0, c0 + 1, fx * (1 - fy)], [r0 + 1, c0, (1 - fx) * fy], [r0 + 1, c0 + 1, fx * fy]];
      var sum = 0, weight = 0;
      corners.forEach(function (corner) {
        var v = value(corner[0], corner[1]);
        if (v != null) { sum += v * corner[2]; weight += corner[2] }
      });
      if (weight == 0) { continue }
      var color = colorFor(sum / weight);
      if (!color) { continue }
      var i = (y * width + x) * 4;
      pixels.data[i] = color[0];
      pixels.data[i + 1] = color[1];
      pixels.data[i + 2] = color[2];
      pixels.data[i + 3] = 255;
    }
  }
  ctx.putImageData(pixels, 0, 0);
  return canvas.toDataURL();
}

function hexToRGB(hex) {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

//golf index 0-10, blended along the legend gradient
function golfIndexColor(index) {
  var rgb = golfColors.map(hexToRGB);
  index = Math.max(0, Math.min(10, index));
  var lo = Math.floor(index), hi = Math.min(10, lo + 1), t = index - lo;
  return [0, 1, 2].map(function (k) { return rgb[lo][k] + (rgb[hi][k] - rgb[lo][k]) * t });
}

//legend bands, highest first: [lower bound, color]
function bandColor(bands) {
  var rgb = bands.map(function (band) { return [band[0], hexToRGB(band[1])] });
  return function (value) {
    var band = rgb.find(function (band) { return value >= band[0] });
    return band ? band[1] : null;
  };
}

//adds or updates an image layer for a card
function setCardMapImage(card, url, b, before) {
  var coordinates = [[b.west, b.north], [b.east, b.north], [b.east, b.south], [b.west, b.south]];
  var id = mapCards[card].layer;
  //data that lands while its card is up (a card jump right at startup) takes down the unavailable label
  if (card == activeMapCard) { $(".tempunavailable").fadeOut(500) }
  if (cardMap.getSource(id)) {
    cardMap.getSource(id).updateImage({ url: url, coordinates: coordinates });
    return;
  }
  cardMap.addSource(id, { type: 'image', url: url, coordinates: coordinates });
  cardMap.addLayer({ id: id, type: 'raster', source: id, layout: { visibility: cardLayerVisibility(card) }, paint: { 'raster-opacity': 0.9, 'raster-fade-duration': 0 } }, before);
}

//points on a regular grid over the card map area, north to south
function cardMapGridPoints(grid, b) {
  var points = [];
  for (var r = 0; r < grid.rows; r++) {
    for (var c = 0; c < grid.cols; c++) {
      var lat = b.north - (b.north - b.south) * r / (grid.rows - 1);
      var lon = b.west + (b.east - b.west) * c / (grid.cols - 1);
      points.push(lat.toFixed(2) + ',' + lon.toFixed(2));
    }
  }
  return points;
}

//weather.com aggregate request for many locations, a few dozen per call
async function fetchAggregate(product, points, extra) {
  var results = [];
  for (var i = 0; i < points.length; i += 40) {
    var url = "https://api.weather.com/v3/aggcommon/" + product + "?geocodes=" + points.slice(i, i + 40).join(';') + (extra || "") + "&language=en-US&format=json&apiKey=" + api_key;
    var response = await fetch(url);
    results = results.concat(await response.json());
  }
  return results;
}

async function loadSnowfallForecast() {
  try {
    var b = cardMapBounds();
    var results = await fetchAggregate("v3-wx-forecast-daily-5day", cardMapGridPoints(snowGrid, b), "&units=e");
    //the next six dayparts (three days), starting with the first one still ahead
    var sample = results[0]["v3-wx-forecast-daily-5day"];
    var start = sample.daypart[0].qpfSnow.findIndex(function (value) { return value != null });
    var end = Math.min(start + snowDayparts, sample.daypart[0].qpfSnow.length) - 1;
    var values = results.map(function (result) {
      var forecast = result["v3-wx-forecast-daily-5day"];
      if (!forecast) { return null }
      var total = 0;
      for (var p = start; p <= end; p++) { total += forecast.daypart[0].qpfSnow[p] || 0 }
      return total;
    });
    setCardMapImage('snowfallForecast', gridImage(values, snowGrid, b, bandColor(snowBands)), b, 'admin-2-boundary-bg');
    //dayparts alternate day/night, two per day
    var night = end % 2 == 1;
    $(".snowfall-forecast .legend .timestamp").text("Through " + sample.dayOfWeek[Math.floor(end / 2)] + (night ? " Night" : " Evening"));
    weatherData.snowfallForecastMapUnavailable = false;
  } catch (error) {
    console.error("snowfall forecast map", error);
    weatherData.snowfallForecastMapUnavailable = true;
  }
}

async function loadWaterTemps() {
  var corsProxyURL = systemSettings.corsProxy;
  if (!corsProxyURL) {
    console.info("water temps map: no corsProxy set in the config");
    weatherData.waterTempsMapUnavailable = true;
    return;
  }
  if (!corsProxyURL.endsWith("/")) { corsProxyURL += "/" }
  try {
    var b = cardMapBounds();
    //latest MUR satellite analysis (0.01 degree), thinned to every 20th point
    var query = "analysed_sst[(last)][(" + b.south.toFixed(2) + "):20:(" + b.north.toFixed(2) + ")][(" + b.west.toFixed(2) + "):20:(" + b.east.toFixed(2) + ")]";
    var url = corsProxyURL + sstURL + "?" + encodeURIComponent(query);
    var rows = await fetchSSTRows(url);
    //rows are latitude ascending, longitude inside each latitude
    var lats = [...new Set(rows.map(function (row) { return row[1] }))].sort(function (a, c) { return c - a });
    var lons = [...new Set(rows.map(function (row) { return row[2] }))].sort(function (a, c) { return a - c });
    var grid = { rows: lats.length, cols: lons.length };
    var values = new Array(grid.rows * grid.cols).fill(null);
    var latIndex = new Map(lats.map(function (lat, i) { return [lat, i] }));
    var lonIndex = new Map(lons.map(function (lon, i) { return [lon, i] }));
    rows.forEach(function (row) {
      if (row[3] == null) { return }
      values[latIndex.get(row[1]) * grid.cols + lonIndex.get(row[2])] = row[3] * 9 / 5 + 32;
    });
    var area = { north: lats[0], south: lats[lats.length - 1], west: lons[0], east: lons[lons.length - 1] };
    //under the style's land fill, so the coastline stays sharp
    setCardMapImage('waterTemps', gridImage(values, grid, area, bandColor(waterTempBands)), area, 'landcover-outdoors copy 1');
    weatherData.waterTempsMapUnavailable = false;
  } catch (error) {
    console.error("water temps map", error);
    weatherData.waterTempsMapUnavailable = true;
  }
}

//one slanted green rain streak, the travel map's scattered showers/storms marking
var sctStreakAngle = Math.PI / 7;
function drawScatteredStreak(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(sctStreakAngle);
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;
  ctx.shadowBlur = 1;
  ctx.fillStyle = '#2ee62e';
  ctx.beginPath();
  ctx.roundRect(-1.75, -6, 3.5, 12, 1.5);
  ctx.fill();
  ctx.restore();
}
function scatteredStreak() {
  var size = 16, pixelRatio = 2;
  var canvas = document.createElement('canvas');
  canvas.width = size * pixelRatio;
  canvas.height = size * pixelRatio;
  var ctx = canvas.getContext('2d');
  ctx.scale(pixelRatio, pixelRatio);
  drawScatteredStreak(ctx, size / 2, size / 2);
  return { image: ctx.getImageData(0, 0, canvas.width, canvas.height), pixelRatio: pixelRatio };
}

//streak icons on the same brick grid as the legend's pattern tile, in screen pixels so every scattered area
//gets streaks of one size and spacing. a streak goes where both of its ends fall inside a scattered area.
var sctStreakLayer = 'cardmap-travel-weather-sct-streaks';
var sctStreakTile = 26;
var travelSctFeatures = [];
function placeScatteredStreaks() {
  var source = cardMap && cardMap.getSource(sctStreakLayer);
  if (!source || activeMapCard != 'travelWeather') { return }
  var width = cardMap.getContainer().offsetWidth, height = cardMap.getContainer().offsetHeight;
  //every ring of every scattered area, projected to screen points
  var rings = [];
  travelSctFeatures.forEach(function (feature) {
    var g = feature.geometry;
    if (!g) { return }
    var polygons = g.type == 'Polygon' ? [g.coordinates] : g.type == 'MultiPolygon' ? g.coordinates : [];
    polygons.forEach(function (polygon) {
      polygon.forEach(function (ring) {
        rings.push(ring.map(function (c) { var p = cardMap.project(c); return [p.x, p.y] }));
      });
    });
  });
  //even-odd over all rings, so holes stay empty
  var inside = function (x, y) {
    var hit = false;
    rings.forEach(function (ring) {
      for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        if ((ring[i][1] > y) != (ring[j][1] > y) && x < (ring[j][0] - ring[i][0]) * (y - ring[i][1]) / (ring[j][1] - ring[i][1]) + ring[i][0]) { hit = !hit }
      }
    });
    return hit;
  };
  var ex = 6 * Math.sin(sctStreakAngle), ey = 6 * Math.cos(sctStreakAngle);
  var points = [];
  for (var y = 0; y < height + sctStreakTile; y += sctStreakTile) {
    for (var x = 0; x < width + sctStreakTile; x += sctStreakTile) {
      [[x + 6.5, y + 6.5], [x + 19.5, y + 19.5]].forEach(function (p) {
        if (inside(p[0] + ex, p[1] - ey) && inside(p[0] - ex, p[1] + ey)) {
          points.push({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: cardMap.unproject(p).toArray() } });
        }
      });
    }
  }
  source.setData({ type: 'FeatureCollection', features: points });
}

//seamless tile of slanted green rain streaks over a light green tint, for the travel map legend's Sct box.
//images/assets/sct.png is a crop of an old map with that map's terrain baked in, so it can't be tiled cleanly.
function scatteredPattern() {
  var size = 26, pixelRatio = 2;
  var canvas = document.createElement('canvas');
  canvas.width = size * pixelRatio;
  canvas.height = size * pixelRatio;
  var ctx = canvas.getContext('2d');
  ctx.scale(pixelRatio, pixelRatio);
  ctx.fillStyle = 'rgba(60, 190, 60, 0.35)';
  ctx.fillRect(0, 0, size, size);
  //two streaks per tile, offset like bricks; each is also drawn shifted by a tile so ones crossing an edge wrap around
  var streaks = [[6.5, 6.5], [19.5, 19.5]];
  streaks.forEach(function (streak) {
    [-size, 0, size].forEach(function (dx) {
      [-size, 0, size].forEach(function (dy) { drawScatteredStreak(ctx, streak[0] + dx, streak[1] + dy) });
    });
  });
  return { url: canvas.toDataURL(), size: size };
}

//ERDDAP sometimes answers with a plain text "Error {...}" while it's busy, so try a few times
//rather than leaving the card unavailable until the next refresh
async function fetchSSTRows(url) {
  var lastError;
  for (var attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) { await new Promise(function (resolve) { setTimeout(resolve, 5000) }) }
    try {
      var text = await (await fetch(url)).text();
      if (!text.trim().startsWith("{")) { throw new Error("ERDDAP: " + text.slice(0, 200)) }
      return JSON.parse(text).table.rows;
    } catch (error) {
      lastError = error;
      console.warn("water temps attempt " + (attempt + 1) + " failed", error.message);
    }
  }
  throw lastError;
}
