//start at a specific card, or jump to one from the console. for debugging/testing.
//
//URL (uses the hash, since ?query is the location search):
//  #card=dopplerRadar                    start on the first package that has that card
//  #card=dopplerRadar&package=extralocal pick the package when the card is in more than one
//  #card=snowfallForecast&package=ski   a package missing from the config is added for that page load
//  #card=dopplerRadar&hold               keep replaying that card instead of moving on
//  #segment=5                            start at the beginning of the lineup's sixth package (counting from 0);
//                                        phones reload onto the next one this way
//
//console:
//  weatherscan.cards()                   list the lineup and every card in it
//  weatherscan.jump("almanac")           same package: switches at the next card change
//                                        other package: reloads straight onto the card
//  weatherscan.jump("almanac", {now: true})  always reload straight onto the card
//  weatherscan.hold() / weatherscan.release()  stop/resume advancing past the current card

var cardJump = {
  start: null,         //{card, package} from the URL, applied once at kickoff
  startSegment: null,  //lineup index from #segment, applied once at kickoff
  pendingIdx: null,    //same-package jump waiting for the current card to finish
  hold: false,
  firstSegment: false  //starting mid-lineup still needs the mini radar started
};

(function readCardJumpHash() {
  var params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  if (params.get("card")) {
    cardJump.start = { card: params.get("card"), package: params.get("package") };
  }
  cardJump.hold = params.has("hold");
  if (params.get("segment")) { cardJump.startSegment = Number(params.get("segment")) }
})();

//#card=...&package=ski adds that package for this page load when the config doesn't include it,
//so cards from any package can be tested. called by startup before the lineup is built and data loads.
function addCardJumpPackage() {
  if (!cardJump.start || !cardJump.start.package) { return }
  var name = cardJump.start.package;
  if (systemSettings.packageSettings.includes(name)) { return }
  if (!packageLibrary[name]) {
    console.warn("[cardjump] there is no " + name + " package");
    return;
  }
  systemSettings.packageSettings.push(name);
  console.log("[cardjump] added the " + name + " package for this page load");
}

//finds the package (gidx) and card (idx) for a card name in the current lineup
function findCard(card, packageName) {
  var lineup = slideSettings.order[orderidx].slideLineup;
  var savedGidx = gidx;
  var found = null;
  for (var g = 0; g < lineup.length && !found; g++) {
    if (packageName && lineup[g].group != packageName) { continue }
    gidx = g;
    //manageDurations fills in the package's cards for the current alert state
    manageDurations();
    var i = lineup[g].slides.findIndex(function (slide) { return slide.function == card });
    if (i != -1) { found = { gidx: g, idx: i } }
  }
  gidx = savedGidx;
  manageDurations();
  return found;
}

//called by slideKickOff before the first package is set up
function applyStartCard() {
  var segment = cardJump.startSegment;
  cardJump.startSegment = null;
  if (segment > 0 && segment < slideSettings.order[orderidx].slideLineup.length) {
    gidx = segment;
    idx = 0;
    cardJump.firstSegment = true;
  }
  if (!cardJump.start) { return }
  var found = findCard(cardJump.start.card, cardJump.start.package);
  if (!found) {
    console.warn("[cardjump] " + cardJump.start.card + " is not in the lineup. weatherscan.cards() lists what is.");
    cardJump.start = null;
    return;
  }
  gidx = found.gidx;
  idx = found.idx;
  cardJump.firstSegment = true;
}

//called by slideKickOff right before the first card shows. extralocal picks a random
//set of cards each time it is set up, so make sure the target card is still in it.
function resolveStartCard() {
  if (!cardJump.start) { return }
  var slides = slideSettings.order[orderidx].slideLineup[gidx].slides;
  for (var tries = 0; tries < 20; tries++) {
    var i = slides.findIndex(function (slide) { return slide.function == cardJump.start.card });
    if (i != -1) {
      idx = i;
      break;
    }
    manageDurations();
    slides = slideSettings.order[orderidx].slideLineup[gidx].slides;
  }
  console.log("[cardjump] starting on " + cardJump.start.card + " in " + slideSettings.order[orderidx].slideLineup[gidx].group);
  cardJump.start = null;
}

//called by slideCallBack when a card finishes. returns true when it set idx itself.
function cardJumpHandoff() {
  if (cardJump.pendingIdx != null) {
    idx = cardJump.pendingIdx;
    cardJump.pendingIdx = null;
    console.log("[cardjump] jumped to " + slideSettings.order[orderidx].slideLineup[gidx].slides[idx].function);
    return true;
  }
  return cardJump.hold;
}

var weatherscan = {
  cards: function () {
    var lineup = slideSettings.order[orderidx].slideLineup;
    var savedGidx = gidx;
    var rows = lineup.map(function (pkg, g) {
      gidx = g;
      manageDurations();
      return {
        package: pkg.group,
        current: g == savedGidx ? "<-" : "",
        cards: pkg.slides.map(function (slide) { return slide.function }).filter(function (name) { return name != "nullFunction" && name != "changeELoc" }).join(", ")
      };
    });
    gidx = savedGidx;
    manageDurations();
    console.table(rows);
  },
  jump: function (card, options) {
    options = options || {};
    var current = slideSettings.order[orderidx].slideLineup[gidx];
    if (!options.now && (!options.package || options.package == current.group)) {
      var i = current.slides.findIndex(function (slide) { return slide.function == card });
      if (i != -1) {
        cardJump.pendingIdx = i;
        return "jumping to " + card + " when the current card ends";
      }
    }
    if (!findCard(card, options.package)) {
      return card + " is not in the lineup. weatherscan.cards() lists what is.";
    }
    var params = new URLSearchParams({ card: card });
    if (options.package) { params.set("package", options.package) }
    if (options.hold || cardJump.hold) { params.set("hold", "") }
    window.location.hash = params.toString();
    window.location.reload();
    return "reloading onto " + card;
  },
  hold: function () {
    cardJump.hold = true;
    return "holding on the current card";
  },
  release: function () {
    cardJump.hold = false;
    return "advancing normally";
  }
};
