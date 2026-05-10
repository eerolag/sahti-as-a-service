import { Coffee, ExternalLink, Heart, Home } from "lucide-react";
import { useEffect } from "react";
import makersImageUrl from "../../../../makers-image.png";
import { supportConfig } from "../config/support";

export function MakersRoute() {
  const hasPaymentUrl = supportConfig.paymentUrl.length > 0;

  useEffect(() => {
    document.title = supportConfig.title;
    return () => {
      document.title = "Breview";
    };
  }, []);

  return (
    <main className="makers-page">
      <section className="makers-hero">
        <div className="makers-hero__copy">
          <a className="makers-home-link" href="/" aria-label="Back to Breview home">
            <Home size={16} aria-hidden="true" />
            Breview
          </a>

          <div className="makers-kicker">
            <Heart size={16} aria-hidden="true" />
            Support Breview
          </div>

          <h1 className="makers-title">{supportConfig.title}</h1>
          <p className="makers-subtitle">{supportConfig.subtitle}</p>

          <div className="makers-actions">
            {hasPaymentUrl ? (
              <a
                className="btn btn-primary makers-cta"
                href={supportConfig.paymentUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Coffee size={18} aria-hidden="true" />
                {supportConfig.ctaLabel}
                <ExternalLink size={16} aria-hidden="true" />
              </a>
            ) : (
              <button className="btn btn-primary makers-cta" type="button" disabled>
                <Coffee size={18} aria-hidden="true" />
                {supportConfig.ctaLabel}
              </button>
            )}

            <div className="makers-support-note">
              {hasPaymentUrl
                ? supportConfig.paymentLabel || "External checkout opens in a new tab."
                : "Support link coming soon."}
            </div>
          </div>
        </div>

        <figure className="makers-image-frame">
          <img
            className="makers-image"
            src={makersImageUrl}
            alt="The five Breview makers at a cozy pub table"
          />
        </figure>
      </section>

      <section className="makers-copy-grid" aria-label="About the makers">
        <article className="makers-panel">
          <h2>How this got started</h2>
          <p>
            Breview started as an idea between five friends around tasting notes. It helps groups rate,
            compare and discuss drinks with slightly more structure than a napkin and blind confidence.
          </p>
        </article>

        <article className="makers-panel makers-panel--warm">
          <h2>The research budget</h2>
          <p>
            If Breview made your tasting session smoother, funnier or only slightly more statistically
            questionable, you can support the project with a coffee.
          </p>
          <p className="makers-small-print">
            No pressure. The app works either way. Support helps keep the app maintained, reviewed and available.
          </p>
        </article>
      </section>

      <footer className="makers-footer">
        <span>Made by {supportConfig.makerName}</span>
        <div className="flex flex-wrap gap-3">
          <a className="inline-link" href="/">
            Back to Breview
          </a>
          <a className="inline-link" href="/support">
            Support
          </a>
          <a className="inline-link" href="/privacy">
            Privacy
          </a>
        </div>
      </footer>
    </main>
  );
}
