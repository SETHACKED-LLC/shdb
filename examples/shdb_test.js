const SHDB = require('../index.js');
const http2 = require('http2');

// {
//     "users": [
//         {
//             "id": 1,
//             "username": "anticlergy",
//             "joined": "2023-09-12T02:26:25.989Z",
//             "admin": true,
//             "status": {
//                 "online": true,
//                 "lastSeen": "now"
//             }
//         },
//         {
//             "id": 2,
//             "username": "fubar",
//             "joined": "2023-09-12T02:26:25.989Z",
//             "admin": false,
//             "status": {
//                 "online": false,
//                 "lastSeen": "2023-09-12T02:26:25.989Z"
//             }
//         }
//     ]
// }

const shdb = new SHDB({
    publicFilesPath: 'C:/Users/jason/Code/github/shdb/examples/public',
    jsonDBPath: 'C:/Users/jason/Code/github/shdb/examples/db.json',
    key: 'C:/Users/jason/Code/github/shdb/examples/localhost-privkey.pem',
    cert: 'C:/Users/jason/Code/github/shdb/examples/localhost-cert.pem',
    host: 'localhost',
    port: 8443
});

shdb.start();

/**
 * GET /shdb/json/:users
 * GET /shdb/json/:users/:id
 * Filter examples
 * GET /shdb/json/:users?username=anticlergy
 * GET /shdb/json/:users?username=anticlergy&admin=true
 * GET /shdb/json/:users?id=1&id=2
 * GET /shdb/json/:users?username=anticlergy&admin=true&status.online=true
 * GET /shdb/json/:users?_sort=id&_order=desc
 */
/** 
 * POST /shdb/json/:users
 */
/**
 * PUT /shdb/json/:users/:id
 */
/**
 * DELETE /shdb/json/:users/:id
 */

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
getJsonBody(getUsers).then((body) => {
    console.log("GET /shdb/json/:users")
    console.log(body);
});

// GET /shdb/json/:users/:id
const getUser = client.request({ ':path': '/shdb/json/users/1' });
getJsonBody(getUser).then((body) => {
    console.log("GET /shdb/json/:users/:id")
    console.log(body);
});

// GET /shdb/json/:users?username=anticlergy
const getUserByUsername = client.request({ ':path': '/shdb/json/users?username=anticlergy' });
getJsonBody(getUserByUsername).then((body) => {
    console.log("GET /shdb/json/:users?username=anticlergy")
    console.log(body);
});

// GET /shdb/json/:users?username=anticlergy&admin=true
const getUserByUsernameAndAdmin = client.request({ ':path': '/shdb/json/users?username=anticlergy&admin=true' });
getJsonBody(getUserByUsernameAndAdmin).then((body) => {
    console.log("GET /shdb/json/:users?username=anticlergy&admin=true")
    console.log(body);
});

// GET /shdb/json/:users?id=1&id=2
const getUsersById = client.request({ ':path': '/shdb/json/users?id=1&id=2' });
getJsonBody(getUsersById).then((body) => {
    console.log("GET /shdb/json/:users?id=1&id=2")
    console.log(body);
});

// GET /shdb/json/:users?username=anticlergy&admin=true&status.online=true
const getUsersByUsernameAndAdminAndOnline = client.request({ ':path': '/shdb/json/users?username=anticlergy&admin=true&status.online=true' });
getJsonBody(getUsersByUsernameAndAdminAndOnline).then((body) => {
    console.log("GET /shdb/json/:users?username=anticlergy&admin=true&status.online=true")
    console.log(body);
});

// GET /shdb/json/:users?_sort=id&_order=desc
const getUsersSorted = client.request({ ':path': '/shdb/json/users?_sort=id&_order=desc' });
getJsonBody(getUsersSorted).then((body) => {
    console.log("GET /shdb/json/:users?_sort=id&_order=desc")
    console.log(body);
});