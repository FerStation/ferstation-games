import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import {
    searchGame,
    getCoverUrl
} from "./igdb.js";

import {
    sleep,
    slugify,
    ensureDirectory,
    fileExists,
    downloadFile,
    saveJson
} from "./utils.js";

const __filename =
    fileURLToPath(import.meta.url);

const __dirname =
    path.dirname(__filename);

const GENERATOR_DIR =
    path.resolve(
        __dirname,
        ".."
    );

const SITE_DIR =
    path.resolve(
        GENERATOR_DIR,
        "..",
        "site"
    );

const COVERS_DIR =
    path.join(
        SITE_DIR,
        "covers"
    );

const OUTPUT_DIR =
    path.join(
        GENERATOR_DIR,
        "output"
    );

const GAMES_FILE =
    path.join(
        SITE_DIR,
        "games.json"
    );

const ERRORS_FILE =
    path.join(
        OUTPUT_DIR,
        "errors.json"
    );

function normalize(value) {
    return String(value ?? "")
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .toLowerCase()
        .replace(
            /[^a-z0-9 ]/g,
            " "
        )
        .replace(
            /\s+/g,
            " "
        )
        .trim();
}

/**
 * Identifica uma conclusão específica.
 *
 * O mesmo jogo pode aparecer mais de uma vez
 * caso tenha sido concluído em plataformas,
 * origens ou períodos diferentes.
 */
function getGameKey(game) {
    return [
        normalize(
            game.title ??
            game.game
        ),

        normalize(
            game.platform
        ),

        normalize(
            game.source
        ),

        normalize(
            game.completedDate
        )
    ].join("|");
}

function loadJson(
    filePath,
    fallback = []
) {
    if (!fs.existsSync(filePath)) {
        return fallback;
    }

    try {
        return JSON.parse(
            fs.readFileSync(
                filePath,
                "utf8"
            )
        );
    } catch {
        console.warn(
            `Aviso: ${filePath} está inválido. Será recriado.`
        );

        return fallback;
    }
}

function calculateMatchScore(
    requested,
    result
) {
    const a =
        normalize(requested);

    const b =
        normalize(result.name);

    if (a === b) {
        return 100;
    }

    if (b.includes(a)) {
        return 85;
    }

    if (a.includes(b)) {
        return 75;
    }

    const wordsA =
        new Set(
            a
                .split(" ")
                .filter(Boolean)
        );

    const wordsB =
        new Set(
            b
                .split(" ")
                .filter(Boolean)
        );

    if (!wordsA.size) {
        return 0;
    }

    let matches = 0;

    for (const word of wordsA) {
        if (wordsB.has(word)) {
            matches++;
        }
    }

    return Math.round(
        (
            matches /
            wordsA.size
        ) * 60
    );
}

function chooseBestResult(
    requested,
    results
) {
    if (!results.length) {
        return null;
    }

    return results
        .map(game => ({
            game,

            score:
                calculateMatchScore(
                    requested,
                    game
                )
        }))
        .sort(
            (a, b) =>
                b.score -
                a.score
        )
        .find(
            item =>
                item.score >= 40
        )?.game ?? null;
}

function getDevelopers(game) {
    return (
        game.involved_companies ??
        []
    )
        .filter(
            company =>
                company.developer === true
        )
        .map(
            company =>
                company.company?.name
        )
        .filter(Boolean);
}

function getGenres(game) {
    return (
        game.genres ??
        []
    )
        .map(
            genre =>
                genre.name
        )
        .filter(Boolean);
}

function getReleaseYear(game) {
    if (!game.first_release_date) {
        return null;
    }

    return new Date(
        game.first_release_date * 1000
    ).getUTCFullYear();
}

function transformGame(
    gameInput,
    game
) {
    const developers =
        getDevelopers(game);

    const releaseYear =
        getReleaseYear(game);

    return {
        title:
            game.name,

        developer:
            developers.length
                ? developers.join(", ")
                : null,

        releaseYear,

        completedDate:
            gameInput.completedDate,

        platform:
            gameInput.platform,

        source:
            gameInput.source,

        genres:
            getGenres(game),

        cover:
            null,

        igdbId:
            game.id,

        slug:
            game.slug || null
    };
}

async function processGame(
    gameInput
) {
    const requestedName =
        gameInput.game;

    console.log(
        `\n🔎 ${requestedName}`
    );

    if (
        gameInput.completedDate
    ) {
        console.log(
            `   Concluído em: ${gameInput.completedDate}`
        );
    } else {
        console.log(
            "   ⚠ Data de conclusão não informada"
        );
    }

    if (
        gameInput.platform
    ) {
        console.log(
            `   Plataforma: ${gameInput.platform}`
        );
    } else {
        console.log(
            "   ⚠ Plataforma não informada"
        );
    }

    if (
        gameInput.source
    ) {
        console.log(
            `   Onde jogou: ${gameInput.source}`
        );
    } else {
        console.log(
            "   ⚠ Origem não informada"
        );
    }

    const results =
        await searchGame(
            requestedName
        );

    const game =
        chooseBestResult(
            requestedName,
            results
        );

    if (!game) {
        throw new Error(
            "Jogo não encontrado ou resultado ambíguo"
        );
    }

    console.log(
        `   → IGDB: ${game.name}`
    );

    const result =
        transformGame(
            gameInput,
            game
        );

    const slug =
        slugify(game.name);

    const imagePath =
        path.join(
            COVERS_DIR,
            `${slug}.jpg`
        );

    const coverUrl =
        getCoverUrl(
            game.cover?.image_id
        );

    if (coverUrl) {

        if (
            !fileExists(
                imagePath
            )
        ) {
            console.log(
                "   ↓ Baixando capa..."
            );

            await downloadFile(
                coverUrl,
                imagePath
            );
        } else {
            console.log(
                "   ✓ Capa já existe"
            );
        }

        result.cover =
            `covers/${slug}.jpg`;

    } else {

        console.log(
            "   ⚠ Sem capa na IGDB"
        );
    }

    return result;
}

export async function processGames(
    gameInputs
) {
    const results =
        loadJson(
            GAMES_FILE
        );

    const errors =
        loadJson(
            ERRORS_FILE
        );

    const processedGames =
        new Set(
            results.map(
                game =>
                    getGameKey(game)
            )
        );

    const errorGames =
        new Set(
            errors.map(
                error =>
                    getGameKey(error)
            )
        );

    for (
        let i = 0;
        i < gameInputs.length;
        i++
    ) {
        const gameInput =
            gameInputs[i];

        const gameKey =
            getGameKey(
                gameInput
            );

        console.log(
            `\n[${i + 1}/${gameInputs.length}]`
        );

        if (
            processedGames.has(
                gameKey
            )
        ) {
            console.log(
                `⏭ ${gameInput.game} já está em games.json`
            );

            continue;
        }

        try {

            const game =
                await processGame(
                    gameInput
                );

            results.push(game);

            processedGames.add(
                getGameKey(game)
            );

            saveJson(
                GAMES_FILE,
                results
            );

            console.log(
                "   ✓ Salvo em site/games.json"
            );

        } catch (error) {

            console.error(
                `   ✗ ${error.message}`
            );

            const errorEntry = {

                game:
                    gameInput.game,

                completedDate:
                    gameInput.completedDate,

                platform:
                    gameInput.platform,

                source:
                    gameInput.source,

                sourceRow:
                    gameInput.sourceRow,

                error:
                    error.message,

                date:
                    new Date().toISOString()
            };

            const errorKey =
                getGameKey(
                    errorEntry
                );

            if (
                !errorGames.has(
                    errorKey
                )
            ) {
                errors.push(
                    errorEntry
                );

                errorGames.add(
                    errorKey
                );
            }

            saveJson(
                ERRORS_FILE,
                errors
            );
        }

        await sleep(500);
    }

    console.log(
        "\n================================"
    );

    console.log(
        "Processamento concluído"
    );

    console.log(
        `Jogos salvos: ${results.length}`
    );

    console.log(
        `Erros: ${errors.length}`
    );

    console.log(
        "================================"
    );
}