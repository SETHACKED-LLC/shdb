'use strict';

const http2 = require("http2");
const url = require("url");
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
            // console.log(`requestURL: ${requestURL}`);
            let pathname = requestURL.pathname;
            // console.log(`${this.options.publicFilesPath}${pathname}`)
            if (this.files[`${this.options.publicFilesPath}${pathname}`] !== undefined) { // if the file exists in public files, send it over
                res.setHeader('Content-Type', this.files[`${this.options.publicFilesPath}${pathname}`].mime);
                res.end(this.files[`${this.options.publicFilesPath}${pathname}`].data);
            } else {
                if (pathname.indexOf('/shdb/json/') === 0) {
                    // CRUD API for the JSON database
                    switch (req.method) {
                        case 'GET':
                            {
                                /**
                                 * GET /shdb/json/:collection => returns all items in the collection
                                 * GET /shdb/json/:collection/:id => returns the item with the id
                                 * Filter examples
                                 * GET /shdb/json/:collection?username=anticlergy => returns all items with username=anticlergy
                                 * GET /shdb/json/:collection?username=anticlergy&admin=true => returns all items with username=anticlergy and admin=true
                                 * GET /shdb/json/:collection?id=1&id=2 => returns all items with id=1 or id=2
                                 * GET /shdb/json/:collection?username=anticlergy&status.online=true => returns all items with username=anticlergy and admin=true and status.online=true
                                 * GET /shdb/json/:collection?_sort=id&_order=desc => returns all items sorted by id descending
                                 */
                                let collection = pathname.split('/')[3];
                                let id = pathname.split('/')[4];
                                let query = requestURL.searchParams;
                                let filteredItems = [];
                                if (id) {
                                    let item = this.jsonDatabase[collection].find(item => item.id === id);
                                    if (item) {
                                        res.setHeader('Content-Type', 'application/json');
                                        res.end(JSON.stringify(item));
                                    } else {
                                        res.writeHead(404);
                                        res.end();
                                    }
                                } else {
                                    if (query.toString().length > 0) {
                                        let queryKeys = Object.keys(query);
                                        let queryValues = Object.values(query);
                                        let queryItems = [];
                                        for (let i = 0; i < queryKeys.length; i++) {
                                            let key = queryKeys[i];
                                            let value = queryValues[i];
                                            if (key === '_sort') {
                                                queryItems.sort((a, b) => {
                                                    if (a[value] < b[value]) {
                                                        return -1;
                                                    }
                                                    if (a[value] > b[value]) {
                                                        return 1;
                                                    }
                                                    return 0;
                                                });
                                            } else if (key === '_order') {
                                                if (value === 'desc') {
                                                    queryItems.reverse();
                                                }
                                            } else {
                                                queryItems = queryItems.concat(this.jsonDatabase[collection].filter(item => item[key] === value));
                                            }
                                        }
                                        filteredItems = queryItems;
                                    } else {
                                        filteredItems = this.jsonDatabase[collection];
                                    }
                                    res.setHeader('Content-Type', 'application/json');
                                    res.end(JSON.stringify(filteredItems));
                                }
                            }
                            break;
                        case 'POST':
                            {
                                /** 
                                 * POST /shdb/json/:users
                                 */                                
                            }
                            break;
                        case 'PUT':
                            {
                                /**
                                 * PUT /shdb/json/:users/:id
                                 */
                            }
                            break;
                        case 'DELETE':
                            {
                                /**
                                 * DELETE /shdb/json/:users/:id
                                 */                            
                            }
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
}

module.exports = SHDB;