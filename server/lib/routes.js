(function () {
	"use strict";

	module.exports.get = {
		download: require('./routes/download'),
		register: require('./routes/register'),
		meta: require('./routes/meta')
	};

	module.exports.post = {
		check: require('./routes/check'),
		register: require('./routes/register'),
		upload: require('./routes/upload')
	};
}());
