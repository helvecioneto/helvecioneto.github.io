$(function () {
    const dict = {
        "LABEL_ABOUT_ME": {
            "en_us": "About Me",
            "pt_br": "Sobre Mim"
        },
        "VALUE_ABOUT_ME": {
            "en_us": "Technology enthusiast, Contestant in competitive programming, Web/Mobile Developer and with interests in information security, algorithms and artificial intelligence. Graduated in Computing at Estácio da Amazônia University Center and accepted in the master's program in Applied Computing at the National Institute of Space Research (INPE) with CAPES scholarship.",
            "pt_br": "Entusiasta da tecnologia..."

        },
        "JOB": {
            "en_us": "Applied Computing",
            "pt_br": "Computação Aplicada"
        },
        "BTN_CONTACT": {
            "en_us": "Contact Me",
            "pt_br": "Fale Comigo"
        },
        "LABEL_LATEST_PROJECTS": {
            "en_us": "Latest Projects",
            "pt_br": "Útimos Projetos"
        },
        "VALUE_LOCATION": {
            "en_us": "Sao Jose dos Campos/SP, Brazil",
            "pt_br": "São José dos Campos/SP, Brasil"
        },
        "LABEL_SKILLS": {
            "en_us": "Skills",
            "pt_br": "Habilidades"
        },
        "VALUE_SKILLS": {
            "en_us": "Experiência em Redes de Computadores, Instrumentação Meteorológica, Segurança da Informação, Redes de sensores Sem Fio, Monitoramento Ambiental.",
            "pt_br": "Experiência em Redes de Computadores, Instrumentação Meteorológica, Segurança da Informação, Redes de sensores Sem Fio, Monitoramento Ambiental."
        },
        "": {
            "en_us": "",
            "pt_br": ""
        }
    }

    var translator = $('body').translate({lang: "en_us", t: dict});
    
    $.onL
    $(".lang_selector").click(function (ev) {
        var lang = $(this).attr("data-value");
        translator.lang(lang);

        console.log(lang);
        ev.preventDefault();
    });
});






