# geojson-tile-cache
Tiled cache for geoJSON data. This module allows you to add geoJSON data for certain OSM Tiles and to get the data for any kind of tile back.

## Installation
Use standard npm installation

```shell
npm install --save geojson-tile-cache
```

## Usage
In order to use the cache you have to create an instance of the tile cache.

```shell
const
    cache = require('geojson-tile-cache'),
    cacheInstance = cache('uniqueId', options);
```

The factory function accepts two inputs. 

- id (string) *required*, unique id the cache instance should have. This id allows you to share an instance between different modules. Whenever you instantiate a cache the first time, a new instance is generated. If you call the cache factory a second time with the same id, the first instance is returned.

- options (object) *optional*, options to modify the behavior of the cache object. See the **Options** section for further details.

### Methods
Every cache instance provides four different methods to work with the cache:

- add(tile, geoJSON): add data to the cache
- get(tile): get data from the cache
- has(tile): check if cache has data for the given tile
- getReferenceTiles(tile): get a list of tiles that is neccessary to provide the data for a given tile

All methods work with the following tile-format (see [OSM tile format](http://wiki.openstreetmap.org/wiki/Slippy_map_tilenames#Resolution_and_Scale)):
```js
{
    valid : true, // optional
    x : 139507,
    y : 90949,
    z : 18
}
```

#### add(tile, geoJSON) : *boolean*
Add data to the cache for a given tile.

tile: Tile the data covers. Please note that the data needs to cover the complete tile and cannot provide parts of the tile. The tile z value also needs to be greater or equal to the refZoom value.

geoJSON: GeoJSON data that should be added for the tile. Although the data is not tested during the adding process, it is expected to be a geoJSON FeatureCollection object that contains all data as geoJSON features.

The add method returns a boolean value. True: data successfully added, false: problem occured during add process.

#### get(tile) : *geoJSON*
Get data for a given tile from the cache.

tile: Tile the data should be requested for. The tile z value is independent from the refZoom. The cache slices the geoJSON data if the z value describes a smaller tile than the refZoom does.

The get method returns a geoJSON object. If no data could be found or an error occurred, the return value is also a geoJSON object, but without features (empty FeatureCollection object).

#### has(tile) : *boolean*
Check whether the cache can provide data for the given tile or not. This is done by checking if the needed reference tiles are available nor not.

True: cache is covered with reference tiles to fulfill a request for the given tile
False: reference tiles needed. A get() call with the same tile would result in an empty FeatureCollection object.

#### getReferenceTiles(tile) : *tile[]*
Get a list of all reference tiles needed to cover a given tile.

The returned tile list describes a list of all reference tiles that are needed for the given tile. There is no information if the tile is already available in the cache or not.

### Options

#### limits *object* (default: null)
The passed limit object describes a region the cache should work with.

Default: no borders (= whole world).

The limits object can contain four different values:

- xMin *number*: minimum x value of a tile
- xMax *number*: maximum x value of a tile
- yMin *number*: minimum y value of a tile
- yMax *number*: maximum y value of a tile

Please note that all passed values need to describe the x and y values of the refZoom. The values differ for each zoom level to describe the same region.

#### refZoom *number* (default: 13)
The cache works with an internal reference zoom. Whenever data is added, it is normalized to this zoom level. 
This reference zoom is used for the internal caching and/or for persistence.

All data passed to the cache needs to be in a larger or equal zoom level than the reference zoom. Retrieving data is possible in smaller zoom levels.

Default behavior: Cache.add() excepts only data for tiles with zoom level higher or equal to 13. Cache.get() excepts all kind of zoom levels.

### Performance
There are several performance issues if you do not use the tile cache properly. Most of them can be eliminated by the use of proper options.

#### Correct refZoom
The correct refZoom depends on the usage of this module.

- High refZoom (= small OSM zoom value, like 5)
The higher the refZoom is, the faster data can be added to the cache. This should be considered if you have a small amount of data for a large region. Example: Town halls in Germany.

- Low refZoom (= high OSM zoom value, like 15)
The lower the refZoom is, the faster data can be provided by the cache. This should be considered if there is a lot of data for a small region. Example: buildings and streets

### Add limits
Adding limits allows you to speed up the Cache.add() calls, especially for low refZooms. The default refZoom (13) contains 67,108,864 tiles. Splitting data into these tiles may take a long time. If you know in which region your data is located, you can limit the amount of tiles (e.g. to 1000) and therefore improve the performance.

## Future Work
- better inline documentation
- zoom independent limits option (WGS84 coordinates instead of OSM tile values)
- better performance
- more generic way of caching data (allow to overwrite writing/loading data to/from a custom cache, like a database)
- getReferenceTiles: returned tiles contain a flag whether the tile is already loaded or not.

## Contribute
Feel free to add issues or pull requests. I'm glad for every kind of feedback!
