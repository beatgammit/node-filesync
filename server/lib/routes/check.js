(function () {
	"use strict";

	function checkStatus(req, res, next) {
		var bFirst = true;

		res.writeHead(200, {'Content-Type': 'application/json'});
		res.write('[');
		req.body.files.forEachAsync(function (next, item) {
			dbaccess.fileExists(item.filestat, item.filedata, req.remoteUser, function (result) {
				if (!bFirst) {
					res.write(',');
				}
				bFirst = false;

				res.write(JSON.stringify(result));
				next();
			});
		}).then(function () {
			res.end(']');
		});
	}

	module.exports = checkStatus;
}());
