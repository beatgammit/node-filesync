(function () {
	"use strict";

	var fs = require('fs'),
		path = require('path'),
		data;

	data = fs.readFileSync(path.join(__dirname, 'settings.json'), 'utf8');

	module.exports = JSON.parse(data);
}());
