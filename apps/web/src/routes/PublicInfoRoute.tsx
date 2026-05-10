import { ExternalLink, Home, Mail } from "lucide-react";
import { useEffect } from "react";
import type { ReactNode } from "react";

export type PublicInfoPage = "privacy" | "support" | "delete-account";

const SUPPORT_EMAIL = "support@breview.ing";

const pageTitles: Record<PublicInfoPage, string> = {
  privacy: "Tietosuoja",
  support: "Tuki",
  "delete-account": "Tilin poistaminen",
};

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
  useEffect(() => {
    document.title = `${pageTitles[page]} | Breview`;
    return () => {
      document.title = "Breview";
    };
  }, [page]);

  return (
    <main className="public-page">
      <nav className="public-nav" aria-label="Breview pages">
        <a className="makers-home-link" href="/">
          <Home size={16} aria-hidden="true" />
          Breview
        </a>
        <div className="public-nav__links">
          <a className="inline-link" href="/privacy">
            Tietosuoja
          </a>
          <a className="inline-link" href="/support">
            Tuki
          </a>
          <a className="inline-link" href="/delete-account">
            Poista tili
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

function PrivacyPage() {
  return (
    <PageShell page="privacy" eyebrow="Breview privacy" title="Tietosuojaseloste">
      <section className="public-panel">
        <h2>Mitä tietoja Breview käsittelee</h2>
        <p>
          Breview tallentaa pelien nimet, oluiden nimet, käyttäjien nimimerkit, arvosanat, kommentit ja
          käyttäjän lisäämät olutkuvat. Jos kirjaudut sähköpostilla, Breview tallentaa sähköpostiosoitteesi,
          tilin istunnot ja tiliin linkitetyn arvosteluhistorian.
        </p>
        <p>
          Sovellus käyttää laite- tai selainkohtaista teknistä tunnistetta, jotta samalla laitteella tehdyt
          arvostelut voidaan löytää ja liittää tiliin kirjautumisen yhteydessä. Tunnistetta ei käytetä mainontaan.
        </p>
      </section>

      <section className="public-panel">
        <h2>Mihin tietoja käytetään</h2>
        <p>
          Tietoja käytetään olutarvostelupelien luomiseen, jakamiseen, arvosanojen tallentamiseen, tulosten
          näyttämiseen, kirjautumiseen, väärinkäytön rajoittamiseen ja palvelun vianmääritykseen.
        </p>
        <p>
          Olutkuvien nimientunnistus käsitellään Cloudflare Workers AI:n kautta. Ladatut kuvat säilytetään
          Cloudflare R2:ssa, jotta pelit ja tulokset voivat näyttää niihin liitetyt kuvat.
        </p>
      </section>

      <section className="public-panel">
        <h2>Palvelut ja jakaminen</h2>
        <p>
          Breview käyttää Cloudflare Workersia, D1-tietokantaa, R2-tallennusta, Workers AI:ta ja Cloudflare
          Email Serviceä. Breview ei sisällä kolmannen osapuolen mainonta- tai seurantakirjastoja.
        </p>
        <p>
          Pelilinkit ovat jaettavia. Henkilö, jolla on pelin linkki tai pelinumero, voi nähdä pelin, siihen
          tallennetut oluet ja tulokset. Älä lisää kommentteihin tietoja, joita et halua jakaa muille pelaajille.
        </p>
      </section>

      <section className="public-panel">
        <h2>Tilin poistaminen ja yhteydenotto</h2>
        <p>
          Kirjautunut käyttäjä voi poistaa tilinsä Breviewin tili-näkymästä. Julkinen ohjesivu on osoitteessa{" "}
          <a className="inline-link" href="/delete-account">
            breview.ing/delete-account
          </a>
          .
        </p>
        <p>
          Tukipyynnöt voi lähettää osoitteeseen{" "}
          <a className="inline-link" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </section>
    </PageShell>
  );
}

function SupportPage() {
  return (
    <PageShell page="support" eyebrow="Breview support" title="Tuki">
      <section className="public-panel">
        <h2>Yhteydenotto</h2>
        <p>
          Jos kirjautuminen, pelin avaaminen, kuvien lataaminen tai tilin poistaminen ei toimi, lähetä viesti
          osoitteeseen{" "}
          <a className="inline-link" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
        <p>
          Liitä mukaan käyttämäsi sähköpostiosoite, pelin numero, laitteen tyyppi ja lyhyt kuvaus siitä, mitä
          tapahtui. Älä lähetä kirjautumiskoodeja tai istuntotunnuksia.
        </p>
      </section>

      <section className="public-panel">
        <h2>Yleiset tilanteet</h2>
        <ul className="public-list">
          <li>Jos kirjautumiskoodi ei saavu, tarkista roskaposti ja pyydä uusi koodi hetken kuluttua.</li>
          <li>Jos jaettu linkki ei avaa sovellusta, sama linkki toimii myös selaimessa osoitteessa breview.ing.</li>
          <li>Jos kamera tai kuvakirjasto on estetty, salli käyttöoikeus laitteen asetuksista ja yritä uudelleen.</li>
          <li>Jos haluat poistaa tilin, käytä kirjautuneena tili-näkymää tai seuraa julkista poistopyyntöä.</li>
        </ul>
      </section>

      <section className="public-panel">
        <h2>Lisätiedot</h2>
        <p>
          Tietosuojaseloste on osoitteessa{" "}
          <a className="inline-link" href="/privacy">
            breview.ing/privacy
          </a>
          . Tilin poistamisen ohjeet ovat osoitteessa{" "}
          <a className="inline-link" href="/delete-account">
            breview.ing/delete-account
          </a>
          .
        </p>
        <p>
          Jos haluat tukea Breviewin ylläpitoa, tekijäsivu on osoitteessa{" "}
          <a className="inline-link" href="/makers">
            breview.ing/makers
          </a>
          .
        </p>
      </section>
    </PageShell>
  );
}

function DeleteAccountPage() {
  return (
    <PageShell page="delete-account" eyebrow="Account deletion" title="Tilin poistaminen Breviewistä">
      <section className="public-panel public-panel--important">
        <h2>Nopein tapa poistaa tili</h2>
        <ol className="public-list public-list--ordered">
          <li>Avaa Breview webissä tai mobiilisovelluksessa.</li>
          <li>Siirry Tili-näkymään ja kirjaudu sähköpostikoodilla, jos et ole kirjautunut.</li>
          <li>Valitse Poista tili ja vahvista poisto.</li>
        </ol>
        <p>
          Sovelluksessa tehty poisto käsitellään heti. Kirjaudut ulos, tili poistetaan ja tiliin linkitetyt
          pelaajarivit, arvosanat ja kommentit poistuvat aktiivisista peleistä.
        </p>
      </section>

      <section className="public-panel">
        <h2>Jos et pääse kirjautumaan</h2>
        <p>
          Lähetä poistopyyntö osoitteeseen{" "}
          <a className="inline-link" href={`mailto:${SUPPORT_EMAIL}?subject=Breview%20account%20deletion`}>
            {SUPPORT_EMAIL}
          </a>{" "}
          siitä sähköpostiosoitteesta, jolla käytit Breview-tiliä. Jos kirjoitat toisesta osoitteesta, pyydämme
          vahvistamaan omistajuuden ennen poistoa.
        </p>
        <a className="btn btn-primary public-mail-cta no-underline" href={`mailto:${SUPPORT_EMAIL}?subject=Breview%20account%20deletion`}>
          <Mail size={18} aria-hidden="true" />
          Lähetä poistopyyntö
          <ExternalLink size={16} aria-hidden="true" />
        </a>
      </section>

      <section className="public-panel">
        <h2>Mitä poistetaan</h2>
        <p>
          Poistamme tilin sähköpostiosoitteen, aktiiviset istunnot, tiliin linkitetyt pelaajarivit, arvosanat ja
          kommentit. Kun pelaajarivi poistuu, siihen liittyvät arvosanat eivät enää näy pelin tuloksissa.
        </p>
        <p>
          Pelit, olutlistat ja muiden pelaajien arvosanat voivat jäädä näkyviin, koska ne eivät kuulu vain yhteen
          tiliin. Tilin poistaminen ei poista muiden käyttäjien jakamia tai tallentamia tietoja.
        </p>
      </section>

      <section className="public-panel">
        <h2>Mitä voidaan säilyttää</h2>
        <p>
          Breview voi säilyttää rajallisia operatiivisia lokitietoja, kuten kirjautumis- ja poistotapahtumia,
          toimitusvirheitä, turvarajoituksia ja palvelun virhelokeja, väärinkäytön estämistä, vianmääritystä ja
          lakisääteisiä velvoitteita varten. Näitä tietoja säilytetään vain niin kauan kuin niille on perusteltu tarve.
        </p>
      </section>

      <section className="public-panel">
        <h2>Aikataulu</h2>
        <p>
          Sovelluksessa vahvistettu poisto tapahtuu välittömästi. Sähköpostilla lähetetyt poistopyynnöt käsitellään
          yleensä 7 päivän kuluessa ja viimeistään 30 päivän kuluessa, ellei pyynnön vahvistaminen vaadi lisätietoja.
        </p>
      </section>
    </PageShell>
  );
}

export function PublicInfoRoute({ page }: { page: PublicInfoPage }) {
  if (page === "privacy") return <PrivacyPage />;
  if (page === "support") return <SupportPage />;
  return <DeleteAccountPage />;
}
