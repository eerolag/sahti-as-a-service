# Sahti as a Service

Cloudflare Worker + D1 + R2 -sovellus oluiden pisteyttämiseen pelimuodossa.

Uusi arkkitehtuuri:
- `src/worker`: API-reitit, handlerit, palvelut ja repositoryt
- `src/shared`: framework-agnostinen domain-logiikka ja API-tyypit
- `src/web`: React + Tailwind -käyttöliittymä

## Projektirakenne

```txt
.
├── src
│   ├── worker
│   │   ├── index.ts
│   │   ├── router.ts
│   │   ├── env.ts
│   │   ├── http.ts
│   │   ├── handlers/
│   │   ├── repositories/
│   │   └── services/
│   ├── shared/
│   └── web/
├── tests
│   ├── api/
│   └── shared/
├── migrations/
├── wrangler.jsonc
├── vite.config.ts
├── tailwind.config.ts
├── vitest.config.ts
└── tsconfig.json
```

## Teknologiat

- Cloudflare Workers
- Cloudflare D1 (SQLite)
- Cloudflare R2
- TypeScript
- React
- Tailwind CSS
- Vite
- Vitest
- qrcode

## Vaatimukset

- Node.js 18+ (suositus: 20+)
- npm
- Cloudflare-tili + Wrangler-login

## API-avaimet (valinnainen)

Sovellus toimii ilman ulkoisia avaimia:
- ilman Brave-avainta internet-kuvahaku palauttaa `503`
- ilman Untappd-avaimia oluille tallennetaan automaattinen Untappd-hakulinkki

Aseta halutessa:

```bash
npx wrangler secret put BRAVE_SEARCH_API_KEY
npx wrangler secret put UNTAPPD_CLIENT_ID
npx wrangler secret put UNTAPPD_CLIENT_SECRET
```

## R2-kuvabucket (pakollinen kuvatiedostoille)

Kuvatiedostot ladataan R2:een ja tarjoillaan Workerin kautta endpointista `/api/images/:key`.

Luo bucket (vähintään kerran per ympäristö):

```bash
npx wrangler r2 bucket create sahti-as-a-service-images
```

`wrangler.jsonc` käyttää bindingia:
- `IMAGES_BUCKET` -> `sahti-as-a-service-images`

## Kehitys

1. Asenna riippuvuudet:

```bash
npm install
```

2. Aja D1-migraatiot paikalliseen kantaan:

```bash
npx wrangler d1 migrations apply sahti-as-a-service-db --local
```

3. Käynnistä kehitys:

```bash
npm run dev
```

Tämä käynnistää:
- `npm run dev:web` -> build-watch `dist/web`-kansioon
- `npm run dev:worker` -> `wrangler dev`

4. Avaa selaimessa:

```txt
http://127.0.0.1:8787
```

## Build, test ja tyypitys

```bash
npm run test
npm run typecheck
npm run build
npm run deploy:worker
```

## Deploy

1. Aja migraatiot etäkantaan:

```bash
npx wrangler d1 migrations apply sahti-as-a-service-db --remote
```

2. Rakenna web-assetit:

```bash
npm run build:web
```

3. Julkaise Worker:

```bash
npm run deploy:worker
```

## Auto deploy GitHub pushista

Repoon on lisätty GitHub Actions workflow:
- [deploy-worker.yml](/Users/anttieerola/Documents/GitHub/sahti-as-a-service/.github/workflows/deploy-worker.yml)

Se ajaa `push`-eventillä (`main` / `master`):
1. `npm ci`
2. `npm test`
3. `npm run deploy:worker`

Jotta workflow voi deployata Cloudflareen, lisää GitHub-repoon `Settings -> Secrets and variables -> Actions`:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

## API-päätepisteet

- `POST /api/create-game`
- `GET /api/games/:id`
- `PUT /api/games/:id`
- `POST /api/games/:id/ratings` (body: `clientId`, `ratings`, optional `nickname`; ratingissä valinnainen `comment`, max 255 merkkiä)
- `GET /api/games/:id/ratings?clientId=...` (tekninen tunniste omien arvosanojen hakuun)
- `GET /api/games/:id/results`
- `GET /api/image-search?q=<query>&count=<1-12>`
- `POST /api/images/upload` (`multipart/form-data`, kenttä `file`, max 10 MB; UI validoi lisäksi max 6000x6000 px)
- `GET /api/images/:key`
- `GET /api/qr?url=<http/https-url-encoded>`

Vastauskentät ovat taaksepäin yhteensopivat aiemman version kanssa.

## Lisenssi

MIT, katso `LICENSE`.
