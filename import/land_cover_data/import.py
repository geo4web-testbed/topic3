#!/usr/bin/python

import os
from osgeo import ogr, osr
from elasticsearch import Elasticsearch, RequestsHttpConnection
from elasticsearch.helpers import bulk
from requests_aws4auth import AWS4Auth

def getUrl(doc):
    return 'abc'

host = 'search-geo4web-if2ippqsoax25uzkvf7qkazw7m.eu-west-1.es.amazonaws.com'

awsauth = AWS4Auth(
    os.environ.get('AWS_ACCESS_KEY_ID'),
    os.environ.get('AWS_SECRET_ACCESS_KEY'),
    'eu-west-1', 'es'
)

es = Elasticsearch(
    hosts=[{'host': host, 'port': 443}],
    http_auth=awsauth,
    use_ssl=True,
    verify_certs=True,
    connection_class=RequestsHttpConnection
)

es.info()

# Amersfoort / RD New
projSource = osr.SpatialReference()
projSource.ImportFromEPSG(28992)

# WGS 84
projTarget = osr.SpatialReference()
projTarget.ImportFromEPSG(4326)

transform = osr.CoordinateTransformation(projSource, projTarget)

reader = ogr.Open('data/Bestemmingsplangebied.gml')
layer = reader.GetLayer()

for feature in layer:
    geom = feature.GetGeometryRef()
    geom.Transform(transform)
    doc = feature.ExportToJson()
    id = getUrl(doc)
    print doc
