var dgram = require('dgram'),	// UDP (datagram)
	fs = require('fs');			// FileSystem

// type: Opcode
var types = {
	'rrq': 1, // Read ReQuest
	'wrq': 2, // Write ReQuest
	'data':3,
	'ack': 4,
	'err': 5,

	// aliases:
	'read':1,
	'write':2
}

// Error strings ([errorCode] = errorString)
var errors = [
	'Not defined, see error message (if any).',
	'File not found.',
	'Access violation.',
	'Disk full or allocation exceeded.',
	'Illegal TFTP operation.',
	'Unknown transfer ID.',
	'File already exists.',
	'No such user.'
];

/**
 * Constructor
 * @param  {Number} port Port the tftp server is listening to
 * @param  {String} ip   Ip of host where the tftp server is
 */
var TFTP = module.exports = function(port, ip) {
	this.ip = ip || '127.0.0.1';
	this.port = port || 69;
	
	// Called when getting an message from the server
	var onMessage = function(msg, rinfo) {

		var type  = msg.readUInt16BE(0);

		switch (type) {
			// Data
			case 3:
				var block = msg.readUInt16BE(2);
				var data  = msg.toString('ascii', 4);

				console.log('Received data');
				console.log(data);
				break;
			// Ack
			case 4:
				break;
			// Error
			case 5:
				break;
		}

		console.log(type);

		console.log('GOT MESSAGE!');
		console.log(rinfo);
		console.log('msg:', msg);
	}

	this.client = dgram.createSocket("udp4", onMessage);
}

/**
 * Sends a file to the server
 * @param  {String}   filename File to send
 * @param  {Function} cb       Callback - (err)
 */
TFTP.prototype.sendFile = function(filename, cb) {
	// We need this later (inside another scope)
	var self = this;

	fs.exists(filename, function(exists) {
		if (!exists) {
			// Send `false` back to the callback from `.sendFile()`
			var err = new Error('File (' + filename + ') does exist.');
			cb(err);
			return;
		}

		var file = fs.open(filename, 'r', function(err, fd) {
			if (err)
				return cb(err);

			var bytesSent = 0;

			var next = function() {
				// Create a new buffer of 500 bytes.
				var byff = new Buffer(500);
				fs.read(fd, buff, 0, 500, null, function() {
					// ... @TODO
				});
			}

		})
	});
};

/**
 * Reads a file off the server
 * @param  {Stromg}   filename File to read from server
 * @param  {Function} cb       Callback
 */
TFTP.prototype.getFile = function(filename, cb) {
	// We need this later
	var self = this;

	// Create the request
	var buff = createRequest('read', filename);

	this.client.send(buff, 0, buff.length, this.port, this.ip, function(err, bytes) {

	})
};

/**
 * Creates a request. Returns Buffer.
 * @param  {String|Number} type     Int Opcode, or String (read|write|rrq|wrq)
 * @param  {String} filename        Filename to add in the request
 * @param  {String} mode            optional Mode (netascii|octet|email) - Defaults to octet
 * @return {Buffer}                 Buffer
 */
function createRequest(type, filename, mode) {
	// Accept type as string
	if (typeof type === 'string') {
		type = type.toLowerCase();

		if (types.hasOwnProperty(type))
			type = types[type];
		else
			throw 'Unknown type (' + type + ')';
	}
	// Not a string, nor a number, then we dno what type of request it is...
	else if (typeof type !== 'number')
		throw 'Unknown type (' + type + ')';

	// Default mode to 'octet'
	mode = mode || 'octet';

	// Calculate the length of the buffer
	// mode (2 byte opcode) + length of filename + 1 null byte + length of mode + 1 null byte.
	var buffLen = 4 + filename.length + mode.length;

	// Create the buffer
	var buff = new Buffer(buffLen);
	// Write mode (as unsigned 16 bit integer) on offset 0
	buff.writeUInt16BE(type, 0);
	// Write filename as ascii on offset 2
	buff.write(filename, 2, 'ascii');
	// Write mode as ascii on offset filename.length + 3 (type + filename null termination)
	buff.write(mode, 2 + filename.length + 1, 'ascii');

	// Return the new buffer
	return buff;
}