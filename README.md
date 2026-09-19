# FerStation — Portfolio Site + Game Diary Generator

Personal indie portfolio for **FerStation**: a public static site (diary of completed games + indie game projects) and a small admin app that manages the diary data.

The repository has two independent parts:

| Folder       | What it is                                        | Where it runs                     |
| ------------ | ------------------------------------------------- | --------------------------------- |
| `site/`      | Public portfolio site (pure static, no build)     | **GitHub Pages** (only this folder is published) |
| `generator/` | Admin app ("FerStation — Gerenciador") for the diary | Your **VPS** (Node.js)          |

## Repository layout

```
ferstation-games-client/
├── site/                 # Public site — the ONLY folder deployed to GitHub Pages
│   ├── index.html        # Single page (pt-BR/en via JS)
│   ├── games.json        # Timeline data (generated/edited by the generator)
│   ├── covers/           # Game cover images (written by the generator, COMMITTED)
│   ├── css/js/img/icons/ # Styles, scripts, images, favicons
│   └── vendor/           # Self-hosted fonts (JetBrains Mono variable) + subset FontAwesome
├── generator/            # Node.js admin app
│   ├── server.js         # Express 5 server (admin + APIs + serves /site)
│   ├── index.js          # One-shot CLI (same IGDB logic)
│   ├── public/           # Admin UI (index.html, css/admin.css, js/admin.js)
│   ├── src/              # igdb.js · input.js · processor.js · utils.js
│   ├── data/             # games.txt example input for the CLI
│   └── output/           # temp/ + errors.json (git-ignored)
├── .env.example          # TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET template
├── .gitignore
└── README.md / README.pt-BR.md
```

## site/ — Public portfolio

A single-page site with no build step. Features:

- **Timeline** of completed games loaded from `games.json` (159 entries), grouped by year with covers, genres, platform and completion dates.
- **Projects** section with status badges ("PUBLISHED" / "IN PRODUCTION").
- **i18n** pt-BR / EN (persisted in `localStorage`).
- **Dark / Light** theme (CSS variables), also persisted.
- **Accessibility**: focus-visible, `prefers-reduced-motion`, screen-reader font announcements, `aria-busy`, `<noscript>` fallback; all text pairs pass WCAG AA contrast.
- **Performance**: self-hosted fonts — a single JetBrains Mono variable font (`wght` 400–800) — and a hand-subset FontAwesome build (~5 KB, only the glyphs used).
- No external CDNs, works fully offline once served over HTTP.

> Note: `games.json` and `covers/` are produced by the generator, but they are part of the site and **must be committed** (`.gitignore` scopes `output/` to `generator/` only).

## generator/ — Admin ("Gerenciador")

Express 5 application (Node ESM). Dependencies: `express`, `multer`, `xlsx`, `axios`, `dotenv`.

What it does:

- Searches the **IGDB** by name and auto-fills title, developer, release year, genres and cover.
- **Adds / edits / deletes** games manually (`POST/PUT/DELETE /api/games[/:id]`).
- **Imports** a list from TXT or XLSX (drag & drop), with preview and duplicate detection.
- Lets you **upload a custom cover** (`POST /api/games/:id/cover`).
- Writes the result into **`site/games.json`** and downloads covers to **`site/covers/`**.
- Also serves the public site at `GET /site/` (same origin as the admin).

### Setup

```bash
cd generator
cp ../.env.example .env      # fill TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET
npm install
```

Create an app in the [Twitch Developer Console](https://dev.twitch.tv/console/apps) to get the credentials (used to authenticate with IGDB).

### Run

```bash
npm start        # starts the Express admin (default port 3000)
# admin UI → http://localhost:3000/
# site     → http://localhost:3000/site/

npm run cli      # one-shot CLI from generator/data/games.txt (no server)
```

### Input formats (import / CLI)

TXT — one game per line, pipe separated:

```
Game Name|completedDate|platform|source
God of War|2024|PS4|Console
Hollow Knight|2018|PC|Steam
```

Excel — first sheet, columns `game | completedDate | platform | source` (aliases accepted: `nome`, `Nome`, `titulo`, `Titulo`, `Game` for the name; `dataZerado`, `AnoZerado`, `...` for the date; `plataforma`, `origem`, ... for platform/source).

`completedDate` accepts either `YYYY`, `YYYY-MM`, `YYYY-MM-DD` or a range `YYYY-YYYY`.

## Deployment

### site/ → GitHub Pages

Only the **`site/`** folder is published. Two options:

**Option A — Pages settings (no workflow):**
`Settings → Pages → Source: Deploy from a branch → Branch: main → Folder: /site`.

**Option B — GitHub Actions (recommended if you want deploys only when the site changes):**

```yaml
# .github/workflows/deploy-pages.yml
name: Deploy site to Pages
on:
  push:
    branches: [main]
    paths: ["site/**"]
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/upload-pages-artifact@v3
        with: { path: "site" }
      - id: deployment
        uses: actions/deploy-pages@v4
```

Optional: set the custom domain `ferstation.com.br` in `Settings → Pages` (the `og:image`, `canonical` and `sitemap` already use the absolute `https://ferstation.com.br/` URL).

**The usual update flow:** edit games in the generator → commit `site/games.json` (and any new/changed files under `site/covers/`) → push to `main` → Pages rebuilds automatically.

### generator/ → VPS

The generator must run where it can write `site/games.json` and `site/covers/`, so clone the repo on the VPS and run it with a process manager:

```bash
cd ferstation-games-client/generator
npm ci
npm start          # or: pm2 start server.js --name ferstation-generator
```

Expose it behind nginx with HTTPS (example):

```nginx
server {
    listen 443 ssl;
    server_name ferstation.com.br;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

After every change, commit `site/**` from the VPS working copy (or push from your local machine) so Pages picks the new data up.

## Git notes

- `.env` (real Twitch credentials) is ignored — copy from `.env.example`.
- `node_modules/` and `generator/output/` are ignored.
- **`site/covers/` is committed on purpose** — without it the Pages site has no cover images.