$(function() {
  $('.map-container').each(function() {
    var container = this;

    $.ajax(window.location.pathname, {
      dataType: 'json',
      accepts: {
        json: 'application/vnd.geo+json'
      },
      success: function(data) {
        var map = L.map(container);
        var geoJson = L.geoJson(data.geometry);

        geoJson.addTo(map);

        L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        	attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        map.fitBounds(geoJson.getBounds());
      }
    });
  });
});
