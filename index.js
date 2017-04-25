(function() {
    'use strict';

    let log = require('npmlog'),
        slice = require('geojson-slicer'),
        osmtile2bound = require('osmtile2bound');

    module.exports = function(opts) {
        let options = opts || {},
            cache = {},
            refZoom = options.refZoom || 13;

        // add data into a single tile
        function add(tile, data) {
            if (!data) {
                return false;
            }

            if (tile.z < refZoom) {
                log.error('tile to add does not fit to internal minZoom (tile, minZoom).', tile.z, refZoom);

                return false;
            }
            if (tile.z > refZoom) {
                // split up tile to all tiles in the necessary zoomlevel
                let tiles = splitTile(tile);

                return fillTiles(tiles, data);
            }
            if (!cache[tile.x]) {
                cache[tile.x] = {};
            }
            cache[tile.x][tile.y] = data;

            return true;
        }

        // fill available data in a set of tlies
        function fillTiles(tiles, data) {
            if (!data) {
                return false;
            }
            tiles.forEach(function(tile) {
                add(tile, slice(data, osmtile2bound(tile)));
            });

            return true;
        }

        function getCoverTiles(origTile) {
            let tiles = getReferenceTiles(origTile),
                allAvailable = true;

            tiles.forEach(function(tile) {
                if (cache[tile.x] && cache[tile.x][tile.y]) {
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
                result.concat(cache[necTile.x][necTile.y].features);
            });

            return {
                type : 'FeatureCollection',
                features : result
            };
        }

        return {
            // add(tile, geojson)
            add : add,
            // get(tile) -> geojson
            get : get,
            // getCoverTiles(tile) -> tile[] available to cover given tile
            getCoverTiles : getCoverTiles,
            // getReferenceTiles(tile) -> tile[] necessary tiles in the reference zoom to
            // cover the given tile
            getReferenceTiles : getReferenceTiles
        };
    };
}());