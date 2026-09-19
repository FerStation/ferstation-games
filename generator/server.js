import "dotenv/config";

import express from "express";
import multer from "multer";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import {
    searchGame,
    getGameById,
    getCoverUrl
} from "./src/igdb.js";

import {
    loadGames
} from "./src/input.js";

import {
    downloadFile,
    ensureDirectory,
    fileExists,
    saveJson,
    slugify
} from "./src/utils.js";

import {
    processGames
} from "./src/processor.js";


// =========================================================
// PATHS
// =========================================================

const __filename =
    fileURLToPath(import.meta.url);

const __dirname =
    path.dirname(__filename);

const GENERATOR_DIR =
    __dirname;

const PROJECT_DIR =
    path.resolve(
        GENERATOR_DIR,
        ".."
    );

const SITE_DIR =
    path.join(
        PROJECT_DIR,
        "site"
    );

const PUBLIC_DIR =
    path.join(
        GENERATOR_DIR,
        "public"
    );

const COVERS_DIR =
    path.join(
        SITE_DIR,
        "covers"
    );

const GAMES_FILE =
    path.join(
        SITE_DIR,
        "games.json"
    );

const TEMP_DIR =
    path.join(
        GENERATOR_DIR,
        "output",
        "temp"
    );


ensureDirectory(
    COVERS_DIR
);

ensureDirectory(
    TEMP_DIR
);


// =========================================================
// EXPRESS
// =========================================================

const app =
    express();

const PORT =
    Number(
        process.env.PORT
    ) || 3000;


app.use(
    express.json({
        limit: "10mb"
    })
);


// =========================================================
// ARQUIVOS DO GERENCIADOR
// =========================================================

app.use(
    express.static(
        PUBLIC_DIR
    )
);


// =========================================================
// DIÁRIO PÚBLICO
// =========================================================

app.use(
    "/site",
    express.static(
        SITE_DIR
    )
);


// =========================================================
// MULTER
// =========================================================

const upload =
    multer({
        dest: TEMP_DIR,

        limits: {
            fileSize:
                20 * 1024 * 1024
        }
    });


// =========================================================
// HELPERS
// =========================================================

function readGames() {
    if (
        !fs.existsSync(
            GAMES_FILE
        )
    ) {
        return [];
    }

    try {
        const content =
            fs.readFileSync(
                GAMES_FILE,
                "utf8"
            );

        const games =
            JSON.parse(
                content
            );

        return Array.isArray(
            games
        )
            ? games
            : [];

    } catch (error) {
        console.error(
            "Erro ao ler games.json:",
            error
        );

        throw new Error(
            "games.json está inválido."
        );
    }
}


function writeGames(
    games
) {
    ensureDirectory(
        path.dirname(
            GAMES_FILE
        )
    );

    saveJson(
        GAMES_FILE,
        games
    );
}


function normalize(
    value
) {
    return String(
        value ?? ""
    )
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


// =========================================================
// IGDB MATCHING
// =========================================================

function calculateMatchScore(
    requested,
    result
) {
    const a =
        normalize(
            requested
        );

    const b =
        normalize(
            result.name
        );

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

    for (
        const word of wordsA
    ) {
        if (
            wordsB.has(word)
        ) {
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
    if (
        !results.length
    ) {
        return null;
    }

    return results
        .map(
            game => ({
                game,

                score:
                    calculateMatchScore(
                        requested,
                        game
                    )
            })
        )
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


// =========================================================
// IGDB DATA HELPERS
// =========================================================

function getDevelopers(
    game
) {
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


function getGenres(
    game
) {
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


function getReleaseYear(
    game
) {
    if (
        !game.first_release_date
    ) {
        return null;
    }

    return new Date(
        game.first_release_date *
            1000
    ).getUTCFullYear();
}


// =========================================================
// RECORD IDS
// =========================================================

function createRecordId() {
    return crypto.randomUUID();
}


/*
 * Chave usada para detectar duplicidade
 * durante a criação/importação.
 */
function getGameKey(
    game
) {
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


/*
 * Localiza jogos novos e também
 * registros de versões anteriores
 * do sistema.
 */
function findGameIndexById(
    games,
    recordId
) {
    const id =
        String(
            recordId
        );

    return games.findIndex(
        game =>
            String(
                game.recordId ??
                ""
            ) === id ||

            String(
                game.id ??
                ""
            ) === id ||

            String(
                game.igdbId ??
                ""
            ) === id
    );
}


function findGameByRecordId(
    games,
    recordId
) {
    const index =
        findGameIndexById(
            games,
            recordId
        );

    if (
        index === -1
    ) {
        return null;
    }

    return games[index];
}


// =========================================================
// TRANSFORMAÇÃO IGDB → REGISTRO DO SITE
// =========================================================

function transformIgdbGame(
    input,
    game
) {
    return {
        recordId:
            createRecordId(),

        title:
            game.name,

        developer:
            getDevelopers(
                game
            ).length
                ? getDevelopers(
                    game
                ).join(", ")
                : null,

        releaseYear:
            getReleaseYear(
                game
            ),

        completedDate:
            input.completedDate ||
            null,

        platform:
            input.platform ||
            null,

        source:
            input.source ||
            null,

        genres:
            getGenres(
                game
            ),

        cover:
            null,

        igdbId:
            game.id,

        slug:
            game.slug ||
            null
    };
}


// =========================================================
// CAPAS
// =========================================================

async function saveCoverForGame(
    game
) {
    const coverUrl =
        getCoverUrl(
            game.cover?.image_id
        );

    if (!coverUrl) {
        return null;
    }

    const slug =
        slugify(
            game.name
        );

    const imagePath =
        path.join(
            COVERS_DIR,
            `${slug}.jpg`
        );

    if (
        !fileExists(
            imagePath
        )
    ) {
        await downloadFile(
            coverUrl,
            imagePath
        );
    }

    return `covers/${slug}.jpg`;
}


// =========================================================
// DATA DE CONCLUSÃO
// =========================================================

function validateCompletedDate(
    value
) {
    if (!value) {
        return null;
    }

    const date =
        String(
            value
        ).trim();


    // AAAA

    if (
        /^\d{4}$/.test(
            date
        )
    ) {
        return date;
    }


    // AAAA-MM

    if (
        /^\d{4}-(0[1-9]|1[0-2])$/
            .test(date)
    ) {
        return date;
    }


    // AAAA-MM-DD

    const fullDate =
        date.match(
            /^(\d{4})-(\d{2})-(\d{2})$/
        );

    if (fullDate) {
        const year =
            Number(
                fullDate[1]
            );

        const month =
            Number(
                fullDate[2]
            );

        const day =
            Number(
                fullDate[3]
            );

        const testDate =
            new Date(
                Date.UTC(
                    year,
                    month - 1,
                    day
                )
            );

        if (
            testDate.getUTCFullYear() ===
                year &&

            testDate.getUTCMonth() ===
                month - 1 &&

            testDate.getUTCDate() ===
                day
        ) {
            return date;
        }
    }


    // AAAA-AAAA

    const range =
        date.match(
            /^(\d{4})-(\d{4})$/
        );

    if (range) {
        const start =
            Number(
                range[1]
            );

        const end =
            Number(
                range[2]
            );

        if (
            start <= end
        ) {
            return date;
        }
    }


    throw new Error(
        `Data de conclusão inválida: "${date}". ` +
        "Use AAAA, AAAA-MM, AAAA-MM-DD ou AAAA-AAAA."
    );
}


// =========================================================
// API — LIST GAMES
// =========================================================

app.get(
    "/api/games",
    (req, res) => {
        try {
            const games =
                readGames();

            res.json(
                games
            );

        } catch (error) {
            console.error(
                error
            );

            res.status(500).json({
                error:
                    error.message
            });
        }
    }
);


// =========================================================
// API — SEARCH IGDB
// =========================================================

app.get(
    "/api/search",
    async (
        req,
        res
    ) => {
        const query =
            String(
                req.query.q ??
                ""
            ).trim();

        if (!query) {
            return res.status(
                400
            ).json({
                error:
                    "Informe um termo de busca."
            });
        }

        try {
            const results =
                await searchGame(
                    query
                );

            const games =
                results.map(
                    game => ({
                        id:
                            game.id,

                        name:
                            game.name,

                        developer:
                            getDevelopers(
                                game
                            ).join(
                                ", "
                            ) || null,

                        releaseYear:
                            getReleaseYear(
                                game
                            ),

                        genres:
                            getGenres(
                                game
                            ),

                        coverUrl:
                            getCoverUrl(
                                game.cover
                                    ?.image_id
                            ),

                        slug:
                            game.slug ||
                            null
                    })
                );

            res.json({
                results:
                    games
            });

        } catch (error) {
            console.error(
                "Erro na busca IGDB:",
                error
            );

            res.status(500).json({
                error:
                    error.message
            });
        }
    }
);


// =========================================================
// API — ADD GAME
// =========================================================

app.post(
    "/api/games",
    async (
        req,
        res
    ) => {
        try {
            const {
                igdbId,
                completedDate,
                platform,
                source
            } = req.body;


            if (!igdbId) {
                return res.status(
                    400
                ).json({
                    error:
                        "igdbId é obrigatório."
                });
            }


            const validDate =
                validateCompletedDate(
                    completedDate
                );


            const games =
                readGames();


            const igdbGame =
                await getGameById(
                    igdbId
                );


            if (!igdbGame) {
                return res.status(
                    404
                ).json({
                    error:
                        "Jogo não encontrado na IGDB."
                });
            }


            const input = {
                game:
                    igdbGame.name,

                completedDate:
                    validDate,

                platform:
                    platform ||
                    null,

                source:
                    source ||
                    null
            };


            const duplicate =
                games.find(
                    game =>
                        getGameKey(
                            game
                        ) ===
                        getGameKey(
                            input
                        )
                );


            if (duplicate) {
                return res.status(
                    409
                ).json({
                    error:
                        "Esse jogo já está cadastrado " +
                        "com a mesma data, plataforma e origem.",

                    game:
                        duplicate
                });
            }


            const newGame =
                transformIgdbGame(
                    input,
                    igdbGame
                );


            newGame.cover =
                await saveCoverForGame(
                    igdbGame
                );


            games.push(
                newGame
            );


            writeGames(
                games
            );


            res.status(
                201
            ).json({
                game:
                    newGame
            });

        } catch (error) {
            console.error(
                "Erro ao adicionar jogo:",
                error
            );

            res.status(500).json({
                error:
                    error.message
            });
        }
    }
);


// =========================================================
// API — EDIT GAME
// =========================================================

app.put(
    "/api/games/:recordId",
    async (
        req,
        res
    ) => {
        try {
            const {
                recordId
            } = req.params;


            const games =
                readGames();


            const index =
                findGameIndexById(
                    games,
                    recordId
                );


            if (
                index === -1
            ) {
                return res.status(
                    404
                ).json({
                    error:
                        "Jogo não encontrado."
                });
            }


            const current =
                games[index];


            const {
                title,
                developer,
                releaseYear,
                completedDate,
                platform,
                source,
                genres
            } = req.body;


            const validDate =
                validateCompletedDate(
                    completedDate
                );


            const updated = {
                ...current,

                title:
                    title?.trim() ||
                    current.title,

                developer:
                    developer?.trim() ||
                    null,

                releaseYear:
                    releaseYear
                        ? Number(
                            releaseYear
                        )
                        : null,

                completedDate:
                    validDate,

                platform:
                    platform?.trim() ||
                    null,

                source:
                    source?.trim() ||
                    null,

                genres:
                    Array.isArray(
                        genres
                    )
                        ? genres
                        : []
            };


            /*
             * Garante que registros antigos
             * passem a ter recordId.
             */
            if (
                !updated.recordId
            ) {
                updated.recordId =
                    createRecordId();
            }


            games[index] =
                updated;


            writeGames(
                games
            );


            res.json({
                game:
                    updated
            });

        } catch (error) {
            console.error(
                "Erro ao editar jogo:",
                error
            );

            res.status(500).json({
                error:
                    error.message
            });
        }
    }
);


// =========================================================
// API — DELETE GAME
// =========================================================

app.delete(
    "/api/games/:recordId",
    (
        req,
        res
    ) => {
        try {
            const {
                recordId
            } = req.params;


            const games =
                readGames();


            const index =
                findGameIndexById(
                    games,
                    recordId
                );


            if (
                index === -1
            ) {
                return res.status(
                    404
                ).json({
                    error:
                        "Jogo não encontrado."
                });
            }


            const [
                removed
            ] =
                games.splice(
                    index,
                    1
                );


            writeGames(
                games
            );


            res.json({
                success:
                    true,

                game:
                    removed
            });

        } catch (error) {
            console.error(
                "Erro ao excluir jogo:",
                error
            );

            res.status(500).json({
                error:
                    error.message
            });
        }
    }
);


// =========================================================
// API — CHANGE COVER
// =========================================================

app.post(
    "/api/games/:recordId/cover",
    upload.single(
        "cover"
    ),
    async (
        req,
        res
    ) => {
        try {
            const {
                recordId
            } = req.params;


            if (!req.file) {
                return res.status(
                    400
                ).json({
                    error:
                        "Nenhuma imagem foi enviada."
                });
            }


            const games =
                readGames();


            const index =
                findGameIndexById(
                    games,
                    recordId
                );


            if (
                index === -1
            ) {
                return res.status(
                    404
                ).json({
                    error:
                        "Jogo não encontrado."
                });
            }


            const game =
                games[index];


            const extension =
                path.extname(
                    req.file.originalname
                ).toLowerCase() ||
                ".jpg";


            const safeExtension =
                [
                    ".jpg",
                    ".jpeg",
                    ".png",
                    ".webp"
                ].includes(
                    extension
                )
                    ? extension
                    : ".jpg";


            const slug =
                slugify(
                    game.title
                );


            const filename =
                `${slug}-${game.recordId}${safeExtension}`;


            const destination =
                path.join(
                    COVERS_DIR,
                    filename
                );


            fs.renameSync(
                req.file.path,
                destination
            );


            game.cover =
                `covers/${filename}`;


            /*
             * Garante que registros antigos
             * tenham recordId depois de
             * receberem uma capa.
             */
            if (
                !game.recordId
            ) {
                game.recordId =
                    createRecordId();
            }


            writeGames(
                games
            );


            res.json({
                success:
                    true,

                cover:
                    game.cover,

                game:
                    game
            });

        } catch (error) {
            console.error(
                "Erro ao alterar capa:",
                error
            );


            if (
                req.file?.path &&
                fs.existsSync(
                    req.file.path
                )
            ) {
                fs.unlinkSync(
                    req.file.path
                );
            }


            res.status(500).json({
                error:
                    error.message
            });
        }
    }
);


// =========================================================
// API — IMPORT PREVIEW
// =========================================================

app.post(
    "/api/import/preview",
    upload.single(
        "file"
    ),
    (
        req,
        res
    ) => {
        try {
            if (!req.file) {
                return res.status(
                    400
                ).json({
                    error:
                        "Nenhum arquivo foi enviado."
                });
            }


            /*
             * IMPORTANTE:
             * O Multer salva o arquivo temporário
             * sem extensão. Por isso enviamos
             * também o nome original.
             */
            const rows =
                loadGames(
                    req.file.path,
                    req.file.originalname
                );


            fs.unlinkSync(
                req.file.path
            );


            res.json({
                rows
            });

        } catch (error) {

            if (
                req.file?.path &&
                fs.existsSync(
                    req.file.path
                )
            ) {
                fs.unlinkSync(
                    req.file.path
                );
            }


            console.error(
                "Erro no preview:",
                error
            );


            res.status(400).json({
                error:
                    error.message
            });
        }
    }
);


// =========================================================
// API — IMPORT
// =========================================================

app.post(
    "/api/import",
    async (
        req,
        res
    ) => {
        try {
            const rows =
                req.body?.games;


            if (
                !Array.isArray(
                    rows
                )
            ) {
                return res.status(
                    400
                ).json({
                    error:
                        "Nenhuma lista de jogos foi enviada."
                });
            }


            await processGames(
                rows
            );


            const games =
                readGames();


            res.json({
                success:
                    true,

                message:
                    "Importação concluída.",

                total:
                    games.length
            });

        } catch (error) {
            console.error(
                "Erro na importação:",
                error
            );


            res.status(500).json({
                error:
                    error.message
            });
        }
    }
);


// =========================================================
// FALLBACK
// =========================================================

app.get(
    "/",
    (
        req,
        res
    ) => {
        res.sendFile(
            path.join(
                PUBLIC_DIR,
                "index.html"
            )
        );
    }
);


// =========================================================
// ERROR HANDLER
// =========================================================

app.use(
    (
        error,
        req,
        res,
        next
    ) => {
        console.error(
            "Erro não tratado:",
            error
        );


        res.status(
            500
        ).json({
            error:
                error.message ||
                "Erro interno do servidor."
        });
    }
);


// =========================================================
// START
// =========================================================

app.listen(
    PORT,
    () => {
        console.log("");

        console.log(
            "========================================"
        );

        console.log(
            " FerStation — Gerenciador"
        );

        console.log(
            "========================================"
        );

        console.log(
            `Gerenciador: http://localhost:${PORT}/`
        );

        console.log(
            `Diário:      http://localhost:${PORT}/site/`
        );

        console.log(
            `API:         http://localhost:${PORT}/api/games`
        );

        console.log(
            "========================================"
        );

        console.log("");
    }
);
