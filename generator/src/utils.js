import fs from "fs";

export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function slugify(text) {
    return String(text)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

export function ensureDirectory(directory) {
    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
    }
}

export function fileExists(filePath) {
    return fs.existsSync(filePath);
}

export async function downloadFile(url, destination) {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Erro ao baixar imagem: HTTP ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.promises.writeFile(destination, buffer);
}

export function saveJson(filePath, data) {
    fs.writeFileSync(
        filePath,
        JSON.stringify(data, null, 2),
        "utf8"
    );
}
