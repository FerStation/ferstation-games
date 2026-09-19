import fs from "fs";
import path from "path";
import XLSX from "xlsx";

export function loadGames(filePath, originalFileName = null) {
    const extension = path
        .extname(originalFileName || filePath)
        .toLowerCase();

    if (extension === ".txt") {
        return loadTxt(filePath);
    }

    if (extension === ".xlsx" || extension === ".xls") {
        return loadExcel(filePath);
    }

    throw new Error(`Formato não suportado: ${extension}`);
}

/**
 * Valida a data de conclusão.
 *
 * Formatos aceitos:
 *
 * AAAA
 * AAAA-MM
 * AAAA-MM-DD
 * AAAA-AAAA
 */
function validateCompletedDate(value, sourceRow) {
    if (!value) {
        return null;
    }

    const date = String(value).trim();

    // Somente ano
    if (/^\d{4}$/.test(date)) {
        return date;
    }

    // Mês + ano
    if (/^\d{4}-(0[1-9]|1[0-2])$/.test(date)) {
        return date;
    }

    // Dia + mês + ano
    const fullDateMatch =
        date.match(
            /^(\d{4})-(\d{2})-(\d{2})$/
        );

    if (fullDateMatch) {
        const year =
            Number(fullDateMatch[1]);

        const month =
            Number(fullDateMatch[2]);

        const day =
            Number(fullDateMatch[3]);

        const testDate =
            new Date(
                Date.UTC(
                    year,
                    month - 1,
                    day
                )
            );

        if (
            testDate.getUTCFullYear() === year &&
            testDate.getUTCMonth() === month - 1 &&
            testDate.getUTCDate() === day
        ) {
            return date;
        }
    }

    // Intervalo de anos
    const rangeMatch =
        date.match(
            /^(\d{4})-(\d{4})$/
        );

    if (rangeMatch) {
        const startYear =
            Number(rangeMatch[1]);

        const endYear =
            Number(rangeMatch[2]);

        if (startYear <= endYear) {
            return date;
        }
    }

    throw new Error(
        `Data de conclusão inválida na linha ${sourceRow}: "${date}". ` +
        `Use AAAA, AAAA-MM, AAAA-MM-DD ou AAAA-AAAA.`
    );
}

function loadTxt(filePath) {
    const content =
        fs.readFileSync(
            filePath,
            "utf8"
        );

    return content
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)
        .map((line, index) => {

            const [
                game,
                completedDate,
                platform,
                source
            ] =
                line
                    .split("|")
                    .map(value => value.trim());

            if (!game) {
                return null;
            }

            return {
                game,

                completedDate:
                    validateCompletedDate(
                        completedDate,
                        index + 1
                    ),

                platform:
                    platform || null,

                source:
                    source || null,

                sourceRow:
                    index + 1
            };
        })
        .filter(Boolean);
}

function loadExcel(filePath) {
    const workbook =
        XLSX.readFile(filePath);

    const sheet =
        workbook.Sheets[
            workbook.SheetNames[0]
        ];

    const rows =
        XLSX.utils.sheet_to_json(
            sheet,
            {
                defval: ""
            }
        );

    return rows
        .map((row, index) => {

            const game =
                row.game ??
                row.Game ??
                row.nome ??
                row.Nome ??
                row.titulo ??
                row.Titulo ??
                "";

            const completedDate =
                row.completedDate ??
                row.CompletedDate ??
                row.dataZerado ??
                row.DataZerado ??
                row.data_zerado ??
                row.anoZerado ??
                row.AnoZerado ??
                "";

            const platform =
                row.platform ??
                row.Platform ??
                row.plataforma ??
                row.Plataforma ??
                "";

            const source =
                row.source ??
                row.Source ??
                row.origem ??
                row.Origem ??
                "";

            const sourceRow =
                index + 2;

            if (
                !String(game).trim()
            ) {
                return null;
            }

            return {
                game:
                    String(game).trim(),

                completedDate:
                    validateCompletedDate(
                        completedDate,
                        sourceRow
                    ),

                platform:
                    String(platform).trim() ||
                    null,

                source:
                    String(source).trim() ||
                    null,

                sourceRow
            };
        })
        .filter(Boolean);
}