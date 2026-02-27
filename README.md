# Sahti as a Service

Cloudflare Worker + D1 -pohjainen sovellus oluiden pisteyttämiseen pelimuodossa.
Sovellus tarjoaa sekä käyttöliittymän että API:n saman Workerin kautta.

## Ominaisuudet

- Luo uusi peli ja lisää oluet (nimi + kuvan URL/tiedosto data-URL:na).
- Jaa pelin linkki muille (`/{gameId}`) ja näytä QR-koodi pelinäkymässä.
- Pelaajat antavat pisteet väliltä `0.00–10.00`.
- Tulokset lasketaan keskiarvona ja näytetään järjestettynä.
- Pelin ja olutlistan muokkaus jälkikäteen.

## Teknologiat

- Cloudflare Workers
- Cloudflare D1 (SQLite)
- Wrangler v4
- qrcode (server-side QR-generointi)
- Vanilla JS (ei erillistä frontend-buildia)

## Projektirakenne

```txt
.
├── src/index.js               # Worker + UI + API
├── migrations/                # D1-migraatiot
├── wrangler.jsonc             # Worker- ja D1-konfiguraatio
├── package.json
└── .gitignore
```

## Vaatimukset

- Node.js 18+ (suositus: Node.js 20+)
- npm
- Cloudflare-tili + Wrangler-autentikointi (`npx wrangler login`)

## Käyttöönotto lokaalisti

1. Asenna riippuvuudet:

```bash
npm install
```

2. Aja D1-migraatiot paikalliseen kantaan:

```bash
npx wrangler d1 migrations apply sahti-as-a-service-db --local
```

3. Käynnistä kehityspalvelin:

```bash
npx wrangler dev
```

4. Avaa selaimessa:

```txt
http://127.0.0.1:8787
```

## Julkaisu (deploy)

1. Aja migraatiot etäkantaan:

```bash
npx wrangler d1 migrations apply sahti-as-a-service-db --remote
```

2. Julkaise Worker:

```bash
npx wrangler deploy
```

## API-päätepisteet

- `POST /api/create-game`
  - Body: `{ "name": "Pelin nimi", "beers": [{ "name": "Olut", "image_url": "https://..." }] }`
- `GET /api/games/:id`
- `PUT /api/games/:id`
  - Body: `{ "name": "Uusi nimi", "beers": [{ "id": 1, "name": "Olut", "image_url": null }] }`
- `POST /api/games/:id/ratings`
  - Body: `{ "clientId": "client-123", "ratings": [{ "beerId": 1, "score": 8.5 }] }`
- `GET /api/games/:id/ratings?clientId=client-123`
  - Response: `{ "ok": true, "ratings": [{ "beerId": 1, "score": 8.5 }] }`
- `GET /api/games/:id/results`
- `GET /api/qr?url=https%3A%2F%2Fexample.com%2F123`
  - Palauttaa SVG-muotoisen QR-koodin annetulle `http/https`-URL:lle.

## Lisenssi

MIT, katso `LICENSE`.
