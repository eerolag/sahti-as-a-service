# Breview

Breview on tuotantoon rakennettava web-, iOS- ja Android-sovellus oluiden arviointipeleihin.

Tuotantodomain: `https://breview.ing`

Monorepo-arkkitehtuuri:
- `apps/api`: Cloudflare Worker, API-reitit, D1-migraatiot ja binding-konfiguraatio
- `apps/web`: React + Vite + Tailwind -web-käyttöliittymä
- `apps/mobile`: Expo Router + AniUI + NativeWind -mobiilisovellus
- `packages/shared`: framework-agnostinen domain-logiikka ja API-tyypit
- `packages/api-client`: webin ja mobiilin jaettu typed fetch-client

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
├── apps
│   ├── api/
│   ├── mobile/
│   └── web/
├── packages
│   ├── api-client/
│   └── shared/
├── tests
│   ├── api/
│   ├── web/
│   └── shared/
├── plans/
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
- npm workspaces
- React
- Tailwind CSS
- shadcn/ui (webin tuotantosuunta)
- Expo Router + AniUI + NativeWind (mobiilin tuotantosuunta)
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

`apps/api/wrangler.jsonc` käyttää bindingia:
- `IMAGES_BUCKET` -> `sahti-as-a-service-images`

## Kehitys

1. Asenna riippuvuudet:

```bash
npm install
```

2. Aja D1-migraatiot paikalliseen kantaan:

```bash
npm --workspace @breview/api run migrate:local
```

3. Käynnistä kehitys:

```bash
npm run dev
```

Tämä käynnistää:
- `npm run dev:web` -> build-watch `apps/web/dist`-kansioon
- `npm run dev:worker` -> `wrangler dev`

4. Avaa selaimessa:

```txt
http://127.0.0.1:8787
```

### AI-tunnistuksen testilukon vapautus

AI-kuvatunnistus käyttää D1:ssä päiväkohtaista testattavaa käyttörajaa ja lukkoa. Jos ei-juomakuvien testaus lukitsee tunnistuksen, nollaa tämän päivän yritykset, varoitukset ja lukot:

```bash
npm --workspace @breview/api run ai:unlock:local
```

Tuotantokantaan sama testiapukomento on:

```bash
npm --workspace @breview/api run ai:unlock:remote
```

Tämä vapauttaa tämän päivän AI-tunnistuksen kaikilta teknisiltä client-tunnisteilta kyseisessä kannassa, joten käytä remote-komentoa vain testauksen aikana.

## Mobiili

Breviewin mobiili on tällä hetkellä tarkoituksella Expo SDK 54 -projektina, jotta se toimii saman App Store Expo Go -version kanssa kuin muut aktiiviset SDK 54 -projektit. Päivitä SDK 55:een vasta, kun myös rinnakkainen projekti siirtyy SDK 55:een tai Breviewille tehdään oma development build/TestFlight-polku.

```bash
npm run dev:mobile
```

Metro/Expo välimuistin tyhjennyksellä:

```bash
npm --workspace @breview/mobile run start -- --clear
```

Expo dev serverissä:
- `i` avaa iOS-simulaattorin
- `a` avaa Android-emulaattorin
- `w` avaa web-preview'n
- QR-koodin voi skannata Expo Golla

Repo pinnaa `lightningcss`-paketin versioon `1.30.1`, koska NativeWindin `react-native-css`-Metro-muunnos voi hajota uudemmalla versiolla iOS-bundlauksessa. Jos Metro antaa `failed to deserialize; expected an object-like struct named Specifier` -virheen, aja rootissa `npm install` ja käynnistä Metro uudelleen `--clear`-lipulla.

Suoraan simulaattoriin tai emulaattoriin:

```bash
npm --workspace @breview/mobile run ios -- --clear
npm --workspace @breview/mobile run android -- --clear
```

Expo käyttää oletuksena `https://breview.ing` API-basea, eli simulaattori ja Expo Go osuvat oikeaan Cloudflare Workeriin ja sen D1/R2-resursseihin. Paikallisen Workerin voi antaa muuttujalla `EXPO_PUBLIC_API_BASE_URL`.

Mobiilissa voi tällä hetkellä luoda pelin, liittyä peliin, arvostella oluet sliderilla, lisätä kommentit, tallentaa arviot, katsoa tulokset, jakaa pelin linkin sekä muokata peliä ja oluita. Muokkaus tukee kuvan lisäämistä kamerasta tai kuvakirjastosta, kuvan latausta R2:een ja nimen tunnistusta Workers AI:lla. Mobiilin tumma Breview-ilme pidetään linjassa webin kanssa, vaikka komponenttipohja on eri.

iOS-simulaattori tai Expo web:

```bash
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8787 npm --workspace @breview/mobile run start -- --clear
```

Android-emulaattori:

```bash
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8787 npm --workspace @breview/mobile run start -- --clear
```

Fyysisellä puhelimella käytä kehityskoneen LAN-IP:tä, esimerkiksi `http://192.168.1.23:8787`.

## Maker-support-sivu

Webissä on julkinen maker-sivu osoitteessa `/makers`. Maksupainike käyttää vain ulkoista linkkiä muuttujasta `SUPPORT_PAYMENT_URL`; jos muuttujaa ei ole, sivu näyttää tekstin `Support link coming soon.` eikä avaa maksua. Valinnainen `SUPPORT_PAYMENT_LABEL` näkyy CTA:n alla.

Mobiili ei sisällä natiivia maksuflow'ta. Tili-välilehden maker-linkki avaa ulkoisen web-sivun muuttujasta `EXPO_PUBLIC_SUPPORT_PAGE_URL`, jonka oletus on `https://breview.ing/makers`.

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
npm --workspace @breview/api run migrate:remote
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
