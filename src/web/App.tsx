import { HomeRoute } from "./routes/HomeRoute";
import { GameRoute } from "./routes/GameRoute";

function parsePath(pathname: string): { type: "home" } | { type: "game"; gameId: number } | { type: "not-found" } {
  if (pathname === "/" || pathname === "") {
    return { type: "home" };
  }

  const match = pathname.match(/^\/(\d+)\/?$/);
  if (match) {
    return { type: "game", gameId: Number(match[1]) };
  }

  return { type: "not-found" };
}

export function App() {
  const route = parsePath(window.location.pathname);

  if (route.type === "home") {
    return <HomeRoute />;
  }

  if (route.type === "game") {
    return <GameRoute gameId={route.gameId} />;
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
