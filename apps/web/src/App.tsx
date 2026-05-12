import { useEffect, useState } from "react";
import { AccountRoute } from "./routes/AccountRoute";
import { HomeRoute } from "./routes/HomeRoute";
import { GameRoute, type GameSection } from "./routes/GameRoute";
import { MakersRoute } from "./routes/MakersRoute";
import { PublicInfoRoute, type PublicInfoPage } from "./routes/PublicInfoRoute";
import { useT } from "./i18n/i18nContext";

export type AppRoute =
  | { type: "home" }
  | { type: "account" }
  | { type: "makers" }
  | { type: "public-info"; page: PublicInfoPage }
  | { type: "game"; gameId: number; section: GameSection; legacy: true }
  | { type: "session"; shareId: string; section: GameSection; host: boolean }
  | { type: "not-found" };

export function parsePath(pathname: string): AppRoute {
  if (pathname === "/" || pathname === "") {
    return { type: "home" };
  }

  if (pathname === "/makers" || pathname === "/makers/") {
    return { type: "makers" };
  }

  if (pathname === "/account" || pathname === "/account/") {
    return { type: "account" };
  }

  if (pathname === "/privacy" || pathname === "/privacy/") {
    return { type: "public-info", page: "privacy" };
  }

  if (pathname === "/support" || pathname === "/support/") {
    return { type: "public-info", page: "support" };
  }

  if (pathname === "/delete-account" || pathname === "/delete-account/") {
    return { type: "public-info", page: "delete-account" };
  }

  const resultsMatch = pathname.match(/^\/(\d+)\/results\/?$/);
  if (resultsMatch) {
    return { type: "game", gameId: Number(resultsMatch[1]), section: "results", legacy: true };
  }

  const rateMatch = pathname.match(/^\/(\d+)\/?$/);
  if (rateMatch) {
    return { type: "game", gameId: Number(rateMatch[1]), section: "rate", legacy: true };
  }

  const sessionMatch = pathname.match(/^\/s\/([A-Za-z0-9_-]+)(?:\/(results))?\/?$/);
  if (sessionMatch) {
    return {
      type: "session",
      shareId: sessionMatch[1],
      section: sessionMatch[2] === "results" ? "results" : "rate",
      host: false,
    };
  }

  const hostMatch = pathname.match(/^\/h\/([A-Za-z0-9_-]+)(?:\/(results))?\/?$/);
  if (hostMatch) {
    return {
      type: "session",
      shareId: hostMatch[1],
      section: hostMatch[2] === "results" ? "results" : "rate",
      host: true,
    };
  }

  return { type: "not-found" };
}

export function App() {
  const t = useT();
  const [pathname, setPathname] = useState(() => window.location.pathname);

  useEffect(() => {
    function handlePopState() {
      setPathname(window.location.pathname);
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const route = parsePath(pathname);

  if (route.type === "home") {
    return <HomeRoute />;
  }

  if (route.type === "makers") {
    return <MakersRoute />;
  }

  if (route.type === "account") {
    return <AccountRoute />;
  }

  if (route.type === "public-info") {
    return <PublicInfoRoute page={route.page} />;
  }

  if (route.type === "game") {
    return (
      <GameRoute
        target={{ type: "game", gameId: route.gameId }}
        section={route.section}
        onSectionChange={(section) => {
          const targetPath = section === "results" ? `/${route.gameId}/results` : `/${route.gameId}`;
          if (window.location.pathname === targetPath) return;
          window.history.pushState({}, "", targetPath);
          setPathname(targetPath);
        }}
      />
    );
  }

  if (route.type === "session") {
    return (
      <GameRoute
        target={{ type: "session", shareId: route.shareId, host: route.host }}
        section={route.section}
        onSectionChange={(section) => {
          const prefix = route.host ? "/h" : "/s";
          const targetPath =
            section === "results" ? `${prefix}/${route.shareId}/results` : `${prefix}/${route.shareId}`;
          if (window.location.pathname === targetPath) return;
          window.history.pushState({}, "", targetPath);
          setPathname(targetPath);
        }}
      />
    );
  }

  return (
    <div className="app-wrap">
      <div className="mb-1 text-2xl font-extrabold">Breview</div>
      <div className="card">
        <div className="mb-2 font-semibold">{t.game.unknownAddress}</div>
        <a className="btn inline-flex no-underline" href="/">
          {t.nav.backToHome}
        </a>
      </div>
    </div>
  );
}
