var TFTP = require('..');


// Initialize the ftp client
var client = new TFTP(69, '78.47.194.67');

client.getFile('1.txt');