var TFTP = require('..');


// Initialize the ftp client
var client = new TFTP(69, '78.47.194.67');

client.read('1.txt', function (err, data) {
	if (err) {
		console.error('ERROR:');
		console.error(err);
		return;
	}

	console.log('Got data:');
	console.log(data.toString());
});
