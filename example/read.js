var TFTP = require('..'),
	fs = require('fs');

// Initialize the tftp client
var client = new TFTP(69, 'localhost');

client.read('1.txt', function (err, data) {
	if (err) {
		console.error('ERROR:');
		console.error(err);
		return;
	}

	console.log('Got data (%d bytes). First 100 bytes:', data.length);
	console.log(data.toString('utf8', 0, 100));

	fs.writeFileSync('1.txt', data);
});
