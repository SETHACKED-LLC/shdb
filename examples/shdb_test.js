const SHDB = require('../index.js');
const http2 = require('http2');

const shdb = new SHDB({
    publicFilesPath: 'C:/Users/jason/Code/github/shdb/examples/public',
    jsonDBPath: 'C:/Users/jason/Code/github/shdb/examples/db.json',
    key: 'C:/Users/jason/Code/github/shdb/examples/localhost-privkey.pem',
    cert: 'C:/Users/jason/Code/github/shdb/examples/localhost-cert.pem',
    host: 'localhost',
    port: 8443
});

shdb.start();

// GET /shdb/json/:collection => returns all records in collection
// GET /shdb/json/:collection/:id => returns record with id
// GET /shdb/json/:collection?key=value => returns records with key=value
// GET /shdb/json/:collection?key.key2=value => returns records with key.key2=value
// GET /shdb/json/:collection?key1=value1&key2=value2 => returns records with key1=value1 and key2=value2
// GET /shdb/json/:collection?key=:value1&key=:value2 => returns records with key=value1 or key=value2
// GET /shdb/json/:collection?_sort=key => returns records sorted by key
// GET /shdb/json/:collection?_sort=key&_order=asc => returns records sorted by key in ascending order

//async function to turn a request into its json body
const getJsonBody = async (req) => {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', (chunk) => {
            body += chunk;
        });
        req.on('end', () => {
            resolve(JSON.parse(body));
        });
    });
}

// http2 client with rejectUnauthorized false to test the json api
const client = http2.connect('https://localhost:8443', { rejectUnauthorized: false });

// GET /shdb/json/:users
const getUsers = client.request({ ':path': '/shdb/json/users' });
getJsonBody(getUsers).then(body => {
    console.log("GET /shdb/json/users")
    console.log(body);
    const getUser = client.request({ ':path': '/shdb/json/users/1' });
    return getJsonBody(getUser)
}).then(body => {
    console.log("GET /shdb/json/users/1")
    console.log(body);
    // GET /shdb/json/:users?username=anticlergy
    const getUser = client.request({ ':path': '/shdb/json/users?username=anticlergy' });
    return getJsonBody(getUser)
}).then(body => {
    console.log("GET /shdb/json/users?username=anticlergy")
    console.log(body);
    // GET /shdb/json/:users?admin=true&status.online=true
    const getUser = client.request({ ':path': '/shdb/json/users?status.online=true' });
    return getJsonBody(getUser)
}).then(body => {
    console.log("GET /shdb/json/users?status.online=true")
    console.log(body);
});