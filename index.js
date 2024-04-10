'use strict';

function SHDB(options) {
    options = options || {};
    options.jsonDBPath = options.jsonDBPath || './db.json';
    let jsonDatabase = require(options.jsonDBPath);

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

    function getNestedValue(obj, key) {
        let keys = key.split('.');
        for (let i = 0; i < keys.length; i++) {
            if (obj[keys[i]] === undefined) return undefined;
            obj = obj[keys[i]];
        }
        return obj;
    }

    return function(req, res, next) {
        if (!req.path.startsWith('/shdb/json/')) {
            next();
            return;
        }

        let pathParts = req.path.split('/').filter(part => part);
        let tableName = pathParts[2]; // The table name is the third part of the path
        let id = pathParts[3]; // The id is the fourth part of the path

        // If no table name is provided, return the whole JSON database
        if (!tableName) {
            res.json(removePrivateKeys(jsonDatabase));
            return;
        }

        if (tableName.startsWith('_')) {
            res.sendStatus(404);
            return;
        }

        let table = jsonDatabase[tableName];

        if (!table) {
            res.sendStatus(404);
            return;
        }

        // If no id is provided, and there is no query, return the whole table
        if (!id && Object.keys(req.query).length === 0) {
            res.json(removePrivateKeys(table));
            return;
        }

        if (id) {
            // Find the record with the given id
            let record = table.find(record => Number(record.id) === Number(id));
            if (!record) {
                res.sendStatus(404);
                return;
            }

            res.json(removePrivateKeys(record));
        } else {
            // Apply filters, sorting, and pagination
            let records = [...table];

            // Filtering
            for (let key in req.query) {
                if (key.startsWith('_')) continue; // Ignore special parameters
                records = records.filter(record => {
                    let recordValue = getNestedValue(record, key);
                    // Convert both values to strings before comparing
                    return String(recordValue) === String(req.query[key]);
                });
            }

            // Sorting
            let sortKey = req.query._sort;
            let sortOrder = req.query._order;
            if (sortKey) {
                records.sort((a, b) => {
                    if (a[sortKey] < b[sortKey]) return sortOrder === 'asc' ? -1 : 1;
                    if (a[sortKey] > b[sortKey]) return sortOrder === 'asc' ? 1 : -1;
                    return 0;
                });
            }

            // Pagination
            let page = parseInt(req.query._page);
            let limit = parseInt(req.query._limit);
            if (page && limit) {
                records = records.slice((page - 1) * limit, page * limit);
            }
            res.json(removePrivateKeys(records));
            return;
        }
    };
}

module.exports = SHDB;