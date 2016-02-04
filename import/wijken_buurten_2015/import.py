#!/usr/bin/python

import base64
import json
import os
import sys
from osgeo import ogr, osr
from elasticsearch import Elasticsearch, RequestsHttpConnection
from elasticsearch.helpers import streaming_bulk
from requests_aws4auth import AWS4Auth

reload(sys)
sys.setdefaultencoding('utf-8')

BASE_URI = 'https://geo4web.apiwise.nl'

host = 'geo4web.apiwise.nl'

awsauth = AWS4Auth(
    os.environ.get('AWS_ACCESS_KEY_ID'),
    os.environ.get('AWS_SECRET_ACCESS_KEY'),
    'eu-west-1', 'es'
)

es = Elasticsearch(
    hosts=[{'host': host, 'port': 9200}]
)

mapping = {
    'mappings': {
        'gemeente': {
            'properties': {
                'meta': {
                    'type': 'object',
                    'properties': {
                        'uriStrategy': {
                          'type': 'string',
                          'index': 'not_analyzed'
                        }
                    }
                },
                'doc': {
                    'type': 'object',
                    'properties': {
                        'type': {
                            'type': 'string',
                            'index': 'no'
                        },
                        'geometry': {
                            'type': 'geo_shape'
                        },
                        'properties': {
                            'type': 'object',
                            'properties': {
                                'GM_CODE': {
                                    'type': 'string',
                                    'index': 'not_analyzed'
                                },
                                'GM_NAAM': {
                                    'type': 'string',
                                    'index': 'not_analyzed'
                                },
                                'WATER': {
                                    'type': 'string',
                                    'index': 'not_analyzed'
                                }
                            }
                        }
                    }
                }
            }
        },
        'wijk': {
            'properties': {
                'meta': {
                    'type': 'object',
                    'properties': {
                        'uriStrategy': {
                          'type': 'string',
                          'index': 'not_analyzed'
                        }
                    }
                },
                'doc': {
                    'type': 'object',
                    'properties': {
                        'type': {
                            'type': 'string',
                            'index': 'no'
                        },
                        'geometry': {
                            'type': 'geo_shape'
                        },
                        'properties': {
                            'type': 'object',
                            'properties': {
                                'GM_CODE': {
                                    'type': 'string',
                                    'index': 'not_analyzed'
                                },
                                'GM_NAAM': {
                                    'type': 'string',
                                    'index': 'not_analyzed'
                                },
                                'WK_CODE': {
                                    'type': 'string',
                                    'index': 'not_analyzed'
                                },
                                'WK_NAAM': {
                                    'type': 'string',
                                    'index': 'not_analyzed'
                                },
                                'WATER': {
                                    'type': 'string',
                                    'index': 'not_analyzed'
                                }
                            }
                        }
                    }
                }
            }
        },
        'buurt': {
            'properties': {
                'meta': {
                    'type': 'object',
                    'properties': {
                        'uriStrategy': {
                          'type': 'string',
                          'index': 'not_analyzed'
                        }
                    }
                },
                'doc': {
                    'type': 'object',
                    'properties': {
                        'type': {
                            'type': 'string',
                            'index': 'no'
                        },
                        'geometry': {
                            'type': 'geo_shape'
                        },
                        'properties': {
                            'type': 'object',
                            'properties': {
                                'GM_CODE': {
                                    'type': 'string',
                                    'index': 'not_analyzed'
                                },
                                'GM_NAAM': {
                                    'type': 'string',
                                    'index': 'not_analyzed'
                                },
                                'WK_CODE': {
                                    'type': 'string',
                                    'index': 'not_analyzed'
                                },
                                'WK_NAAM': {
                                    'type': 'string',
                                    'index': 'not_analyzed'
                                },
                                'BU_CODE': {
                                    'type': 'string',
                                    'index': 'not_analyzed'
                                },
                                'BU_NAAM': {
                                    'type': 'string',
                                    'index': 'not_analyzed'
                                },
                                'WATER': {
                                    'type': 'string',
                                    'index': 'not_analyzed'
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

# es.indices.delete(index='wijken_buurten_2015')
# es.indices.create(index='wijken_buurten_2015', body=mapping)

# Amersfoort / RD New
projSource = osr.SpatialReference()
projSource.ImportFromEPSG(28992)

# WGS 84
projTarget = osr.SpatialReference()
projTarget.ImportFromEPSG(4326)

transform = osr.CoordinateTransformation(projSource, projTarget)

def escapeValue(value):
    if (value == None):
        return 'Onbekend'
    return value.replace(' ', '_')

def getWkNaam(wkCode):
    body = {'query': {'filtered': {'filter': {'term': {'doc.properties.WK_CODE': wkCode}}}}}
    result = es.search(index='wijken_buurten_2015', doc_type='wijk', _source='doc.properties.WK_NAAM', size=1, body=body)
    if (result['hits']['total'] == 0):
        return 'Onbekend'
    return str(result['hits']['hits'][0]['_source']['doc']['properties']['WK_NAAM'])

def dbpedia(feature, type, idProperty, nameProperty):
    uri = BASE_URI + '/page/' + escapeValue(feature.GetField(nameProperty))
    if type != 'gemeente':
        uri += ',_' + escapeValue(feature.GetField('GM_NAAM'))
    uri += '_(' + type + ')'
    return uri

def hierarchical(feature, type, idProperty, nameProperty):
    uri = BASE_URI
    if type != 'gemeente':
        uri += '/' + escapeValue(feature.GetField('GM_NAAM'))
    if type == 'buurt':
        wkNaam = getWkNaam(feature.GetField('WK_CODE'))
        uri += '/' + escapeValue(wkNaam)
    uri += '/' + escapeValue(feature.GetField(nameProperty))
    return uri

def rest(feature, type, idProperty, nameProperty):
    uri = BASE_URI + '/' + type + '/' + feature.GetField(idProperty);
    return uri

def pldn(feature, type, idProperty, nameProperty):
    uri = BASE_URI + '/doc/' + type + '/' + feature.GetField(idProperty);
    return uri

def unstructured(feature, type, idProperty, nameProperty):
    uri = BASE_URI + '/unstructured/' + base64.b64encode(json.dumps({
        'id': feature.GetField(idProperty),
        'type': type
    }, separators=(',', ':'), sort_keys=True));
    return uri

uriGenerators = {
    0: dbpedia,
    1: hierarchical,
    2: rest,
    3: pldn,
    4: unstructured
}

def getUri(feature, type, idProperty, nameProperty):
    print feature.GetField(idProperty)
    print feature.GetField(nameProperty)
    uriStrategy = int(feature.GetField('GM_CODE')[2:]) % 5
    uri = uriGenerators[uriStrategy](feature, type, idProperty, nameProperty)
    print uri
    return uri

def getFeatures(layer, type, idProperty, nameProperty):
    for feature in layer:
        uriStrategy = int(feature.GetField('GM_CODE')[2:]) % 5
        geom = feature.GetGeometryRef()
        geom.Transform(transform)
        doc = feature.ExportToJson(as_object=True)
        if (type == 'buurt'):
            doc['properties']['WK_NAAM'] = getWkNaam(feature.GetField('WK_CODE'))
        yield {
            '_id': getUri(feature, type, idProperty, nameProperty),
            '_source': {
                'meta': {
                    'uriStrategy': uriGenerators[uriStrategy].__name__
                },
                'doc': doc
            }
        }

# reader = ogr.Open('data/gem_2015.shp')
# layer = reader.GetLayer()
#
# for ok, result in streaming_bulk(es, getFeatures(layer, 'gemeente', 'GM_CODE', 'GM_NAAM'), index='wijken_buurten_2015', doc_type='gemeente', chunk_size=25, raise_on_error=False):
#     if not ok:
#         print('Failed')
#
# reader = ogr.Open('data/Wijk_2015.shp')
# layer = reader.GetLayer()
#
# for ok, result in streaming_bulk(es, getFeatures(layer, 'wijk', 'WK_CODE', 'WK_NAAM'), index='wijken_buurten_2015', doc_type='wijk', chunk_size=25, raise_on_error=False):
#     if not ok:
#         print('Failed')

reader = ogr.Open('data/Buurt_2015.shp')
layer = reader.GetLayer()

for ok, result in streaming_bulk(es, getFeatures(layer, 'buurt', 'BU_CODE', 'BU_NAAM'), index='wijken_buurten_2015', doc_type='buurt', chunk_size=25, raise_on_error=False):
    if not ok:
        print('Failed')
