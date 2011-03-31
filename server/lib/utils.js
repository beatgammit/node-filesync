(function () {
	"use strict";

	var path = require('path'),
		regex = /(..)(..)(..)(..).*/,
		doc_root = "./media/";
	
	function hashToPath(md5) {
		var m = md5.match(regex),
			newPath = path.join(doc_root, m[1], m[2], m[3], m[4], m[0]);

		return newPath;
	}

	module.exports.hashToPath = hashToPath;
}());
