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
        this.files = {};
        this.jsonDatabase = require(this.options.jsonDBPath);

        this.server = http2.createSecureServer({
            key: fs.readFileSync(this.options.key),
            cert: fs.readFileSync(this.options.cert),
        }, (req, res) => {
            if (req.url === '/') {
                req.url = '/index.html';
            }
            let requestURL = new URL(req.url, `https://${this.options.host}:${this.options.port}`);
            if (this.files[`${this.options.publicFilesPath}${requestURL.pathname}`] !== undefined) { // if the file exists in public files, send it over
                res.writeHead(200, { 'Content-Type': this.files[`${this.options.publicFilesPath}${requestURL.pathname}`].mime });
                res.end(this.files[`${this.options.publicFilesPath}${requestURL.pathname}`].data);
            } else {
                if (requestURL.pathname.indexOf('/shdb/json/') === 0) {
                    let collection = requestURL.pathname.split('/')[3] || null;
                    let id = requestURL.pathname.split('/')[4] || null;
                    // if requestURL.searchParams is empty, params is null
                    // if requestURL.searchParams is not empty, params is requestURL.searchParams
                    let params = requestURL.searchParams.toString() === '' ? null : requestURL.searchParams;
                    // CRUD API for the JSON database
                    switch (req.method) {
                        case 'GET':
                            {
                                // if collection is null, return all collections
                                // if id is null, return all records in collection
                                // if params is null, return all records in collection
                                // if params is not null, return filtered records in collection
                                if (collection === null) {
                                    res.writeHead(200, { 'Content-Type': 'application/json' });
                                    res.end(JSON.stringify(this.jsonDatabase));
                                } else {
                                    if (id === null) {
                                        if (params === null) {
                                            res.writeHead(200, { 'Content-Type': 'application/json' });
                                            res.end(JSON.stringify(this.jsonDatabase[collection]));
                                        } else {
                                            res.writeHead(200, { 'Content-Type': 'application/json' });
                                            res.end(JSON.stringify(this.filterCollection(collection, params)));
                                        }
                                    } else {
                                        res.writeHead(200, { 'Content-Type': 'application/json' });
                                        res.end(JSON.stringify(this.jsonDatabase[collection][id]));
                                    }
                                }
                            }
                            break;
                        case 'POST':
                            {}
                            break;
                        case 'PUT':
                            {}
                            break;
                        case 'DELETE':
                            {}
                            break;
                        default:
                            {
                                res.writeHead(405);
                                res.end();
                            }
                    }
                } else {
                    this.customAPI(req, res);
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

    customAPI(req, res) {
        // default to 404 for now
        res.writeHead(404);
        res.end();
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

    addRecord = (collection, record) => {
        // if collection does not exist, create it

    filterCollection = (collection, searchParams) => {
        let records = this.jsonDatabase[collection]
        let filteredRecords = []
        for (let record of records) {
            let match = true
            for (let [key, value] of searchParams) {
                let keys = key.split('.')
                let recordValue = record
                for (let key of keys) {
                    recordValue = recordValue[key]
                }
                if (recordValue !== value) {
                    match = false
                    break
                }
            }
            if (match) {
                filteredRecords.push(record)
            }
        }
        return filteredRecords
    }
}

module.exports = SHDB;