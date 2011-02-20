/*
 * Copyright 2011 T. Jameson Little, AJ ONeal
 * MIT Licensed
 */
var require;
(function () {
	"use strict";

	require('noop');

	var connect = require('connect'),
        auth = require('connect-auth'),
        authdb = require('./users'),
		staticProvider = require("./static"),
		form = require('connect-form'),
		fs = require('fs'),
		util = require('util'),
		handleUpload = require("./lib/import.js"),
		server;

	// try to rename first, copy as a backup plan
	fs.move = function (oldPath, newPath, cb) {
		fs.rename(oldPath, newPath, function(err){
			if (!err) {
				return doop(cb);
			}

			// backup plan
			//console.log("Move Error: " + err);
			var readStream = fs.createReadStream(oldPath),
				writeStream = fs.createWriteStream(newPath);

			util.pump(readStream, writeStream, function(err) {
				if (err) {
					return doop(cb, err);
				}
				fs.unlink(oldPath, cb);
			});
		});
	};

  function validateUserPassword(username, password, onSuccess, onFailure) {
    if (authdb[username] && authdb[username] === password) {
      return onSuccess();
    }
    onFailure(new Error("Username and password don't pass"));
  }

  function authenticateUser(req, res, next) {
    req.authenticate(['http'], function(error, authenticated) { 
      if (authenticated) {
        return next();
      }
      console.log(error);
      res.writeHead(403, {'Content-Type': 'text/html'});
      res.end("<html><h1>Bad Authentication</h1></html>\n");
      return;
    });
  }

	server = connect.createServer(
        auth([ auth.Http({ validatePassword: validateUserPassword }) ]),
        authenticateUser,
        form({keepExtensions: true}),
        handleUpload,
        staticProvider()
	);

	server.listen(8022);

	console.log("Server listening on port 8022");
}());
