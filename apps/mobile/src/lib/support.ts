import {
  SUPPORT_CTA_LABEL,
  SUPPORT_MAKER_NAME,
  SUPPORT_PAGE_DEFAULT_URL,
} from "@breview/shared/support";

function readExpoPublicEnv(name: string): string {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : "";
}

export const mobileSupportConfig = {
  makerName: SUPPORT_MAKER_NAME,
  ctaLabel: SUPPORT_CTA_LABEL,
  // Public web page only. Mobile opens this URL externally; it does not handle payments natively.
  pageUrl: readExpoPublicEnv("EXPO_PUBLIC_SUPPORT_PAGE_URL") || SUPPORT_PAGE_DEFAULT_URL,
  supportUrl: "https://breview.ing/support",
  privacyUrl: "https://breview.ing/privacy",
  deleteAccountUrl: "https://breview.ing/delete-account",
};
