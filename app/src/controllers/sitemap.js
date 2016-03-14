var createError = require('http-errors'),
  sitemap = require('sitemap');

module.exports = function(esClient) {
  return function(req, res, next) {
    var type, urls
      pathSegments = req.path.split('.');

    if (pathSegments.length >= 4) {
      var params = {
        type: pathSegments[1],
        size: 25000,
        fields: []
      };

      return esClient.search(params).then(function(result) {
        if (result.hits.total === 0) {
          throw new createError.NotFound();
        }

        var sm = sitemap.createSitemap({
          urls: result.hits.hits.map(function(hit) {
            return {
              url: pathSegments[2] === 'kml' ? hit._id + '.kml' : hit._id,
              changefreq: 'daily'
            };
          })
        });

        sm.toXML(function(err, xml) {
          if (err) {
            return next(err);
          }

          res.header('Content-Type', 'application/xml');
          res.send(xml);
        });
      }).catch(function(err) {
        next(err);
      });
    } else {
      var index = '<?xml version="1.0" encoding="UTF-8"?>';
      index += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
      index += '<sitemap><loc>https://geo4web.apiwise.nl/sitemap.gemeente.xml.gz</loc><lastmod>' + new Date().toISOString() + '</lastmod></sitemap>';
      index += '<sitemap><loc>https://geo4web.apiwise.nl/sitemap.gemeente.kml.xml.gz</loc><lastmod>' + new Date().toISOString() + '</lastmod></sitemap>';
      index += '<sitemap><loc>https://geo4web.apiwise.nl/sitemap.wijk.xml.gz</loc><lastmod>' + new Date().toISOString() + '</lastmod></sitemap>';
      index += '<sitemap><loc>https://geo4web.apiwise.nl/sitemap.wijk.kml.xml.gz</loc><lastmod>' + new Date().toISOString() + '</lastmod></sitemap>';
      index += '<sitemap><loc>https://geo4web.apiwise.nl/sitemap.buurt.xml.gz</loc><lastmod>' + new Date().toISOString() + '</lastmod></sitemap>';
      index += '<sitemap><loc>https://geo4web.apiwise.nl/sitemap.buurt.kml.xml.gz</loc><lastmod>' + new Date().toISOString() + '</lastmod></sitemap>';
      index += '<sitemap><loc>https://geo4web.apiwise.nl/sitemap.bestemmingsplangebied.xml.gz</loc><lastmod>' + new Date().toISOString() + '</lastmod></sitemap>';
      index += '<sitemap><loc>https://geo4web.apiwise.nl/sitemap.bestemmingsplangebied.kml.xml.gz</loc><lastmod>' + new Date().toISOString() + '</lastmod></sitemap>';
      index += '</sitemapindex>';

      res.header('Content-Type', 'application/xml');
      res.send(index);
    }
  };
};
