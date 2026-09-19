import "dotenv/config";
import fs from "fs";

import path from "path";
import { fileURLToPath } from "url";

import { loadGames } from "./src/input.js";
import { processGames } from "./src/processor.js";

async function main() {
    if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET) {
        console.error("TWITCH_CLIENT_ID e TWITCH_CLIENT_SECRET precisam estar no .env");
        process.exit(1);
    }

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const inputFile =
        process.argv[2] ||
        path.join(__dirname, "data", "games.txt");

    if (!fs.existsSync(inputFile)) {
        console.error(`Arquivo não encontrado: ${inputFile}`);
        process.exit(1);
    }

    const games = loadGames(inputFile);

    console.log(`Arquivo: ${inputFile}`);
    console.log(`Jogos encontrados: ${games.length}`);

    if (!games.length) {
        console.log("Nenhum jogo encontrado.");
        return;
    }

    await processGames(games);
}

main().catch((error) => {
    console.error("\nErro fatal:", error.message);
    process.exit(1);
});
