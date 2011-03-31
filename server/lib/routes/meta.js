(function () {
	"use strict";

	var dbaccess = require('../dbaccess');

	function handleMeta(req, res, next) {
		var mimeType,
			user = req.remoteUser,
			category = req.params.field,
			type = req.params.value;

		if (!req.params.field) {
			return next();
		}

		// if they have supplied the full mimetype
		if (req.params.value) {
			mimeType = category + "/" + type;

			dbaccess.getByMimeType(user, mimeType, function (error, result) {
				res.writeHead(200, {'Content-Type': 'application/json'});
				if (error) {
					res.end(JSON.stringify(error));
				} else {
					res.end(JSON.stringify(result));
				}
			});
			return;
		}

		// they want a category
		dbaccess.getMimeCategories(user, category, function (error, result) {
			var bFirst = true;

			res.writeHead(200, {'Content-Type': 'application/json'});

			if (error) {
				res.end(JSON.stringify(error));
				return;
			}

			console.log(result);

			res.write('[');
			result.forEachAsync(function (next, item) {
				console.log(item);
				dbaccess.getByMimeType(user, item, function (error, result) {

					result.forEach(function (tDoc) {
						if (!bFirst) {
							res.write(',');
						}
						bFirst = false;
						
						res.write(JSON.stringify(tDoc));
					});

					next();
				});
			}).then(function () {
				res.end(']');
			});
		});
	}

	module.exports = handleMeta;
}());
