import { ExternalLink, Home, Mail } from "lucide-react";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { useT, useI18n } from "../i18n/i18nContext";

export type PublicInfoPage = "privacy" | "support" | "delete-account";

const SUPPORT_EMAIL = "support@breview.ing";

function PageShell({
  page,
  eyebrow,
  title,
  children,
}: {
  page: PublicInfoPage;
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  const t = useT();
  const { locale } = useI18n();

  useEffect(() => {
    document.title = `${title} | Breview`;
    return () => {
      document.title = "Breview";
    };
  }, [title]);

  return (
    <main className="public-page" lang={locale}>
      <nav className="public-nav" aria-label="Breview pages">
        <a className="makers-home-link" href="/">
          <Home size={16} aria-hidden="true" />
          Breview
        </a>
        <div className="public-nav__links">
          <a className="inline-link" href="/privacy">
            {t.nav.privacy}
          </a>
          <a className="inline-link" href="/support">
            {t.nav.support}
          </a>
          <a className="inline-link" href="/delete-account">
            {t.nav.deleteAccount}
          </a>
        </div>
      </nav>

      <section className="public-hero">
        <div className="public-kicker">{eyebrow}</div>
        <h1 className="public-title">{title}</h1>
      </section>

      <div className="public-content">{children}</div>
    </main>
  );
}

function SectionContent({ section }: { section: { title: string; paragraphs: readonly string[]; list?: readonly string[] } }) {
  return (
    <section className="public-panel">
      <h2>{section.title}</h2>
      {section.paragraphs.map((p, idx) => (
        <p key={idx}>{p}</p>
      ))}
      {section.list && section.list.length > 0 ? (
        <ul className="public-list">
          {section.list.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function PrivacyPage() {
  const t = useT();
  return (
    <PageShell page="privacy" eyebrow={t.publicInfo.privacyEyebrow} title={t.publicInfo.privacyTitle}>
      {t.publicInfo.privacySections.map((section, idx) => (
        <SectionContent key={idx} section={section} />
      ))}
    </PageShell>
  );
}

function SupportPage() {
  const t = useT();
  return (
    <PageShell page="support" eyebrow={t.publicInfo.supportEyebrow} title={t.publicInfo.supportTitle}>
      {t.publicInfo.supportSections.map((section, idx) => (
        <SectionContent key={idx} section={section} />
      ))}
    </PageShell>
  );
}

function DeleteAccountPage() {
  const t = useT();
  return (
    <PageShell page="delete-account" eyebrow={t.publicInfo.deleteAccountEyebrow} title={t.publicInfo.deleteAccountTitle}>
      <section className="public-panel public-panel--important">
        <h2>{t.publicInfo.deleteAccountSections[0].title}</h2>
        {t.publicInfo.deleteAccountSections[0].list ? (
          <ol className="public-list public-list--ordered">
            {t.publicInfo.deleteAccountSections[0].list.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ol>
        ) : null}
        {t.publicInfo.deleteAccountSections[0].paragraphs.map((p, idx) => (
          <p key={idx}>{p}</p>
        ))}
      </section>

      <section className="public-panel">
        <h2>{t.publicInfo.deleteAccountSections[1].title}</h2>
        {t.publicInfo.deleteAccountSections[1].paragraphs.map((p, idx) => (
          <p key={idx}>{p}</p>
        ))}
        <a className="btn btn-primary public-mail-cta no-underline" href={`mailto:${SUPPORT_EMAIL}?subject=Breview%20account%20deletion`}>
          <Mail size={18} aria-hidden="true" />
          {t.publicInfo.emailLinkText}
          <ExternalLink size={16} aria-hidden="true" />
        </a>
      </section>

      {t.publicInfo.deleteAccountSections.slice(2).map((section, idx) => (
        <SectionContent key={idx + 2} section={section} />
      ))}
    </PageShell>
  );
}

export function PublicInfoRoute({ page }: { page: PublicInfoPage }) {
  if (page === "privacy") return <PrivacyPage />;
  if (page === "support") return <SupportPage />;
  return <DeleteAccountPage />;
}
