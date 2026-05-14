import type { Translations } from "./types";

export const nl: Translations = {
  locale: "nl",
  welcome: {
    sessionTerm: "sessie",
    flightTerm: "proeverij",
    welcomeTitle: "Welkom bij Breview",
    welcomeSubtitle: "Maak een proeverijsessie, deel de link en onthul de resultaten samen.",
    createStep: "Voeg de dranken toe aan de proeverij.",
    inviteStep: "Deel de onraadbare sessielink.",
    revealStep: "Onthul de resultaten aan het eind.",
    start: "Aan de slag",
  },
  nav: {
    home: "Start",
    account: "Account",
    sessions: "Sessies",
    privacy: "Privacy",
    support: "Ondersteuning",
    deleteAccount: "Account verwijderen",
    backToHome: "Terug naar startpagina",
    language: "Taal",
  },
  home: {
    session: "Proeverijsessie",
    sessionName: "Sessienaam",
    drink: "Drank",
    oneDrink: "1 drank",
    multipleDrinks: "{count} dranken",
    openMenu: "Menu openen",
    createSession: "Sessie aanmaken",
    joinSession: "Deelnemen aan sessie",
    createSessionSubtitle: "Geef de sessie een naam, voeg dranken toe en deel de link.",
    openSharedLink: "Gedeelde sessielink openen",
    openSessionLink: "Sessielink openen",
    openSessionLinkSubtitle: "Plak een Breview-link om deel te nemen of verder te gaan.",
    open: "Openen",
    join: "Deelnemen",
    recent: "Recent",
    noRecentGames: "Nog geen recente sessies.",
    sessionSettings: "Sessie-instellingen",
    settingsDescription: "Kies de beoordelingsmethode en wanneer resultaten zichtbaar zijn.",
    ratingMode: "Beoordelingsmethode",
    slider: "Slider",
    stars: "Sterren",
    results: "Resultaten",
    revealAtEnd: "Onthul aan het einde",
    showAfterSubmit: "Toon na opslaan",
    showImmediately: "Toon direct",
    scale: "Schaal",
    custom: "Aangepast",
    minLabel: "Min",
    maxLabel: "Max",
    stepLabel: "Stap",
    safetyCheckbox: "Ik voeg alleen gepaste inhoud toe en begrijp dat namen, afbeeldingen en commentaren zichtbaar zijn voor iedereen met de link.",
    addMultipleImages: "Meerdere afbeeldingen toevoegen",
    queued: "In wachtrij",
    running: "Bezig",
    done: "Klaar",
    fixManually: "Handmatig corrigeren",
    optionalComment: "Opmerking (optioneel)",
    ratings: "beoordelingen",
  },
  game: {
    session: "Sessie",
    sessionNumber: "Sessie",
    loading: "Laden...",
    error: "Fout",
    unknownAddress: "Onbekend adres",
    editSession: "Sessie bewerken",
    settings: "Instellingen",
    drinks: "dranken",
    nickname: "Bijnaam",
    notSet: "Niet ingesteld",
    change: "(Wijzigen)",
    reportSession: "Sessie rapporteren",
    rate: "Beoordelen",
    resultsTab: "Resultaten",
    save: "Opslaan",
    saving: "Opslaan...",
    saved: "Opgeslagen",
    sortedByAverage: "Gesorteerd op gemiddelde",
    players: "Deelnemers",
    anonymousPlayer: "Anonieme deelnemer",
    noPlayersYet: "Nog geen deelnemers",
    refreshResults: "Resultaten vernieuwen",
    refreshing: "Vernieuwen...",
    shareResults: "Resultaten delen",
    revealResults: "Resultaten onthullen",
    joinWithNickname: "Neem deel aan de sessie met een bijnaam",
    leaveEmptyForAutoName: "Laat leeg voor een automatische naam (bijv. Anonieme proever 112).",
    nicknameOptionalLabel: "Bijnaam (optioneel)",
    nicknamePlaceholder: "bijv. Proever",
    continueToSession: "Doorgaan naar sessie",
    cancel: "Annuleren",
    backToSession: "Terug naar sessie",
    resultsShareTitle: "resultaten",
    resultsShareText: "Bekijk de sessie",
    linkCopied: "Link gekopieerd",
    reportContent: "Inhoud rapporteren",
    retry: "Opnieuw proberen",
  },
  editor: {
    createNewSession: "Nieuwe sessie aanmaken",
    editSession: "Sessie bewerken",
    sessionNameRequired: "Sessienaam en dranknaam zijn verplicht.",
    dragDesktop: "Sleep dranken met het handvat (⋮⋮) om de volgorde te wijzigen.",
    dragMobile: "Wijzig de volgorde via het Rij-menu.",
    sessionNameLabel: "Sessienaam",
    sessionNamePlaceholder: "bijv. Breview-avond",
    nameDrink: "Geef de drank een naam",
    drink: "Drank",
    rowLabel: "Rij",
    row: "Rij",
    changeRowOrder: "Rijvolgorde wijzigen",
    remove: "Verwijderen",
    nameLabel: "Naam",
    namePlaceholder: "bijv. Pale Ale",
    imageOptional: "Afbeelding (optioneel)",
    noImage: "Geen afbeelding",
    imagePreview: "Voorbeeld van drankafbeelding",
    imagePreviewFor: "Voorbeeld van drankafbeelding voor",
    imageSelected: "Afbeelding geselecteerd",
    changeImage: "Afbeelding wijzigen",
    selectImage: "Afbeelding selecteren",
    camera: "Camera",
    gallery: "Galerij",
    fileUploadNote: "Bestand wordt geüpload naar de server (max 10 MB, aanbevolen max 6000×6000 px).",
    identifyWithAI: "Naam herkennen met AI",
    identifyWithAi: "Naam herkennen met AI",
    identifying: "Herkennen...",
    identifyingName: "Naam herkennen...",
    identifiedName: "Herkend",
    identificationFailed: "Herkenning mislukt",
    externalSearch: "Extern zoeken",
    openSearch: "Zoekopdracht openen",
    saveAndCreate: "Opslaan en sessie aanmaken",
    saveChanges: "Wijzigingen opslaan",
    addDrink: "+ Drank toevoegen",
    savingEllipsis: "Opslaan...",
    cancelLabel: "Annuleren",
    dragHandle: "Sleep om volgorde te wijzigen",
    queuedForRecognition: "In wachtrij voor herkenning",
    safetyTerms: "Ik voeg alleen gepaste inhoud toe en begrijp dat namen, afbeeldingen en commentaren zichtbaar zijn voor iedereen met de link.",
  },
  beerCard: {
    noImage: "Geen afbeelding",
    report: "Rapporteren",
    externalSearch: "Extern zoeken",
    average: "gemiddelde",
    ratings: "beoordelingen",
    commentOptional: "Opmerking (optioneel)",
    scoreFor: "Score voor",
    scoreNumericFor: "Numerieke score voor",
    commentFor: "Opmerking voor",
  },
  share: {
    inviteTasters: "Proevers uitnodigen",
    shareDescription: "Deel de onraadbare sessielink met deelnemers.",
    copySessionLink: "Sessielink kopiëren",
    copied: "Gekopieerd!",
    hideQR: "QR verbergen",
    qr: "QR",
    shareSession: "Sessie delen",
    copyHostLink: "Hostlink kopiëren",
    creatingQR: "QR-code aanmaken...",
    scanQR: "Scan QR om de sessie te openen",
    loadingEllipsis: "Laden...",
    joinSession: "Neem deel aan Breview-sessie",
  },
  account: {
    title: "Account",
    loggedIn: "Ingelogd",
    saveHistory: "Geschiedenis opslaan",
    enterEmailPrompt: "Vul je e-mailadres in en we sturen een eenmalige code.",
    emailLabel: "E-mail",
    newCodeIn: "Nieuwe code over",
    resendCode: "Code opnieuw verzenden",
    sendCode: "Code verzenden",
    canRequestNewCode: "Je kunt binnenkort een nieuwe inlogcode aanvragen.",
    codeLabel: "Code",
    login: "Inloggen",
    codeSent: "Code verzonden. Controleer je e-mail en voer de zescijferige code in.",
    loginSuccess: "Inloggen gelukt.",
    dataAndSupport: "Gegevens en ondersteuning",
    logout: "Uitloggen",
    deleteAccount: "Account verwijderen",
    deleteAccountInstructions: "Instructies voor accountverwijdering",
    confirmDelete: "Account en gekoppelde beoordelingen verwijderen?",
    accountDeleted: "Account verwijderd.",
    deleteSuccess: "Account verwijderd.",
    noHistory: "Nog geen beoordelingen gekoppeld aan dit account.",
    noReviewsYet: "Nog geen beoordelingen.",
    ratingsCount: "beoordelingen",
    reviewsCount: "beoordelingen",
    noDate: "Geen datum",
    privacyToggle: "Privacy",
    privacyStatement: "Privacyverklaring",
    privacyDescription: [
      "Breview gebruikt je e-mailadres alleen voor inloggen en het vinden van je beoordelingen. Beoordelingen slaan je bijnaam, scores, opmerkingen, sessiegegevens en geüploade afbeeldingen op.",
      "Een technische identifier wordt opgeslagen in je browser of app om eerdere beoordelingen na inloggen aan je account te koppelen. Eenmalige codes verlopen na 10 minuten.",
      "Gegevens worden gebruikt voor het aanmaken van sessies, opslaan van beoordelingen, tonen van resultaten en het voorkomen van misbruik. Ingelogde gebruikers kunnen hun account verwijderen vanaf deze pagina.",
    ],
    notLoggedIn: "Niet ingelogd",
    myReviews: "Mijn beoordelingen",
    historyTitle: "Beoordelingsgeschiedenis opslaan",
    myReviewsSubtitle: "Sessies gekoppeld aan dit account.",
    historySubtitle: "Log in met e-mail om je beoordelingen op te slaan en terug te vinden.",
    newCodeWait: "Nieuwe code over {seconds} s",
    sendNewCode: "Nieuwe code verzenden",
    codeCooldown: "Je kunt binnenkort een nieuwe inlogcode aanvragen.",
    manageAccountOnlyForLoggedIn: "Accountacties zijn beschikbaar wanneer je bent ingelogd.",
    deleteConfirm: "Account en gekoppelde beoordelingen verwijderen?",
    deleteAccountAction: "Account verwijderen",
    codeSentMessage: "Code verzonden. Controleer je e-mail.",
  },
  errors: {
    giveSessionName: "Geef de sessie een naam",
    nameAllDrinks: "Geef alle dranken een naam of verwijder de lege rij",
    addAtLeastOneDrink: "Voeg minstens één drank toe",
    acceptSafety: "Accepteer de gebruiksvoorwaarden voordat je een sessie aanmaakt.",
    useBreviewLink: "Gebruik een gedeelde Breview-sessielink.",
    notBreviewLink: "Deze link lijkt niet op een Breview-sessielink.",
    pasteFullLink: "Plak de volledige Breview-sessielink.",
    sharingFailed: "Delen mislukt",
    revealFailed: "Onthullen van resultaten mislukt",
    reportingOnNewOnly: "Rapporteren is beschikbaar op nieuwe sessielinks.",
    reportPrompt: "Beschrijf kort wat ongepast is aan de inhoud.",
    reportReceived: "Melding ontvangen. Bedankt.",
    reportFailed: "Melding verzenden mislukt",
    copyFailed: "Kopiëren mislukt",
    qrFailed: "QR-code aanmaken mislukt",
    hostCopyFailed: "Hostlink kopiëren mislukt",
    urlCopyFailed: "URL kopiëren mislukt",
    pageNotOpened: "Pagina kon niet worden geopend",
    cameraDenied: "Cameratoegang geweigerd",
    libraryDenied: "Toegang tot fotobibliotheek geweigerd",
    allowCamera: "Sta cameratoegang toe in de instellingen en probeer opnieuw.",
    allowLibrary: "Sta toegang tot de fotobibliotheek toe in de instellingen en probeer opnieuw.",
    openSettings: "Instellingen openen",
    pasteValidLink: "Plak een geldige Breview-sessielink.",
    acceptSafetyTerms: "Accepteer de gebruiksvoorwaarden voordat je een sessie aanmaakt.",
    cameraMissing: "Cameratoegang is nodig om een foto te maken.",
    libraryMissing: "Toegang tot de fotobibliotheek is nodig om een afbeelding te kiezen.",
    selectImageFirst: "Selecteer eerst een afbeelding.",
    aiIdentificationFailed: "AI-herkenning mislukt",
    saveAtLeastOneRating: "Sla minstens één beoordeling op.",
    generalError: "Er ging iets mis. Probeer opnieuw.",
    send: "Verzenden",
  },
  publicInfo: {
    privacyEyebrow: "Breview privacy",
    privacyTitle: "Privacybeleid",
    privacySections: [
      {
        title: "Welke gegevens Breview verwerkt",
        paragraphs: [
          "Breview slaat sessienamen, dranknamen, bijnamen van gebruikers, beoordelingen, opmerkingen en door de gebruiker geüploade afbeeldingen op. Als je inlogt via e-mail, slaat Breview je e-mailadres, accountsessies en je gekoppelde beoordelingsgeschiedenis op.",
          "De app gebruikt een apparaat- of browserspecifieke technische identifier, zodat beoordelingen die op hetzelfde apparaat zijn gemaakt, kunnen worden gevonden en na het inloggen aan je account kunnen worden gekoppeld. De identifier wordt niet gebruikt voor reclame."
        ]
      },
      {
        title: "Hoe de gegevens worden gebruikt",
        paragraphs: [
          "Gegevens worden gebruikt om proeverijsessies te maken, deze te delen, beoordelingen op te slaan, resultaten weer te geven, inloggen te verwerken, misbruik te beperken en problemen met de dienst op te lossen.",
          "Naamherkenning van afbeeldingen wordt verwerkt via Cloudflare Workers AI. Geüploade afbeeldingen worden opgeslagen in Cloudflare R2, zodat sessies en resultaten de bijgevoegde afbeeldingen kunnen weergeven."
        ]
      },
      {
        title: "Diensten en delen",
        paragraphs: [
          "Breview gebruikt Cloudflare Workers, een D1-database, R2-opslag, Workers AI en Cloudflare Email Service. Breview bevat geen advertentie- of trackingbibliotheken van derden.",
          "Sessielinks kunnen worden gedeeld. Iedereen met een sessielink kan de sessie, de bijbehorende dranken en zichtbare resultaten zien. Voeg geen informatie toe aan opmerkingen die je niet met andere deelnemers wilt delen."
        ]
      },
      {
        title: "Account verwijderen en contact",
        paragraphs: [
          "Een ingelogde gebruiker kan zijn account verwijderen via de Breview-accountweergave. De openbare instructiepagina bevindt zich op breview.ing/delete-account.",
          "Ondersteuningsverzoeken kunnen worden gestuerd naar support@breview.ing."
        ]
      }
    ],
    supportEyebrow: "Breview ondersteuning",
    supportTitle: "Ondersteuning",
    supportSections: [
      {
        title: "Contact",
        paragraphs: [
          "Als inloggen, het openen van een sessie, het uploaden van afbeeldingen of het verwijderen van een account niet werkt, stuur dan een bericht naar support@breview.ing.",
          "Vermeld je e-mailadres, sessielink, apparaattype en een korte beschrijving van wat er is gebeurd. Stuur geen inlogcodes of sessietokens."
        ]
      },
      {
        title: "Veelvoorkomende situaties",
        paragraphs: [],
        list: [
          "Als de inlogcode niet aankomt, controleer dan je spammap en vraag even later een nieuwe code aan.",
          "Als de gedeelde link de app niet opent, werkt dezelfde link ook in een browser op breview.ing.",
          "Als je camera of fotobibliotheek is geblokkeerd, verleen dan toestemming via de apparaatinstellingen en probeer het opnieuw.",
          "Om je account te verwijderen, gebruik je de accountweergave terwijl je bent ingelogd, of volg je de openbare instructies voor het verwijderen van een account."
        ]
      },
      {
        title: "Aanvullende informatie",
        paragraphs: [
          "Het privacybeleid staat op breview.ing/privacy. Instructies voor het verwijderen van een account staan op breview.ing/delete-account.",
          "Als je het onderhoud van Breview wilt steunen, kun je de makerspagina vinden op breview.ing/makers."
        ]
      }
    ],
    deleteAccountTitle: "Je Breview-account verwijderen",
    deleteAccountEyebrow: "Account verwijderen",
    deleteAccountSections: [
      {
        title: "De snelste manier om een account te verwijderen",
        paragraphs: [
          "Een verwijdering in de app wordt direct verwerkt. Je wordt uitgelogd, het account wordt verwijderd en spelersrijen, beoordelingen en opmerkingen die aan het account zijn gekoppeld, worden uit actieve spellen verwijderd."
        ],
        list: [
          "Open Breview op het web of in de mobiele app.",
          "Ga naar de Accountweergave en log in met een e-mailcode als je niet bent ingelogd.",
          "Selecteer Account verwijderen en bevestig de verwijdering."
        ]
      },
      {
        title: "Als je niet kunt inloggen",
        paragraphs: [
          "Stuur een verwijderingsverzoek naar support@breview.ing vanaf het e-mailadres dat je voor je Breview-account hebt gebruikt. Als je vanaf een ander adres schrijft, vragen we je het eigendom te verifiëren voordat we het account verwijderen."
        ]
      },
      {
        title: "Wat er wordt verwijderd",
        paragraphs: [
          "We verwijderen het e-mailadres van het account, actieve sessies en de spelersrijen, beoordelingen en opmerkingen die aan het account zijn gekoppeld. Wanneer een spelersrij wordt verwijderd, verschijnen de beoordelingen niet langer in de resultaten van de sessie.",
          "Sessies, dranklijsten en beoordelingen van andere deelnemers kunnen zichtbaar blijven, omdat ze niet uitsluitend aan één account toebehoren. Het verwijderen van een account verwijdert geen gegevens die door andere gebruikers zijn gedeeld of opgeslagen."
        ]
      },
      {
        title: "Wat er kan worden bewaard",
        paragraphs: [
          "Breview kan beperkte operationele loggegevens bewaren, zoals inlog- en verwijderingsgebeurtenissen, leveringsfouten, beveiligingsbeperkingen en servicefoutenlogboeken, om misbruik te voorkomen, voor probleemoplossing en voor wettelijke verplichtingen. Deze gegevens worden alleen bewaard zolang er een gerechtvaardigde behoefte is."
        ]
      },
      {
        title: "Tijdsbestek",
        paragraphs: [
          "Een in de app bevestigde verwijdering vindt onmiddellijk plaats. Verwijderingsverzoeken die per e-mail worden verzonden, worden meestal binnen 7 dagen verwerkt en maximaal binnen 30 dagen, tenzij voor het verifiëren van het verzoek aanvullende informatie nodig is."
        ]
      }
    ],
    emailLinkText: "Verwijderingsverzoek sturen"
  }
};
