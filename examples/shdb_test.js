const SHDB = require('../index.js')

const server = new SHDB({
    publicFIlesPath: './public',
    jsonDBPath: './db.json',
    key: '.localhost-privkey.pem',
    cert: '.localhost-cert.pem'
})

server.customAPI = (req, res) => {
    // test custom api
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end('<h1>Custom API</h1>')
}