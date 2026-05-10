import {
  SUPPORT_CTA_LABEL,
  SUPPORT_MAKER_NAME,
  SUPPORT_PAGE_SUBTITLE,
  SUPPORT_PAGE_TITLE,
} from "@breview/shared/support";

function readPublicEnv(name: string): string {
  const value = import.meta.env[name];
  return typeof value === "string" ? value.trim() : "";
}

export const supportConfig = {
  makerName: SUPPORT_MAKER_NAME,
  title: SUPPORT_PAGE_TITLE,
  subtitle: SUPPORT_PAGE_SUBTITLE,
  ctaLabel: SUPPORT_CTA_LABEL,
  // Public external payment link. It can point to any provider-owned checkout page.
  paymentUrl: readPublicEnv("SUPPORT_PAYMENT_URL"),
  paymentLabel: readPublicEnv("SUPPORT_PAYMENT_LABEL"),
};

