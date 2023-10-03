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

// http2 client with rejectUnauthorized false to test the json api
const client = http2.connect('https://localhost:8443', {
    ca: fs.readFileSync('C:/Users/jason/Code/github/shdb/examples/localhost-cert.pem')
});

let usersRequest = client.request({ ':path': '/shdb/json/users' })
usersRequest.on('response', (headers, flags) => {
    for (const name in headers) {
        console.log(`${name}: ${headers[name]}`);
    }
});
usersRequest.setEncoding('utf8');
let data = '';
usersRequest.on('data', (chunk) => { data += chunk; });
usersRequest.on('end', () => {
    console.log(`\n${data}`);
    client.close();
});