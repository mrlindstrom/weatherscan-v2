//a phone runs out of memory with every map alive at once: the browser kills the page and keeps reloading it.
//so on phones the doppler, radar/satellite and traffic maps are only made while their card shows (radar.js),
//and the maps draw no sharper than the shrunken stage shows them. desktops keep every map, as before.
//#phonemaps=on or #phonemaps=off in the URL tries either way
var phoneMaps = (function () {
	var choice = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("phonemaps");
	return choice ? choice == "on" : /Mobi/.test(navigator.userAgent);
})();
//how long a phone's page runs before it starts over at the next segment change (slides.js)
var phoneReloadAfter = 8 * 60 * 1000;
if (phoneMaps) {
	//each of mapbox's tile workers is another copy of mapbox in memory
	mapboxgl.workerCount = 1;
	//for phone-only styles in weatherscan.css
	document.documentElement.classList.add("phone-maps");
	//the maps draw at the 1620x1080 stage's own size times the screen's pixel ratio, before the stage is shrunk to fit:
	//4860x3240 per map on a phone's 3x screen. on phones, they draw only as sharp as the shrunken stage, and never sharper than the screen
	var screenPixelRatio = window.devicePixelRatio;
	Object.defineProperty(window, "devicePixelRatio", {
		get: function () {
			var stageScale = Math.min(window.innerWidth / 1620, window.innerHeight / 1080);
			return screenPixelRatio * Math.min(stageScale, 1);
		}
	});
}

$(function(){
	var $main = $("#main"),
		$window = $( window ),
	    mainHeight = $main.outerHeight(),
	    mainWidth = $main.outerWidth(),
	    mainAspect = 3/2,
	    resizeTimer;

//calls rescale when window resizes
	$(window).resize( function(e) {
		clearTimeout(resizeTimer);
		resizeTimer = setTimeout(scaleWindow, 100);
	});

	function scaleWindow() {
		var scale, windowAspect;

		windowAspect = $window.width() / $window.height();
		if (windowAspect>=mainAspect) {
			scale = $window.height() / mainHeight;
		} else {
			scale = $window.width() / mainWidth;
		}

		$main.css({
			transform: "translate(-50%, -50%) " + "scale(" + scale + ")"
		});
		$("#startup").css({
			transform: "translate(-50%, -50%) " + "scale(" + scale + ")"
		});
		$("#settingspanel").css({
			transform: "translate(-50%, -50%) " + "scale(" + scale + ")"
		});
		$("#backplating").css({
			transform: "translate(-50%, -50%) " + "scale(" + scale + ")"
		});
		$("#json-load").css({
			transform: "translate(-50%, -50%) " + "scale(" + scale + ")"
		});
	}
	scaleWindow(); // init

});
