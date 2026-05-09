# Breview Mobile

Expo SDK 54 + Expo Router -sovellus Breviewin iOS- ja Android-julkaisua varten.

SDK 54 on tarkoituksellinen kehitysvaiheen valinta, jotta Expo Go -testaus pysyy samassa versiossa rinnakkaisen SDK 54 -projektin kanssa. SDK 55 -päivitys tehdään, kun molemmat projektit voidaan nostaa yhdessä tai Breviewille otetaan käyttöön oma development build.

## Kehitys

```bash
npm run dev:mobile
```

API-osoite tulee muuttujasta `EXPO_PUBLIC_API_BASE_URL`. Jos muuttujaa ei ole asetettu, mobiili käyttää tuotantodomainia `https://breview.ing`.

Nykyinen mobiilishell tukee luontia, liittymistä, viimeisimpiä pelejä, slider-arvosteluja, kommentteja, tallennusta ja tuloksia tuotannon Cloudflare API:a vasten.
