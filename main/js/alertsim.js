//simulated weather alerts for testing the crawl, warning beep, bulletin and severe lineup.
//the sim's own alert requests for the main city get made-up answers, so everything downstream runs as it
//would for a real alert. nothing here runs unless asked for.
//
//URL (with the card jump options, after the #):
//  #alert=Tornado Warning                         start with that alert active
//  #alert=Tornado Warning,Flash Flood Warning     several at once
//
//console:
//  weatherscan.alert("Tornado Warning")           add an alert now (the crawl switches right away; the
//                                                 severe lineup starts at the next package)
//  weatherscan.alert("Tornado Warning", {text: "..."})   with your own crawl/bulletin text
//  weatherscan.alertTypes()                       list the alert names the sim knows
//  weatherscan.clearAlerts()                      back to real alerts

var simulatedAlerts = [];

(function readAlertHash() {
  var value = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("alert");
  if (!value) { return }
  value.split(",").map(function (name) { return name.trim() }).filter(Boolean).forEach(function (name) {
    simulatedAlerts.push({ event: name, text: "" });
  });
})();

function simulatedAlertText(alert) {
  if (alert.text) { return alert.text }
  var until = new Date(Date.now() + 2 * 60 * 60 * 1000).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  var place = (typeof systemSettings != "undefined" && systemSettings.mainCity && systemSettings.mainCity.locationName) || "the area";
  return "THIS IS A SIMULATED ALERT FOR TESTING. The National Weather Service has issued a " + alert.event +
    " for " + place + " until " + until + ".";
}

//answers the main city's alert headline and detail requests while any alert is simulated
(function interceptAlertRequests() {
  var getJSON = $.getJSON;
  $.getJSON = function (url) {
    if (simulatedAlerts.length > 0 && typeof url == "string") {
      var answer = null;
      var city = systemSettings.mainCity;
      if (url.includes("/v3/alerts/headlines") && url.includes("geocode=" + city.lat + "," + city.lon)) {
        answer = {
          alerts: simulatedAlerts.map(function (alert, i) {
            return { eventDescription: alert.event, detailKey: "simulated-" + i, headlineText: alert.event + " for " + city.locationName + " (simulated)" };
          })
        };
      }
      var detail = /\/v3\/alerts\/detail\?alertId=simulated-(\d+)/.exec(url);
      if (detail && simulatedAlerts[detail[1]]) {
        var alert = simulatedAlerts[detail[1]];
        answer = { alertDetail: { eventDescription: alert.event, messageType: "New", texts: [{ description: simulatedAlertText(alert) }] } };
      }
      if (answer) {
        var callback = Array.prototype.slice.call(arguments, 1).find(function (arg) { return typeof arg == "function" });
        if (callback) { callback(answer) }
        return $.Deferred().resolve(answer).promise();
      }
    }
    return getJSON.apply(this, arguments);
  };
})();

weatherscan.alertTypes = function () {
  console.table(Object.keys(warningSettings).map(function (name) {
    return { alert: name, severe: warningSettings[name].severe, shown: warningSettings[name].included, color: warningSettings[name].color };
  }));
};

weatherscan.alert = function (event, options) {
  options = options || {};
  if (!warningSettings[event]) {
    return '"' + event + '" is not an alert the sim knows. weatherscan.alertTypes() lists them.';
  }
  if (!warningSettings[event].included) {
    console.warn(event + " is turned off (included: false) in warningSettings, so the sim won't show it");
  }
  simulatedAlerts.push({ event: event, text: options.text || "" });
  checkWarningCrawl();
  return "simulating " + simulatedAlerts.map(function (a) { return a.event }).join(", ") +
    (warningSettings[event].severe ? ". the severe lineup starts at the next package" : "");
};

weatherscan.clearAlerts = function () {
  simulatedAlerts = [];
  checkWarningCrawl();
  return "back to real alerts";
};
