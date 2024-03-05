const SHDB = require('../index.js');
const http2 = require('http2');
const fs = require('fs');
const shdb = new SHDB({
    publicFilesPath: 'C:/Users/jason/Code/github/shdb/examples/public', // This is the static serve files directory
    jsonDBPath: 'C:/Users/jason/Code/github/shdb/examples/jsonDatabase/db.json', // This is the json database file, the server will host a CRUD API for interacting with this JSON file.
    key: 'C:/Users/jason/Code/github/shdb/examples/localhost-privkey.pem', // https key
    cert: 'C:/Users/jason/Code/github/shdb/examples/localhost-cert.pem',   // https cert
    host: 'localhost', // host
    port: 8443 // port
});
shdb.start();