(function () {
    const STORAGE_KEY = "ferstation-lang";

    const translations = {
        pt: {
            siteTitle: "FerStation - Jogos zerados & projetos indie",
            metaDescription: "Portfólio indie do FerStation: diário de jogos zerados e projetos de jogos desenvolvidos por ele.",
            skipLink: "Pular para o conteúdo",
            socialLabel: "Redes sociais",
            toggleLangLabel: "Mudar idioma",
            a11yGroup: "Acessibilidade",
            fontDecrease: "Diminuir fonte",
            fontReset: "Tamanho normal da fonte",
            fontIncrease: "Aumentar fonte",
            themeToDark: "Ativar tema escuro",
            themeToLight: "Ativar tema claro",
            intro: "Bem-vindo(a) ao meu site! Aqui registro os games que já zerei e os projetos de jogos que desenvolvo. <br>Obrigado pela visita.",
            projectsTitle: "Meus Projetos",
            projectsDesc: "Jogos concebidos, programados e publicados por mim",
            project1Status: "● PUBLICADO",
            project1Desc: "Controle Teseu, pegue as chaves e escape do Minotauro em 12 fases",
            playOnItch: "Jogar no itch.io",
            project2Status: "● EM PRODUÇÃO",
            project2Eta: "PREVISÃO: 2027",
            project2Title: "Projeto em produção",
            project2Desc: "Novo projeto em desenvolvimento. Mais detalhes em breve.",
            playedTitle: "Jogos Zerados",
            playedDesc: "Linha do tempo com os jogos zerados ao longo dos anos",
            statTotalLabel: "Zerados desde 2002",
            statYearLabel: "Zerados em 2026",
            developerUnknown: "Desenvolvedora não informada",
            releaseYear: "Ano de lançamento:",
            myCompletion: "Minha conclusão",
            platform: "Plataforma",
            playedOn: "Jogado em",
            finished: "Finalizado",
            recordedCompletions: "Zerados registrados",
            completedInYear: "Zerados em {year}",
            errorTitle: "ERRO",
            errorMsg: "Não foi possível carregar os jogos.",
            noJsMsg: "Ative o JavaScript para ver a linha do tempo.",
            fontScaleAnnounce: "Fonte: {percent}%",
            coverFallback: "JOGO",
            coverAlt: "Capa de {title}",
            project1ImgAlt: "Imagem do jogo publicado",
            project2ImgAlt: "Imagem do jogo em produção",
            months: ["", "JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"]
        },
        en: {
            siteTitle: "FerStation - Completed games & indie projects",
            metaDescription: "FerStation's indie portfolio: a diary of completed games and game projects developed by him.",
            skipLink: "Skip to content",
            socialLabel: "Social media",
            toggleLangLabel: "Change language",
            a11yGroup: "Accessibility",
            fontDecrease: "Decrease font size",
            fontReset: "Reset font size",
            fontIncrease: "Increase font size",
            themeToDark: "Enable dark theme",
            themeToLight: "Enable light theme",
            intro: "Welcome to my site! Here I keep track of the games I've completed and the game projects I develop. <br>Thanks for visiting.",
            projectsTitle: "My Projects",
            projectsDesc: "Games conceived, programmed and published by me",
            project1Status: "● RELEASED",
            project1Desc: "Control Theseus, grab the keys and escape the Minotaur in 12 levels",
            playOnItch: "Play on itch.io",
            project2Status: "● IN PRODUCTION",
            project2Eta: "EXPECTED: 2027",
            project2Title: "Project in production",
            project2Desc: "New project in development. More details soon.",
            playedTitle: "Games Completed",
            playedDesc: "Timeline of games completed over the years",
            statTotalLabel: "Completed since 2002",
            statYearLabel: "Completed in 2026",
            developerUnknown: "Developer not specified",
            releaseYear: "Release year:",
            myCompletion: "My completion",
            platform: "Platform",
            playedOn: "Played on",
            finished: "Completed",
            recordedCompletions: "Recorded completions",
            completedInYear: "Completed in {year}",
            errorTitle: "ERROR",
            errorMsg: "Could not load games.",
            noJsMsg: "Enable JavaScript to view the timeline.",
            fontScaleAnnounce: "Font: {percent}%",
            coverFallback: "GAME",
            coverAlt: "Cover of {title}",
            project1ImgAlt: "Published game image",
            project2ImgAlt: "Game in development image",
            months: ["", "JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
        }
    };

    let currentLang = null;

    function detectLang() {
        let stored = null;
        try {
            stored = localStorage.getItem(STORAGE_KEY);
        } catch (e) {
            /* ignore */
        }

        if (stored === "pt" || stored === "en") {
            return stored;
        }

        const langs = navigator.languages && navigator.languages.length
            ? navigator.languages
            : [navigator.language];

        const preferred = langs.join(",").toLowerCase();

        return preferred.includes("pt") ? "pt" : "en";
    }

    function t(key, vars) {
        const table = translations[currentLang] || translations.pt;
        let value = table[key] ?? translations.pt[key] ?? key;

        if (vars) {
            for (const [k, v] of Object.entries(vars)) {
                value = value.split(`{${k}}`).join(String(v));
            }
        }

        return value;
    }

    function apply() {
        const lang = currentLang;
        document.documentElement.lang = lang === "pt" ? "pt-BR" : "en";

        const table = translations[lang] || translations.pt;

        document.querySelectorAll("[data-i18n]").forEach((el) => {
            const key = el.getAttribute("data-i18n");
            const value = table[key] ?? translations.pt[key] ?? key;
            const attrName = el.getAttribute("data-i18n-attr");

            if (attrName) {
                el.setAttribute(attrName, value);
            } else {
                el.textContent = value;
            }
        });

        document.querySelectorAll("[data-i18n-html]").forEach((el) => {
            const key = el.getAttribute("data-i18n-html");
            el.innerHTML = table[key] ?? translations.pt[key] ?? key;
        });

        const localeMeta = document.querySelector('meta[property="og:locale"]');
        if (localeMeta) {
            localeMeta.setAttribute("content", lang === "pt" ? "pt_BR" : "en_US");
        }

        const toggle = document.getElementById("lang-toggle");
        const code = document.getElementById("lang-code");
        if (code) {
            code.textContent = lang === "pt" ? "EN" : "PT";
        } else if (toggle) {
            toggle.textContent = lang === "pt" ? "EN" : "PT";
        }
    }

    function setLanguage(lang) {
        if (lang !== "pt" && lang !== "en") {
            return;
        }

        currentLang = lang;

        try {
            localStorage.setItem(STORAGE_KEY, lang);
        } catch (e) {
            /* ignore */
        }

        apply();

        document.dispatchEvent(new CustomEvent("languagechange", { detail: { lang } }));
    }

    function init() {
        currentLang = detectLang();

        const toggle = document.getElementById("lang-toggle");
        if (toggle) {
            toggle.addEventListener("click", () => {
                setLanguage(currentLang === "pt" ? "en" : "pt");
            });
        }

        apply();
    }

    window.i18n = {
        get lang() {
            return currentLang;
        },
        get months() {
            const table = translations[currentLang] || translations.pt;
            return table.months;
        },
        t: t,
        setLanguage: setLanguage
    };

    init();
})();