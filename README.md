# shdb
A Module to handle hosting a simple web app *In development*

JSON REST API

GET /shdb/json  => returns full JSON object.
GET /shdb/json/:collection  => returns all JSON records in a given collection
                            => error if collection does not exist
GET /shdb/json/:collection/:id  => returns JSON record with given id in given collection
                                => error if collection or id does not exist
GET /shdb/json/:collection/?key=value   => returns array of JSON records in given collection with given key/value pair
                                        => error if collection does not exist
GET /shdb/json/:collection/?key.deepKey=value   => returns array of JSON records in given collection with given key.deepKey/value pair
                                                => error if collection does not exist