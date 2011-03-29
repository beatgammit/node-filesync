(function () {
	"use strict";

	var fs = require('fs'),
		data;

	data = fs.readFileSync('settings.json', 'utf8');

	module.exports = JSON.parse(data);
}());
