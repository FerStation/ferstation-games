    let cachedGames = null;

    const yearEl = document.getElementById("year");
    if (yearEl) {
        yearEl.textContent = new Date().getFullYear();
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function getDateParts(completedDate) {
        if (!completedDate) {
            return {
                type: "unknown",
                year: null,
                month: null,
                day: null,
                endYear: null
            };
        }

        // Intervalo: AAAA-AAAA
        const range =
            completedDate.match(
                /^(\d{4})-(\d{4})$/
            );

        if (range) {
            return {
                type: "range",
                year: Number(range[1]),
                month: null,
                day: null,
                endYear: Number(range[2])
            };
        }

        // Data completa: AAAA-MM-DD
        const fullDate =
            completedDate.match(
                /^(\d{4})-(\d{2})-(\d{2})$/
            );

        if (fullDate) {
            return {
                type: "day",
                year: Number(fullDate[1]),
                month: Number(fullDate[2]),
                day: Number(fullDate[3]),
                endYear: null
            };
        }

        // Mês + ano: AAAA-MM
        const monthDate =
            completedDate.match(
                /^(\d{4})-(\d{2})$/
            );

        if (monthDate) {
            return {
                type: "month",
                year: Number(monthDate[1]),
                month: Number(monthDate[2]),
                day: null,
                endYear: null
            };
        }

        // Somente ano: AAAA
        const year =
            completedDate.match(
                /^(\d{4})$/
            );

        if (year) {
            return {
                type: "year",
                year: Number(year[1]),
                month: null,
                day: null,
                endYear: null
            };
        }

        return {
            type: "unknown",
            year: null,
            month: null,
            day: null,
            endYear: null
        };
    }

    function getTimelineGroup(game) {
        const date =
            getDateParts(
                game.completedDate
            );

        if (date.type === "range") {
            return {
                key: game.completedDate,
                label:
                    `${date.year}–${date.endYear}`,
                sortYear: date.year,
                sortMonth: 0,
                sortDay: 0
            };
        }

        return {
            key: String(date.year),
            label: String(date.year),
            sortYear: date.year,
            sortMonth:
                date.month ?? 0,
            sortDay:
                date.day ?? 0
        };
    }

    function formatCompletedDate(
        completedDate
    ) {
        if (!completedDate) {
            return "—";
        }

        const date =
            getDateParts(
                completedDate
            );

        if (date.type === "range") {
            return `${date.year}–${date.endYear}`;
        }

        if (date.type === "day") {
            return `${String(date.day).padStart(2, "0")} ${i18n.months[date.month]} ${date.year}`;
        }

        if (date.type === "month") {
            return `${i18n.months[date.month]} ${date.year}`;
        }

        if (date.type === "year") {
            return String(date.year);
        }

        return completedDate;
    }

    function getPlatformIcon(
        platform
    ) {
        const value =
            String(platform ?? "")
                .toLowerCase();

        if (
            value.includes("pc") ||
            value.includes("windows")
        ) {
            return "fa-solid fa-desktop";
        }

        if (
            value.includes("playstation") ||
            value.includes("ps1") ||
            value.includes("ps2") ||
            value.includes("ps3") ||
            value.includes("ps4") ||
            value.includes("ps5")
        ) {
            return "fa-brands fa-playstation";
        }

        if (
            value.includes("xbox")
        ) {
            return "fa-brands fa-xbox";
        }

        if (
            value.includes("switch") ||
            value.includes("nintendo")
        ) {
            return "fa-solid fa-gamepad";
        }

        if (
            value.includes("mobile") ||
            value.includes("android") ||
            value.includes("ios")
        ) {
            return "fa-solid fa-mobile-screen-button";
        }

        return "fa-solid fa-gamepad";
    }

    function getSourceIcon(
        source
    ) {
        const value =
            String(source ?? "")
                .toLowerCase();

        if (
            value.includes("steam")
        ) {
            return "fa-brands fa-steam";
        }

        if (
            value.includes("gog")
        ) {
            return "fa-solid fa-compact-disc";
        }

        if (
            value.includes("epic")
        ) {
            return "fa-solid fa-store";
        }

        if (
            value.includes("itch")
        ) {
            return "fa-brands fa-itch-io";
        }

        if (
            value.includes("playstation") ||
            value.includes("psn")
        ) {
            return "fa-brands fa-playstation";
        }

        if (
            value.includes("xbox")
        ) {
            return "fa-brands fa-xbox";
        }

        if (
            value.includes("nintendo") ||
            value.includes("eshop")
        ) {
            return "fa-solid fa-gamepad";
        }

        return "fa-solid fa-compact-disc";
    }

    function createTags(genres) {
        if (
            !Array.isArray(genres) ||
            !genres.length
        ) {
            return "";
        }

        return genres
            .map(genre => `
                <span class="tag">
                    ${escapeHtml(
                        genre.toUpperCase()
                    )}
                </span>
            `)
            .join("");
    }

    function createGameCard(
        game,
        side
    ) {
        const platformIcon =
            getPlatformIcon(
                game.platform
            );

        const sourceIcon =
            getSourceIcon(
                game.source
            );

        const cover =
            game.cover ||
            `https://placehold.co/180x250/182333/66c0f4?text=${i18n.t("coverFallback")}`;

        return `
            <article class="entry ${side}">
                <div class="game surface">

                    <img
                        class="cover"
                        src="${escapeHtml(cover)}"
                        alt="${escapeHtml(i18n.t("coverAlt", { title: game.title }))}"
                        loading="lazy"
                    >

                    <div class="game-info">

                        <div class="game-top">

                            <div>

                                <h3>
                                    ${escapeHtml(game.title)}
                                </h3>

                                <div class="studio">
                                    ${escapeHtml(
                                        game.developer ||
                                        i18n.t("developerUnknown")
                                    )}
                                </div>

                                <span class="release">
                                    ${i18n.t("releaseYear")}
                                    <strong>
                                        ${game.releaseYear ?? "—"}
                                    </strong>
                                </span>

                            </div>

                            <div class="tags">
                                ${createTags(
                                    game.genres
                                )}
                            </div>

                        </div>

                        <div class="info-divider"></div>

                        <div class="info-block">

                            <div class="info-label">
                                ${i18n.t("myCompletion")}
                            </div>

                            <div class="completion-block">

                                <div class="completion-row">

                                    <span class="completion-key">
                                        ${i18n.t("platform")}
                                    </span>

                                    <span class="completion-value">
                                        <i class="${platformIcon}"></i>
                                        ${escapeHtml(
                                            game.platform || "—"
                                        )}
                                    </span>

                                </div>

                                <div class="completion-row">

                                    <span class="completion-key">
                                        ${i18n.t("playedOn")}
                                    </span>

                                    <span class="completion-value">
                                        <i class="${sourceIcon}"></i>
                                        ${escapeHtml(
                                            game.source || "—"
                                        )}
                                    </span>

                                </div>

                                <div class="completion-row">

                                    <span class="completion-key">
                                        ${i18n.t("finished")}
                                    </span>

                                    <span class="completion-value">

                                        <span class="finished">

                                            <i class="fa-regular fa-calendar-check"></i>

                                            ${escapeHtml(
                                                formatCompletedDate(
                                                    game.completedDate
                                                )
                                            )}

                                        </span>

                                    </span>

                                </div>

                            </div>

                        </div>

                    </div>

                </div>
            </article>
        `;
    }

    function renderTimeline(
        games
    ) {
        const timeline =
            document.getElementById(
                "timeline"
            );

        if (!timeline) {
            return;
        }

        /*
         * Ordena cronologicamente:
         * ano mais recente primeiro.
         *
         * Dentro do mesmo ano:
         * mês mais recente primeiro.
         *
         * Dentro do mesmo mês:
         * dia mais recente primeiro.
         */
const sortedGames =
    games
        .map(
            (game, originalIndex) => ({
                game,
                originalIndex,
                date: getDateParts(game.completedDate)
            })
        )
        .sort(
            (a, b) => {
                const dateA = a.date;
                const dateB = b.date;

                if (
                    dateA.year !==
                    dateB.year
                ) {
                    return (
                        (dateB.year ?? 0) -
                        (dateA.year ?? 0)
                    );
                }

                if (
                    (dateA.month ?? 0) !==
                    (dateB.month ?? 0)
                ) {
                    return (
                        (dateB.month ?? 0) -
                        (dateA.month ?? 0)
                    );
                }

                if (
                    (dateA.day ?? 0) !==
                    (dateB.day ?? 0)
                ) {
                    return (
                        (dateB.day ?? 0) -
                        (dateA.day ?? 0)
                    );
                }

                /*
                 * Mesma data/período:
                 *
                 * A ordem da planilha/JSON
                 * é a ordem cronológica real
                 * do diário.
                 *
                 * Como a timeline é exibida
                 * do mais recente para o mais
                 * antigo, o último da sequência
                 * aparece primeiro.
                 */
                return (
                    b.originalIndex -
                    a.originalIndex
                );
            }
        )
        .map(
            item => item.game
        );

        /*
         * Agrupa os jogos por ano/período.
         */
        const groups =
            new Map();

        sortedGames.forEach(
            game => {

                const group =
                    getTimelineGroup(
                        game
                    );

                if (
                    !groups.has(
                        group.key
                    )
                ) {
                    groups.set(
                        group.key,
                        {
                            ...group,
                            games: []
                        }
                    );
                }

                groups
                    .get(group.key)
                    .games
                    .push(game);
            }
        );

        let html = "";

        /*
         * Cada ano começa novamente
         * pela esquerda.
         */
        groups.forEach(
            group => {

                html += `
                    <div class="year">
                        <span>
                            ${escapeHtml(
                                group.label
                            )}
                        </span>
                    </div>
                `;

                group.games.forEach(
                    (game, index) => {

                        const side =
                            index % 2 === 0
                                ? "left"
                                : "right";

                        html +=
                            createGameCard(
                                game,
                                side
                            );
                    }
                );
            }
        );

        timeline.innerHTML =
            html;

        timeline.setAttribute(
            "aria-busy",
            "false"
        );
    }

    function updateStats(
        games
    ) {
        const stats =
            document.querySelectorAll(
                "#played .stat"
            );

        if (stats.length < 2) {
            return;
        }

        const total =
            games.length;

        const currentYear =
            new Date().getFullYear();

        const completedThisYear =
            games.filter(
                game => {

                    const date =
                        getDateParts(
                            game.completedDate
                        );

                    if (
                        date.type ===
                        "range"
                    ) {
                        return (
                            date.year ===
                            currentYear ||
                            date.endYear ===
                            currentYear
                        );
                    }

                    return (
                        date.year ===
                        currentYear
                    );
                }
            ).length;

        stats[0].querySelector(
            "b"
        ).textContent =
            total;

        stats[0].querySelector(
            "span"
        ).textContent =
            i18n.t("recordedCompletions");

        stats[1].querySelector(
            "b"
        ).textContent =
            completedThisYear;

        stats[1].querySelector(
            "span"
        ).textContent =
            i18n.t("completedInYear", {
                year: currentYear
            });
    }

    async function loadGames() {
        const timeline =
            document.getElementById(
                "timeline"
            );

        try {

            const response =
                await fetch(
                    "games.json"
                );

            if (!response.ok) {
                throw new Error(
                    `HTTP ${response.status}`
                );
            }

            const games =
                await response.json();

            if (
                !Array.isArray(games)
            ) {
                throw new Error(
                    "games.json não contém uma lista de jogos."
                );
            }

            cachedGames = games;

            renderTimeline(
                games
            );

            updateStats(
                games
            );

        } catch (error) {

            console.error(
                "Erro ao carregar games.json:",
                error
            );

            if (timeline) {
                timeline.innerHTML = `
                    <div class="year">
                        <span>${i18n.t("errorTitle")}</span>
                    </div>

                    <p style="text-align:center;opacity:.7">
                        ${i18n.t("errorMsg")}
                    </p>
                `;

                timeline.setAttribute(
                    "aria-busy",
                    "false"
                );
            }
        }
    }

    document.addEventListener(
        "languagechange",
        () => {
            if (cachedGames) {
                renderTimeline(
                    cachedGames
                );

                updateStats(
                    cachedGames
                );
            }
        }
    );

    loadGames();