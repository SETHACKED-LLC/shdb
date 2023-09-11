/**
 * @fileOverview Module to handle hosting a simple web app.
 * @author Jason Clay <sethacked@gmail.com> (https://sethacked.com)
 */

'use strict';

const http2 = require("http2");
const url = require("url");
const fsp = require("fs").promises;
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
        this.files = {};

        this.jsonDatabase = require(this.options.jsonDBPath);
        // jsonDatabase example
        /*
            {
                "table1": [{
                    "id": 1,
                    "key1": "value1",
                    "key2": "value2"
                },
                {
                    "id": 2,
                    "key1": "value3",
                    "key2": "value4"
                }],
                "table2": [{
                    "id": 1,
                    "key1": "value1",
                    "key2": "value2"
                },
                {
                    "id": 2,
                    "key1": "value3",
                    "key2": "value4"
                }]
            }
        */

        /** @type {http2.Server}*/
        this.server = http2.createSecureServer({
            key: fsp.readFileSync(this.options.key),
            cert: fsp.readFileSync(this.options.cert),
        }, (req, res) => {
            let requestURL = new URL(req.url, `https://${this.options.hostname}`);
            let pathname = requestURL.pathname;
            if (pathname === '/') {
                pathname = '/index.html';
            }
            console.log(`pathname: ${pathname}`);
            console.log(`requestURL: ${requestURL}`);
            if (this.files[`${this.options.publicFilesPath}${pathname}`] !== undefined) { // if the file exists in public files, send it over
                res.setHeader('Content-Type', this.files[`${this.options.publicFilesPath}${pathname}`].mime);
                res.end(this.files[`${this.options.publicFilesPath}${pathname}`].data);
            } else {
                if(pathname.indexOf('/shdb/json/') !== 0){
                    // JSON CRUD API for the database
                    switch (req.method) {
                        case 'GET':
                            // allow for deep access to the database
                            // /shdb/json/table1/1
                            // /shdb/json/table?key1
                            break;
                        case 'POST':
                            break;
                        case 'PUT':
                            break;
                        case 'DELETE':
                            break;
                        default:
                            res.writeHead(405);
                            res.end();
                    }
                } else {
                    this.customAPI(req, res);
                }
            }
        });
    }
    //** @type {function} */
    customAPI(req, res) {
        // default to 404
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
                if(this.files[`${directoryPath}${path}`]) {
                    if(this.files[`${directoryPath}${path}`].mtimeMs !== stat.mtimeMs) {
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
        await this.walkDirectory(this.options.publicFilesPath);
        return;
    }    
}

module.exports = SHDB;