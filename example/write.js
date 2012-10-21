var TFTP = require('..'),
	fs = require('fs');

// Initialize the tftp client
var client = new TFTP(69, '78.47.194.67');

// Read file, and get a buffer back
var data = fs.readFileSync('1.txt');

client.write('1.txt', data, function (err, bytes) {
	if (err) {
		console.error('ERROR:');
		console.error(err);
		return;
	}

	console.log('SUCCESS!!! WOOP! - sent %d bytes!', bytes);
});
