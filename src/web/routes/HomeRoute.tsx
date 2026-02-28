import { useState } from "react";
import type { CreateGameRequest } from "../../shared/api-contracts";
import { apiClient } from "../api/client";
import { BeerEditor, type BeerEditorRow } from "../components/BeerEditor";

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function HomeRoute() {
  const [showCreate, setShowCreate] = useState(false);
  const [joinId, setJoinId] = useState("");
  const [gameName, setGameName] = useState("");
  const [beers, setBeers] = useState<BeerEditorRow[]>([{ name: "", imageUrl: "", file: null }]);
  const [submitting, setSubmitting] = useState(false);

  async function submitCreateGame() {
    try {
      setSubmitting(true);

      const trimmedName = gameName.trim();
      if (!trimmedName) throw new Error("Anna pelille nimi");

      const payloadBeers: CreateGameRequest["beers"] = [];
      for (let index = 0; index < beers.length; index += 1) {
        const row = beers[index];
        const name = row.name.trim();
        if (!name) {
          throw new Error(`Anna nimi kaikille oluille tai poista tyhjä rivi (rivi ${index + 1})`);
        }

        let image_url = row.imageUrl.trim() || null;
        if (!image_url && row.file) {
          image_url = await fileToDataUrl(row.file);
          if (image_url.length > 700000) {
            throw new Error("Kuvatiedosto liian iso MVP-versioon. Käytä pienempää kuvaa tai URL:ia.");
          }
        }

        payloadBeers.push({
          name,
          image_url,
        });
      }

      if (!payloadBeers.length) {
        throw new Error("Lisää vähintään yksi olut");
      }

      const result = await apiClient.createGame({
        name: trimmedName,
        beers: payloadBeers,
      });

      window.location.href = `/${result.gameId}`;
    } catch (error) {
      alert(String((error as Error)?.message ?? error));
      setSubmitting(false);
    }
  }

  return (
    <div className="app-wrap">
      <div className="mb-1 text-2xl font-extrabold">Sahti as a Service</div>
      <div className="mb-4 text-sm text-muted">Arvosanat oluille, mobiili edellä</div>

      <div className="card">
        <div className="flex flex-col gap-3">
          <button className="btn btn-primary" type="button" onClick={() => setShowCreate((prev) => !prev)}>
            Luo peli
          </button>

          <div className="h-px bg-line" />

          <label className="text-sm text-muted" htmlFor="join-id">
            Liity peliin ID:llä
          </label>
          <div className="flex gap-2">
            <input
              id="join-id"
              className="input"
              value={joinId}
              onChange={(event) => setJoinId(event.target.value)}
              placeholder="esim. 12"
              inputMode="numeric"
            />
            <button
              className="btn"
              type="button"
              onClick={() => {
                if (!/^\d+$/.test(joinId.trim())) {
                  alert("Syötä numeromuotoinen peli-ID");
                  return;
                }
                window.location.href = `/${joinId.trim()}`;
              }}
            >
              Liity
            </button>
          </div>
        </div>
      </div>

      {showCreate ? (
        <BeerEditor
          title="Luo uusi peli"
          gameName={gameName}
          onGameNameChange={setGameName}
          beers={beers}
          onBeersChange={setBeers}
          onSubmit={submitCreateGame}
          submitting={submitting}
          submitLabel="Tallenna ja luo peli"
          addLabel="+ Lisää rivi"
        />
      ) : null}
    </div>
  );
}
