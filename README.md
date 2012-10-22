# TFTP-Client

A simple TFTP client for Node.Js.  
*Should not be used in production - first of all: this module is at an early stage (written in less than 12 hours), second: tftp is terrible*

## Install

### As a module
`npm install tftp-client`

### As CLI
`npm install -g tftp-client`

## Usage

### Module

`var client = new TFTP(port, client)` to create a new client.

`client.read(filename, callback)` to **read** from the server.  
 ~ The Callback is passed 2 arguments `(err, data)`, where `data` is the contents of the file.  

`client.write(filename, callback)` to **write** to the server.  
 ~ The callback is passed 2 arguments `(err, bytes)`, where `bytes` is the number of bytes sent.  

**Simple read example:**

```javascript
var TFTP = require('tftp-client');

// Initialize the tftp client
var client = new TFTP(69, 'localhost');

// Read 1.txt from the server
client.read('1.txt', function (err, data) {
	if (err) {
		console.error('ERROR:');
		console.error(err);
		return;
	}

	console.log('Got data (%d bytes). First 100 bytes:', data.length);
	console.log(data.toString('utf8', 0, 100));
});
```

### Command line

To install the tftp-client as CLI, run `npm install -g tftp-client`.

`tftp-client <hostname> (read|write) <filename> [<port>]`
* hostname - Hostname of tftp server
* read|write - Wether you want to read or write
* filename - Path to the file you want to read or write
* port - Optional. Defaults to 69

**Example**:
`tftp-client localhost read 1.txt`