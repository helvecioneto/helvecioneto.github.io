const options = {
    // Required: API key
    key: 'zqrQkL4kvkdyp30r3R74ntepGSVKfLWU', // REPLACE WITH YOUR KEY !!!

    // Put additional console output
    verbose: true,
    latlon: true,

    // Optional: Initial state of the map
    lat: -15,
    lon: -46,
    zoom: 4.5,
    overlay: 'satellite',

};

// Initialize Windy API
windyInit(options, windyAPI => {
    // windyAPI is ready, and contain 'map', 'store',
    // 'picker' and other usefull stuff
    // .map is instance of Leaflet map
    const { map } = windyAPI;



});

