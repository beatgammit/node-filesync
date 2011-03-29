(function () {
	"use strict";

	var adminDB = require('../../admins');

	module.exports = function (req, res, next) {
		if (req.remoteUser && adminDB[req.remoteUser]) {
			req.url = "./admin.html";
			return next();
		} else {
			res.statusCode = 401;
			res.setHeader('WWW-Authenticate', 'Basic realm="Authorization Required"');
			res.end('Unauthorized');
		}
	};
}());
