(function () {
    const FONT_KEY = "ferstation-font";
    const THEME_KEY = "ferstation-theme";

    const FONT_MIN = 85;
    const FONT_MAX = 130;
    const FONT_STEP = 5;

    let fontScale = 100;
    let theme = "dark";

    function savePref(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            /* ignore */
        }
    }

    function applyFont() {
        if (fontScale === 100) {
            document.documentElement.style.zoom = "";
        } else {
            document.documentElement.style.zoom = fontScale + "%";
        }
    }

    function announceFont() {
        const status = document.getElementById("font-status");
        if (status) {
            status.textContent = window.i18n.t("fontScaleAnnounce", { percent: fontScale });
        }
    }

    function applyTheme() {
        document.documentElement.setAttribute("data-theme", theme);

        const themeColor = document.querySelector('meta[name="theme-color"]');
        if (themeColor) {
            themeColor.setAttribute("content", theme === "light" ? "#f2f6fa" : "#090d14");
        }

        const icon = document.getElementById("theme-icon");
        if (icon) {
            icon.className = theme === "dark" ? "fa-solid fa-moon" : "fa-solid fa-sun";
        }

        relabel();
    }

    function relabel() {
        const labels = {
            fontDecrease: window.i18n.t("fontDecrease"),
            fontReset: window.i18n.t("fontReset"),
            fontIncrease: window.i18n.t("fontIncrease"),
            langToggle: window.i18n.t("toggleLangLabel"),
            themeToggle: theme === "dark"
                ? window.i18n.t("themeToLight")
                : window.i18n.t("themeToDark")
        };

        const setLabel = (id, label) => {
            const el = document.getElementById(id);
            if (el) {
                el.title = label;
                el.setAttribute("aria-label", label);
            }
        };

        setLabel("font-decrease", labels.fontDecrease);
        setLabel("font-reset", labels.fontReset);
        setLabel("font-increase", labels.fontIncrease);
        setLabel("lang-toggle", labels.langToggle);
        setLabel("theme-toggle", labels.themeToggle);
    }

    function init() {
        try {
            const saved = Number(localStorage.getItem(FONT_KEY));
            if (!isNaN(saved) && saved >= FONT_MIN && saved <= FONT_MAX) {
                fontScale = saved;
            }

            const savedTheme = localStorage.getItem(THEME_KEY);
            if (savedTheme === "light" || savedTheme === "dark") {
                theme = savedTheme;
            } else if (
                window.matchMedia &&
                window.matchMedia("(prefers-color-scheme: light)").matches
            ) {
                theme = "light";
            }
        } catch (e) {
            /* ignore */
        }

        applyFont();
        applyTheme();

        const el = (id) => document.getElementById(id);
        const increase = el("font-increase");
        const decrease = el("font-decrease");
        const reset = el("font-reset");
        const toggle = el("theme-toggle");

        if (increase) {
            increase.addEventListener("click", () => {
                fontScale = Math.min(fontScale + FONT_STEP, FONT_MAX);
                savePref(FONT_KEY, String(fontScale));
                applyFont();
                announceFont();
            });
        }

        if (decrease) {
            decrease.addEventListener("click", () => {
                fontScale = Math.max(fontScale - FONT_STEP, FONT_MIN);
                savePref(FONT_KEY, String(fontScale));
                applyFont();
                announceFont();
            });
        }

        if (reset) {
            reset.addEventListener("click", () => {
                fontScale = 100;
                savePref(FONT_KEY, String(fontScale));
                applyFont();
                announceFont();
            });
        }

        if (toggle) {
            toggle.addEventListener("click", () => {
                theme = theme === "dark" ? "light" : "dark";
                savePref(THEME_KEY, theme);
                applyTheme();
            });
        }

        document.addEventListener("languagechange", relabel);
    }

    init();
})();