import type { Translations } from "./types";

export const en: Translations = {
  locale: "en",
  welcome: {
    sessionTerm: "session",
    flightTerm: "flight",
    welcomeTitle: "Welcome to Breview",
    welcomeSubtitle: "Create a tasting session, invite tasters, and reveal results together.",
    createStep: "Add the drinks in the flight.",
    inviteStep: "Share the unguessable session link.",
    revealStep: "Reveal results at the end.",
    start: "Get started",
  },
  nav: {
    home: "Home",
    account: "Account",
    sessions: "Sessions",
    privacy: "Privacy",
    support: "Support",
    deleteAccount: "Delete account",
    backToHome: "Back to home",
    language: "Language",
  },
  home: {
    session: "Tasting session",
    sessionName: "Session name",
    drink: "Drink",
    oneDrink: "1 drink",
    multipleDrinks: "{count} drinks",
    openMenu: "Open menu",
    createSession: "Create session",
    joinSession: "Join session",
    createSessionSubtitle: "Name the session, add drinks, and share the link.",
    openSharedLink: "Open shared session link",
    openSessionLink: "Open session link",
    openSessionLinkSubtitle: "Paste a Breview link to join or continue a session.",
    open: "Open",
    join: "Join",
    recent: "Recent",
    noRecentGames: "No recent sessions yet.",
    sessionSettings: "Session settings",
    settingsDescription: "Choose the rating method and when results are visible.",
    ratingMode: "Rating mode",
    slider: "Slider",
    stars: "Stars",
    results: "Results",
    revealAtEnd: "Reveal at the end",
    showAfterSubmit: "Show after submitting",
    showImmediately: "Show immediately",
    scale: "Scale",
    custom: "Custom",
    minLabel: "Min",
    maxLabel: "Max",
    stepLabel: "Step",
    safetyCheckbox: "I will only add appropriate content and understand that names, images, and comments are visible to anyone with the link.",
    addMultipleImages: "Add multiple images",
    queued: "Queued",
    running: "Running",
    done: "Done",
    fixManually: "Fix manually",
    optionalComment: "Comment (optional)",
    ratings: "ratings",
  },
  game: {
    session: "Session",
    sessionNumber: "Session",
    loading: "Loading...",
    error: "Error",
    unknownAddress: "Unknown address",
    editSession: "Edit session",
    settings: "Settings",
    drinks: "drinks",
    nickname: "Nickname",
    notSet: "Not set",
    change: "(Change)",
    reportSession: "Report session",
    rate: "Rate",
    resultsTab: "Results",
    save: "Save",
    saving: "Saving...",
    saved: "Saved",
    sortedByAverage: "Sorted by average",
    players: "Players",
    anonymousPlayer: "Anonymous player",
    noPlayersYet: "No players yet",
    refreshResults: "Refresh results",
    refreshing: "Refreshing...",
    shareResults: "Share results",
    revealResults: "Reveal results",
    joinWithNickname: "Join session with a nickname",
    leaveEmptyForAutoName: "Leave empty for an automatic name (e.g. Anonymous taster 112).",
    nicknameOptionalLabel: "Nickname (optional)",
    nicknamePlaceholder: "e.g. Taster",
    continueToSession: "Continue to session",
    cancel: "Cancel",
    backToSession: "Back to session",
    resultsShareTitle: "results",
    resultsShareText: "Check out the session",
    linkCopied: "Link copied",
    reportContent: "Report content",
    retry: "Try again",
  },
  editor: {
    createNewSession: "Create new session",
    editSession: "Edit session",
    sessionNameRequired: "Session name and drink name are required.",
    dragDesktop: "Drag drinks by the handle (⋮⋮) to reorder.",
    dragMobile: "Change drink order from the Row menu.",
    sessionNameLabel: "Session name",
    sessionNamePlaceholder: "e.g. Breview evening",
    nameDrink: "Name the drink",
    drink: "Drink",
    rowLabel: "Row",
    row: "Row",
    changeRowOrder: "Change row order",
    remove: "Remove",
    nameLabel: "Name",
    namePlaceholder: "e.g. Pale Ale",
    imageOptional: "Image (optional)",
    noImage: "No image",
    imagePreview: "Drink image preview",
    imagePreviewFor: "Drink image preview for",
    imageSelected: "Image selected",
    changeImage: "Change image",
    selectImage: "Select image",
    camera: "Camera",
    gallery: "Gallery",
    fileUploadNote: "File will be uploaded to server (max 10 MB, recommended max 6000×6000 px).",
    identifyWithAI: "Identify name with AI",
    identifyWithAi: "Identify name with AI",
    identifying: "Identifying...",
    identifyingName: "Identifying name...",
    identifiedName: "Identified",
    identificationFailed: "Identification failed",
    externalSearch: "External search",
    openSearch: "Open search",
    saveAndCreate: "Save and create session",
    saveChanges: "Save changes",
    addDrink: "+ Add drink",
    savingEllipsis: "Saving...",
    cancelLabel: "Cancel",
    dragHandle: "Drag to reorder",
    queuedForRecognition: "Queued for recognition",
    safetyTerms: "I will only add appropriate content and understand that names, images, and comments are visible to anyone with the link.",
  },
  beerCard: {
    noImage: "No image",
    report: "Report",
    externalSearch: "External search",
    average: "average",
    ratings: "ratings",
    commentOptional: "Comment (optional)",
    scoreFor: "Score for",
    scoreNumericFor: "Numeric score for",
    commentFor: "Comment for",
  },
  share: {
    inviteTasters: "Invite tasters",
    shareDescription: "Share the unguessable session link with participants.",
    copySessionLink: "Copy session link",
    copied: "Copied!",
    hideQR: "Hide QR",
    qr: "QR",
    shareSession: "Share session",
    copyHostLink: "Copy host link",
    creatingQR: "Creating QR code...",
    scanQR: "Scan QR to open the session",
    loadingEllipsis: "Loading...",
    joinSession: "Join Breview session",
  },
  account: {
    title: "Account",
    loggedIn: "Logged in",
    saveHistory: "Save history",
    enterEmailPrompt: "Enter your email and we'll send a one-time code.",
    emailLabel: "Email",
    newCodeIn: "New code in",
    resendCode: "Resend code",
    sendCode: "Send code",
    canRequestNewCode: "You can request a new login code shortly.",
    codeLabel: "Code",
    login: "Log in",
    codeSent: "Code sent. Check your email and enter the six-digit code.",
    loginSuccess: "Login successful.",
    dataAndSupport: "Data & support",
    logout: "Log out",
    deleteAccount: "Delete account",
    deleteAccountInstructions: "Account deletion instructions",
    confirmDelete: "Delete account and linked reviews?",
    accountDeleted: "Account deleted.",
    deleteSuccess: "Account deleted.",
    noHistory: "No reviews linked to this account yet.",
    noReviewsYet: "No reviews yet.",
    ratingsCount: "ratings",
    reviewsCount: "reviews",
    noDate: "No date",
    privacyToggle: "Privacy",
    privacyStatement: "Privacy policy",
    privacyDescription: [
      "Breview uses your email address only for login and finding your reviews. Reviews store your nickname, scores, comments, session details, and any uploaded images.",
      "A technical identifier is stored in your browser or app to link previous reviews to your account after login. One-time codes expire in 10 minutes.",
      "Data is used for creating sessions, saving reviews, showing results, and preventing abuse. Logged-in users can delete their account from this page.",
    ],
    notLoggedIn: "Not logged in",
    myReviews: "My reviews",
    historyTitle: "Save review history",
    myReviewsSubtitle: "Sessions linked to this account.",
    historySubtitle: "Log in with email to save and find your reviews.",
    newCodeWait: "New code in {seconds} s",
    sendNewCode: "Send new code",
    codeCooldown: "You can request a new login code shortly.",
    manageAccountOnlyForLoggedIn: "Account actions are available when you are logged in.",
    deleteConfirm: "Delete account and linked reviews?",
    deleteAccountAction: "Delete account",
    codeSentMessage: "Code sent. Check your email.",
  },
  errors: {
    giveSessionName: "Please give the session a name",
    nameAllDrinks: "Name all drinks or remove the empty row",
    addAtLeastOneDrink: "Add at least one drink",
    acceptSafety: "Accept the safe-use terms before creating a session.",
    useBreviewLink: "Use a Breview shared session link.",
    notBreviewLink: "This link doesn't look like a Breview session link.",
    pasteFullLink: "Paste the full Breview session link.",
    sharingFailed: "Sharing failed",
    revealFailed: "Revealing results failed",
    reportingOnNewOnly: "Reporting is available on new session links.",
    reportPrompt: "Briefly describe what is inappropriate about the content.",
    reportReceived: "Report received. Thank you.",
    reportFailed: "Sending report failed",
    copyFailed: "Copy failed",
    qrFailed: "QR code creation failed",
    hostCopyFailed: "Copying host link failed",
    urlCopyFailed: "Copying URL failed",
    pageNotOpened: "Page could not be opened",
    cameraDenied: "Camera permission denied",
    libraryDenied: "Photo library permission denied",
    allowCamera: "Allow camera access in settings and try again.",
    allowLibrary: "Allow photo library access in settings and try again.",
    openSettings: "Open settings",
    pasteValidLink: "Paste a valid Breview session link.",
    acceptSafetyTerms: "Accept the safe-use terms before creating a session.",
    cameraMissing: "Camera permission is required to take a photo.",
    libraryMissing: "Photo library permission is required to choose an image.",
    selectImageFirst: "Select an image first.",
    aiIdentificationFailed: "AI identification failed",
    saveAtLeastOneRating: "Save at least one rating.",
    generalError: "Something went wrong. Try again.",
    send: "Send",
  },
  publicInfo: {
    privacyEyebrow: "Breview privacy",
    privacyTitle: "Privacy Policy",
    privacySections: [
      {
        title: "What data Breview processes",
        paragraphs: [
          "Breview stores session names, drink names, user nicknames, ratings, comments, and images uploaded by the user. If you log in via email, Breview stores your email address, account sessions, and your linked rating history.",
          "The app uses a device or browser-specific technical identifier so that reviews made on the same device can be found and linked to your account upon login. The identifier is not used for advertising."
        ]
      },
      {
        title: "How the data is used",
        paragraphs: [
          "Data is used to create tasting sessions, share them, save ratings, display results, process logins, restrict abuse, and troubleshoot the service.",
          "Image name recognition is processed via Cloudflare Workers AI. Uploaded images are stored in Cloudflare R2 so sessions and results can display the attached images."
        ]
      },
      {
        title: "Services and sharing",
        paragraphs: [
          "Breview uses Cloudflare Workers, a D1 database, R2 storage, Workers AI, and Cloudflare Email Service. Breview does not contain third-party advertising or tracking libraries.",
          "Session links are shareable. Anyone with a session link can see the session, its drinks, and visible results. Do not add information to comments that you do not wish to share with other participants."
        ]
      },
      {
        title: "Account deletion and contact",
        paragraphs: [
          "A logged-in user can delete their account from the Breview account view. The public instruction page is at breview.ing/delete-account.",
          "Support requests can be sent to support@breview.ing."
        ]
      }
    ],
    supportEyebrow: "Breview support",
    supportTitle: "Support",
    supportSections: [
      {
        title: "Contact",
        paragraphs: [
          "If login, opening a session, uploading images, or account deletion is not working, send a message to support@breview.ing.",
          "Include your email address, session link, device type, and a short description of what happened. Do not send login codes or session tokens."
        ]
      },
      {
        title: "Common situations",
        paragraphs: [],
        list: [
          "If the login code doesn't arrive, check your spam folder and request a new code in a moment.",
          "If the shared link doesn't open the app, the same link also works in a browser at breview.ing.",
          "If your camera or photo library is blocked, grant permission from device settings and try again.",
          "To delete your account, use the account view while logged in, or follow the public deletion request instructions."
        ]
      },
      {
        title: "Additional info",
        paragraphs: [
          "The privacy policy is at breview.ing/privacy. Account deletion instructions are at breview.ing/delete-account.",
          "If you want to support maintaining Breview, the makers page is at breview.ing/makers."
        ]
      }
    ],
    deleteAccountTitle: "Deleting your Breview account",
    deleteAccountEyebrow: "Account deletion",
    deleteAccountSections: [
      {
        title: "The fastest way to delete an account",
        paragraphs: [
          "A deletion done in the app is processed immediately. You will be logged out, the account will be deleted, and player rows, ratings, and comments linked to the account will be removed from active games."
        ],
        list: [
          "Open Breview on the web or in the mobile app.",
          "Go to the Account view and log in with an email code if you aren't logged in.",
          "Select Delete account and confirm the deletion."
        ]
      },
      {
        title: "If you cannot log in",
        paragraphs: [
          "Send a deletion request to support@breview.ing from the email address you used for your Breview account. If you write from a different address, we will ask you to verify ownership before deletion."
        ]
      },
      {
        title: "What gets deleted",
        paragraphs: [
          "We delete the account's email address, active sessions, and the player rows, ratings, and comments linked to the account. When a player row is removed, its ratings no longer appear in the session's results.",
          "Sessions, drink lists, and ratings from other participants may remain visible, as they do not belong exclusively to one account. Deleting an account does not delete data shared or saved by other users."
        ]
      },
      {
        title: "What may be retained",
        paragraphs: [
          "Breview may retain limited operational log data such as login and deletion events, delivery errors, security limitations, and service error logs for abuse prevention, troubleshooting, and legal obligations. This data is retained only as long as there is a justified need."
        ]
      },
      {
        title: "Timeline",
        paragraphs: [
          "A deletion confirmed in the app happens immediately. Deletion requests sent by email are usually processed within 7 days and at most within 30 days, unless verifying the request requires additional information."
        ]
      }
    ],
    emailLinkText: "Send deletion request"
  }
};
