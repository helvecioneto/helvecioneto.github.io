// Centraliza o mapa na localização desejada
var map = L.map('mapid').setView([-26, -57], 5);

// Adiciona o tile layer do OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Define as opções de estilo do GeoJSON
var geojsonStyle = {
  fillColor: "transparent",
  color: "#FF0000",
  weight: 1,
};

// Função para adicionar o GeoJSON ao mapa
fetch('https://raw.githubusercontent.com/helvecioneto/helvecioneto.github.io/refs/heads/main/trackboard/leaflet/data/track/boundary.geojson')
  .then(response => response.json())
  .then(data => {
    // Cria o layer GeoJSON e adiciona ao mapa
    var geojsonLayer = L.geoJSON(data, {
      style: geojsonStyle
    }).addTo(map);
    
    // Ajusta o zoom para o novo layer
    map.fitBounds(geojsonLayer.getBounds());
  })
  .catch(error => console.error('Erro ao carregar o arquivo GeoJSON:', error));
