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
            "en_us": "FullStack Developer",
            "pt_br": "Desenvolvedor FullStack"
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
            "en_us": "Boa Vista/Roraima, Brazil",
            "pt_br": "Boa Vista/Roraima, Brasil"
        },
        "LABEL_SKILLS": {
            "en_us": "Skills",
            "pt_br": "Habilidades"
        },
        "VALUE_SKILLS": {
            "en_us": "Experiência em desenvolvimento mobile e web. Estudante aventureiro nas áreas de Inteligência Artificial, Segurança da Informação e Análise da Complexidade e Otimização de Algoritmos.",
            "pt_br": "Experiência em desenvolvimento mobile e web. Estudante aventureiro nas áreas de Inteligência Artificial, Segurança da Informação e Análise da Complexidade e Otimização de Algoritmos."
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






