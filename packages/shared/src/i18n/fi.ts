import type { Translations } from "./types";

export const fi: Translations = {
  locale: "fi",
  welcome: {
    sessionTerm: "sessio",
    flightTerm: "maistelusarja",
    welcomeTitle: "Tervetuloa Breviewiin",
    welcomeSubtitle: "Luo maistelusessio, jaa linkki ja paljasta tulokset yhdessä.",
    createStep: "Lisää arvioitavat juomat.",
    inviteStep: "Jaa arvaamaton sessiolinkki.",
    revealStep: "Paljasta tulokset lopussa.",
    start: "Aloita",
  },
  nav: {
    home: "Koti",
    account: "Tili",
    sessions: "Sessiot",
    privacy: "Tietosuoja",
    support: "Tuki",
    deleteAccount: "Poista tili",
    backToHome: "Takaisin etusivulle",
    language: "Kieli",
  },
  home: {
    session: "Maistelusessio",
    sessionName: "Session nimi",
    drink: "Juoma",
    oneDrink: "1 juoma",
    multipleDrinks: "{count} juomaa",
    openMenu: "Avaa valikko",
    createSession: "Luo sessio",
    joinSession: "Liity sessioon",
    createSessionSubtitle: "Nimeä sessio, lisää juomat ja jaa linkki.",
    openSharedLink: "Avaa jaettu sessiolinkki",
    openSessionLink: "Avaa sessiolinkki",
    openSessionLinkSubtitle: "Liitä Breview-linkki liittyäksesi tai jatkaaksesi sessiota.",
    open: "Avaa",
    join: "Liity",
    recent: "Viimeisimmät",
    noRecentGames: "Ei viimeisimpiä sessioita vielä.",
    sessionSettings: "Session asetukset",
    settingsDescription: "Valitse arvostelutapa ja milloin tulokset näkyvät.",
    ratingMode: "Arvostelutapa",
    slider: "Slideri",
    stars: "Tähdet",
    results: "Tulokset",
    revealAtEnd: "Paljasta lopussa",
    showAfterSubmit: "Näytä oman tallennuksen jälkeen",
    showImmediately: "Näytä heti",
    scale: "Asteikko",
    custom: "Oma",
    minLabel: "Minimi",
    maxLabel: "Maksimi",
    stepLabel: "Askel",
    safetyCheckbox: "Lisään vain asiallista sisältöä ja ymmärrän, että nimet, kuvat ja kommentit näkyvät linkin saaneille.",
    addMultipleImages: "Lisää monta kuvaa",
    queued: "Jonossa",
    running: "Käynnissä",
    done: "Valmis",
    fixManually: "Korjaa käsin",
    optionalComment: "Kommentti (valinnainen)",
    ratings: "arviota",
  },
  game: {
    session: "Sessio",
    sessionNumber: "Sessio",
    loading: "Ladataan...",
    error: "Virhe",
    unknownAddress: "Tuntematon osoite",
    editSession: "Muokkaa sessiota",
    settings: "Asetukset",
    drinks: "juomaa",
    nickname: "Nimimerkki",
    notSet: "Ei asetettu",
    change: "(Vaihda)",
    reportSession: "Ilmoita sessiosta",
    rate: "Arvostele",
    resultsTab: "Tulokset",
    save: "Tallenna",
    saving: "Tallennetaan...",
    saved: "Tallennettu",
    sortedByAverage: "Järjestetty keskiarvon mukaan",
    players: "Pelaajia",
    anonymousPlayer: "Nimetön pelaaja",
    noPlayersYet: "Ei pelaajia vielä",
    refreshResults: "Päivitä tulokset",
    refreshing: "Päivitetään...",
    shareResults: "Jaa tulokset",
    revealResults: "Paljasta tulokset",
    joinWithNickname: "Liity sessioon nimimerkillä",
    leaveEmptyForAutoName: "Jätä tyhjäksi, jos haluat automaattisen nimen (esim. Nimetön nimimerkki 112).",
    nicknameOptionalLabel: "Nimimerkki (valinnainen)",
    nicknamePlaceholder: "esim. Maistelija",
    continueToSession: "Jatka sessioon",
    cancel: "Peruuta",
    backToSession: "Takaisin sessioon",
    resultsShareTitle: "tulokset",
    resultsShareText: "Katso session",
    linkCopied: "Linkki kopioitu",
    reportContent: "Ilmoita sisällöstä",
    retry: "Yritä uudelleen",
  },
  editor: {
    createNewSession: "Luo uusi sessio",
    editSession: "Muokkaa sessiota",
    sessionNameRequired: "Session nimi ja juoman nimi ovat pakollisia.",
    dragDesktop: "Raahaa juomia kahvasta (⋮⋮) vaihtaaksesi järjestystä.",
    dragMobile: "Vaihda juoman järjestys Rivi-valikosta.",
    sessionNameLabel: "Session nimi",
    sessionNamePlaceholder: "esim. Breview-ilta",
    nameDrink: "Nimeä juoma",
    drink: "Juoma",
    rowLabel: "Rivi",
    row: "Rivi",
    changeRowOrder: "Vaihda rivin järjestystä",
    remove: "Poista",
    nameLabel: "Nimi",
    namePlaceholder: "esim. Mallaski IPA",
    imageOptional: "Kuva (valinnainen)",
    noImage: "Ei kuvaa",
    imageSelected: "Kuva valittu",
    changeImage: "Vaihda kuva",
    selectImage: "Valitse kuva",
    camera: "Kamera",
    gallery: "Kuvat",
    fileUploadNote: "Tiedosto ladataan palvelimelle (max 10 MB, suositus enintään 6000x6000 px).",
    identifyWithAI: "Tunnista nimi AI:lla",
    identifyWithAi: "Tunnista nimi AI:lla",
    identifying: "Tunnistetaan...",
    identifyingName: "Tunnistetaan nimeä...",
    identifiedName: "Tunnistettu",
    identificationFailed: "Tunnistus epäonnistui",
    externalSearch: "Ulkoinen haku",
    openSearch: "Avaa haku",
    saveAndCreate: "Tallenna ja luo sessio",
    saveChanges: "Tallenna muutokset",
    addDrink: "+ Lisää juoma",
    savingEllipsis: "Tallennetaan...",
    cancelLabel: "Peruuta",
    dragHandle: "Raahaa tästä järjestyksen vaihtamiseksi",
    queuedForRecognition: "Jonossa tunnistukseen",
    safetyTerms: "Lisään vain asiallista sisältöä ja ymmärrän, että nimet, kuvat ja kommentit näkyvät linkin saaneille.",
  },
  beerCard: {
    noImage: "Ei kuvaa",
    report: "Ilmoita",
    externalSearch: "Ulkoinen haku",
    average: "keskiarvo",
    ratings: "arvosanaa",
    commentOptional: "Kommentti (valinnainen)",
    scoreFor: "Arvosana juomalle",
    scoreNumericFor: "Arvosana numerona juomalle",
    commentFor: "Kommentti juomalle",
  },
  share: {
    inviteTasters: "Kutsu maistelijat",
    shareDescription: "Jaa arvaamaton sessiolinkki osallistujille.",
    copySessionLink: "Kopioi sessiolinkki",
    copied: "Kopioitu!",
    hideQR: "Piilota QR",
    qr: "QR",
    shareSession: "Jaa sessio",
    copyHostLink: "Kopioi host-linkki",
    creatingQR: "Luodaan QR-koodia...",
    scanQR: "Skannaa QR avataksesi session",
    loadingEllipsis: "Ladataan...",
    joinSession: "Liity Breview-sessioon",
  },
  account: {
    title: "Tili",
    loggedIn: "Kirjautunut",
    saveHistory: "Historia talteen",
    enterEmailPrompt: "Syötä sähköposti, niin lähetämme kertakäyttökoodin.",
    emailLabel: "Sähköposti",
    newCodeIn: "Uusi koodi",
    resendCode: "Lähetä uusi koodi",
    sendCode: "Lähetä koodi",
    canRequestNewCode: "Voit pyytää uuden kirjautumiskoodin hetken kuluttua.",
    codeLabel: "Koodi",
    login: "Kirjaudu",
    codeSent: "Kirjautumiskoodi lähetetty sähköpostiisi.",
    loginSuccess: "Olet nyt kirjautunut sisään.",
    dataAndSupport: "Data ja tuki",
    logout: "Kirjaudu ulos",
    deleteAccount: "Poista tili",
    deleteAccountInstructions: "Tilin poistamisen ohjeet",
    accountDeleted: "Käyttäjätilisi ja kaikki siihen liittyvät tiedot on poistettu.",
    archive: "Arkistoi",
    unarchive: "Palauta",
    archivedSessions: "Arkistoidut sessiot",
    confirmDelete: "Poistetaanko tili ja siihen linkitetyt arvostelut?",
    deleteSuccess: "Tili poistettu.",
    noHistory: "Ei tilille linkitettyjä arvosteluja vielä.",
    noReviewsYet: "Ei arvosteluja vielä.",
    ratingsCount: "arviota",
    reviewsCount: "arviota",
    noDate: "Ei päivämäärää",
    privacyToggle: "Tietosuoja",
    privacyStatement: "Tietosuojaseloste",
    privacyDescription: [
      "Breview käyttää sähköpostiosoitetta vain tilin kirjautumiseen ja omien arvostelujen löytämiseen. Arvosteluissa tallentuvat nimimerkki, arvosanat, kommentit, session tiedot ja mahdolliset ladatut kuvat.",
      "Selaimeen tai sovellukseen tallennetaan tekninen tunniste, jolla aiemmat arvostelut voidaan liittää tiliin kirjautumisen jälkeen. Kertakäyttökoodi vanhenee 10 minuutissa.",
      "Tietoja käytetään sessioiden luomiseen, arvostelujen tallentamiseen, tulosten näyttämiseen ja väärinkäytön rajoittamiseen. Kirjautunut käyttäjä voi poistaa tilinsä tältä sivulta.",
    ],
    notLoggedIn: "Ei kirjautunut",
    myReviews: "Omat arvostelut",
    historyTitle: "Historia talteen",
    myReviewsSubtitle: "Tähän tiliin linkitetyt sessiot.",
    historySubtitle: "Kirjaudu sähköpostilla tallentaaksesi ja löytääksesi arvostelusi.",
    newCodeWait: "Uusi koodi {seconds} s",
    sendNewCode: "Lähetä uusi koodi",
    codeCooldown: "Voit pyytää uuden kirjautumiskoodin hetken kuluttua.",
    manageAccountOnlyForLoggedIn: "Tilin toiminnot ovat käytössä kirjautuneena.",
    deleteConfirm: "Poistetaanko tili ja siihen linkitetyt arvostelut?",
    deleteAccountAction: "Poista tili",
    codeSentMessage: "Koodi lähetetty. Tarkista sähköposti.",
  },
  errors: {
    giveSessionName: "Anna sessiolle nimi",
    nameAllDrinks: "Anna nimi kaikille juomille tai poista tyhjä rivi",
    addAtLeastOneDrink: "Lisää vähintään yksi juoma",
    acceptSafety: "Hyväksy turvallisen käytön ehdot ennen session luontia.",
    useBreviewLink: "Käytä Breviewin jaettua sessiolinkkiä.",
    notBreviewLink: "Linkki ei näytä Breview-sessiolinkiltä.",
    pasteFullLink: "Liitä koko Breview-sessiolinkki.",
    sharingFailed: "Jakaminen epäonnistui",
    revealFailed: "Tulosten paljastus epäonnistui",
    reportingOnNewOnly: "Ilmoittaminen on käytössä uusissa sessiolinkeissä.",
    reportPrompt: "Kerro lyhyesti, mikä sisällössä on asiatonta.",
    reportReceived: "Ilmoitus vastaanotettu. Kiitos.",
    reportFailed: "Ilmoituksen lähetys epäonnistui",
    copyFailed: "Kopiointi epäonnistui",
    qrFailed: "QR-koodin luonti epäonnistui",
    hostCopyFailed: "Host-linkin kopiointi epäonnistui",
    urlCopyFailed: "URL:n kopiointi epäonnistui",
    pageNotOpened: "Sivua ei voitu avata",
    cameraDenied: "Kameran käyttö estetty",
    libraryDenied: "Kuvakirjaston käyttö estetty",
    allowCamera: "Salli kameran käyttö asetuksista ja yritä uudelleen.",
    allowLibrary: "Salli kuvakirjaston käyttö asetuksista ja yritä uudelleen.",
    openSettings: "Avaa asetukset",
    pasteValidLink: "Liitä kelvollinen Breview-sessiolinkki.",
    acceptSafetyTerms: "Hyväksy turvallisen käytön ehdot ennen session luontia.",
    cameraMissing: "Kameran käyttöoikeus tarvitaan kuvan ottamiseen.",
    libraryMissing: "Kuvakirjaston käyttöoikeus tarvitaan kuvan valitsemiseen.",
    selectImageFirst: "Valitse ensin kuva.",
    aiIdentificationFailed: "AI-tunnistus epäonnistui",
    saveAtLeastOneRating: "Tallenna vähintään yksi arvosana.",
    generalError: "Jokin meni pieleen. Yritä uudelleen.",
    send: "Lähetä",
  },
  publicInfo: {
    privacyEyebrow: "Breview tietosuoja",
    privacyTitle: "Tietosuojaseloste",
    privacySections: [
      {
        title: "Mitä tietoja Breview käsittelee",
        paragraphs: [
          "Breview tallentaa sessioiden nimet, juomien nimet, käyttäjien nimimerkit, arvosanat, kommentit ja käyttäjän lisäämät kuvat. Jos kirjaudut sähköpostilla, Breview tallentaa sähköpostiosoitteesi, tilin istunnot ja tiliin linkitetyn arvosteluhistorian.",
          "Sovellus käyttää laite- tai selainkohtaista teknistä tunnistetta, jotta samalla laitteella tehdyt arvostelut voidaan löytää ja liittää tiliin kirjautumisen yhteydessä. Tunnistetta ei käytetä mainontaan."
        ]
      },
      {
        title: "Mihin tietoja käytetään",
        paragraphs: [
          "Tietoja käytetään maistelusessioiden luomiseen, jakamiseen, arvosanojen tallentamiseen, tulosten näyttämiseen, kirjautumiseen, väärinkäytön rajoittamiseen ja palvelun vianmääritykseen.",
          "Kuvien nimientunnistus käsitellään Cloudflare Workers AI:n kautta. Ladatut kuvat säilytetään Cloudflare R2:ssa, jotta sessiot ja tulokset voivat näyttää niihin liitetyt kuvat."
        ]
      },
      {
        title: "Palvelut ja jakaminen",
        paragraphs: [
          "Breview käyttää Cloudflare Workersia, D1-tietokantaa, R2-tallennusta, Workers AI:ta ja Cloudflare Email Serviceä. Breview ei sisällä kolmannen osapuolen mainonta- tai seurantakirjastoja.",
          "Sessiolinkit ovat jaettavia. Henkilö, jolla on session linkki, voi nähdä session, siihen tallennetut juomat ja näkyvissä olevat tulokset. Älä lisää kommentteihin tietoja, joita et halua jakaa muille osallistujille."
        ]
      },
      {
        title: "Tilin poistaminen ja yhteydenotto",
        paragraphs: [
          "Kirjautunut käyttäjä voi poistaa tilinsä Breviewin tili-näkymästä. Julkinen ohjesivu on osoitteessa breview.ing/delete-account.",
          "Tukipyynnöt voi lähettää osoitteeseen support@breview.ing."
        ]
      }
    ],
    supportEyebrow: "Breview tuki",
    supportTitle: "Tuki",
    supportSections: [
      {
        title: "Yhteydenotto",
        paragraphs: [
          "Jos kirjautuminen, session avaaminen, kuvien lataaminen tai tilin poistaminen ei toimi, lähetä viesti osoitteeseen support@breview.ing.",
          "Liitä mukaan käyttämäsi sähköpostiosoite, sessiolinkki, laitteen tyyppi ja lyhyt kuvaus siitä, mitä tapahtui. Älä lähetä kirjautumiskoodeja tai istuntotunnuksia."
        ]
      },
      {
        title: "Yleiset tilanteet",
        paragraphs: [],
        list: [
          "Jos kirjautumiskoodi ei saavu, tarkista roskaposti ja pyydä uusi koodi hetken kuluttua.",
          "Jos jaettu linkki ei avaa sovellusta, sama linkki toimii myös selaimessa osoitteessa breview.ing.",
          "Jos kamera tai kuvakirjasto on estetty, salli käyttöoikeus laitteen asetuksista ja yritä uudelleen.",
          "Jos haluat poistaa tilin, käytä kirjautuneena tili-näkymää tai seuraa julkista poistopyyntöä."
        ]
      },
      {
        title: "Lisätiedot",
        paragraphs: [
          "Tietosuojaseloste on osoitteessa breview.ing/privacy. Tilin poistamisen ohjeet ovat osoitteessa breview.ing/delete-account.",
          "Jos haluat tukea Breviewin ylläpitoa, tekijäsivu on osoitteessa breview.ing/makers."
        ]
      }
    ],
    deleteAccountTitle: "Tilin poistaminen Breviewistä",
    deleteAccountEyebrow: "Account deletion",
    deleteAccountSections: [
      {
        title: "Nopein tapa poistaa tili",
        paragraphs: [
          "Sovelluksessa tehty poisto käsitellään heti. Kirjaudut ulos, tili poistetaan ja tiliin linkitetyt pelaajarivit, arvosanat ja kommentit poistuvat aktiivisista peleistä."
        ],
        list: [
          "Avaa Breview webissä tai mobiilisovelluksessa.",
          "Siirry Tili-näkymään ja kirjaudu sähköpostikoodilla, jos et ole kirjautunut.",
          "Valitse Poista tili ja vahvista poisto."
        ]
      },
      {
        title: "Jos et pääse kirjautumaan",
        paragraphs: [
          "Lähetä poistopyyntö osoitteeseen support@breview.ing siitä sähköpostiosoitteesta, jolla käytit Breview-tiliä. Jos kirjoitat toisesta osoitteesta, pyydämme vahvistamaan omistajuuden ennen poistoa."
        ]
      },
      {
        title: "Mitä poistetaan",
        paragraphs: [
          "Poistamme tilin sähköpostiosoitteen, aktiiviset istunnot, tiliin linkitetyt pelaajarivit, arvosanat ja kommentit. Kun pelaajarivi poistuu, siihen liittyvät arvosanat eivät enää näy session tuloksissa.",
          "Sessiot, juomalistat ja muiden osallistujien arvosanat voivat jäädä näkyviin, koska ne eivät kuulu vain yhteen tiliin. Tilin poistaminen ei poista muiden käyttäjien jakamia tai tallentamia tietoja."
        ]
      },
      {
        title: "Mitä voidaan säilyttää",
        paragraphs: [
          "Breview voi säilyttää rajallisia operatiivisia lokitietoja, kuten kirjautumis- ja poistotapahtumia, toimitusvirheitä, turvarajoituksia ja palvelun virhelokeja, väärinkäytön estämistä, vianmääritystä ja lakisääteisiä velvoitteita varten. Näitä tietoja säilytetään vain niin kauan kuin niille on perusteltu tarve."
        ]
      },
      {
        title: "Aikataulu",
        paragraphs: [
          "Sovelluksessa vahvistettu poisto tapahtuu välittömästi. Sähköpostilla lähetetyt poistopyynnöt käsitellään yleensä 7 päivän kuluessa ja viimeistään 30 päivän kuluessa, ellei pyynnön vahvistaminen vaadi lisätietoja."
        ]
      }
    ],
    emailLinkText: "Lähetä poistopyyntö"
  }
};
