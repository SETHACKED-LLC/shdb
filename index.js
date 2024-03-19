'use strict';

const http2 = require('http2');
const fs = require('fs');
const fsp = fs.promises;
const mime = require('mime-types');
const crypto = require('crypto');

class SHDB {
    constructor(options) {
        this.options = options;
        this.options.publicFilesPath = this.options.publicFilesPath || './public/';
        this.options.jsonDBPath = this.options.jsonDBPath || './db.json';
        this.options.key = this.options.key || './localhost-privkey.pem';
        this.options.cert = this.options.cert || './localhost-cert.pem';
        this.options.host = this.options.host || 'localhost';
        this.options.port = this.options.port || 8443;
        this.options.passwordHashIterations = this.options.passwordHashIterations || 10000;
        this.options.customAPI =
            this.options.customAPI ||
            function (req, res) {
                console.log(`custom api - 404: ${req.url}`);
                res.writeHead(404);
                res.end();
            };
        this.files = {};
        this.jsonDatabase = require(this.options.jsonDBPath);
        this.server = http2.createSecureServer(
            {
                key: fs.readFileSync(this.options.key),
                cert: fs.readFileSync(this.options.cert),
                allowHTTP1: true,
            },
            (req, res) => {
                if (req.url === '/') {
                    req.url = '/index.html';
                }
                let requestURL = new URL(`https://${this.options.host}:${this.options.port}${req.url}`);
                if (this.files[`${this.options.publicFilesPath}${requestURL.pathname}`] !== undefined) {
                    console.log(`serving file: ${this.options.publicFilesPath}${requestURL.pathname}`);
                    res.writeHead(200, {
                        'Content-Type': this.files[`${this.options.publicFilesPath}${requestURL.pathname}`].mime,
                        'X-Content-Type-Options': 'nosniff',
                        'Cache-Control': 'public, max-age=31536000, immutable',
                    });
                    res.end(this.files[`${this.options.publicFilesPath}${requestURL.pathname}`].data);
                } else if (requestURL.pathname.indexOf('/shdb/json/') === 0 && req.method === 'GET') {

                    function removePrivateKeys(obj) {
                        let newObj = Array.isArray(obj) ? [] : {};
                        for (let key in obj) {
                            if (!key.startsWith('_')) {
                                if (typeof obj[key] === 'object' && obj[key] !== null) {
                                    newObj[key] = removePrivateKeys(obj[key]);
                                } else {
                                    newObj[key] = obj[key];
                                }
                            }
                        }
                        return newObj;
                    }

                    console.log(`/shdb/json/ GET: ${req.url}`);
                    let pathParts = requestURL.pathname.split('/').filter(part => part);
                    let tableName = pathParts[2]; // The table name is the third part of the path
                    let id = pathParts[3]; // The id is the fourth part of the path

                    // If no table name is provided, return the whole JSON database
                    if (!tableName) {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(removePrivateKeys(this.jsonDatabase)));
                        return;
                    }

                    let table = this.jsonDatabase[tableName];
                    if (!table) {
                        res.writeHead(404);
                        res.end();
                        return;
                    }

                    // If no id is provided, and there is no query, return the whole table
                    if (!id && requestURL.search === '') {
                        if (tableName.startsWith('_')) {
                            res.writeHead(404);
                            res.end();
                            return;
                        }
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(removePrivateKeys(table)));
                        return;
                    }

                    if (id) {
                        // Find the record with the given id
                        let record = table.find(record => Number(record.id) === Number(id));
                        if (!record) {
                            res.writeHead(404);
                            res.end();
                            return;
                        }

                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(removePrivateKeys(record)));
                    } else {
                        // Apply filters, sorting, and pagination
                        let records = [...table];

                        // Filtering
                        if (requestURL.searchParams && requestURL.searchParams.toString()) {
                            for (let [key, value] of requestURL.searchParams.entries()) {
                                if (key.startsWith('_')) continue; // Ignore special parameters
                                records = records.filter(record => {
                                    let recordValue = getNestedValue(record, key);
                                    // Convert both values to strings before comparing
                                    return String(recordValue) === String(value);
                                });
                            }
                        }

                        // This function gets the value at the property path
                        function getNestedValue(obj, key) {
                            let keys = key.split('.');
                            for (let i = 0; i < keys.length; i++) {
                                if (obj[keys[i]] === undefined) return undefined;
                                obj = obj[keys[i]];
                            }
                            return obj;
                        }

                        // Sorting
                        let sortKey, sortOrder;
                        if (requestURL.searchParams && requestURL.searchParams.toString()) {
                            sortKey = requestURL.searchParams.get('_sort');
                            sortOrder = requestURL.searchParams.get('_order');
                        }
                        if (sortKey) {
                            records.sort((a, b) => {
                                if (a[sortKey] < b[sortKey]) return sortOrder === 'asc' ? -1 : 1;
                                if (a[sortKey] > b[sortKey]) return sortOrder === 'asc' ? 1 : -1;
                                return 0;
                            });
                        }

                        // Pagination
                        let page, limit;
                        if (requestURL.searchParams && requestURL.searchParams.toString()) {
                            page = parseInt(requestURL.searchParams.get('_page'));
                            limit = parseInt(requestURL.searchParams.get('_limit'));
                        }
                        if (page && limit) {
                            records = records.slice((page - 1) * limit, page * limit);
                        }
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(removePrivateKeys(records)));
                        return;
                    }
                } else {
                    //custom api
                    this.options.customAPI(req, res);
                }
            }
        );
    }

    start() {
        this.server.listen(this.options.port, this.options.host, () => {
            console.log(`Server running at https://${this.options.host}:${this.options.port}/`);
        });
        this.readPublicFiles().catch((err) => {
            console.error(err);
            throw err;
        });
    }

    async walkDirectory(directoryPath) {
        try {
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
                                data: await fsp.readFile(`${directoryPath}${path}`),
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
                            data: await fsp.readFile(`${directoryPath}${path}`),
                        };
                    }
                }
            }
        } catch (err) {
            console.error(err);
            throw err;
        }
    }

    async readPublicFiles() {
        try {
            await this.walkDirectory(this.options.publicFilesPath + '/');
        } catch (err) {
            console.error(err);
            throw err;
        }
    }

    async hashPassword(password, salt = null) {
        try {
            salt = salt || crypto.randomBytes(32).toString('hex');
            const hash = await new Promise((resolve, reject) => {
                crypto.pbkdf2(
                    password,
                    salt,
                    this.options.passwordHashIterations,
                    64,
                    'sha512',
                    (err, derivedKey) => {
                        if (err) reject(err);
                        resolve(derivedKey.toString('hex'));
                    }
                );
            });
            return {
                salt: salt,
                hash: hash,
            };
        } catch (err) {
            console.error(err);
            throw err;
        }
    }

    async verifyPassword(inputPassword, storedHash, storedSalt) {
        try {
            const hash = await new Promise((resolve, reject) => {
                crypto.pbkdf2(
                    inputPassword,
                    storedSalt,
                    this.options.passwordHashIterations,
                    64,
                    'sha512',
                    (err, derivedKey) => {
                        if (err) reject(err);
                        resolve(derivedKey.toString('hex'));
                    }
                );
            });
            return hash === storedHash;
        } catch (err) {
            console.error(err);
            throw err;
        }
    }
}

module.exports = SHDB;