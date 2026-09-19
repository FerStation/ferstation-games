import axios from "axios";

const TWITCH_TOKEN_URL =
    "https://id.twitch.tv/oauth2/token";

const IGDB_URL =
    "https://api.igdb.com/v4";

let accessToken = null;
let tokenExpiresAt = 0;

async function getAccessToken() {
    const now = Date.now();

    if (accessToken && now < tokenExpiresAt) {
        return accessToken;
    }

    const response = await axios.post(
        TWITCH_TOKEN_URL,
        null,
        {
            params: {
                client_id:
                    process.env.TWITCH_CLIENT_ID,

                client_secret:
                    process.env.TWITCH_CLIENT_SECRET,

                grant_type:
                    "client_credentials"
            },

            timeout: 15000
        }
    );

    accessToken =
        response.data.access_token;

    tokenExpiresAt =
        now +
        Math.max(
            response.data.expires_in - 300,
            60
        ) *
            1000;

    return accessToken;
}

async function igdbRequest(
    endpoint,
    query,
    attempt = 1
) {
    const token =
        await getAccessToken();

    try {
        const response = await axios.post(
            `${IGDB_URL}/${endpoint}`,
            query,
            {
                headers: {
                    "Client-ID":
                        process.env.TWITCH_CLIENT_ID,

                    "Authorization":
                        `Bearer ${token}`,

                    "Accept":
                        "application/json",

                    "Content-Type":
                        "text/plain"
                },

                timeout: 30000
            }
        );

        return response.data;
    } catch (error) {
        const status =
            error.response?.status;

        if (
            status === 401 &&
            attempt === 1
        ) {
            accessToken = null;
            tokenExpiresAt = 0;

            return igdbRequest(
                endpoint,
                query,
                2
            );
        }

        if (
            (
                status === 429 ||
                status >= 500 ||
                !status
            ) &&
            attempt < 4
        ) {
            const delay =
                attempt * 2000;

            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        delay
                    )
            );

            return igdbRequest(
                endpoint,
                query,
                attempt + 1
            );
        }

        throw error;
    }
}

function escapeQuery(value) {
    return String(value)
        .replace(/\\/g, "\\\\")
        .replace(/"/g, '\\"');
}

export async function searchGame(name) {
    const query = `
        search "${escapeQuery(name)}";

        fields
            id,
            name,
            slug,
            first_release_date,
            genres.name,
            cover.image_id,
            involved_companies.company.name,
            involved_companies.developer,
            version_parent;

        where version_parent = null;

        limit 10;
    `;

    return igdbRequest(
        "games",
        query
    );
}

export async function getGameById(id) {
    const numericId =
        Number(id);

    if (
        !Number.isInteger(numericId) ||
        numericId <= 0
    ) {
        throw new Error(
            "ID da IGDB inválido."
        );
    }

    const query = `
        fields
            id,
            name,
            slug,
            first_release_date,
            genres.name,
            cover.image_id,
            involved_companies.company.name,
            involved_companies.developer,
            version_parent;

        where
            id = ${numericId}
            & version_parent = null;

        limit 1;
    `;

    const results =
        await igdbRequest(
            "games",
            query
        );

    return results[0] || null;
}

export function getCoverUrl(imageId) {
    if (!imageId) {
        return null;
    }

    return (
        "https://images.igdb.com/" +
        "igdb/image/upload/" +
        "t_cover_big_2x/" +
        `${imageId}.jpg`
    );
}