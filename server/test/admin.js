(function () {
	"use strict";

	var http = require('http'),
		users = require("../users"),
		basicOptions = {
			host: "localhost",
			port: 8022,
			path: "/admin"
		},
		failAuth = {
			user: 'test',
			password: users.test
		},
		successAuth = {
			user: 'beatgammit',
			password: users.beatgammit
		},
		failOptions,
		successOptions;
	
	function formatAuth(auth) {
		return auth.user + ":" + auth.password;
	}

	failOptions = basicOptions;
	failOptions.headers = {
		'authorization': "Basic " + (new Buffer(formatAuth(failAuth), 'utf8')).toString('base64')
	};
	http.request(failOptions, function (res) {
		if (res.statusCode === 401) {
			console.log("Fail auth test: OK");
		} else {
			console.log("Failed auth test: Not OK");
			console.log("Status: ", res.statusCode, " (Should be 401)");
			console.log("Credentials: ", failAuth);
			console.log();
		}
	}).end();

	successOptions = basicOptions;
	successOptions.headers = {
		'authorization': "Basic " + (new Buffer(formatAuth(successAuth), 'utf8')).toString('base64')
	};
	http.request(successOptions, function (res) {
		if (res.statusCode >= 200 && res.statusCode < 300) {
			console.log("Pass auth test: OK");
		} else {
			console.log("Pass auth test: Not OK");
			console.log("Status: ", res.statusCode, " (Should be 2xx)");
			console.log("Credentials: ", successAuth);
			console.log();
		}
	}).end();
}());
