#!/usr/bin/env node

// Require needed modules
var TFTP = require('..'), // The tftp-client module
	fs = require('fs'), // Simple wrappers around standard POSIX functions
	path = require('path'); // Contains utilities for handling and transforming file paths

/**********************\
|* Validate arguments *|
\**********************/

// Too few arguments (node + path_to_this_file + host + cmd + file = 5)
if (process.argv.length < 5) {
	// Print usage, and exit
	console.log('Needs atleast 3 arguments (you had %d)', process.argv.length-2);
	console.log('');
	printUsage(true);
}

// Grab arguments
var host = process.argv[2];
var cmd  = process.argv[3];
var file = process.argv[4];
var port = process.argv[5] || 69; // Port defaults to 69 if omitted

// If cmd is neither read nor write, print usage & exit
if (['read', 'write'].indexOf(cmd)===-1) {
	console.log('Command must be read or write (you had %s)', cmd);
	printUsage(true);
}

/*******************\
|* Validation done *|
\*******************/

// Create the client
var client = new TFTP(port, host);

var basename = path.basename(file);

/********\
|* READ *|
\********/
if (cmd == 'read') {
	// Read from server
	client.read(basename, function(err, data) {
		// If error, output some error message
		if (err) {
			console.error('Oh noes! Error while reading file from tftp server:');
			console.error(err);
		} else {

			// No error, we got the file, lets write it
			
			fs.writeFile(file, data, function (err) {
				
				// If error, output some error message
				if (err) {
					console.error('Dang it! Error while writing file!');
					console.error(err);
				} else {

					// No error, the file has been written!

					console.log('File saved (%d bytes)', data.length);
				}
			});
		}
	});
}
/*********\
|* WRITE *|
\*********/
else if (cmd == 'write') {
	// If file does not exist, print error and usage & exit
	if (!fs.existsSync(file)) {
		console.log('File (%s) does not exist!', file);
		printUsage(true);
	}

	// Read file first, then send to server
	var data = fs.readFileSync(file);

	client.write(basename, data, function (err, bytes) {
		if (err) {
			console.error('ERROR:');
			console.error(err);
			return;
		}

		console.log('File sent (%d bytes)', bytes);
	});
} else {
	console.log('???HOW DID YOU GET HERE???');
}

/**
 * Prints usage - how to use tftp-client
 * @param  {boolean} exit Wether it sould exit the process
 */
function printUsage(exit) {
	console.log('Usage:');
	console.log('  tftp-client <hostname> (read|write) <filename> [<port>]');
	console.log('');
	console.log('Example:');
	console.log('  tftp-client localhost read 1.txt');

	if (exit===true)
		process.exit(0);
}