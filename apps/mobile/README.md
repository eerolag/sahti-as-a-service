# Breview Mobile

Expo SDK 54 + Expo Router -sovellus Breviewin iOS- ja Android-julkaisua varten.

SDK 54 on tarkoituksellinen kehitysvaiheen valinta, jotta Expo Go -testaus pysyy samassa versiossa rinnakkaisen SDK 54 -projektin kanssa. SDK 55 -päivitys tehdään, kun molemmat projektit voidaan nostaa yhdessä tai Breviewille otetaan käyttöön oma development build.

## Kehitys

```bash
npm run dev:mobile
```

API-osoite tulee muuttujasta `EXPO_PUBLIC_API_BASE_URL`. Jos muuttujaa ei ole asetettu, mobiili käyttää tuotantodomainia `https://breview.ing`.

Maker-tukilinkki tulee muuttujasta `EXPO_PUBLIC_SUPPORT_PAGE_URL`. Jos muuttujaa ei ole asetettu, mobiili avaa osoitteen `https://breview.ing/makers` ulkoiseen selaimeen.

Nykyinen mobiilishell tukee luontia, liittymistä, viimeisimpiä pelejä, slider-arvosteluja, kommentteja, tallennusta, tuloksia, jakamista sekä pelin ja oluiden muokkausta tuotannon Cloudflare API:a vasten. Muokkaus tukee kuvan lisäämistä kamerasta tai kuvakirjastosta, R2-uploadia ja Workers AI -nimientunnistusta. Paikallisia kuvatiedostonimiä ei näytetä käyttöliittymässä.

## Linkitys

`app.json` pitää `breview://`-schemen käytössä ja lisää iOS associated domains- sekä Android intent filter -valmiuden domainille `https://breview.ing`. Natiivien app linksien tuotantovarmennus vaatii vielä omistaja-arvot Workeriin:

- `IOS_APPLE_TEAM_ID`
- `ANDROID_SHA256_CERT_FINGERPRINTS`

Kun arvot puuttuvat, web fallback toimii edelleen normaalisti ja `/.well-known/*` palauttaa tyhjän assosiaation feikkiarvojen sijaan.

## Tili ja tuki

Tili-välilehti tukee kirjautumiskoodin resend-cooldownia, uloskirjautumista, tilin poistoa sekä ulkoisia linkkejä sivuille:

- `https://breview.ing/privacy`
- `https://breview.ing/support`
- `https://breview.ing/delete-account`
