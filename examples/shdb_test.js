const SHDB = require('../index.js');
const http2 = require('http2');
const fs = require('fs');
const shdb = new SHDB({
    publicFilesPath: 'C:/Users/jason/Code/github/shdb/examples/public',
    jsonDBPath: 'C:/Users/jason/Code/github/shdb/examples/db.json',
    key: 'C:/Users/jason/Code/github/shdb/examples/localhost-privkey.pem',
    cert: 'C:/Users/jason/Code/github/shdb/examples/localhost-cert.pem',
    host: 'localhost',
    port: 8443
});
shdb.start();