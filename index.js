'use strict';
const http2 = require("http2");
const fs = require("fs");
const fsp = fs.promises;
const mime = require("mime-types");
class SHDB {
    constructor(options) {
        this.options = options;
        this.options.publicFilesPath = this.options.publicFilesPath || './public/';
        this.options.jsonDBPath = this.options.jsonDBPath || './db.json';
        this.options.key = this.options.key || './localhost-privkey.pem';
        this.options.cert = this.options.cert || './localhost-cert.pem';
        this.options.host = this.options.host || 'localhost';
        this.options.port = this.options.port || 8443;
        this.options.customAPI = this.options.customAPI || function(req, res) {
            res.writeHead(404);
            res.end();
        }; 
        this.files = {};
        this.jsonDatabase = require(this.options.jsonDBPath);
        this.server = http2.createSecureServer({
            key: fs.readFileSync(this.options.key),
            cert: fs.readFileSync(this.options.cert),
            allowHTTP1: true
        }, (req, res) => {
            if (req.url === '/') {
                req.url = '/index.html';
            }
            let requestURL = new URL(req.url, `https://${this.options.host}:${this.options.port}`);
            // static files
            if (this.files[`${this.options.publicFilesPath}${requestURL.pathname}`] !== undefined) {
                res.writeHead(200, {
                    'Content-Type': this.files[`${this.options.publicFilesPath}${requestURL.pathname}`].mime,
                    'X-Content-Type-Options': 'nosniff',
                    'Cache-Control': 'public, max-age=31536000, immutable'
                });
                res.end(this.files[`${this.options.publicFilesPath}${requestURL.pathname}`].data);
            } else {
            // defined APIs
                if (requestURL.pathname.indexOf('/shdb/json/') === 0) {
                    // JSON CRUD API
                    // 404 for now
                    res.writeHead(404);
                } else {
                    this.options.customAPI(req, res);
                }
            }
        });
    }
    start() {
        this.server.listen(this.options.port, this.options.host, () => {
            console.log(`Server running at https://${this.options.host}:${this.options.port}/`);
        });
        this.readPublicFiles();
    }
    async walkDirectory(directoryPath) {
        let paths = await fsp.readdir(directoryPath);
        for (let i = 0; i < paths.length; i++) {
            let path = paths[i];
            let stat = await fsp.stat(directoryPath + path);
            if (stat.isDirectory()) {
                await this.walkDirectory(directoryPath + path + '/');
            } else {
                if (this.files[`${directoryPath}${path}`]) {
                    if (this.files[`${directoryPath}${path}`].mtimeMs !== stat.mtimeMs) {
                        this.files[`${directoryPath}${path}`] = {
                            path: `${directoryPath}${path}`,
                            name: path,
                            mime: mime.lookup(path),
                            stat: stat,
                            data: await fsp.readFile(`${directoryPath}${path}`)
                        };
                    } else {
                        this.files[`${directoryPath}${path}`].stat = stat;
                    }
                } else {
                    this.files[`${directoryPath}${path}`] = {
                        path: `${directoryPath}${path}`,
                        name: path,
                        mime: mime.lookup(path),
                        stat: stat,
                        data: await fsp.readFile(`${directoryPath}${path}`)
                    };
                }
            }
        }
    }
    async readPublicFiles() {
        await this.walkDirectory(this.options.publicFilesPath + '/');
        return;
    }
}

module.exports = SHDB;