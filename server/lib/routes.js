(function () {
	"use strict";

	module.exports.get = {
		admin: require('./routes/admin'),
		download: require('./routes/download'),
		register: require('./routes/register'),
		meta: require('./routes/meta'),
		settings: require('./routes/settings').get
	};

	module.exports.post = {
		check: require('./routes/check'),
		register: require('./routes/register'),
		upload: require('./routes/upload'),
		settings: require('./routes/settings').post
	};
}());
