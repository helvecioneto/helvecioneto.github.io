const options = {
    // Substitua pela sua chave Windy API
    key: 'zqrQkL4kvkdyp30r3R74ntepGSVKfLWU',

    // Informações adicionais para depuração no console
    verbose: true,

    // Estado inicial do mapa
    lat: -15,
    lon: -46,
    zoom: 4.5,
    overlay: 'satellite'
};

// Inicializa a API Windy
windyInit(options, windyAPI => {
    const { map, overlays } = windyAPI;
    
    // Verifica se o mapa foi carregado corretamente
    console.log("Mapa Windy inicializado!");

    // Adiciona algum comportamento adicional, se necessário
});
