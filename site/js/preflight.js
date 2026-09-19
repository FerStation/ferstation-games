(function () {
    try {
        var lang = localStorage.getItem("ferstation-lang");
        if (lang !== "pt" && lang !== "en") {
            var langs = navigator.languages && navigator.languages.length
                ? navigator.languages
                : [navigator.language];
            lang = langs.join(",").toLowerCase().includes("pt") ? "pt" : "en";
        }
        document.documentElement.lang = lang === "pt" ? "pt-BR" : "en";

        var t = localStorage.getItem("ferstation-theme");
        if (t !== "light" && t !== "dark") {
            t = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
        }
        document.documentElement.setAttribute("data-theme", t);

        var tc = document.querySelector('meta[name="theme-color"]');
        if (tc) {
            tc.setAttribute("content", t === "light" ? "#f2f6fa" : "#090d14");
        }

        var f = parseFloat(localStorage.getItem("ferstation-font"));
        if (!isNaN(f) && f >= 85 && f <= 130 && f !== 100) {
            document.documentElement.style.zoom = f + "%";
        }
    } catch (e) { }
})();