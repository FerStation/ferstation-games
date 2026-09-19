# FerStation — Site de Portfólio + Gerador do Diário de Games

Portfólio indie do **FerStation**: um site público estático (diário de jogos zerados + projetos de jogos) e um pequeno app administrativo que gerencia os dados do diário.

O repositório tem duas partes independentes:

| Pasta        | O que é                                              | Onde roda                          |
| ------------ | ---------------------------------------------------- | ---------------------------------- |
| `site/`      | Site público de portfólio (100% estático, sem build) | **GitHub Pages** (só esta pasta é publicada) |
| `generator/` | App administrativo ("FerStation — Gerenciador") do diário | Seu **VPS** (Node.js)         |

## Estrutura do repositório

```
ferstation-games-client/
├── site/                 # Site público — ÚNICA pasta publicada no GitHub Pages
│   ├── index.html        # Página única (pt-BR/en via JS)
│   ├── games.json        # Dados da timeline (gerados/editados pelo generator)
│   ├── covers/           # Capas dos jogos (escritas pelo generator, SÃO COMMITADAS)
│   ├── css/js/img/icons/ # Estilos, scripts, imagens, favicons
│   └── vendor/           # Fontes locais (JetBrains Mono variável) + FontAwesome subsetado
├── generator/            # App administrativo Node.js
│   ├── server.js         # Servidor Express 5 (admin + APIs + serve /site)
│   ├── index.js          # CLI de execução única (mesma lógica da IGDB)
│   ├── public/           # UI do admin (index.html, css/admin.css, js/admin.js)
│   ├── src/              # igdb.js · input.js · processor.js · utils.js
│   ├── data/             # games.txt de exemplo para a CLI
│   └── output/           # temp/ + errors.json (ignorados pelo git)
├── .env.example          # template TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET
├── .gitignore
└── README.md / README.pt-BR.md
```

## site/ — Portfólio público

Site de página única, sem etapa de build. Recursos:

- **Timeline** de jogos zerados carregada de `games.json` (159 jogos), agrupada por ano, com capas, gêneros, plataforma e data de conclusão.
- Seção de **projetos** com badges de status ("PUBLICADO" / "EM PRODUÇÃO").
- **i18n** pt-BR / EN (persistido em `localStorage`).
- **Temas** claro/escuro (CSS variables), também persistidos.
- **Acessibilidade**: focus-visible, `prefers-reduced-motion`, anúncio de tamanho de fonte para leitores de tela, `aria-busy`, fallback `<noscript>`; todos os pares de texto passam em contraste WCAG AA.
- **Performance**: fontes locais — uma única fonte variável JetBrains Mono (`wght` 400–800) — e um build do FontAwesome sob medida (~5 KB, só os glifos usados).
- Sem CDNs externas, funciona offline total desde que servido via HTTP.

> Nota: `games.json` e `covers/` são produzidos pelo generator, mas fazem parte do site e **devem ser commitados** (o `.gitignore` limita `output/` apenas a `generator/`).

## generator/ — Admin ("Gerenciador")

Aplicação Express 5 (Node ESM). Dependências: `express`, `multer`, `xlsx`, `axios`, `dotenv`.

O que ele faz:

- Busca na **IGDB** pelo nome e preenche automaticamente título, desenvolvedora, ano, gêneros e capa.
- **Adiciona / edita / exclui** jogos manualmente (`POST/PUT/DELETE /api/games[/:id]`).
- **Importa** uma lista de TXT ou XLSX (arrastar e soltar), com pré-visualização e detecção de duplicados.
- Permite **enviar capa personalizada** (`POST /api/games/:id/cover`).
- Grava o resultado em **`site/games.json`** e baixa as capas para **`site/covers/`**.
- Também serve o site público em `GET /site/` (mesma origem do admin).

### Configuração

```bash
cd generator
cp ../.env.example .env      # preencha TWITCH_CLIENT_ID e TWITCH_CLIENT_SECRET
npm install
```

Crie um app no [Twitch Developer Console](https://dev.twitch.tv/console/apps) para obter as credenciais (usadas para autenticar na IGDB).

### Executar

```bash
npm start        # inicia o Express (admin na porta padrão 3000)
# admin → http://localhost:3000/
# site  → http://localhost:3000/site/

npm run cli      # CLI de execução única a partir de generator/data/games.txt (sem servidor)
```

### Formatos de entrada (importação / CLI)

TXT — um jogo por linha, separado por pipe:

```
Nome do Jogo|completedDate|platform|source
God of War|2024|PS4|Console
Hollow Knight|2018|PC|Steam
```

Excel — primeira planilha, colunas `game | completedDate | platform | source` (aceita aliases: `nome`, `Nome`, `titulo`, `Titulo`, `Game` para o jogo; `dataZerado`, `AnoZerado`, ... para a data; `plataforma`, `origem`, ... para platform/source).

`completedDate` aceita `AAAA`, `AAAA-MM`, `AAAA-MM-DD` ou intervalo `AAAA-AAAA`.

## Deploy

### site/ → GitHub Pages

Apenas a pasta **`site/`** é publicada. Duas opções:

**Opção A — nas configurações do Pages (sem workflow):**
`Settings → Pages → Source: Deploy from a branch → Branch: main → Folder: /site`.

**Opção B — GitHub Actions (recomendado se quiser deploy só quando o site muda):**

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

Opcional: configure o domínio `ferstation.com.br` em `Settings → Pages` (o `og:image`, `canonical` e `sitemap` já usam a URL absoluta `https://ferstation.com.br/`).

**Fluxo usual de atualização:** edite os jogos no generator → commite `site/games.json` (e qualquer arquivo novo/alterado em `site/covers/`) → push para `main` → Pages reconstrói automaticamente.

### generator/ → VPS

O generator precisa rodar onde ele possa escrever em `site/games.json` e `site/covers/`, então clone o repositório no VPS e rode com um gerenciador de processos:

```bash
cd ferstation-games-client/generator
npm ci
npm start          # ou: pm2 start server.js --name ferstation-generator
```

Exponha atrás de um nginx com HTTPS (exemplo):

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

Após cada alteração, commite `site/**` a partir da cópia no VPS (ou faça push da sua máquina) para o Pages publicar os dados novos.

## Notas sobre o Git

- `.env` (credenciais reais da Twitch) é ignorado — copie de `.env.example`.
- `node_modules/` e `generator/output/` são ignorados.
- **`site/covers/` é commitado de propósito** — sem ele, o site no Pages fica sem as capas.