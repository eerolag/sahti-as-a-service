# Breview

Breview on tuotantoon rakennettava web-, iOS- ja Android-sovellus juomien maistelusessioihin ja arviointiin.

Tuotantodomain: `https://breview.ing`

Monorepo-arkkitehtuuri:
- `apps/api`: Cloudflare Worker, API-reitit, D1-migraatiot ja binding-konfiguraatio
- `apps/web`: React + Vite + Tailwind -web-käyttöliittymä
- `apps/mobile`: Expo Router + NativeWind + React Native -mobiilisovellus
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
- Expo Router + NativeWind + React Native -komponentit (mobiilin tuotantosuunta)
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
- ilman Cloudflare Email Service -bindingia kirjautumiskoodin lähetys palauttaa `503`
- Untappd toimii pelkkänä ulkoisena hakulinkkinä eikä tarvitse avaimia

Kuvatunnistus käyttää Cloudflare Workers AI -bindingia `AI` ja aloittaa mallilla `@cf/google/gemma-4-26b-a4b-it`. Kirjautuminen käyttää Cloudflare Email Service -bindingia `EMAIL`, D1:een tallennettuja kertakäyttöisiä kirjautumishaasteita ja hashattuja sessiotunnisteita. Paikallinen `wrangler dev` simuloi sähköpostilähetyksen ja tulostaa viestin konsoliin; lisää `remote: true` `send_email`-bindingiin vain silloin, kun haluat lähettää paikallisesta devistä oikeita viestejä onboardatun Email Sending -domainin kautta. Untappd-integraatio on pelkkä käyttäjälle näkyvä ulkoinen hakulinkki, ei API-kutsu. Katso tarkempi vaiheistus plans-dokumenteista.

Tuotannossa aseta lisäksi salaisuus:

```bash
npx wrangler secret put AUTH_SECRET --config apps/api/wrangler.jsonc
```

Kirjautumiskoodin pyyntö, lähetys, varmennus, uloskirjautuminen ja tilin poisto kirjoittavat rakenteiset `breview.auth_event` -lokit Worker-lokeihin. Käyttäjälle näytettävät sähköpostivirheet pidetään yleisinä, mutta lokit sisältävät Cloudflare Email Service -vianmääritykseen tarvittavan luokituksen ja diagnostiikan ilman kirjautumiskoodia tai sessiotunnusta.

## Julkiset reviewer-sivut

Store-reviewta ja käyttäjiä varten webissä on kirjautumatta avautuvat sivut:

- `https://breview.ing/privacy`
- `https://breview.ing/support`
- `https://breview.ing/delete-account`

`/delete-account` kertoo, miten tilin voi poistaa sovelluksessa, miten sähköpostipoistopyyntö tehdään, mitä tietoja poistetaan, mitä operatiivisia tietoja voidaan säilyttää ja mikä on odotettu käsittelyaika. Webin ja mobiilin tili-/tukipinnat linkittävät näihin sivuihin.

## Kieliversiot

Web ja mobiili käyttävät yhteisiä käännösresursseja hakemistosta `packages/shared/src/i18n`.
Nykyiset toteutetut kieliversiot ovat:

- `fi` - suomi
- `en` - englanti
- `sv` - ruotsi
- `nl` - hollanti

Selain tai mobiililaite valitsee automaattisesti tuetun kielen, jos käyttäjän locale vastaa jotakin näistä. Tuntematon locale fallbackaa englantiin. Kielen voi vaihtaa käsin webissä kielivalitsimesta ja mobiilissa etusivun oikean yläkulman valikosta. Laajempi top-kielien joukko pysyy julkaisua edeltävässä backlogissa, mutta sitä ei merkitä valmiiksi ennen kuin kaikki tekstit ja tarvittavat RTL-layoutit on testattu.

## Deep links ja app links

Mobiilisovelluksen oma scheme on edelleen `breview://`. Lisäksi Expo-konfiguraatio valmistaa iOS universal links- ja Android app links -polun domainille `https://breview.ing`.

Worker palvelee:

- `/.well-known/apple-app-site-association`
- `/.well-known/assetlinks.json`

Jos natiivijulkaisun omistajatietoja ei ole asetettu, nämä endpointit palauttavat validin tyhjän assosiaation eivätkä feikkaa tuotantoarvoja. Kun Apple Developer- ja Android-signing-arvot ovat saatavilla, aseta Workeriin:

- `IOS_APPLE_TEAM_ID` - Apple Developer Team ID
- `IOS_BUNDLE_IDENTIFIER` - oletus `ing.breview.app`, aseta vain jos bundle ID muuttuu
- `ANDROID_PACKAGE_NAME` - oletus `ing.breview.app`, aseta vain jos package muuttuu
- `ANDROID_SHA256_CERT_FINGERPRINTS` - pilkuilla erotetut Android signing certificate SHA-256 -sormenjäljet

Tuotannon jakolinkit käyttävät arvaamattomia polkuja `https://breview.ing/s/:shareId` osallistujille ja
`https://breview.ing/h/:shareId#hostToken` hostille. Vanhat numeeriset `/:gameId`-linkit jäävät vain
siirtymäkauden yhteensopivuudeksi. Tuotannon D1-migraatiot `0007_session_links_settings_reports.sql` ja
`0008_backfill_game_public_ids.sql` lisäävät public-linkkikentät ja backfillaavat vanhoille sessioille
satunnaiset public-koodit; uusi share-, account- ja recent-UI käyttää ensisijaisesti `/s/:shareId`-linkkejä.

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

Mobiilissa voi tällä hetkellä luoda session, avata jaetun sessiolinkin, arvostella juomat sliderilla tai tähdillä, lisätä kommentit, tallentaa arviot, katsoa tulokset, jakaa sessiolinkin sekä hostina muokata sessiota ja juomia. Muokkaus tukee kuvan lisäämistä kamerasta tai kuvakirjastosta, kuvan latausta R2:een ja nimen tunnistusta Workers AI:lla. iOS-kuvakirjaston valinta käyttää system picker -virtaa ilman erillistä ennakkolupadialogia, jotta picker ei jää jumiin, ja mobiilin oma `Vibration`-haptics on poistettu käytöstä. Alareunan tab-navigaatio on poistettu; etusivun oikean yläkulman valikko avaa Tili-, Tuki-, Tietosuoja- ja kielivalintatoiminnot. Tili-näkymä tukee sähköpostiin lähetettävää kertakäyttökoodia, näyttää resend-cooldownin, linkittää tämän laitteen aiemmat arviot tiliin ja näyttää tilille talletetut arvostelusessiot public-linkkeinä. Mobiili linkittää julkisiin privacy/support/delete-account-sivuihin ja pitää valitun paikallisen kuvan tiedostonimen piilossa. Mobiilin tumma Breview-ilme pidetään linjassa webin kanssa, vaikka komponenttipohja on eri.

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

Mobiili ei sisällä natiivia maksuflow'ta. Tili-näkymän maker-linkki avaa ulkoisen web-sivun muuttujasta `EXPO_PUBLIC_SUPPORT_PAGE_URL`, jonka oletus on `https://breview.ing/makers`.

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

Deploy-komento ajaa `wrangler deploy` -vaiheen pienellä uusintayrityksellä, koska Cloudflare Workers Assets -upload voi joskus palauttaa transientin `assets-upload-session` / `code: 10013` -virheen, vaikka build ja konfiguraatio ovat kunnossa.

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
- `GET /api/sessions/:shareId`
- `PUT /api/sessions/:shareId` (`x-breview-creator-token`)
- `POST /api/sessions/:shareId/ratings`
- `GET /api/sessions/:shareId/ratings?clientId=...`
- `GET /api/sessions/:shareId/results`
- `POST /api/sessions/:shareId/reveal-results` (`x-breview-creator-token`)
- `POST /api/sessions/:shareId/reports`
- `GET /api/games/:id`
- `PUT /api/games/:id` (legacy-yhteensopivuus; uusien sessioiden host-muokkaus kulkee `/api/sessions/:shareId`-reitin kautta)
- `POST /api/games/:id/ratings` (body: `clientId`, `ratings`, optional `nickname`; ratingissä valinnainen `comment`, max 255 merkkiä)
- `GET /api/games/:id/ratings?clientId=...` (tekninen tunniste omien arvosanojen hakuun)
- `GET /api/games/:id/results`
- `POST /api/auth/request-code` (body: `email`; lähettää sähköpostin kertakäyttökoodilla)
- `POST /api/auth/verify-code` (body: `email`, `code`, optional `clientId`/`clientIds`; palauttaa session ja linkittää laitteen aiemmat arviot)
- `POST /api/auth/logout` (`Authorization: Bearer <sessionToken>`)
- `GET /api/account/me` (`Authorization: Bearer <sessionToken>`)
- `DELETE /api/account/me` (`Authorization: Bearer <sessionToken>`; poistaa tilin ja siihen linkitetyt pelaajarivit/arviot)
- `POST /api/images/upload` (`multipart/form-data`, kenttä `file`, max 10 MB; UI validoi lisäksi max 6000x6000 px)
- `POST /api/images/identify-beer-name` (`multipart/form-data`, kenttä `file`; palauttaa tunnistetun juoman nimen tai virheen)
- `GET /api/images/:key`
- `GET /api/qr?url=<http/https-url-encoded>`

Pääsession vastauskentät ovat taaksepäin yhteensopivat aiemman version kanssa. `game.publicId` ja
account-historian `publicId` ovat ensisijainen linkityspinta, ja uudet share-UI:t eivät näytä numeerista session ID:tä.

## Lisenssi

MIT, katso `LICENSE`.
