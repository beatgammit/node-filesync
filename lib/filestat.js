var exports,
	crypto = require('crypto'),
	hashAlgo = "md5";

function FileStat(){
	var self = {};

	function checksum(callback) {
		var hash, matches,
			hashData = self.mtime.toString() + self.size.toString() + self.path;

		if (!(self.path && self.mtime && self.size)) { 
			return;
		}

		hash = crypto.createHash(hashAlgo).update(hashData).digest("hex");
		matches = self.qmd5 ? (self.qmd5 === hash) : true;
		self.qmd5 = hash;
		callback(matches, hash);
	}

	self.checksum = checksum;

	return self;
}

module.exports = FileStat;
