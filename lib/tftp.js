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
 * @param  {String} ip   Ip or hostname of the tftp server
 */
var TFTP = module.exports = function(port, ip) {
	this.ip = ip || '127.0.0.1';
	this.port = port || 69;

	// Hold the current operation
	this.current = false;
	// Holds the queue of the next operations
	this.queue = [];

	this.client = null;
}

TFTP.prototype.createClient = function() {
	if (this.client !== null)
		return;

	// We need this inside onMessage...
	var self = this;
	
	// Called when getting an message from the server
	var onMessage = function(msg, rinfo) {

		var type  = msg.readUInt16BE(0);

		switch (type) {
			// Data
			case 3:
				var block = msg.readUInt16BE(2);
				var data = msg.slice(4); // From byte 4 is data

				// Concat the two buffers
				self.current.data = Buffer.concat([self.current.data, data]);

				// Create and send ACK packet
				var ack = createAck(block);
				self.send(ack);

				// If less than 512 bytes were received, it's the end...
				if (data.length < 512) {
					// Send the data to the callback
					self.current.callback(null, self.current.data);

					// Reset current
					self.current = false;
					// Check queue
					self.check();
				}
				break;
			// Ack
			case 4:
				var block = msg.readUInt16BE(2);

				// If this is the ack for the last block
				if (block == self.current.blocks) {
					// Send callback
					self.current.callback(null, self.current.data.length);

					// Reset current, and check queue
					self.current = false;
					self.check();

					// Break out of switch
					break;
				}

				var start = 512 * block;
				var end   = Math.min(start + 512, self.current.data.length);

				var data = self.current.data.slice(start, end);

				var packet = createData(block+1, data);
				self.send(packet);
				break;
			// Error
			case 5:
				break;
		}
	}

	// Create socket, and listen to messages
	this.client = dgram.createSocket("udp4", onMessage);
};

/**
 * Shortcut for sending packet to server
 * @param  {Buffer}   buff The buffer to send
 * @param  {Function} cb   Callback - (err, bytes)
 */
TFTP.prototype.send = function(buff, cb) {
	if (typeof cb !== 'function') cb = function() {};
	this.client.send(buff, 0, buff.length, this.port, this.ip, cb);
};

/**
 * Checks the Queue.
 * If no operation is currently active, go to the next item in the queue (if any).
 */
TFTP.prototype.check = function() {
	// If there currently is an active operation
	// Or if the queue is empty, just return
	if (this.current !== false)
		return;

	// If there is nothing running, and the queue is empty
	if (this.queue.length == 0) {
		// Close client
		this.client.close();
		return;
	} else {
		// Create client
		this.createClient();
	}

	// Take the first item in queue
	this.current = this.queue.shift();

	// We need this later
	var self = this;

	// Create the request...
	var buff = createRequest(this.current.type, this.current.filename);
	// Send the request
	this.send(buff, function(err, bytes) {
		// If there was an error sending the packet
		if (err) {
			// Create Error message
			var err = new Error(['Error when sending ',
								self.current.type,
								' request for ',
								self.current.filename].join());

			// Send error to the callback of the current operation
			self.current.callback(err);

			// Reset current
			self.current = false;

			// Then check queue
			self.check();
		}
	});
};

/**
 * Sends a file to the server
 * @param  {String}   filename File to send
 * @param  {Function} cb       Callback - (err)
 */
TFTP.prototype.write = function(filename, data, cb) {
	if (typeof cb !== 'function') cb = function() {}; // Default cb to an empty function
	if (!Buffer.isBuffer(data)) data = new Buffer(data); // If data is not a Buffer, make it a buffer

	// Item to put into the queue
	var queueItem = {
		type: 'write',
		filename: filename,
		callback: cb,
		data: data,
		blocks: Math.ceil(data.length / 512) // Number of blocks to transfer data.
		                                     // When we receive an ACK with this number, the transfer is finished
	};

	// Push the queueItem to the end of the queue.
	this.queue.push(queueItem);

	// Check the queue...
	this.check();
};

/**
 * Reads a file off the server
 * @param  {String}   filename File to read from server
 * @param  {Function} cb       Callback - (err, data)
 */
TFTP.prototype.read = function(filename, cb) {
	if (typeof cb !== 'function') cb = function() {}; // Default cb to an empty function

	// Item to put into the queue
	var queueItem = {
		type: 'read',
		filename: filename,
		callback: cb,
		data: new Buffer(0) // Buffer of size 0 which will be filled up by onMessage
	};

	// Push the queueItem to the end of the queue.
	this.queue.push(queueItem);

	// Check the queue...
	this.check();
};

/**
 * Creates a buffer for a request.
 * @param  {String|Number} type     Int Opcode, or String (read|write|rrq|wrq)
 * @param  {String} filename        Filename to add in the request
 * @param  {String} mode            optional Mode (netascii|octet|email) - Defaults to octet
 * @return {Buffer}                 The Buffer
 */
function createRequest(type, filename, mode) {
	// Figure out the opcode for the type
	if (typeof type === 'string') {
		type = type.toLowerCase();

		// If it exists in the types object, we found it
		if (types.hasOwnProperty(type))
			type = types[type];
		// If not, we dno what type
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

/**
 * Creates a buffer for a data packet
 * @param  {Number} blockNumber Which block of the transaction it is
 * @param  {String} data        The data to send
 * @return {Buffer}             The Buffer
 */
function createData(blockNumber, data) {
	var type = types['data'];

	// Type + blocknumber + length of data(max 512)
	var dataLen = Math.min(data.length, 512);
	var buffLen = 4 + dataLen;

	var buff = new Buffer(buffLen);

	buff.writeUInt16BE(type, 0); // Type as UInt16BE on offset: 0
	buff.writeUInt16BE(blockNumber, 2); // BlockNumber as UInt16BE on offset: 2
	// Copy `data` into buff on offset 4. bytes 0 to 512 from `data`.
	data.copy(buff, 4, 0, dataLen); // targetBuffer, targetStart, sourceStart, sourceEnd

	return buff;
}

/**
 * Creates a buffer for a ACK packet
 * @param  {Number} blockNumber Which block to ack
 * @return {Buffer}             The Buffer
 */
function createAck(blockNumber) {
	var type = types['ack'];

	var buff = new Buffer(4);
	buff.writeUInt16BE(type, 0); // Type as UInt16BE on offset: 0
	buff.writeUInt16BE(blockNumber, 2); // BlockNumber as UInt16BE on offset: 2

	return buff;
}