# Breview

Breview on tuotantoon rakennettava web-, iOS- ja Android-sovellus oluiden arviointipeleihin.

Tuotantodomain: `https://breview.ing`

Uusi arkkitehtuuri:
- `src/worker`: API-reitit, handlerit, palvelut ja repositoryt
- `src/shared`: framework-agnostinen domain-logiikka ja API-tyypit
- `src/web`: React + Tailwind -käyttöliittymä

## Agent workflow

Ennen toteutustyötä jokaisen agentin pitää lukea:
- `plans/implementation-plan.md`
- `plans/roadmap.md`

Agentin pitää päivittää plans-dokumentit samassa muutoksessa, jos työn aikana muuttuu jokin seuraavista:
- tuotteen tavoite tai rajaus
- arkkitehtuuri tai käytettävät palvelut
- release-, store- tai deploy-polku
- toteutuksen vaiheistus, status tai hyväksymiskriteerit

Älä jätä plans-dokumentteja vanhentuneiksi suhteessa koodiin tai READMEhen.

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
├── plans/
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
- Cloudflare Workers AI
- Cloudflare Email Service
- TypeScript
- React
- Tailwind CSS
- shadcn/ui (webin tuotantosuunta)
- Expo + AniUI (mobiilin tuotantosuunta)
- Vite
- Vitest
- qrcode

## Vaatimukset

- Node.js 18+ (suositus: 20+)
- npm
- Cloudflare-tili + Wrangler-login

## API-avaimet ja bindingit

Nykyinen Worker toimii ilman ulkoisia avaimia:
- ilman Cloudflare Workers AI -bindingia kuvatunnistus palauttaa `503`
- Untappd toimii pelkkänä ulkoisena hakulinkkinä eikä tarvitse avaimia

Kuvatunnistus käyttää Cloudflare Workers AI -bindingia `AI` ja aloittaa mallilla `@cf/google/gemma-4-26b-a4b-it`. Tuotantosuunnassa kirjautumissähköpostit siirretään Cloudflare Email Service -bindingiin. Untappd-integraatio on pelkkä käyttäjälle näkyvä ulkoinen hakulinkki, ei API-kutsu. Katso tarkempi vaiheistus plans-dokumenteista.

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
- `POST /api/images/upload` (`multipart/form-data`, kenttä `file`, max 10 MB; UI validoi lisäksi max 6000x6000 px)
- `POST /api/images/identify-beer-name` (`multipart/form-data`, kenttä `file`; palauttaa tunnistetun oluen nimen tai virheen)
- `GET /api/images/:key`
- `GET /api/qr?url=<http/https-url-encoded>`

Pääpelin vastauskentät ovat taaksepäin yhteensopivat aiemman version kanssa.

## Lisenssi

MIT, katso `LICENSE`.
