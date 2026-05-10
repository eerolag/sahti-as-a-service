export const SUPPORTED_LOCALES = [
  "fi",
  "en",
  "es",
  "pt-BR",
  "fr",
  "de",
  "zh-Hans",
  "hi",
  "ar",
  "bn",
  "id",
  "ru",
  "ur",
] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

const LOCALE_ALIASES: Record<string, SupportedLocale> = {
  pt: "pt-BR",
  zh: "zh-Hans",
  "zh-cn": "zh-Hans",
  "zh-sg": "zh-Hans",
};

export function resolveLocale(preferredLocales: readonly string[] = []): SupportedLocale {
  for (const rawLocale of preferredLocales) {
    const locale = String(rawLocale ?? "").trim();
    if (!locale) continue;

    const normalized = locale.replace("_", "-");
    const exact = SUPPORTED_LOCALES.find((item) => item.toLowerCase() === normalized.toLowerCase());
    if (exact) return exact;

    const lower = normalized.toLowerCase();
    const alias = LOCALE_ALIASES[lower];
    if (alias) return alias;

    const language = lower.split("-")[0];
    const languageAlias = LOCALE_ALIASES[language];
    if (languageAlias) return languageAlias;

    const byLanguage = SUPPORTED_LOCALES.find((item) => item.toLowerCase().split("-")[0] === language);
    if (byLanguage) return byLanguage;
  }

  return "en";
}

export function isRtlLocale(locale: SupportedLocale): boolean {
  return locale === "ar" || locale === "ur";
}

export interface WelcomeCopy {
  sessionTerm: string;
  flightTerm: string;
  welcomeTitle: string;
  welcomeSubtitle: string;
  createStep: string;
  inviteStep: string;
  revealStep: string;
}

export const WELCOME_COPY: Record<SupportedLocale, WelcomeCopy> = {
  fi: {
    sessionTerm: "sessio",
    flightTerm: "maistelusarja",
    welcomeTitle: "Tervetuloa Breviewiin",
    welcomeSubtitle: "Luo maistelusessio, jaa linkki ja paljasta tulokset yhdessä.",
    createStep: "Lisää arvioitavat juomat.",
    inviteStep: "Jaa arvaamaton sessiolinkki.",
    revealStep: "Paljasta tulokset lopussa.",
  },
  en: {
    sessionTerm: "session",
    flightTerm: "flight",
    welcomeTitle: "Welcome to Breview",
    welcomeSubtitle: "Create a tasting session, invite tasters, and reveal results together.",
    createStep: "Add the drinks in the flight.",
    inviteStep: "Share the unguessable session link.",
    revealStep: "Reveal results at the end.",
  },
  es: {
    sessionTerm: "sesión",
    flightTerm: "flight",
    welcomeTitle: "Bienvenido a Breview",
    welcomeSubtitle: "Crea una sesión de cata, invita al grupo y revela los resultados.",
    createStep: "Añade las bebidas a catar.",
    inviteStep: "Comparte el enlace seguro de la sesión.",
    revealStep: "Revela los resultados al final.",
  },
  "pt-BR": {
    sessionTerm: "sessão",
    flightTerm: "flight",
    welcomeTitle: "Boas-vindas ao Breview",
    welcomeSubtitle: "Crie uma sessão de degustação, convide pessoas e revele os resultados.",
    createStep: "Adicione as bebidas da degustação.",
    inviteStep: "Compartilhe o link seguro da sessão.",
    revealStep: "Revele os resultados no fim.",
  },
  fr: {
    sessionTerm: "session",
    flightTerm: "flight",
    welcomeTitle: "Bienvenue sur Breview",
    welcomeSubtitle: "Créez une session de dégustation, invitez les participants et révélez les résultats.",
    createStep: "Ajoutez les boissons à évaluer.",
    inviteStep: "Partagez le lien sécurisé de la session.",
    revealStep: "Révélez les résultats à la fin.",
  },
  de: {
    sessionTerm: "Session",
    flightTerm: "Flight",
    welcomeTitle: "Willkommen bei Breview",
    welcomeSubtitle: "Erstelle eine Verkostungssession, lade Gäste ein und zeige die Ergebnisse am Ende.",
    createStep: "Füge die Getränke hinzu.",
    inviteStep: "Teile den sicheren Session-Link.",
    revealStep: "Zeige die Ergebnisse am Ende.",
  },
  "zh-Hans": {
    sessionTerm: "场次",
    flightTerm: "品鉴组",
    welcomeTitle: "欢迎使用 Breview",
    welcomeSubtitle: "创建品鉴场次，邀请参与者，并在最后公布结果。",
    createStep: "添加要品鉴的饮品。",
    inviteStep: "分享难以猜到的场次链接。",
    revealStep: "在结束时公布结果。",
  },
  hi: {
    sessionTerm: "सेशन",
    flightTerm: "फ्लाइट",
    welcomeTitle: "Breview में आपका स्वागत है",
    welcomeSubtitle: "टेस्टिंग सेशन बनाएं, लोगों को आमंत्रित करें और अंत में परिणाम दिखाएं।",
    createStep: "चखने वाली ड्रिंक जोड़ें।",
    inviteStep: "सुरक्षित सेशन लिंक शेयर करें।",
    revealStep: "अंत में परिणाम दिखाएं।",
  },
  ar: {
    sessionTerm: "جلسة",
    flightTerm: "مجموعة تذوق",
    welcomeTitle: "مرحبًا بك في Breview",
    welcomeSubtitle: "أنشئ جلسة تذوق، وادع المشاركين، ثم اكشف النتائج في النهاية.",
    createStep: "أضف المشروبات للتقييم.",
    inviteStep: "شارك رابط الجلسة الآمن.",
    revealStep: "اكشف النتائج في النهاية.",
  },
  bn: {
    sessionTerm: "সেশন",
    flightTerm: "ফ্লাইট",
    welcomeTitle: "Breview-এ স্বাগতম",
    welcomeSubtitle: "টেস্টিং সেশন তৈরি করুন, সবাইকে আমন্ত্রণ জানান, শেষে ফলাফল দেখান।",
    createStep: "রিভিউ করার পানীয় যোগ করুন।",
    inviteStep: "নিরাপদ সেশন লিংক শেয়ার করুন।",
    revealStep: "শেষে ফলাফল দেখান।",
  },
  id: {
    sessionTerm: "sesi",
    flightTerm: "flight",
    welcomeTitle: "Selamat datang di Breview",
    welcomeSubtitle: "Buat sesi tasting, undang penilai, lalu tampilkan hasil bersama.",
    createStep: "Tambahkan minuman yang dinilai.",
    inviteStep: "Bagikan tautan sesi yang aman.",
    revealStep: "Tampilkan hasil di akhir.",
  },
  ru: {
    sessionTerm: "сессия",
    flightTerm: "сет",
    welcomeTitle: "Добро пожаловать в Breview",
    welcomeSubtitle: "Создайте дегустационную сессию, пригласите участников и откройте результаты в конце.",
    createStep: "Добавьте напитки для оценки.",
    inviteStep: "Поделитесь безопасной ссылкой на сессию.",
    revealStep: "Откройте результаты в конце.",
  },
  ur: {
    sessionTerm: "سیشن",
    flightTerm: "فلائٹ",
    welcomeTitle: "Breview میں خوش آمدید",
    welcomeSubtitle: "چکھنے کا سیشن بنائیں، لوگوں کو مدعو کریں، اور آخر میں نتائج دکھائیں۔",
    createStep: "جائزے کے لیے مشروبات شامل کریں۔",
    inviteStep: "محفوظ سیشن لنک شیئر کریں۔",
    revealStep: "آخر میں نتائج دکھائیں۔",
  },
};

export function getWelcomeCopy(preferredLocales: readonly string[] = []): WelcomeCopy & { locale: SupportedLocale; dir: "ltr" | "rtl" } {
  const locale = resolveLocale(preferredLocales);
  return {
    locale,
    dir: isRtlLocale(locale) ? "rtl" : "ltr",
    ...WELCOME_COPY[locale],
  };
}
