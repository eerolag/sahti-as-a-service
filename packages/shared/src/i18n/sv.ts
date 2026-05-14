import type { Translations } from "./types";

export const sv: Translations = {
  locale: "sv",
  welcome: {
    sessionTerm: "session",
    flightTerm: "provning",
    welcomeTitle: "Välkommen till Breview",
    welcomeSubtitle: "Skapa en provningssession, dela länken och avslöja resultaten tillsammans.",
    createStep: "Lägg till dryckerna i provningen.",
    inviteStep: "Dela den säkra sessionslänken.",
    revealStep: "Avslöja resultaten i slutet.",
    start: "Kom igång",
  },
  nav: {
    home: "Hem",
    account: "Konto",
    sessions: "Sessioner",
    privacy: "Integritet",
    support: "Support",
    deleteAccount: "Radera konto",
    backToHome: "Tillbaka till startsidan",
    language: "Språk",
  },
  home: {
    session: "Provningssession",
    sessionName: "Sessionsnamn",
    drink: "Dryck",
    oneDrink: "1 dryck",
    multipleDrinks: "{count} drycker",
    openMenu: "Öppna meny",
    createSession: "Skapa session",
    joinSession: "Gå med i session",
    createSessionSubtitle: "Namnge sessionen, lägg till drycker och dela länken.",
    openSharedLink: "Öppna delad sessionslänk",
    openSessionLink: "Öppna sessionslänk",
    openSessionLinkSubtitle: "Klistra in en Breview-länk för att gå med eller fortsätta en session.",
    open: "Öppna",
    join: "Gå med",
    recent: "Senaste",
    noRecentGames: "Inga senaste sessioner ännu.",
    sessionSettings: "Sessionsinställningar",
    settingsDescription: "Välj bedömningsmetod och när resultaten visas.",
    ratingMode: "Bedömningsmetod",
    slider: "Slider",
    stars: "Stjärnor",
    results: "Resultat",
    revealAtEnd: "Avslöja i slutet",
    showAfterSubmit: "Visa efter att ha sparat",
    showImmediately: "Visa direkt",
    scale: "Skala",
    custom: "Anpassad",
    minLabel: "Min",
    maxLabel: "Max",
    stepLabel: "Steg",
    safetyCheckbox: "Jag lägger bara till lämpligt innehåll och förstår att namn, bilder och kommentarer syns för alla med länken.",
    addMultipleImages: "Lägg till flera bilder",
    queued: "I kö",
    running: "Pågår",
    done: "Klar",
    fixManually: "Rätta manuellt",
    optionalComment: "Kommentar (valfritt)",
    ratings: "betyg",
  },
  game: {
    session: "Session",
    sessionNumber: "Session",
    loading: "Laddar...",
    error: "Fel",
    unknownAddress: "Okänd adress",
    editSession: "Redigera session",
    settings: "Inställningar",
    drinks: "drycker",
    nickname: "Smeknamn",
    notSet: "Inte angivet",
    change: "(Ändra)",
    reportSession: "Rapportera session",
    rate: "Betygsätt",
    resultsTab: "Resultat",
    save: "Spara",
    saving: "Sparar...",
    saved: "Sparat",
    sortedByAverage: "Sorterat efter medelvärde",
    players: "Deltagare",
    anonymousPlayer: "Anonym deltagare",
    noPlayersYet: "Inga deltagare ännu",
    refreshResults: "Uppdatera resultat",
    refreshing: "Uppdaterar...",
    shareResults: "Dela resultat",
    revealResults: "Avslöja resultat",
    joinWithNickname: "Gå med i sessionen med ett smeknamn",
    leaveEmptyForAutoName: "Lämna tomt för ett automatiskt namn (t.ex. Anonym provare 112).",
    nicknameOptionalLabel: "Smeknamn (valfritt)",
    nicknamePlaceholder: "t.ex. Provare",
    continueToSession: "Fortsätt till sessionen",
    cancel: "Avbryt",
    backToSession: "Tillbaka till sessionen",
    resultsShareTitle: "resultat",
    resultsShareText: "Kolla in sessionens",
    linkCopied: "Länken kopierad",
    reportContent: "Rapportera innehåll",
    retry: "Försök igen",
  },
  editor: {
    createNewSession: "Skapa ny session",
    editSession: "Redigera session",
    sessionNameRequired: "Sessionsnamn och dryckens namn krävs.",
    dragDesktop: "Dra drycker med handtaget (⋮⋮) för att ändra ordning.",
    dragMobile: "Ändra ordning via Rad-menyn.",
    sessionNameLabel: "Sessionsnamn",
    sessionNamePlaceholder: "t.ex. Breview-kväll",
    nameDrink: "Namnge drycken",
    drink: "Dryck",
    rowLabel: "Rad",
    row: "Rad",
    changeRowOrder: "Ändra radordning",
    remove: "Ta bort",
    nameLabel: "Namn",
    namePlaceholder: "t.ex. Pale Ale",
    imageOptional: "Bild (valfritt)",
    noImage: "Ingen bild",
    imagePreview: "Förhandsvisning av dryckens bild",
    imagePreviewFor: "Förhandsvisning av bild för",
    imageSelected: "Bild vald",
    changeImage: "Byt bild",
    selectImage: "Välj bild",
    camera: "Kamera",
    gallery: "Galleri",
    fileUploadNote: "Filen laddas upp till servern (max 10 MB, rekommenderat max 6000×6000 px).",
    identifyWithAI: "Identifiera namn med AI",
    identifyWithAi: "Identifiera namn med AI",
    identifying: "Identifierar...",
    identifyingName: "Identifierar namn...",
    identifiedName: "Identifierat",
    identificationFailed: "Identifiering misslyckades",
    externalSearch: "Extern sökning",
    openSearch: "Öppna sökning",
    saveAndCreate: "Spara och skapa session",
    saveChanges: "Spara ändringar",
    addDrink: "+ Lägg till dryck",
    savingEllipsis: "Sparar...",
    cancelLabel: "Avbryt",
    dragHandle: "Dra för att ändra ordning",
    queuedForRecognition: "Köad för igenkänning",
    safetyTerms: "Jag lägger bara till lämpligt innehåll och förstår att namn, bilder och kommentarer syns för alla med länken.",
  },
  beerCard: {
    noImage: "Ingen bild",
    report: "Rapportera",
    externalSearch: "Extern sökning",
    average: "medelvärde",
    ratings: "betyg",
    commentOptional: "Kommentar (valfritt)",
    scoreFor: "Betyg för",
    scoreNumericFor: "Numeriskt betyg för",
    commentFor: "Kommentar för",
  },
  share: {
    inviteTasters: "Bjud in provare",
    shareDescription: "Dela den säkra sessionslänken med deltagarna.",
    copySessionLink: "Kopiera sessionslänk",
    copied: "Kopierat!",
    hideQR: "Dölj QR",
    qr: "QR",
    shareSession: "Dela session",
    copyHostLink: "Kopiera värdlänk",
    creatingQR: "Skapar QR-kod...",
    scanQR: "Skanna QR för att öppna sessionen",
    loadingEllipsis: "Laddar...",
    joinSession: "Gå med i Breview-session",
  },
  account: {
    title: "Konto",
    loggedIn: "Inloggad",
    saveHistory: "Spara historik",
    enterEmailPrompt: "Ange din e-post så skickar vi en engångskod.",
    emailLabel: "E-post",
    newCodeIn: "Ny kod om",
    resendCode: "Skicka ny kod",
    sendCode: "Skicka kod",
    canRequestNewCode: "Du kan begära en ny inloggningskod inom kort.",
    codeLabel: "Kod",
    login: "Logga in",
    codeSent: "Kod skickad. Kolla din e-post och ange den sexsiffriga koden.",
    loginSuccess: "Inloggningen lyckades.",
    dataAndSupport: "Data och support",
    logout: "Logga ut",
    deleteAccount: "Radera konto",
    deleteAccountInstructions: "Instruktioner för kontoradering",
    confirmDelete: "Radera kontot och länkade recensioner?",
    accountDeleted: "Kontot raderat.",
    deleteSuccess: "Kontot raderat.",
    noHistory: "Inga recensioner länkade till detta konto ännu.",
    noReviewsYet: "Inga recensioner ännu.",
    ratingsCount: "betyg",
    reviewsCount: "recensioner",
    noDate: "Inget datum",
    privacyToggle: "Integritet",
    privacyStatement: "Integritetspolicy",
    privacyDescription: [
      "Breview använder din e-postadress bara för inloggning och för att hitta dina recensioner. Recensioner sparar smeknamn, betyg, kommentarer, sessionsuppgifter och uppladdade bilder.",
      "En teknisk identifierare sparas i din webbläsare eller app för att kunna länka tidigare recensioner till ditt konto efter inloggning. Engångskoder går ut efter 10 minuter.",
      "Data används för att skapa sessioner, spara recensioner, visa resultat och förebygga missbruk. Inloggade användare kan radera sitt konto från den här sidan.",
    ],
    notLoggedIn: "Inte inloggad",
    myReviews: "Mina recensioner",
    historyTitle: "Spara recensionshistorik",
    myReviewsSubtitle: "Sessioner länkade till detta konto.",
    historySubtitle: "Logga in med e-post för att spara och hitta dina recensioner.",
    newCodeWait: "Ny kod om {seconds} s",
    sendNewCode: "Skicka ny kod",
    codeCooldown: "Du kan begära en ny inloggningskod inom kort.",
    manageAccountOnlyForLoggedIn: "Kontohantering är tillgänglig när du är inloggad.",
    deleteConfirm: "Radera kontot och länkade recensioner?",
    deleteAccountAction: "Radera konto",
    codeSentMessage: "Kod skickad. Kontrollera din e-post.",
  },
  errors: {
    giveSessionName: "Ge sessionen ett namn",
    nameAllDrinks: "Namnge alla drycker eller ta bort den tomma raden",
    addAtLeastOneDrink: "Lägg till minst en dryck",
    acceptSafety: "Godkänn villkoren för säker användning innan du skapar en session.",
    useBreviewLink: "Använd en delad Breview-sessionslänk.",
    notBreviewLink: "Länken ser inte ut som en Breview-sessionslänk.",
    pasteFullLink: "Klistra in hela Breview-sessionslänken.",
    sharingFailed: "Delning misslyckades",
    revealFailed: "Avslöjande av resultat misslyckades",
    reportingOnNewOnly: "Rapportering är tillgänglig på nya sessionslänkar.",
    reportPrompt: "Beskriv kort vad som är olämpligt med innehållet.",
    reportReceived: "Rapport mottagen. Tack.",
    reportFailed: "Rapporten kunde inte skickas",
    copyFailed: "Kopiering misslyckades",
    qrFailed: "QR-kod kunde inte skapas",
    hostCopyFailed: "Kopiering av värdlänk misslyckades",
    urlCopyFailed: "Kopiering av URL misslyckades",
    pageNotOpened: "Sidan kunde inte öppnas",
    cameraDenied: "Kameraåtkomst nekad",
    libraryDenied: "Åtkomst till bildbibliotek nekad",
    allowCamera: "Tillåt kameraåtkomst i inställningarna och försök igen.",
    allowLibrary: "Tillåt åtkomst till bildbibliotek i inställningarna och försök igen.",
    openSettings: "Öppna inställningar",
    pasteValidLink: "Klistra in en giltig Breview-sessionslänk.",
    acceptSafetyTerms: "Godkänn villkoren för säker användning innan du skapar en session.",
    cameraMissing: "Kameraåtkomst krävs för att ta en bild.",
    libraryMissing: "Åtkomst till bildbibliotek krävs för att välja en bild.",
    selectImageFirst: "Välj en bild först.",
    aiIdentificationFailed: "AI-identifiering misslyckades",
    saveAtLeastOneRating: "Spara minst ett betyg.",
    generalError: "Något gick fel. Försök igen.",
    send: "Skicka",
  },
  publicInfo: {
    privacyEyebrow: "Breview integritet",
    privacyTitle: "Integritetspolicy",
    privacySections: [
      {
        title: "Vilka data Breview behandlar",
        paragraphs: [
          "Breview sparar sessionsnamn, dryckesnamn, användarnas smeknamn, betyg, kommentarer och bilder som laddas upp av användaren. Om du loggar in via e-post sparar Breview din e-postadress, kontosessioner och din länkade betygshistorik.",
          "Appen använder en enhets- eller webbläsarspecifik teknisk identifierare så att recensioner gjorda på samma enhet kan hittas och länkas till ditt konto vid inloggning. Identifieraren används inte för reklam."
        ]
      },
      {
        title: "Hur datan används",
        paragraphs: [
          "Datan används för att skapa provningssessioner, dela dem, spara betyg, visa resultat, hantera inloggningar, begränsa missbruk och felsöka tjänsten.",
          "Bildnamnsigenkänning bearbetas via Cloudflare Workers AI. Uppladdade bilder lagras i Cloudflare R2 så att sessioner och resultat kan visa de bifogade bilderna."
        ]
      },
      {
        title: "Tjänster och delning",
        paragraphs: [
          "Breview använder Cloudflare Workers, en D1-databas, R2-lagring, Workers AI och Cloudflare Email Service. Breview innehåller inga annonserings- eller spårningsbibliotek från tredje part.",
          "Sessionslänkar kan delas. Vem som helst med en sessionslänk kan se sessionen, dess drycker och synliga resultat. Lägg inte till information i kommentarer som du inte vill dela med andra deltagare."
        ]
      },
      {
        title: "Kontoradering och kontakt",
        paragraphs: [
          "En inloggad användare kan radera sitt konto från Breviews kontovy. Den offentliga instruktionssidan finns på breview.ing/delete-account.",
          "Supportfrågor kan skickas till support@breview.ing."
        ]
      }
    ],
    supportEyebrow: "Breview support",
    supportTitle: "Support",
    supportSections: [
      {
        title: "Kontakt",
        paragraphs: [
          "Om inloggning, att öppna en session, att ladda upp bilder eller kontoradering inte fungerar, skicka ett meddelande till support@breview.ing.",
          "Inkludera din e-postadress, sessionslänk, enhetstyp och en kort beskrivning av vad som hände. Skicka inte inloggningskoder eller sessionstokens."
        ]
      },
      {
        title: "Vanliga situationer",
        paragraphs: [],
        list: [
          "Om inloggningskoden inte kommer fram, kontrollera din skräppost och begär en ny kod om en stund.",
          "Om den delade länken inte öppnar appen fungerar samma länk också i en webbläsare på breview.ing.",
          "Om din kamera eller ditt fotobibliotek är blockerat, ge behörighet från enhetens inställningar och försök igen.",
          "För att radera ditt konto, använd kontovyn när du är inloggad, eller följ instruktionerna för offentlig raderingsbegäran."
        ]
      },
      {
        title: "Mer information",
        paragraphs: [
          "Integritetspolicyn finns på breview.ing/privacy. Instruktioner för kontoradering finns på breview.ing/delete-account.",
          "Om du vill stödja underhållet av Breview finns skaparsidan på breview.ing/makers."
        ]
      }
    ],
    deleteAccountTitle: "Radering av ditt Breview-konto",
    deleteAccountEyebrow: "Kontoradering",
    deleteAccountSections: [
      {
        title: "Det snabbaste sättet att radera ett konto",
        paragraphs: [
          "En radering som görs i appen behandlas omedelbart. Du loggas ut, kontot raderas, och spelarrader, betyg och kommentarer länkade till kontot tas bort från aktiva spel."
        ],
        list: [
          "Öppna Breview på webben eller i mobilappen.",
          "Gå till Kontovyn och logga in med en e-postkod om du inte är inloggad.",
          "Välj Radera konto och bekräfta raderingen."
        ]
      },
      {
        title: "Om du inte kan logga in",
        paragraphs: [
          "Skicka en raderingsbegäran till support@breview.ing från den e-postadress du använde för ditt Breview-konto. Om du skriver från en annan adress kommer vi att be dig verifiera ägandeskapet innan radering."
        ]
      },
      {
        title: "Vad raderas",
        paragraphs: [
          "Vi raderar kontots e-postadress, aktiva sessioner och de spelarrader, betyg och kommentarer som är länkade till kontot. När en spelarrad tas bort syns dess betyg inte längre i sessionens resultat.",
          "Sessioner, dryckeslistor och betyg från andra deltagare kan finnas kvar synliga, eftersom de inte enbart tillhör ett konto. Att radera ett konto raderar inte data som delats eller sparats av andra användare."
        ]
      },
      {
        title: "Vad som kan behållas",
        paragraphs: [
          "Breview kan behålla begränsad operationell loggdata såsom inloggnings- och raderingshändelser, leveransfel, säkerhetsbegränsningar och tjänstefelloggar för att förhindra missbruk, för felsökning och juridiska skyldigheter. Denna data behålls endast så länge det finns ett motiverat behov."
        ]
      },
      {
        title: "Tidsram",
        paragraphs: [
          "En radering som bekräftats i appen sker omedelbart. Raderingsbegäranden som skickas via e-post behandlas vanligtvis inom 7 dagar och som mest inom 30 dagar, såvida inte verifiering av begäran kräver ytterligare information."
        ]
      }
    ],
    emailLinkText: "Skicka raderingsbegäran"
  }
};
