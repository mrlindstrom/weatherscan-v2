![](https://i.postimg.cc/jqpN9c26/mistwxscanv2banner.png)

------------

**Weatherscan v2** is a simulated recreation of "Weatherscan" by The Weather Channel in HTML/CSS/JS, by ***mist weather media***

Online demo: [v2.weatherscan.net](https://v2.weatherscan.net)

© Mist Weather Media 2026.

------------

**Special thanks to these talented minds who made this project possible!**

**Joe Molinelli (TheGoldDiamond9)** - Lead Developer  
**COLSTER** - Developer  
**JensonWX** - Developer  
**Miceoroni** - Map Developer  
**zachNet** - README

and the rest of the Mist Creative Team for their support!

------------

Need support beyond the scope of this README? A guide for configuring this simulator will come soon. In the meantime, feel free to join our Discord for support!

[***mist weather media*** on Discord](https://discord.gg/hV2w5sZQxz)

# Initial Setup (Source code)

1. Install [node.js LTS](https://nodejs.org/en/).
2. Go to `/main/configs` and make a copy of `yourConfig.example.json` named `yourConfig.json`. Your copy is gitignored, so your keys and settings stay out of git. (Until you make one, the simulator runs off the example.)
3. Open `yourConfig.json`. You can look through the options and change anything if needed.
   - The maps leave out country names ("United States") by default. Set `appearanceSettings.countryLabels` to `true` to show them.
4. If you want the traffic segment, put a *TomTom* API key in `traf_key` (line 7). Keys are free at [developer.tomtom.com](https://developer.tomtom.com) with no credit card; the free plan refuses requests past its daily allowance rather than billing, and the simulator stops itself at 2,000 requests a day. Again, this is optional and only if you want the traffic segment - leaving it blank will erase the traffic segment from your lineup cleanly.
   - Each route in `traffic.routes` names its sign in `routeIcon`. That can be any image in `main/images/roadSigns` (without `.png`), or a name like `interstate_95`, `usRoute_66` or `stateRoute_1`, which is drawn on the matching blank sign when there's no image by that name.
5. The beach package's water temperature map reads NOAA CoastWatch, which doesn't allow browser requests from other sites. To show it, set `corsProxy` (line 10) to the URL of a [CORS Anywhere](https://github.com/Rob--W/cors-anywhere) instance you run. Left blank, that one card shows as unavailable.
6. The ski package only plays during `ski.season`, given as month-day dates (`"start":"11-15", "end":"04-15"`); the range can wrap past New Year. Remove `season` or leave its dates blank to play ski all year.
7. Save your changes to `yourConfig.json` and close it.
8. In the terminal / command prompt within the main directory, run `npm install --production`. This will install all dependencies required to run the simulator
9. In the terminal / command prompt within the main directory, run `npm start`. This will spin up a local web server on port 3000 by default. To use another port, put a line like `PORT=3003` in a `.env` file next to `app.js` (it's gitignored), or set the `PORT` environment variable.
10. Visit http://localhost:3000 to view the simulator.

# Jumping to and holding cards

For testing, the simulator can start on any card, stay on it, and jump between cards. This works with any location.

### URL options

These go after a `#` at the end of the URL, since the `?` part is the location (for example `?90210`). Combine them with `&`.

| Option | What it does |
|---|---|
| `#card=dopplerRadar` | Start on that card, in the first package that has it. |
| `&package=extralocal` | Pick the package, for cards that are in more than one (`currentConditions`, `extendedForecast` and so on). If your config's `packageSettings` doesn't include that package, it's added for that page load only. |
| `&hold` | Keep replaying the card instead of moving on. |
| `alert=Tornado Warning` | Start with a simulated alert active (see below). Separate several with commas. |

Examples:

- `http://localhost:3000/?90210#card=dopplerRadar` starts on the Doppler radar for 90210.
- `http://localhost:3000/?90210#card=golfIndex&hold` shows the golf index map and stays there.
- `http://localhost:3000/?Denver,CO#card=snowfallForecast&package=ski&hold` tests a ski card even if the ski package isn't in your lineup.

Changing only the `#` part of a URL doesn't reload the page, so press reload after editing it.

### Console commands

Open the browser's developer tools (F12) and use these in the console:

| Command | What it does |
|---|---|
| `weatherscan.cards()` | Lists the lineup and every card in it. |
| `weatherscan.jump("almanac")` | Jumps to a card. In the current package it switches at the next card change; in another package it reloads the page straight onto the card. |
| `weatherscan.jump("almanac", {now: true})` | Reloads straight onto the card right away. |
| `weatherscan.hold()` | Stops advancing past the current card. |
| `weatherscan.release()` | Resumes the normal rotation. |

### Simulating severe weather

The sim can pretend the main location has active alerts, so you can see the alert crawl, warning beep, Weather Bulletin and severe weather lineup without waiting for real weather. Only the sim's own alert requests for the main location are answered with made-up alerts; every simulated alert's text says it's a test.

| Command | What it does |
|---|---|
| `weatherscan.alert("Tornado Warning")` | Adds a simulated alert. The crawl switches right away; for a severe alert type the severe lineup starts at the next package. |
| `weatherscan.alert("Winter Storm Warning", {text: "..."})` | The same, with your own crawl text. |
| `weatherscan.alertTypes()` | Lists every alert name the sim knows, and which ones are severe. |
| `weatherscan.clearAlerts()` | Removes the simulated alerts and goes back to real ones. |

To start with alerts already active, add `alert=` to the URL, for example `http://localhost:3000/?90210#alert=Tornado Warning,Flash Flood Warning`.

### Card names

Use these names with `#card=` and `weatherscan.jump()`. A package only plays when it's listed in `packageSettings` in your config, except for the alert packages.

| Package | Card | What it shows |
|---|---|---|
| `intro` | `cityIntro` | Opening card with the location's name. |
| `forecast` | `cityIntro` | Location name card that opens the forecast package. |
| | `bulletin` | Text of active weather alerts (only while alerts are active). |
| | `currentConditions` | Current temperature, sky, wind, humidity, pressure and more. |
| | `nearbyCities` | Current conditions for nearby cities. |
| | `radarChooser` | Plays either `dopplerRadar` or `radarSatellite` at random. |
| | `dopplerRadar` | Looping local radar. |
| | `radarSatellite` | Looping local radar over satellite cloud cover. |
| | `localForecast` | Text forecast for the next few periods. |
| | `extendedForecast` | Five-day forecast with icons and highs/lows. |
| | `almanac` | Sunrise/sunset, moon phases and record and average temperatures. |
| `minicoreone`, `minicoretwo` | `currentConditions`, `radarChooser`, `dayPart`, `extendedForecast` | Shorter forecast packages. `dayPart` shows hourly conditions through the day. |
| `extralocal` | `currentConditions`, `radarChooser`, `dayPart`, `extendedForecast` | The forecast cards repeated for each nearby city in the state. |
| `spanish` | `currentConditions`, `radarChooser`, `dayPart`, `extendedForecast` | The forecast cards in Spanish. |
| `radar` | `dopplerRadar` | A full minute of radar. |
| `traffic` | `trafficIntro` | Traffic package title card. |
| | `trafficOverview` | Area map with live traffic flow and road badges. |
| | `trafficReport` | Accidents, construction and closures nearby (TomTom). |
| | `trafficFlow` | Drive times for the routes in your config (TomTom). |
| `travel` | `travelIntro` | Travel package title card. |
| | `travelWeather` | National map of expected weather (rain, snow, storms) with fronts. |
| | `travelForecast` | Forecasts for major U.S. cities. |
| | `destinationForecast` | Multi-day forecast for one travel destination. |
| `airport` | `airportIntro` | Airport package title card. |
| | `airportConditions` | Conditions and delays at your local airports. |
| | `nationalAirports` | Delays at major airports across the country. |
| `international` | `internationalIntro` | International package title card. |
| | `internationalMap` | World map with conditions in major cities. |
| | `internationalForecast` | Forecasts for international cities. |
| `golf` | `golfIntro` | Golf package title card. |
| | `teeTime` | Hourly golf conditions through the day. |
| | `golfIndex` | Regional map of golf conditions, rated poor to excellent. |
| | `courseForecast` | Forecasts for nearby golf courses. |
| | `golfPromo` | Golf package closing promo. |
| `health` | `healthIntro` | Health package title card. |
| | `outdoorActivity` | Outdoor activity rating for the day. |
| | `allergyReport` | Pollen levels by type. |
| | `healthForecast` | Cold & flu and allergy outlook. |
| | `airQuality` | Air quality index. |
| | `uvIndex` | UV index for the day. |
| | `healthTip` | A health tip. |
| | `healthPromo` | Health package closing promo. |
| `garden` | `gardenIntro` | Garden package title card. |
| | `gardenForecast` | Gardening forecast with rain and temperatures. |
| | `estimatedPrecip` | Regional map of rain over the past 24 hours. |
| | `precipForecast` | Regional map of expected rain over the next 3 days. |
| | `droughtMonitor` | Regional map of U.S. Drought Monitor levels. |
| | `frostFreeze` | Regional map of frost and freeze alerts (added only while one is active). |
| | `gardenPromo` | Garden package closing promo. |
| `ski` | `skiIntro` | Ski package title card. |
| | `skiReport` | Conditions at ski resorts. |
| | `snowfallForecast` | Regional map of expected snowfall. |
| | `skiTip` | A ski tip. |
| `beach` | `beachIntro` | Beach package title card. |
| | `surfReport` | Waves, wind and water temperature from the nearest buoy. |
| | `waterTemps` | Regional map of sea surface temperatures (needs `corsProxy`). |
| | `coastalForecast` | NWS coastal waters forecast for the nearest marine zone. |
| | `tides` | Tide times at the two nearest tide stations. |
| `severeA`, `severeB`, `severe2` | `severeMessage` and others | Alert packages that play only during severe weather alerts. |

------------

Enjoy the nostalgia! You're all set.

Many thanks for using our simulator! We hope you like it.
