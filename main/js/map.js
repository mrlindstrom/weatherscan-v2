function initTravelForecast() {
  var tfClass = document.getElementsByClassName("travel-forecast")[0]
  $(".travel-forecast .basemap").css({"background-position-y":systemSettings.travel.regionalMap.mapTop+"px", "background-position-x":systemSettings.travel.regionalMap.mapLeft+"px","background-size":systemSettings.travel.regionalMap.mapScale})
  $(".travel-forecast .map-borders").css({"background-position-y":systemSettings.travel.regionalMap.mapTop+"px", "background-position-x":systemSettings.travel.regionalMap.mapLeft+"px","background-size":systemSettings.travel.regionalMap.mapScale})
  if(systemSettings.travel.regionalMap.autoFind == true){
    $(".travel-forecast .cities").css({"top":systemSettings.travel.regionalMap.mapTop+"px", "left":systemSettings.travel.regionalMap.mapLeft+"px","position":"absolute"})
  }
  for (var i = 0; i < systemSettings.travel.regionalMap.cities.length; i++) {
    //console.log(i)
    //console.log(numToWord(i))
    var child = document.createElement("div")
    child.className = "city " + numToWord(i)
    tfClass.getElementsByClassName("cities")[0].appendChild(child)
    var cnChild = document.createElement("div")
    cnChild.className = "shrinkY cityname"
    tfClass.getElementsByClassName("cities")[0].getElementsByClassName("city " + numToWord(i))[0].appendChild(cnChild)
    var tChild = document.createElement("div")
    tChild.className = "shrinkY temperature"
    tfClass.getElementsByClassName("cities")[0].getElementsByClassName("city " + numToWord(i))[0].appendChild(tChild)
    var iChild = document.createElement("div")
    iChild.className = "mapicon icon"
    tfClass.getElementsByClassName("cities")[0].getElementsByClassName("city " + numToWord(i))[0].appendChild(iChild)
    $(".travel-forecast .cities .city." + numToWord(i)).css({"top":systemSettings.travel.regionalMap.cities[i].topPos+"px", "left":systemSettings.travel.regionalMap.cities[i].leftPos+"px"})
  }
}
function createRadarCities(type) {
  //the legacy basemap already labels every city
  if (legacyMaps) { return }
  var header
  if (type == "main" || type == "spanish") {header = systemSettings.mainCity.radar} else if (type == "extra") {header = systemSettings.extraCity.cities[locationid].radar}
  var drClass = document.getElementsByClassName("doppler-radar")[0]
  for (var i = 0; i < header.radarCities.length; i++) {
    var child = document.createElement("div")
    child.className = "city " + numToWord(i)
    drClass.getElementsByClassName("cities")[0].appendChild(child)
    var dChild = document.createElement("div")
    dChild.className = "dot"
    drClass.getElementsByClassName("cities")[0].getElementsByClassName("city  " + numToWord(i))[0].appendChild(dChild)
    var doChild = document.createElement("div")
    doChild.className = "dot-outline"
    //drClass.getElementsByClassName("cities")[0].getElementsByClassName("city  " + numToWord(i))[0].appendChild(doChild)
    var nChild = document.createElement("div")
    nChild.className = "name shrinkY"
    drClass.getElementsByClassName("cities")[0].getElementsByClassName("city  " + numToWord(i))[0].appendChild(nChild)
    $(".doppler-radar .cities .city." + numToWord(i)).css({"top":header.radarCities[i].dotTopPos+"px", "left":header.radarCities[i].dotLeftPos+"px"})
    $(".doppler-radar .cities .city." + numToWord(i) + " .name").text(header.radarCities[i].locationName)
    $(".doppler-radar .cities .city." + numToWord(i) + " .name").css({"top":header.radarCities[i].nameTopMargin+"px", "left":header.radarCities[i].nameLeftMargin+"px"})
    var Tchild = document.createElement("div")
    Tchild.className = "city " + numToWord(i)
    drClass.getElementsByClassName("cities-trans")[0].appendChild(Tchild)
    var TdChild = document.createElement("div")
    TdChild.className = "dot-trans"
    drClass.getElementsByClassName("cities-trans")[0].getElementsByClassName("city  " + numToWord(i))[0].appendChild(TdChild)
    var TdoChild = document.createElement("div")
    TdoChild.className = "dot-outline"
    drClass.getElementsByClassName("cities-trans")[0].getElementsByClassName("city  " + numToWord(i))[0].appendChild(TdoChild)
    var TnChild = document.createElement("div")
    TnChild.className = "name-trans shrinkY"
    drClass.getElementsByClassName("cities-trans")[0].getElementsByClassName("city  " + numToWord(i))[0].appendChild(TnChild)
    //var TnoChild = document.createElement("div")
    //TnoChild.className = "name-outline shrinkY"
    //drClass.getElementsByClassName("cities-trans")[0].getElementsByClassName("city  " + numToWord(i))[0].appendChild(TnoChild)
    $(".doppler-radar .cities-trans .city." + numToWord(i)).css({"top":header.radarCities[i].dotTopPos+"px", "left":header.radarCities[i].dotLeftPos+"px"})
    $(".doppler-radar .cities-trans .city." + numToWord(i) + " .name-trans").text(header.radarCities[i].locationName)
    $(".doppler-radar .cities-trans .city." + numToWord(i) + " .name-trans").css({"top":header.radarCities[i].nameTopMargin+"px", "left":header.radarCities[i].nameLeftMargin+"px"})
    //$(".doppler-radar .cities-trans .city." + numToWord(i) + " .name-outline").text(header.radarCities[i].locationName)
    //$(".doppler-radar .cities-trans .city." + numToWord(i) + " .name-outline").css({"top":header.radarCities[i].nameTopMargin+"px", "left":header.radarCities[i].nameLeftMargin+"px"})
  }
}
function createRadarIcons(type) {
  var header
  if (type == "main" || type == "spanish") {header = systemSettings.mainCity.radar} else if (type == "extra") {header = systemSettings.extraCity.cities[locationid].radar}
  drClass = document.getElementsByClassName("doppler-radar")[0]
  for (var i = 0; i < header.radarIcons.length; i++) {
    var child = document.createElement("div")
    child.className = "icon " + numToWord(i)
    drClass.getElementsByClassName("icons")[0].appendChild(child)
    var iChild = document.createElement("div")
    iChild.className = "icon " + header.radarIcons[i].type
    drClass.getElementsByClassName("icons")[0].getElementsByClassName("icon  " + numToWord(i))[0].appendChild(iChild)
    var ioChild = document.createElement("div")
    ioChild.className = "icon-outline " + header.radarIcons[i].type
    //drClass.getElementsByClassName("icons")[0].getElementsByClassName("icon  " + numToWord(i))[0].appendChild(ioChild)
    var itChild = document.createElement("div")
    itChild.className = "text " + header.radarIcons[i].type
    drClass.getElementsByClassName("icons")[0].getElementsByClassName("icon  " + numToWord(i))[0].appendChild(itChild)

    var tchild = document.createElement("div")
    tchild.className = "icon " + numToWord(i)
    drClass.getElementsByClassName("icons-trans")[0].appendChild(tchild)
    var tiChild = document.createElement("div")
    tiChild.className = "icon " + header.radarIcons[i].type
    drClass.getElementsByClassName("icons-trans")[0].getElementsByClassName("icon  " + numToWord(i))[0].appendChild(tiChild)
    var tioChild = document.createElement("div")
    tioChild.className = "icon-outline " + header.radarIcons[i].type
    drClass.getElementsByClassName("icons-trans")[0].getElementsByClassName("icon  " + numToWord(i))[0].appendChild(tioChild)
    var titChild = document.createElement("div")
    titChild.className = "text " + header.radarIcons[i].type
    drClass.getElementsByClassName("icons-trans")[0].getElementsByClassName("icon  " + numToWord(i))[0].appendChild(titChild)

    $(".doppler-radar .icons .icon." + numToWord(i)).css({"top":header.radarIcons[i].topPos+"px", "left":header.radarIcons[i].leftPos+"px"})
    $(".doppler-radar .icons .icon." + numToWord(i) + " .text").text(header.radarIcons[i].text)
    $(".doppler-radar .icons-trans .icon." + numToWord(i)).css({"top":header.radarIcons[i].topPos+"px", "left":header.radarIcons[i].leftPos+"px"})
    $(".doppler-radar .icons-trans .icon." + numToWord(i) + " .text").text(header.radarIcons[i].text)
    if (Number(header.radarIcons[i].text) >= 100) {
      $(".doppler-radar .icons .icon." + numToWord(i) + " .text").css("font-size", "31px")
      $(".doppler-radar .icons-trans .icon." + numToWord(i) + " .text").css("font-size", "31px")
    }
  }
}
function createMiniradarCities() {
  if (legacyMaps) { return }
  drClass = document.getElementsByClassName("radar-lbar")[0]
  for (var i = 0; i < systemSettings.LBar.radar.radarCities.length; i++) {
    var child = document.createElement("div")
    child.className = "city " + numToWord(i)
    drClass.getElementsByClassName("cities")[0].appendChild(child)
    var dChild = document.createElement("div")
    dChild.className = "dot"
    drClass.getElementsByClassName("cities")[0].getElementsByClassName("city  " + numToWord(i))[0].appendChild(dChild)
    var doChild = document.createElement("div")
    doChild.className = "dot-outline"
    //drClass.getElementsByClassName("cities")[0].getElementsByClassName("city  " + numToWord(i))[0].appendChild(doChild)
    var nChild = document.createElement("div")
    nChild.className = "name shrinkY"
    drClass.getElementsByClassName("cities")[0].getElementsByClassName("city  " + numToWord(i))[0].appendChild(nChild)
    $(".radar-lbar .cities .city." + numToWord(i)).css({"top":systemSettings.LBar.radar.radarCities[i].dotTopPos+"px", "left":systemSettings.LBar.radar.radarCities[i].dotLeftPos+"px"})
    $(".radar-lbar .cities .city." + numToWord(i) + " .name").text(systemSettings.LBar.radar.radarCities[i].locationName)
    $(".radar-lbar .cities .city." + numToWord(i) + " .name").css({"top":systemSettings.LBar.radar.radarCities[i].nameTopMargin+"px", "left":systemSettings.LBar.radar.radarCities[i].nameLeftMargin+"px"})
    var Tchild = document.createElement("div")
    Tchild.className = "city " + numToWord(i)
    drClass.getElementsByClassName("cities-trans")[0].appendChild(Tchild)
    var TdChild = document.createElement("div")
    TdChild.className = "dot-trans"
    drClass.getElementsByClassName("cities-trans")[0].getElementsByClassName("city  " + numToWord(i))[0].appendChild(TdChild)
    var TdoChild = document.createElement("div")
    TdoChild.className = "dot-outline"
    drClass.getElementsByClassName("cities-trans")[0].getElementsByClassName("city  " + numToWord(i))[0].appendChild(TdoChild)
    var TnChild = document.createElement("div")
    TnChild.className = "name-trans shrinkY"
    drClass.getElementsByClassName("cities-trans")[0].getElementsByClassName("city  " + numToWord(i))[0].appendChild(TnChild)
    //var TnoChild = document.createElement("div")
    //TnoChild.className = "name-outline shrinkY"
    //drClass.getElementsByClassName("cities-trans")[0].getElementsByClassName("city  " + numToWord(i))[0].appendChild(TnoChild)
    $(".radar-lbar .cities-trans .city." + numToWord(i)).css({"top":systemSettings.LBar.radar.radarCities[i].dotTopPos+"px", "left":systemSettings.LBar.radar.radarCities[i].dotLeftPos+"px"})
    $(".radar-lbar .cities-trans .city." + numToWord(i) + " .name-trans").text(systemSettings.LBar.radar.radarCities[i].locationName)
    $(".radar-lbar .cities-trans .city." + numToWord(i) + " .name-trans").css({"top":systemSettings.LBar.radar.radarCities[i].nameTopMargin+"px", "left":systemSettings.LBar.radar.radarCities[i].nameLeftMargin+"px"})
    //$(".radar-lbar .cities-trans .city." + numToWord(i) + " .name-outline").text(systemSettings.LBar.radar.radarCities[i].locationName)
    //$(".radar-lbar .cities-trans .city." + numToWord(i) + " .name-outline").css({"top":systemSettings.LBar.radar.radarCities[i].nameTopMargin+"px", "left":systemSettings.LBar.radar.radarCities[i].nameLeftMargin+"px"})
  }
}
function deleteRadarCities() {
  var drClass = document.getElementsByClassName("doppler-radar")[0]
  const div = drClass.getElementsByClassName("cities")[0]
  while (div.firstChild) {
      div.removeChild(div.firstChild)
  }
  const tdiv = drClass.getElementsByClassName("cities-trans")[0]
  while (tdiv.firstChild) {
      tdiv.removeChild(tdiv.firstChild)
  }
}
function deleteRadarIcons() {
  var drClass = document.getElementsByClassName("doppler-radar")[0]
  const div = drClass.getElementsByClassName("icons")[0]
  while (div.firstChild) {
      div.removeChild(div.firstChild)
  }
  const tdiv = drClass.getElementsByClassName("icons-trans")[0]
  while (tdiv.firstChild) {
      tdiv.removeChild(tdiv.firstChild)
  }
}
function alignDataMaps() {
  $(".data-map").css({"scale":systemSettings.dataMaps.zoom, "top":systemSettings.dataMaps.topPos + "%", "left":systemSettings.dataMaps.leftPos + "%"})
}
function createTrafficMapIcons(zoom) {
  var toClass = document.getElementsByClassName("traffic-overview")[0]
  var id = zoom == 0 ? systemSettings.traffic.mapIcons.zoomOut : systemSettings.traffic.mapIcons.zoomIn
  for (var i = 0; i < id.length; i++) {
    var child = document.createElement("div")
    child.className = "icon " + numToWord(i)
    toClass.getElementsByClassName("traffic-icons")[0].appendChild(child)

    $(".traffic-overview .traffic-icons .icon." + numToWord(i)).css({"top":id[i].topPos+"px", "left":id[i].leftPos+"px","background-image":"url(images/trafficMap/"+id[i].icon + ".png)","background-size":"100% 100%"})
  }
}
function deleteTrafficMapIcons() {
  var toClass = document.getElementsByClassName("traffic-overview")[0]
  const div = toClass.getElementsByClassName("traffic-icons")[0]
  while (div.firstChild) {
      div.removeChild(div.firstChild)
  }
}
//route badges on the traffic overview map. the map's own symbol layers don't draw on this style, so the
//badges are html images over the map, positioned from the route numbers and shield types in its road data.
var trafficBadgeShields = {
  'us-interstate': { image: 'images/roadSigns/interstateHighwaySignLarge.png', text: '#ffffff', y: 0.58, width: 0.7, priority: 0 },
  'us-highway': { image: 'images/roadSigns/usHighwaySignLarge.png', text: '#000000', y: 0.52, width: 0.56, priority: 1 },
  'circle-white': { image: 'images/roadSigns/stateHighwaySignLarge.png', text: '#000000', y: 0.5, width: 0.7, priority: 2 }
};
var trafficBadgeScale = 0.6; //of the 85x84 sign images
var trafficBadgeMax = 10;
var trafficBadgeSpacing = 120; //minimum pixels between badges
var trafficBadgeCache = {};

//loads the blank sign images once
var trafficBadgeBases = Promise.all(Object.keys(trafficBadgeShields).map(function (shield) {
  return new Promise(function (resolve) {
    var img = new Image();
    img.onload = function () { trafficBadgeShields[shield].img = img; resolve() };
    img.onerror = function () { resolve() };
    img.src = trafficBadgeShields[shield].image;
  });
}));

//sign image with the route number drawn in
function trafficBadgeURL(shield, ref) {
  var key = shield + ref;
  if (trafficBadgeCache[key]) { return trafficBadgeCache[key] }
  var info = trafficBadgeShields[shield];
  var canvas = document.createElement('canvas');
  canvas.width = info.img.width;
  canvas.height = info.img.height;
  var ctx = canvas.getContext('2d');
  ctx.drawImage(info.img, 0, 0);
  var size = ref.length >= 3 ? 30 : 38;
  ctx.font = "bold " + size + "px Interstate";
  //width: how much of the sign the number may span (the US shield narrows toward its sides)
  while (ctx.measureText(ref).width > canvas.width * info.width) { size--; ctx.font = "bold " + size + "px Interstate" }
  ctx.fillStyle = info.text;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(ref, canvas.width / 2, canvas.height * info.y);
  trafficBadgeCache[key] = canvas.toDataURL();
  return trafficBadgeCache[key];
}

//sign for a traffic flow route's routeIcon: images/roadSigns/<name>.png when there is one, otherwise names
//like interstate_45, usRoute_59 or stateRoute_249 are drawn on the blank signs, so any city's routes get one
var roadSignPatterns = { interstate: 'us-interstate', usRoute: 'us-highway', stateRoute: 'circle-white' };
async function roadSignURL(name) {
  var file = "images/roadSigns/" + name + ".png";
  var exists = await new Promise(function (resolve) {
    var img = new Image();
    img.onload = function () { resolve(true) };
    img.onerror = function () { resolve(false) };
    img.src = file;
  });
  var match = /^(interstate|usRoute|stateRoute)_([0-9A-Za-z]+)$/.exec(name);
  if (exists || !match) { return file }
  await trafficBadgeBases;
  var shield = roadSignPatterns[match[1]];
  if (!trafficBadgeShields[shield].img) { return file }
  //the canvas only uses the sign font once it has loaded
  try { await document.fonts.load("bold 38px Interstate") } catch (error) {}
  return trafficBadgeURL(shield, match[2]);
}

async function createTrafficBadges() {
  await trafficBadgeBases;
  var holder = document.querySelector(".traffic-overview .traffic-icons");
  if (!holder || !trafficMap) { return }
  var shields = Object.keys(trafficBadgeShields).filter(function (s) { return trafficBadgeShields[s].img });
  var features = trafficMap.querySourceFeatures('composite', {
    sourceLayer: 'road',
    filter: ['all', ['match', ['get', 'class'], ['motorway', 'trunk'], true, false], ['has', 'ref'], ['match', ['get', 'shield'], shields, true, false]]
  });
  //the icon layer and the map are separate boxes; measure where the map sits relative to it
  var mapBox = trafficMap.getContainer().getBoundingClientRect();
  var holderBox = holder.getBoundingClientRect();
  var scale = mapBox.width / trafficMap.getContainer().offsetWidth;
  var dx = (mapBox.left - holderBox.left) / scale, dy = (mapBox.top - holderBox.top) / scale;
  var size = 85 * trafficBadgeScale, margin = size;
  var width = holder.offsetWidth, height = holder.offsetHeight;

  //every on-screen point of each route, grouped by route
  var routes = {};
  features.forEach(function (feature) {
    var key = feature.properties.shield + '|' + feature.properties.ref;
    //points, lines and multilines all come back from the road layer
    var walk = function (coords) {
      if (typeof coords[0] == 'number') {
        var p = trafficMap.project(coords);
        var x = p.x + dx, y = p.y + dy;
        if (x > margin && x < width - margin && y > margin && y < height - margin) {
          (routes[key] = routes[key] || []).push([x, y]);
        }
        return;
      }
      coords.forEach(walk);
    };
    walk(feature.geometry.coordinates);
  });
  //interstates first, then US and state highways; longer stretches on screen first within each
  var order = Object.keys(routes).sort(function (a, b) {
    return (trafficBadgeShields[a.split('|')[0]].priority - trafficBadgeShields[b.split('|')[0]].priority) || (routes[b].length - routes[a].length);
  });
  var placed = [];
  var center = [width / 2, height / 2];
  for (var key of order) {
    if (placed.length >= trafficBadgeMax) { break }
    //the point nearest the middle of the map that isn't crowding a badge already placed
    var spot = routes[key]
      .filter(function (p) { return placed.every(function (q) { return Math.hypot(p[0] - q[0], p[1] - q[1]) >= trafficBadgeSpacing }) })
      .sort(function (a, b) { return Math.hypot(a[0] - center[0], a[1] - center[1]) - Math.hypot(b[0] - center[0], b[1] - center[1]) })[0];
    if (!spot) { continue }
    placed.push(spot);
    var parts = key.split('|');
    var badge = document.createElement('div');
    badge.className = 'icon';
    badge.style.cssText = 'left:' + (spot[0] - size / 2) + 'px;top:' + (spot[1] - size / 2) + 'px;transform:scale(' + trafficBadgeScale + ');background-image:url(' + trafficBadgeURL(parts[0], parts[1]) + ');background-size:100% 100%';
    holder.appendChild(badge);
  }
}
