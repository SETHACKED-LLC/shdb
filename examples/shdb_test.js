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
async function testDataPath(path, client) {
    return new Promise((resolve, reject) => {
        let data = '';
        const request = client.request({ ':path': path });
        request.on('response', (headers) => {
            for (const name in headers) {
                console.log(`${name}: ${headers[name]}`);
            }
        });
        request.setEncoding('utf8');
        request.on('data', (chunk) => { data += chunk; });
        request.on('error', reject);
        request.on('end', () => resolve(data));
        request.end();
    });
}
async function main() {
    const client = http2.connect('https://localhost:8443', {
        ca: fs.readFileSync('C:/Users/jason/Code/github/shdb/examples/localhost-cert.pem')
    })
    try {
        const data = await testDataPath('/shdb/json/users', client);
        console.log('\n' + data);
    } catch (error) {
        console.error('Error: ', error);
    } finally {
        client.close();
    }
}
main();