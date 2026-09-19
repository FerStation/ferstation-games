const elements = {
    dropZone: document.querySelector("#dropZone"),
    fileInput: document.querySelector("#fileInput"),
    selectFileButton: document.querySelector("#selectFileButton"),
    addGameButton: document.querySelector("#addGameButton"),

    totalGames: document.querySelector("#totalGames"),
    searchGames: document.querySelector("#searchGames"),
    gamesContainer: document.querySelector("#gamesContainer"),

    modalBackdrop: document.querySelector("#modalBackdrop"),
    modalTitle: document.querySelector("#modalTitle"),
    modalContent: document.querySelector("#modalContent"),
    closeModal: document.querySelector("#closeModal"),

    toastContainer: document.querySelector("#toastContainer")
};

const state = {
    games: [],
    filteredGames: [],
    selectedGame: null,
    currentMode: null
};


/* =========================================================
   INIT
========================================================= */

document.addEventListener("DOMContentLoaded", initialize);

async function initialize() {
    bindEvents();
    await loadGames();
}


/* =========================================================
   EVENTS
========================================================= */

function bindEvents() {

    elements.selectFileButton.addEventListener(
        "click",
        () => elements.fileInput.click()
    );

    elements.fileInput.addEventListener(
        "change",
        handleFileSelection
    );

    elements.addGameButton.addEventListener(
        "click",
        openAddGameModal
    );

    elements.closeModal.addEventListener(
        "click",
        closeModal
    );

    elements.modalBackdrop.addEventListener(
        "click",
        event => {
            if (event.target === elements.modalBackdrop) {
                closeModal();
            }
        }
    );

    elements.searchGames.addEventListener(
        "input",
        handleSearch
    );

    elements.dropZone.addEventListener(
        "dragover",
        handleDragOver
    );

    elements.dropZone.addEventListener(
        "dragleave",
        handleDragLeave
    );

    elements.dropZone.addEventListener(
        "drop",
        handleDrop
    );

    document.addEventListener(
        "keydown",
        event => {
            if (event.key === "Escape") {
                closeModal();
            }
        }
    );
}


/* =========================================================
   API
========================================================= */

async function apiRequest(url, options = {}) {

    const response = await fetch(url, options);

    let data = null;

    try {
        data = await response.json();
    } catch {
        data = null;
    }

    if (!response.ok) {

        const message =
            data?.error ||
            `Erro HTTP ${response.status}`;

        throw new Error(message);
    }

    return data;
}


/* =========================================================
   LOAD GAMES
========================================================= */

async function loadGames() {

    elements.gamesContainer.innerHTML = `
        <div class="loading">
            Carregando jogos...
        </div>
    `;

    try {

        const data =
            await apiRequest("/api/games");

        state.games =
            Array.isArray(data)
                ? data
                : data.games ?? [];

        state.filteredGames = [...state.games];

        updateTotal();
        renderGames();

    } catch (error) {

        console.error(error);

        elements.gamesContainer.innerHTML = `
            <div class="loading">
                Não foi possível carregar os jogos.
            </div>
        `;

        showToast(
            error.message,
            "error"
        );
    }
}


/* =========================================================
   RENDER
========================================================= */

function renderGames() {
    if (!state.filteredGames.length) {
        elements.gamesContainer.innerHTML = `
            <div class="loading">
                Nenhum jogo encontrado.
            </div>
        `;
        return;
    }

    const rows = state.filteredGames
        .map(createGameRow)
        .join("");

    elements.gamesContainer.innerHTML = `
        <div class="table-wrapper">
            <table class="games-table">
                <thead>
                    <tr>
                        <th class="game-cover-column">Capa</th>
                        <th class="game-column">Jogo</th>
                        <th class="game-platform-column">Plataforma</th>
                        <th class="game-source-column">Origem</th>
                        <th class="game-date-column">Conclusão</th>
                        <th class="game-actions-column">Ações</th>
                    </tr>
                </thead>

                <tbody>
                    ${rows}
                </tbody>
            </table>
        </div>
    `;

    bindGameActions();
}


function createGameRow(game) {
    const cover = game.cover
        ? `/site/${game.cover}`
        : null;

    const genres = Array.isArray(game.genres)
        ? game.genres
        : [];

    const genreHtml = genres.length
        ? `
            <div class="game-genres">
                ${genres
                    .slice(0, 3)
                    .map(
                        genre =>
                            `<span>${escapeHtml(genre)}</span>`
                    )
                    .join("")}
            </div>
        `
        : "";

    const recordId = getRecordId(game);

    return `
        <tr class="game-row">

            <td class="game-cover-cell">
                ${
                    cover
                        ? `
                            <img
                                class="game-thumb"
                                src="${escapeAttribute(cover)}"
                                alt="${escapeAttribute(game.title || "Capa")}"
                                loading="lazy"
                            >
                        `
                        : `
                            <div class="game-thumb game-thumb-empty">
                                <span>Sem capa</span>
                            </div>
                        `
                }
            </td>

            <td class="game-main-cell">
                <div class="game-title">
                    ${escapeHtml(game.title || "Sem título")}
                </div>

                ${
                    game.developer
                        ? `
                            <div class="game-developer">
                                ${escapeHtml(game.developer)}
                            </div>
                        `
                        : ""
                }

                ${genreHtml}
            </td>

            <td class="game-platform-cell">
                <span class="game-badge">
                    ${escapeHtml(game.platform || "—")}
                </span>
            </td>

            <td class="game-source-cell">
                <span class="game-badge game-badge-source">
                    ${escapeHtml(game.source || "—")}
                </span>
            </td>

            <td class="game-date-cell">
                <span class="date-label">
                    ZERADO EM
                </span>

                <strong>
                    ${escapeHtml(game.completedDate || "—")}
                </strong>
            </td>

            <td class="game-actions-cell">
                <div class="actions">

                    <button
                        class="small-button primary edit-game"
                        type="button"
                        data-record-id="${escapeAttribute(recordId)}"
                    >
                        Editar
                    </button>

                    <button
                        class="small-button danger delete-game"
                        type="button"
                        data-record-id="${escapeAttribute(recordId)}"
                    >
                        Excluir
                    </button>

                </div>
            </td>

        </tr>
    `;
}


function bindGameActions() {
    document
        .querySelectorAll(".edit-game")
        .forEach(button => {
            button.addEventListener(
                "click",
                () => {
                    const id = button.dataset.recordId;

                    const game = state.games.find(
                        item =>
                            getRecordId(item) === id
                    );

                    if (game) {
                        openEditGameModal(game);
                    }
                }
            );
        });

    document
        .querySelectorAll(".delete-game")
        .forEach(button => {
            button.addEventListener(
                "click",
                () => {
                    deleteGame(
                        button.dataset.recordId
                    );
                }
            );
        });
}


/* =========================================================
   SEARCH
========================================================= */

function handleSearch(event) {

    const query =
        normalize(event.target.value);

    if (!query) {

        state.filteredGames =
            [...state.games];

    } else {

        state.filteredGames =
            state.games.filter(game => {

                const content = [
                    game.title,
                    game.developer,
                    game.platform,
                    game.source,
                    game.completedDate,
                    ...(game.genres || [])
                ]
                    .filter(Boolean)
                    .join(" ");

                return normalize(content)
                    .includes(query);
            });
    }

    renderGames();
}


/* =========================================================
   ADD GAME
========================================================= */

function openAddGameModal() {

    state.currentMode = "add";
    state.selectedGame = null;

    elements.modalTitle.textContent =
        "Adicionar jogo";

    elements.modalContent.innerHTML = `
        <form id="gameForm">

            <div class="igdb-search">

                <label class="field">

                    <span>
                        Buscar jogo na IGDB
                    </span>

                    <div class="search-line">

                        <input
                            type="search"
                            id="igdbSearchInput"
                            placeholder="Ex.: Hollow Knight"
                            autocomplete="off"
                        >

                        <button
                            type="button"
                            class="button secondary"
                            id="searchIgdbButton"
                        >
                            Buscar
                        </button>

                    </div>

                </label>

                <div
                    id="igdbResults"
                    class="igdb-results"
                ></div>

            </div>


            <div
                id="selectedGameInfo"
                class="selected-game-info"
            ></div>


            ${createGameFormFields()}


            <div class="modal-actions">

                <button
                    type="button"
                    class="button secondary"
                    id="cancelGameButton"
                >
                    Cancelar
                </button>

                <button
                    type="submit"
                    class="button primary"
                >
                    Salvar jogo
                </button>

            </div>

        </form>
    `;

    openModal();

    bindGameFormEvents();
}


/* =========================================================
   EDIT GAME
========================================================= */

function openEditGameModal(game) {

    state.currentMode = "edit";
    state.selectedGame = game;

    elements.modalTitle.textContent =
        "Editar jogo";

    elements.modalContent.innerHTML = `
        <form id="gameForm">

            ${createGameFormFields(game)}

            <div class="cover-editor">

                <div>

                    <div class="field-label">
                        Capa atual
                    </div>

                    <div id="coverPreview">
                        ${
                            game.cover
                                ? `
                                    <img
                                        src="/site/${escapeAttribute(game.cover)}"
                                        alt=""
                                        class="cover-preview"
                                    >
                                `
                                : `
                                    <div class="cover-preview placeholder">
                                        Sem capa
                                    </div>
                                `
                        }
                    </div>

                </div>

                <div>

                    <label class="button secondary">
                        Alterar capa

                        <input
                            type="file"
                            id="coverInput"
                            accept="image/*"
                            hidden
                        >
                    </label>

                </div>

            </div>


            <div class="modal-actions">

                <button
                    type="button"
                    class="button secondary"
                    id="cancelGameButton"
                >
                    Cancelar
                </button>

                <button
                    type="submit"
                    class="button primary"
                >
                    Salvar alterações
                </button>

            </div>

        </form>
    `;

    openModal();

    bindGameFormEvents();
}


/* =========================================================
   FORM
========================================================= */

function createGameFormFields(game = {}) {

    const genres =
        Array.isArray(game.genres)
            ? game.genres.join(", ")
            : "";

    return `
        <div class="form-grid">

            <label class="field">

                <span>Título</span>

                <input
                    type="text"
                    name="title"
                    value="${escapeAttribute(game.title || "")}"
                    required
                >

            </label>


            <label class="field">

                <span>Desenvolvedor</span>

                <input
                    type="text"
                    name="developer"
                    value="${escapeAttribute(game.developer || "")}"
                >

            </label>


            <label class="field">

                <span>Ano de lançamento</span>

                <input
                    type="number"
                    name="releaseYear"
                    min="1950"
                    max="2100"
                    value="${escapeAttribute(game.releaseYear ?? "")}"
                >

            </label>


            <label class="field">

                <span>Data de conclusão</span>

                <input
                    type="text"
                    name="completedDate"
                    placeholder="AAAA, AAAA-MM, AAAA-MM-DD ou AAAA-AAAA"
                    value="${escapeAttribute(game.completedDate || "")}"
                    required
                >

            </label>


            <label class="field">

                <span>Plataforma</span>

                <input
                    type="text"
                    name="platform"
                    placeholder="PC, PS5, Switch..."
                    value="${escapeAttribute(game.platform || "")}"
                >

            </label>


            <label class="field">

                <span>Onde jogou</span>

                <input
                    type="text"
                    name="source"
                    placeholder="Steam, Game Pass..."
                    value="${escapeAttribute(game.source || "")}"
                >

            </label>


            <label class="field field-full">

                <span>Gêneros</span>

                <input
                    type="text"
                    name="genres"
                    placeholder="Action, Adventure, RPG"
                    value="${escapeAttribute(genres)}"
                >

                <small>
                    Separe os gêneros por vírgula.
                </small>

            </label>

        </div>
    `;
}


function bindGameFormEvents() {

    const form =
        document.querySelector("#gameForm");

    const cancelButton =
        document.querySelector("#cancelGameButton");

    cancelButton?.addEventListener(
        "click",
        closeModal
    );

    form?.addEventListener(
        "submit",
        handleGameFormSubmit
    );


    const searchButton =
        document.querySelector("#searchIgdbButton");

    const searchInput =
        document.querySelector("#igdbSearchInput");

    searchButton?.addEventListener(
        "click",
        () => searchIgdb(searchInput.value)
    );

    searchInput?.addEventListener(
        "keydown",
        event => {

            if (event.key === "Enter") {

                event.preventDefault();

                searchIgdb(
                    searchInput.value
                );
            }
        }
    );


    const coverInput =
        document.querySelector("#coverInput");

    coverInput?.addEventListener(
        "change",
        handleCoverPreview
    );
}


/* =========================================================
   IGDB
========================================================= */

async function searchIgdb(query) {

    const cleanQuery =
        query.trim();

    if (!cleanQuery) {

        showToast(
            "Digite o nome de um jogo.",
            "error"
        );

        return;
    }

    const resultsContainer =
        document.querySelector("#igdbResults");

    resultsContainer.innerHTML = `
        <div class="loading">
            Buscando na IGDB...
        </div>
    `;

    try {

        const data =
            await apiRequest(
                `/api/search?q=${encodeURIComponent(cleanQuery)}`
            );

        const results =
            Array.isArray(data)
                ? data
                : data.results ?? [];

        renderIgdbResults(results);

    } catch (error) {

        console.error(error);

        resultsContainer.innerHTML = "";

        showToast(
            error.message,
            "error"
        );
    }
}


function renderIgdbResults(results) {

    const container =
        document.querySelector("#igdbResults");

    if (!results.length) {

        container.innerHTML = `
            <div class="loading">
                Nenhum jogo encontrado.
            </div>
        `;

        return;
    }

    container.innerHTML =
        results.map(result => {

            const cover =
                result.coverUrl
                    ? `
                        <img
                            src="${escapeAttribute(result.coverUrl)}"
                            alt=""
                            class="igdb-cover"
                            loading="lazy"
                        >
                    `
                    : `
                        <div class="igdb-cover placeholder">
                            ?
                        </div>
                    `;

            const genres =
                Array.isArray(result.genres)
                    ? result.genres.join(", ")
                    : "";

            return `
                <button
                    type="button"
                    class="igdb-result"
                    data-game="${encodeURIComponent(JSON.stringify(result))}"
                >

                    ${cover}

                    <div class="igdb-info">

                        <strong>
                            ${escapeHtml(result.name || "Sem título")}
                        </strong>

                        <span>
                            ${escapeHtml(result.developer || "Desenvolvedor desconhecido")}
                        </span>

                        <span>
                            ${escapeHtml(String(result.releaseYear ?? "—"))}
                            ${genres ? ` · ${escapeHtml(genres)}` : ""}
                        </span>

                    </div>

                </button>
            `;

        }).join("");

    container
        .querySelectorAll(".igdb-result")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const result =
                        JSON.parse(
                            decodeURIComponent(
                                button.dataset.game
                            )
                        );

                    selectIgdbGame(result);
                }
            );
        });
}


function selectIgdbGame(game) {

    state.selectedGame = game;

    const titleInput =
        document.querySelector(
            '[name="title"]'
        );

    const developerInput =
        document.querySelector(
            '[name="developer"]'
        );

    const releaseYearInput =
        document.querySelector(
            '[name="releaseYear"]'
        );

    const genresInput =
        document.querySelector(
            '[name="genres"]'
        );

    if (titleInput) {
        titleInput.value =
            game.name || "";
    }

    if (developerInput) {
        developerInput.value =
            game.developer || "";
    }

    if (releaseYearInput) {
        releaseYearInput.value =
            game.releaseYear ?? "";
    }

    if (genresInput) {
        genresInput.value =
            Array.isArray(game.genres)
                ? game.genres.join(", ")
                : "";
    }

    const info =
        document.querySelector(
            "#selectedGameInfo"
        );

    if (info) {

        info.innerHTML = `
            <div class="selected-game">

                ${
                    game.coverUrl
                        ? `
                            <img
                                src="${escapeAttribute(game.coverUrl)}"
                                alt=""
                                class="igdb-cover"
                            >
                        `
                        : ""
                }

                <div>

                    <strong>
                        ${escapeHtml(game.name)}
                    </strong>

                    <span>
                        IGDB #${escapeHtml(String(game.id))}
                    </span>

                </div>

            </div>
        `;
    }

    showToast(
        "Jogo selecionado da IGDB.",
        "success"
    );
}


/* =========================================================
   SAVE GAME
========================================================= */

async function handleGameFormSubmit(event) {

    event.preventDefault();

    const form =
        event.currentTarget;

    const formData =
        new FormData(form);

    const data = {
        title: formData.get("title")?.trim() || "",
        developer:
            formData.get("developer")?.trim() || null,

        releaseYear:
            formData.get("releaseYear")
                ? Number(formData.get("releaseYear"))
                : null,

        completedDate:
            formData.get("completedDate")?.trim() || null,

        platform:
            formData.get("platform")?.trim() || null,

        source:
            formData.get("source")?.trim() || null,

        genres:
            String(formData.get("genres") || "")
                .split(",")
                .map(value => value.trim())
                .filter(Boolean)
    };


    if (!data.title) {

        showToast(
            "Informe o título do jogo.",
            "error"
        );

        return;
    }


    if (!data.completedDate) {

        showToast(
            "Informe a data de conclusão.",
            "error"
        );

        return;
    }


    const submitButton =
        form.querySelector(
            'button[type="submit"]'
        );

    submitButton.disabled = true;

    try {

        if (state.currentMode === "add") {

            if (!state.selectedGame?.id) {

                showToast(
                    "Selecione um jogo encontrado na IGDB.",
                    "error"
                );

                return;
            }

            data.igdbId =
                state.selectedGame.id;

            const saved =
                await apiRequest(
                    "/api/games",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify(data)
                    }
                );

            const savedGame =
                saved.game ?? saved;

            state.games.push(savedGame);

            showToast(
                "Jogo adicionado.",
                "success"
            );

        } else {

            const id =
                getRecordId(state.selectedGame);

            const updated =
                await apiRequest(
                    `/api/games/${encodeURIComponent(id)}`,
                    {
                        method: "PUT",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify(data)
                    }
                );

            const updatedGame =
                updated.game ?? updated;

            const index =
                state.games.findIndex(
                    game =>
                        getRecordId(game) === id
                );

            if (index !== -1) {
                state.games[index] =
                    updatedGame;
            }

            await uploadSelectedCover(id);

            showToast(
                "Jogo atualizado.",
                "success"
            );
        }

        state.filteredGames =
            [...state.games];

        updateTotal();
        renderGames();

        closeModal();

    } catch (error) {

        console.error(error);

        showToast(
            error.message,
            "error"
        );

    } finally {

        submitButton.disabled = false;
    }
}


/* =========================================================
   COVER
========================================================= */

function handleCoverPreview(event) {

    const file =
        event.target.files?.[0];

    if (!file) {
        return;
    }

    const preview =
        document.querySelector(
            "#coverPreview"
        );

    if (!preview) {
        return;
    }

    const url =
        URL.createObjectURL(file);

    preview.innerHTML = `
        <img
            src="${escapeAttribute(url)}"
            alt=""
            class="cover-preview"
        >
    `;
}


async function uploadSelectedCover(recordId) {

    const input =
        document.querySelector(
            "#coverInput"
        );

    const file =
        input?.files?.[0];

    if (!file) {
        return;
    }

    const formData =
        new FormData();

    formData.append(
        "cover",
        file
    );

    await apiRequest(
        `/api/games/${encodeURIComponent(recordId)}/cover`,
        {
            method: "POST",
            body: formData
        }
    );
}


/* =========================================================
   DELETE
========================================================= */

async function deleteGame(recordId) {

    const game =
        state.games.find(
            item =>
                getRecordId(item) === recordId
        );

    if (!game) {
        return;
    }

    const confirmed =
        window.confirm(
            `Excluir "${game.title}" do diário?`
        );

    if (!confirmed) {
        return;
    }

    try {

        await apiRequest(
            `/api/games/${encodeURIComponent(recordId)}`,
            {
                method: "DELETE"
            }
        );

        state.games =
            state.games.filter(
                item =>
                    getRecordId(item) !== recordId
            );

        state.filteredGames =
            [...state.games];

        updateTotal();
        renderGames();

        showToast(
            "Jogo excluído.",
            "success"
        );

    } catch (error) {

        console.error(error);

        showToast(
            error.message,
            "error"
        );
    }
}


/* =========================================================
   IMPORT
========================================================= */

async function handleFileSelection(event) {

    const file =
        event.target.files?.[0];

    if (!file) {
        return;
    }

    await processImportFile(file);

    event.target.value = "";
}


function handleDragOver(event) {

    event.preventDefault();

    elements.dropZone.classList.add(
        "dragging"
    );
}


function handleDragLeave() {

    elements.dropZone.classList.remove(
        "dragging"
    );
}


async function handleDrop(event) {

    event.preventDefault();

    elements.dropZone.classList.remove(
        "dragging"
    );

    const file =
        event.dataTransfer.files?.[0];

    if (!file) {
        return;
    }

    await processImportFile(file);
}


async function processImportFile(file) {

    const allowedExtensions =
        [".txt", ".xlsx", ".xls"];

    const extension =
        "." +
        file.name
            .split(".")
            .pop()
            .toLowerCase();

    if (!allowedExtensions.includes(extension)) {

        showToast(
            "Formato de arquivo não suportado.",
            "error"
        );

        return;
    }

    try {

        const formData =
            new FormData();

        formData.append(
            "file",
            file
        );

        const preview =
            await apiRequest(
                "/api/import/preview",
                {
                    method: "POST",
                    body: formData
                }
            );

        openImportPreview(
            preview
        );

    } catch (error) {

        console.error(error);

        showToast(
            error.message,
            "error"
        );
    }
}


function openImportPreview(data) {

    const rows =
        data.rows ?? data.games ?? [];

    elements.modalTitle.textContent =
        "Importar jogos";

    elements.modalContent.innerHTML = `
        <div class="import-summary">

            <strong>
                ${rows.length}
            </strong>

            <span>
                jogos encontrados no arquivo
            </span>

        </div>


        <div class="import-table">

            ${
                rows.length
                    ? rows.map(row => `
                        <div class="import-row">

                            <strong>
                                ${escapeHtml(row.game || "")}
                            </strong>

                            <span>
                                ${escapeHtml(row.completedDate || "—")}
                            </span>

                            <span>
                                ${escapeHtml(row.platform || "—")}
                            </span>

                            <span>
                                ${escapeHtml(row.source || "—")}
                            </span>

                        </div>
                    `).join("")
                    : `
                        <div class="loading">
                            Nenhum jogo válido encontrado.
                        </div>
                    `
            }

        </div>


        <div class="modal-actions">

            <button
                type="button"
                class="button secondary"
                id="cancelImportButton"
            >
                Cancelar
            </button>

            <button
                type="button"
                class="button primary"
                id="confirmImportButton"
                ${rows.length ? "" : "disabled"}
            >
                Importar ${rows.length} jogos
            </button>

        </div>
    `;

    openModal();


    document
        .querySelector("#cancelImportButton")
        ?.addEventListener(
            "click",
            closeModal
        );


    document
        .querySelector("#confirmImportButton")
        ?.addEventListener(
            "click",
            () => executeImport(rows)
        );
}


async function executeImport(rows) {

    const button =
        document.querySelector(
            "#confirmImportButton"
        );

    if (!button) {
        return;
    }

    button.disabled = true;

    button.textContent =
        "Importando...";

    try {

        const result =
            await apiRequest(
                "/api/import",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        games: rows
                    })
                }
            );

        showToast(
            result.message ||
            "Importação concluída.",
            "success"
        );

        closeModal();

        await loadGames();

    } catch (error) {

        console.error(error);

        button.disabled = false;

        button.textContent =
            "Tentar novamente";

        showToast(
            error.message,
            "error"
        );
    }
}


/* =========================================================
   MODAL
========================================================= */

function openModal() {

    elements.modalBackdrop.classList.remove(
        "hidden"
    );

    document.body.classList.add(
        "modal-open"
    );
}


function closeModal() {

    elements.modalBackdrop.classList.add(
        "hidden"
    );

    document.body.classList.remove(
        "modal-open"
    );

    state.selectedGame = null;
    state.currentMode = null;
}


/* =========================================================
   TOTAL
========================================================= */

function updateTotal() {

    elements.totalGames.textContent =
        state.games.length;
}


/* =========================================================
   RECORD ID
========================================================= */

/*
 * O backend deverá usar recordId para diferenciar
 * duas conclusões do mesmo jogo.
 *
 * Mantemos fallback para igdbId enquanto o backend
 * ainda não tiver sido atualizado.
 */

function getRecordId(game) {

    return String(
        game.recordId ??
        game.id ??
        game.igdbId
    );
}


/* =========================================================
   TOAST
========================================================= */

function showToast(message, type = "success") {

    const toast =
        document.createElement("div");

    toast.className =
        `toast ${type}`;

    toast.textContent =
        message;

    elements.toastContainer.appendChild(
        toast
    );

    window.setTimeout(
        () => {
            toast.remove();
        },
        4000
    );
}


/* =========================================================
   HELPERS
========================================================= */

function normalize(value) {

    return String(value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}


function escapeHtml(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function escapeAttribute(value) {

    return escapeHtml(value);
}