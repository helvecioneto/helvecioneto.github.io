// Center the map on the user's location
var map = L.map('mapid').setView([-26, -65], 4);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

var options = {
  maxZoom: 20,
  tolerance: 3,
  debug: 0,
  style: {
    fillColor: "#1EB300",
    color: "#F2FF00",
  },
};

var data = fetch('https://github.com/helvecioneto/helvecioneto.github.io/blob/main/trackboard/data/track/boundary.geojson')
  .then(response => response.json())
  .then(data => {
    var vtLayer = L.geoJson.vt(data, options).addTo(map);
  });
