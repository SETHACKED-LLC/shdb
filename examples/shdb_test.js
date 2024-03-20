const SHDB = require('../index.js');
const http2 = require('http2');
const fs = require('fs');
const shdb = new SHDB({
    publicFilesPath: 'C:/Users/jason/Code/github/shdb/examples/public', // This is the static serve files directory
    jsonDBPath: 'C:/Users/jason/Code/github/shdb/examples/jsonDatabase/db.json', // This is the json database file, the server will host an API for getting data from this JSON file.
    key: 'C:/Users/jason/Code/github/shdb/examples/localhost-privkey.pem', // https key
    cert: 'C:/Users/jason/Code/github/shdb/examples/localhost-cert.pem',   // https cert
    host: 'localhost', // host
    port: 8443, // port
    customAPI: (req, res) => {
        console.log(`Custom API: ${req.method} ${req.url}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'customAPI' }));
    }
});

shdb.start();