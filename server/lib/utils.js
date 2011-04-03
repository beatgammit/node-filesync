(function () {
	"use strict";

	var path = require('path'),
		settings = require("../settings"),
		regex = /(..)(..)(..)(..).*/;
	
	function hashToPath(md5) {
		var m = md5.match(regex),
			newPath = path.join(settings.media_root, m[1], m[2], m[3], m[4], m[0]);

		return newPath;
	}

	module.exports.hashToPath = hashToPath;
}());
