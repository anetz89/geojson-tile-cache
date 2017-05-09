(function() {
    'use strict';

    const
        log = require('npmlog'),
        slice = require('geojson-slicer'),
        osmtile2bound = require('osmtile2bound'),
        caches = {};

    module.exports = function(id, opts) {
        if (!caches.hasOwnProperty(id)) {
            // return new cache instance if id not yet available
            caches[id] = new Cache(opts);
        }
        // return existing cache instance
        return caches[id];
    };

    function Cache(opts) {
        let options = opts || {},
            refZoom = options.refZoom || 13,
            cache,  // internal cache if no cacheAdd/cacheGet provided
            cacheAdd = options.cacheAdd,
            cacheGet = options.cacheGet;


        // fallback to normal cache object if options do not provide proper handlers
        if (!cacheAdd || !cacheGet ||
                typeof cacheAdd !== 'function' || typeof cacheGet !== 'function') {

            cache = {};

            cacheAdd = function(tile, data) {
                // TODO more checks here? is data geoJSON? is data FeatureCollection?
                if (!data) {
                    return false;
                }
                if (!cache[tile.x]) {
                    cache[tile.x] = {};
                }
                cache[tile.x][tile.y] = data;

                return true;
            };

            cacheGet = function(tile) {
                if (cache.hasOwnProperty(tile.x)) {
                    return cache[tile.x][tile.y];
                }
                return null;
            };
        }

        // add data
        function add(tile, data) {
            if (tile.z > refZoom) {
                // zoom of tile does not fullfil refZoom requirement. lack of data possible -> reject
                log.error('tile to add does not fit to internal minZoom (tile, minZoom).',
                        tile.z, refZoom);

                return false;
            }

            if (tile.z < refZoom) {
                // tile is bigger than refZoom -> split up data to refZoom tiles
                let tiles = splitTile(tile);

                return fillTiles(tiles, data);
            }

            // tile is in refZoom, fill cache with data
            return cacheAdd(tile, data);
        }

        function fitsTileLimit(tile) {
            if (!options.limits) {
                return true;
            }
            if (options.limits.xMin && tile.x < options.limits.xMin) {
                return false;
            }
            if (options.limits.xMax && tile.x > options.limits.xMax) {
                return false;
            }
            if (options.limits.yMin && tile.y < options.limits.yMin) {
                return false;
            }
            if (options.limits.yMax && tile.y > options.limits.yMax) {
                return false;
            }

            return true;
        }

        // fill available data in a set of tlies
        function fillTiles(tiles, data) {
            if (!data) {
                return false;
            }
            tiles.forEach(function(tile) {
                if (tile.z === refZoom && fitsTileLimit(tile)) {
                    add(tile, slice(data, osmtile2bound(tile)));
                }
            });

            return true;
        }

        function getCoverTiles(origTile) {
            let tiles = getReferenceTiles(origTile),
                allAvailable = true;

            tiles.forEach(function(tile) {
                if (cacheGet(tile)) {
                    return;
                }
                allAvailable = false;
            });

            if (allAvailable) {
                return tiles;
            }

            return [];
        }

        function getPartialTile(tile, xOffset, yOffset) {
            return {
                valid : true,
                x : (tile.x * 2) + xOffset,
                y : (tile.y * 2) + yOffset,
                z : tile.z + 1
            };
        }

        function splitTile(tile) {
            let sTiles = [],
                partialTile;

            if (tile.z === refZoom) {
                return [];
            }
            // create all 4 lower tiles and add split them up if necessary
            partialTile = getPartialTile(tile, 0, 0);

            sTiles.push(partialTile);
            sTiles = sTiles.concat(splitTile(partialTile));

            partialTile = getPartialTile(tile, 0, 1);

            sTiles.push(partialTile);
            sTiles = sTiles.concat(splitTile(partialTile));

            partialTile = getPartialTile(tile, 1, 0);

            sTiles.push(partialTile);
            sTiles = sTiles.concat(splitTile(partialTile));

            partialTile = getPartialTile(tile, 1, 1);

            sTiles.push(partialTile);
            sTiles = sTiles.concat(splitTile(partialTile));

            return sTiles;
        }

        function getCoveringTile(tile) {
            let cTile = {
                valid : true,
                x : Math.floor(tile.x / 2),
                y : Math.floor(tile.y / 2),
                z : tile.z - 1
            };

            if (cTile.z <= refZoom) {
                return cTile;
            }

            return getCoveringTile(cTile);
        }

        function getReferenceTiles(tile) {
            if (tile.z === refZoom) {
                return [tile];
            }
            if (tile.z < refZoom) {
                // tile is bigger than the referenced ones. need to split tile up
                return splitTile(tile);
            }

            // tile is smaller than the tile needed
            return [getCoveringTile(tile)];
        }

        function get(tile) {
            let necessary = this.getCoverTiles(tile),
                result = [];

            necessary.forEach(function(necTile) {
                result = result.concat(cacheGet(necTile).features);
            });

            return {
                type : 'FeatureCollection',
                features : result
            };
        }

        return {
            // add(tile, geoJSON) -> boolean
            add : add,
            // get(tile) -> geoJSON
            get : get,
            // TODO remove
            getCoverTiles : getCoverTiles,
            // getCoverTiles(tile) -> tile[] available to cover given tile
            has : getCoverTiles,
            // getReferenceTiles(tile) -> tile[] necessary tiles in the reference zoom to
            // cover the given tile
            getReferenceTiles : getReferenceTiles
        };
    }
}());
