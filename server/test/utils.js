(function () {
	"use strict";

	var path = require('path'),
		utils = require("../lib/utils"),
		settings = require("../settings"),
		md5 = 'be121740bf988b2225a313fa1f107ca1',
		expectedPath = path.join(settings.media_root, "be", "12", "17", "40", md5),
		pathTestResult;
	
	function testPath (hash, expected) {
		var calculated = utils.hashToPath(md5);

		if (path.normalize(calculated) === path.normalize(expected)) {
			return true;
		}
		return calculated;
	}

	pathTestResult = testPath(md5, expectedPath);
	if (pathTestResult === true) {
		console.log("Path test: OK");
	} else {
		console.log("Path test: Not OK");
		console.log("Hash: ", md5);
		console.log("Expected Path: ", expectedPath);
		console.log("Calculated Path: ", pathTestResult);
		console.log();
	}
}());
