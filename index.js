/**
 * @fileOverview Module to handle hosting a simple web app.
 * @author Jason Clay <sethacked@gmail.com> (https://sethacked.com)
 */

'use strict';

const http2 = require("http2");
const url = require("url");
const fs = require("fs")
const fsp = fs.promises;
const mime = require("mime-types");

/** Class representing a simple web app. */
class SHDB {
    /**
     * Builds the web app. 
     * @param {object} options - Options object.
     * @param {string} options.publicFilesPath - Path to the public files.
     * @param {string} options.jsonDBPath - Path to the JSON file.
     * @param {string} options.key - Path to the private key file.
     * @param {string} options.cert - Path to the certificate file.
     */
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
        /** @type {http2.Server}*/
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
                        case 'GET':
                            {
                                let pathParts = pathname.split('/');
                                let collection = pathParts[3];
                                let id = pathParts[4];
                                let query = requestURL.searchParams;
                                let sort = query.get('_sort');
                                let order = query.get('_order');
                                let filter = {};
                                for (let [key, value] of query) {
                                    if (key !== '_sort' && key !== '_order') {
                                        filter[key] = value;
                                    }
                                }
                                if (id === undefined) {
                                    let results = this.jsonDatabase[collection];
                                    if (filter !== undefined) {
                                        results = results.filter((item) => {
                                            let match = true;
                                            for (let key in filter) {
                                                if (item[key] !== filter[key]) {
                                                    match = false;
                                                }
                                            }
                                            return match;
                                        });
                                    }
                                    if (sort !== undefined) {
                                        results.sort((a, b) => {
                                            if (order === 'desc') {
                                                return b[sort] - a[sort];
                                            } else {
                                                return a[sort] - b[sort];
                                            }
                                        });
                                    }
                                    res.setHeader('Content-Type', 'application/json');
                                    res.writeHead(200);
                                    res.end(JSON.stringify(results));
                                } else {
                                    let results = this.jsonDatabase[collection].filter((item) => {
                                        return item.id === parseInt(id);
                                    });
                                    if (results.length > 0) {
                                        res.setHeader('Content-Type', 'application/json');
                                        res.writeHead(200);
                                        res.end(JSON.stringify(results[0]));
                                    } else {
                                        res.writeHead(404);
                                        res.end();
                                    }
                                }
                            }
                            break;
                        /** 
                         * POST /shdb/json/:users
                         */
                        case 'POST':
                            {
                                let pathParts = pathname.split('/');
                                let collection = pathParts[3];
                                //check if the collection exists
                                if (this.jsonDatabase[collection] !== undefined) {
                                    //parse the json from the body and check if it has an id
                                    let body = '';
                                    req.on('data', (chunk) => {
                                        body += chunk.toString();
                                    });
                                    req.on('end', () => {
                                        let newObject = JSON.parse(body);
                                        if (newObject.id !== undefined) {
                                            //check if the id already exists
                                            let results = this.jsonDatabase[collection].filter((item) => {
                                                return item.id === parseInt(newObject.id);
                                            });
                                            if (results.length > 0) {
                                                res.writeHead(409);
                                                res.end();
                                            } else {
                                                this.jsonDatabase[collection].push(newObject);
                                                fsp.writeFile(this.options.jsonDBPath, JSON.stringify(this.jsonDatabase)).then(() => {
                                                    res.writeHead(201);
                                                    res.end();
                                                }).catch((err) => {
                                                    console.log(err);
                                                    res.writeHead(500);
                                                    res.end();
                                                });
                                            }
                                        } else {
                                            res.writeHead(400);
                                            res.end();
                                        }
                                    });
                                }
                            }
                            break;
                        /**
                         * PUT /shdb/json/:users/:id
                         */ 
                        case 'PUT':
                            {
                                let pathParts = pathname.split('/');
                                let collection = pathParts[3];
                                let id = pathParts[4];
                                //check if the collection exists
                                if (this.jsonDatabase[collection] !== undefined) {
                                    //parse the json from the body and check if it has an id
                                    let body = '';
                                    req.on('data', (chunk) => {
                                        body += chunk.toString();
                                    });
                                    req.on('end', () => {
                                        let newObject = JSON.parse(body);
                                        if (newObject.id !== undefined) {
                                            //check if the id already exists
                                            let results = this.jsonDatabase[collection].filter((item) => {
                                                return item.id === parseInt(newObject.id);
                                            });
                                            if (results.length > 0) {
                                                this.jsonDatabase[collection].forEach((item, index) => {
                                                    if (item.id === parseInt(newObject.id)) {
                                                        this.jsonDatabase[collection][index] = newObject;
                                                    }
                                                });
                                                fsp.writeFile(this.options.jsonDBPath, JSON.stringify(this.jsonDatabase)).then(() => {
                                                    res.writeHead(200);
                                                    res.end();
                                                }).catch((err) => {
                                                    console.log(err);
                                                    res.writeHead(500);
                                                    res.end();
                                                });
                                            } else {
                                                res.writeHead(404);
                                                res.end();
                                            }
                                        } else {
                                            res.writeHead(400);
                                            res.end();
                                        }
                                    });
                                }
                            }
                            break;
                        /**
                         * DELETE /shdb/json/:users/:id
                         */
                        case 'DELETE':
                            {
                                let pathParts = pathname.split('/');
                                let collection = pathParts[3];
                                let id = pathParts[4];
                                //check if the collection exists
                                if (this.jsonDatabase[collection] !== undefined) {
                                    //parse the json from the body and check if it has an id
                                    let body = '';
                                    req.on('data', (chunk) => {
                                        body += chunk.toString();
                                    });
                                    req.on('end', () => {
                                        let newObject = JSON.parse(body);
                                        if (newObject.id !== undefined) {
                                            //check if the id already exists
                                            let results = this.jsonDatabase[collection].filter((item) => {
                                                return item.id === parseInt(newObject.id);
                                            });
                                            if (results.length > 0) {
                                                this.jsonDatabase[collection].forEach((item, index) => {
                                                    if (item.id === parseInt(newObject.id)) {
                                                        this.jsonDatabase[collection].splice(index, 1);
                                                    }
                                                });
                                                fsp.writeFile(this.options.jsonDBPath, JSON.stringify(this.jsonDatabase)).then(() => {
                                                    res.writeHead(200);
                                                    res.end();
                                                }).catch((err) => {
                                                    console.log(err);
                                                    res.writeHead(500);
                                                    res.end();
                                                });
                                            } else {
                                                res.writeHead(404);
                                                res.end();
                                            }
                                        } else {
                                            res.writeHead(400);
                                            res.end();
                                        }
                                    });
                                }
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

    /** @type {function} */
    start() {
        this.server.listen(this.options.port, this.options.host, () => {
            console.log(`Server running at https://${this.options.host}:${this.options.port}/`);
        });
        this.readPublicFiles();
    }

    /** @type {function} */
    customAPI(req, res) {
        // default to 404 for now
        res.writeHead(404);
        res.end();
    }

    /** @type {function} */
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

    /** @type {function} */
    async readPublicFiles() {
        await this.walkDirectory(this.options.publicFilesPath + '/');
        return;
    }
}

module.exports = SHDB;