(function () {
	"use strict";

	var dbaccess = require('../dbaccess'),
		qs = require('qs'),
		url = require('url');

	function handleRegister(req, res) {
		var qData;
		if (req.method === "GET") {
			qData = qs.parse(url.parse(req.url).query);
			dbaccess.registerUser(qData.name, qData.pass, qData.data, function (cess) {
				res.writeHead(200, {'Content-Type': 'application/json'});
				res.end(JSON.stringify(cess));
			});
		} else {
			dbaccess.registerUser(req.body.user, req.fields.pass, req.fields.data, function (err) {
				res.writeHead(200, {'Content-Type': 'application/json'});
				if (err) {
					res.end(JSON.stringify({error: err}));
				} else {
					res.end(JSON.stringify({success: true}));
				}
			});
		}
	}

	module.exports = handleRegister;
}());
