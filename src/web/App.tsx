import { useEffect, useState } from "react";
import { HomeRoute } from "./routes/HomeRoute";
import { GameRoute, type GameSection } from "./routes/GameRoute";

export type AppRoute =
  | { type: "home" }
  | { type: "game"; gameId: number; section: GameSection }
  | { type: "not-found" };

export function parsePath(pathname: string): AppRoute {
  if (pathname === "/" || pathname === "") {
    return { type: "home" };
  }

  const resultsMatch = pathname.match(/^\/(\d+)\/results\/?$/);
  if (resultsMatch) {
    return { type: "game", gameId: Number(resultsMatch[1]), section: "results" };
  }

  const rateMatch = pathname.match(/^\/(\d+)\/?$/);
  if (rateMatch) {
    return { type: "game", gameId: Number(rateMatch[1]), section: "rate" };
  }

  return { type: "not-found" };
}

export function App() {
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

  if (route.type === "game") {
    return (
      <GameRoute
        gameId={route.gameId}
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

  return (
    <div className="app-wrap">
      <div className="mb-1 text-2xl font-extrabold">Sahti as a Service</div>
      <div className="card">
        <div className="mb-2 font-semibold">Tuntematon osoite</div>
        <a className="btn inline-flex no-underline" href="/">
          Takaisin etusivulle
        </a>
      </div>
    </div>
  );
}
