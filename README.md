# Crawlable geospatial data using the ecosystem of the Web and Linked Data

This is the repository for research topic 3 of the Geonovum Testbed 'Spatial data on the web'. More information can be found on the [Wiki section](https://github.com/geo4web-testbed/topic3/wiki) of this repository.

## Import

Build & run the container:

```
docker build -t import .
docker run --link=topic3_elasticsearch_1:elasticsearch -v $PWD:/src -it import
```

Start import task:

```
node import.js ./data/wijken_buurten_2015/gem_2015.shp gemeente GM_CODE GM_NAAM
node import.js ./data/wijken_buurten_2015/Wijk_2015.shp wijk WK_CODE WK_NAAM GM_CODE
node import.js ./data/wijken_buurten_2015/Buurt_2015.shp buurt BU_CODE BU_NAAM WK_CODE
node import.js ./data/land_cover/Bestemmingsplangebied.gml bestemmingsplangebied identificatie naam
```
