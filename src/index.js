import QRCode from "qrcode";

export default {
    async fetch(request, env) {
        try {
            const url = new URL(request.url);
            const { pathname } = url;

            // API routes
            if (pathname === "/api/create-game" && request.method === "POST") {
                return await handleCreateGame(request, env);
            }

            const gameMatch = pathname.match(/^\/api\/games\/(\d+)$/);
            if (gameMatch) {
                const gameId = Number(gameMatch[1]);
                if (request.method === "GET") {
                    return await handleGetGame(gameId, env);
                }
                if (request.method === "PUT") {
                    return await handleUpdateGame(gameId, request, env);
                }
            }

            const ratingsMatch = pathname.match(/^\/api\/games\/(\d+)\/ratings$/);
            if (ratingsMatch) {
                const gameId = Number(ratingsMatch[1]);
                if (request.method === "POST") {
                    return await handleSaveRatings(gameId, request, env);
                }
                if (request.method === "GET") {
                    return await handleGetRatings(gameId, request, env);
                }
            }

            const resultsMatch = pathname.match(/^\/api\/games\/(\d+)\/results$/);
            if (resultsMatch && request.method === "GET") {
                return await handleGetResults(Number(resultsMatch[1]), env);
            }

            if (pathname === "/api/image-search" && request.method === "GET") {
                return await handleImageSearch(url, env);
            }

            if (pathname === "/api/qr" && request.method === "GET") {
                return await handleGetQr(url);
            }

            // UI routes (/, /12, etc)
            if (request.method === "GET") {
                return new Response(renderHtml(), {
                    headers: { "content-type": "text/html; charset=utf-8" },
                });
            }

            return json({ error: "Not found" }, 404);
        } catch (err) {
            return json(
                { error: "Server error", details: String(err?.message || err) },
                500
            );
        }
    },
};

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store",
        },
    });
}

async function parseJson(request) {
    try {
        return await request.json();
    } catch {
        return null;
    }
}

const MAX_GAME_NAME_LENGTH = 120;
const UNTAPPD_SEARCH_SOURCE = "search-link";
const UNTAPPD_API_SOURCE = "untappd-api";
const UNTAPPD_MAX_API_AGE_MS = 24 * 60 * 60 * 1000;
const UNTAPPD_RESOLVE_LIMIT = 25;
const UNTAPPD_RESOLVE_CONCURRENCY = 4;
const UNTAPPD_RESOLVE_TIMEOUT_MS = 3500;
const UNTAPPD_MATCH_THRESHOLD = 0.9;

function normalizeGameName(raw) {
    const name = String(raw || "").trim();
    if (!name) return { error: "Anna pelille nimi" };
    if (name.length > MAX_GAME_NAME_LENGTH) {
        return { error: `Pelin nimi on liian pitkä (max ${MAX_GAME_NAME_LENGTH} merkkiä)` };
    }
    return { value: name };
}

function normalizeImageUrl(raw) {
    const value = String(raw || "").trim();
    if (!value) return { value: null };

    if (/^data:image\/[a-zA-Z0-9.+-]+;base64,/i.test(value)) {
        return { value };
    }

    let parsed;
    try {
        parsed = new URL(value);
    } catch {
        return { error: "Virheellinen kuva-URL" };
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return { error: "Kuva-URL:ssa sallitaan vain http/https tai data:image/*" };
    }

    return { value };
}

function sanitizeHttpsUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) return null;

    let parsed;
    try {
        parsed = new URL(raw.startsWith("//") ? `https:${raw}` : raw);
    } catch {
        return null;
    }

    if (parsed.protocol !== "https:") return null;
    return parsed.toString();
}

function sanitizeUntappdUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) return null;

    let parsed;
    try {
        parsed = new URL(raw.startsWith("//") ? `https:${raw}` : raw);
    } catch {
        return null;
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    if (!parsed.hostname.toLowerCase().endsWith("untappd.com")) return null;
    parsed.protocol = "https:";
    return parsed.toString();
}

function createUntappdSearchUrl(name) {
    return `https://untappd.com/search?q=${encodeURIComponent(String(name || "").trim())}`;
}

function createSearchLinkUntappdMeta(name, resolvedAt = new Date().toISOString()) {
    return {
        untappd_url: createUntappdSearchUrl(name),
        untappd_source: UNTAPPD_SEARCH_SOURCE,
        untappd_confidence: null,
        untappd_resolved_at: resolvedAt,
    };
}

function normalizeSearchText(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function scoreUntappdCandidate(query, candidateName) {
    const q = normalizeSearchText(query);
    const c = normalizeSearchText(candidateName);
    if (!q || !c) return 0;
    if (q === c) return 1;
    if (c.includes(q) || q.includes(c)) return 0.92;

    const qTokens = new Set(q.split(" ").filter(Boolean));
    const cTokens = new Set(c.split(" ").filter(Boolean));
    if (!qTokens.size || !cTokens.size) return 0;

    let overlap = 0;
    for (const token of qTokens) {
        if (cTokens.has(token)) overlap++;
    }
    if (!overlap) return 0;

    const ratio = overlap / Math.max(qTokens.size, cTokens.size);
    return Number(Math.min(ratio * 0.89, 0.89).toFixed(3));
}

function clampInteger(value, min, max, fallback) {
    const num = Number(value);
    if (!Number.isFinite(num)) return fallback;
    const int = Math.trunc(num);
    if (int < min) return min;
    if (int > max) return max;
    return int;
}

function pickFirstHttpsUrl(candidates) {
    for (const candidate of candidates) {
        const sanitized = sanitizeHttpsUrl(candidate);
        if (sanitized) return sanitized;
    }
    return null;
}

function getUrlDomain(url) {
    try {
        return new URL(url).hostname.replace(/^www\./i, "");
    } catch {
        return "";
    }
}

function normalizeBraveImageResult(row) {
    const imageUrl = pickFirstHttpsUrl([
        row?.properties?.url,
        row?.image?.url,
        row?.src,
        row?.url,
    ]);
    if (!imageUrl) return null;

    const thumbnailUrl =
        pickFirstHttpsUrl([
            row?.thumbnail?.src,
            row?.thumbnail?.url,
            row?.thumbnail,
            row?.properties?.thumbnail,
        ]) || imageUrl;
    const sourceUrl = pickFirstHttpsUrl([
        row?.page_url,
        row?.meta_url?.url,
        row?.source?.url,
        row?.source_url,
        row?.url,
    ]);

    return {
        imageUrl,
        thumbnailUrl,
        title: String(row?.title || row?.description || "").trim(),
        sourceUrl: sourceUrl || null,
        sourceDomain: getUrlDomain(sourceUrl || imageUrl),
    };
}

function buildUntappdBeerUrl(item) {
    const beer = item?.beer || item || {};

    const directUrl = sanitizeUntappdUrl(
        beer?.beer_url || beer?.url || item?.url || item?.beer_url
    );
    if (directUrl) return directUrl;

    const slug = String(beer?.beer_slug || "").trim();
    const bid = Number(beer?.bid || item?.bid);
    if (!slug || !Number.isInteger(bid) || bid <= 0) return null;

    return `https://untappd.com/b/${encodeURIComponent(slug)}/${bid}`;
}

function isUntappdApiRecordExpired(resolvedAt) {
    const ts = Date.parse(String(resolvedAt || ""));
    if (!Number.isFinite(ts)) return true;
    return Date.now() - ts > UNTAPPD_MAX_API_AGE_MS;
}

async function runWithConcurrency(items, limit, handler) {
    if (!Array.isArray(items) || items.length === 0) return;
    const concurrency = Math.max(1, Math.min(limit, items.length));
    let cursor = 0;

    await Promise.all(
        Array.from({ length: concurrency }).map(async () => {
            while (true) {
                const currentIndex = cursor;
                cursor += 1;
                if (currentIndex >= items.length) return;
                await handler(items[currentIndex], currentIndex);
            }
        })
    );
}

async function resolveUntappdFromApi(env, beerName) {
    const clientId = String(env.UNTAPPD_CLIENT_ID || "").trim();
    const clientSecret = String(env.UNTAPPD_CLIENT_SECRET || "").trim();
    const name = String(beerName || "").trim();
    if (!clientId || !clientSecret || !name) return null;

    const endpoint = new URL("https://api.untappd.com/v4/search/beer");
    endpoint.searchParams.set("q", name);
    endpoint.searchParams.set("limit", "10");
    endpoint.searchParams.set("client_id", clientId);
    endpoint.searchParams.set("client_secret", clientSecret);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), UNTAPPD_RESOLVE_TIMEOUT_MS);

    let data = null;
    try {
        const res = await fetch(endpoint.toString(), {
            method: "GET",
            signal: controller.signal,
            headers: { accept: "application/json" },
        });
        if (!res.ok) return null;
        data = await res.json();
    } catch {
        return null;
    } finally {
        clearTimeout(timeout);
    }

    const items = Array.isArray(data?.response?.beers?.items)
        ? data.response.beers.items
        : [];
    let best = null;
    for (const item of items) {
        const beer = item?.beer || item || {};
        const brewery = item?.brewery || {};
        const candidateName = String(beer?.beer_name || item?.beer_name || "").trim();
        const candidateUrl = buildUntappdBeerUrl(item);
        if (!candidateName || !candidateUrl) continue;

        const breweryName = String(brewery?.brewery_name || "").trim();
        const combinedName = breweryName
            ? `${candidateName} ${breweryName}`
            : candidateName;
        const score = Math.max(
            scoreUntappdCandidate(name, candidateName),
            scoreUntappdCandidate(name, combinedName)
        );
        if (!best || score > best.score) {
            best = { score, url: candidateUrl };
        }
    }

    if (!best || best.score < UNTAPPD_MATCH_THRESHOLD) return null;

    return {
        untappd_url: best.url,
        untappd_source: UNTAPPD_API_SOURCE,
        untappd_confidence: Number(best.score.toFixed(3)),
        untappd_resolved_at: new Date().toISOString(),
    };
}

async function enrichBeersWithUntappd(env, beers) {
    const enriched = beers.map((beer) => ({
        ...beer,
        ...createSearchLinkUntappdMeta(beer.name),
    }));

    const hasUntappdCredentials =
        String(env.UNTAPPD_CLIENT_ID || "").trim() &&
        String(env.UNTAPPD_CLIENT_SECRET || "").trim();
    if (!hasUntappdCredentials) {
        return enriched;
    }

    const resolveTargets = enriched
        .map((beer, idx) => ({ idx, beer }))
        .slice(0, UNTAPPD_RESOLVE_LIMIT);
    await runWithConcurrency(
        resolveTargets,
        UNTAPPD_RESOLVE_CONCURRENCY,
        async (target) => {
            const resolved = await resolveUntappdFromApi(env, target.beer.name);
            if (!resolved) return;
            enriched[target.idx] = {
                ...enriched[target.idx],
                ...resolved,
            };
        }
    );

    return enriched;
}

async function ensureUntappdLinksForGame(env, gameId) {
    const rows = await env.DB.prepare(
        "SELECT id, name, untappd_url, untappd_source, untappd_resolved_at FROM beers WHERE game_id = ?"
    )
        .bind(gameId)
        .all();
    const beers = rows.results || [];
    if (!beers.length) return;

    const updateStmt = env.DB.prepare(
        "UPDATE beers SET untappd_url = ?, untappd_source = ?, untappd_confidence = ?, untappd_resolved_at = ? WHERE game_id = ? AND id = ?"
    );
    const nowIso = new Date().toISOString();
    const updates = [];

    for (const beer of beers) {
        const source = String(beer?.untappd_source || "").trim();
        const hasLink = Boolean(String(beer?.untappd_url || "").trim());
        const sourceKnown =
            source === UNTAPPD_SEARCH_SOURCE || source === UNTAPPD_API_SOURCE;
        const expiredApiRecord =
            source === UNTAPPD_API_SOURCE &&
            isUntappdApiRecordExpired(beer?.untappd_resolved_at);

        if ((hasLink && sourceKnown && !expiredApiRecord) || !beer?.name) continue;

        const fallback = createSearchLinkUntappdMeta(beer.name, nowIso);
        updates.push(
            updateStmt.bind(
                fallback.untappd_url,
                fallback.untappd_source,
                fallback.untappd_confidence,
                fallback.untappd_resolved_at,
                gameId,
                beer.id
            )
        );
    }

    if (updates.length) {
        await env.DB.batch(updates);
    }
}

function normalizeBeersPayload(input, { allowIds = false } = {}) {
    if (!Array.isArray(input)) {
        return { error: "Invalid payload" };
    }

    const beers = [];
    for (let i = 0; i < input.length; i++) {
        const b = input[i];
        const name = String(b?.name || "").trim();
        if (!name) continue;

        const imageUrlRaw =
            typeof b?.image_url === "string" && b.image_url.trim()
                ? b.image_url.trim()
                : null;
        const normalizedImageUrl = normalizeImageUrl(imageUrlRaw);
        if (normalizedImageUrl.error) {
            return {
                error: `Virheellinen kuva oluelle "${name}": ${normalizedImageUrl.error}`,
            };
        }

        const normalized = {
            name,
            image_url: normalizedImageUrl.value,
            sort_order: beers.length,
        };

        if (allowIds && b?.id != null && b.id !== "") {
            const id = Number(b.id);
            if (!Number.isInteger(id) || id <= 0) {
                return { error: "Virheellinen olut-ID" };
            }
            normalized.id = id;
        }

        beers.push(normalized);
    }

    if (beers.length < 1) {
        return { error: "Lisää vähintään yksi olut" };
    }
    if (beers.length > 100) {
        return { error: "Liikaa oluita (max 100)" };
    }

    return { beers };
}

async function getGameWithBeers(env, gameId) {
    const game = await env.DB.prepare(
        "SELECT id, name, created_at FROM games WHERE id = ?"
    )
        .bind(gameId)
        .first();
    if (!game) return null;

    const beersRes = await env.DB.prepare(
        "SELECT id, name, image_url, sort_order, untappd_url, untappd_source, untappd_confidence, untappd_resolved_at FROM beers WHERE game_id = ? ORDER BY sort_order ASC, id ASC"
    )
        .bind(gameId)
        .all();

    return { game, beers: beersRes.results || [] };
}

async function handleCreateGame(request, env) {
    const body = await parseJson(request);
    if (!body) {
        return json({ error: "Invalid payload" }, 400);
    }

    const gameName = normalizeGameName(body.name);
    if (gameName.error) {
        return json({ error: gameName.error }, 400);
    }

    const normalizedBeers = normalizeBeersPayload(body.beers);
    if (normalizedBeers.error) {
        return json({ error: normalizedBeers.error }, 400);
    }
    const beers = await enrichBeersWithUntappd(env, normalizedBeers.beers);

    const gameInsert = await env.DB.prepare("INSERT INTO games (name) VALUES (?)")
        .bind(gameName.value)
        .run();
    const gameId = gameInsert.meta?.last_row_id;

    if (!gameId) {
        return json({ error: "Pelin luonti epäonnistui" }, 500);
    }

    const stmt = env.DB.prepare(
        "INSERT INTO beers (game_id, name, image_url, sort_order, untappd_url, untappd_source, untappd_confidence, untappd_resolved_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    );

    const batch = beers.map((b) =>
        stmt.bind(
            gameId,
            b.name,
            b.image_url,
            b.sort_order,
            b.untappd_url,
            b.untappd_source,
            b.untappd_confidence,
            b.untappd_resolved_at
        )
    );
    await env.DB.batch(batch);

    return json({ ok: true, gameId });
}

async function handleGetGame(gameId, env) {
    await ensureUntappdLinksForGame(env, gameId);
    const payload = await getGameWithBeers(env, gameId);
    if (!payload) {
        return json({ error: "Peliä ei löytynyt" }, 404);
    }

    return json(payload);
}

async function handleUpdateGame(gameId, request, env) {
    const body = await parseJson(request);
    if (!body) {
        return json({ error: "Invalid payload" }, 400);
    }

    const gameName = normalizeGameName(body.name);
    if (gameName.error) {
        return json({ error: gameName.error }, 400);
    }

    const normalizedBeers = normalizeBeersPayload(body.beers, { allowIds: true });
    if (normalizedBeers.error) {
        return json({ error: normalizedBeers.error }, 400);
    }
    const beers = await enrichBeersWithUntappd(env, normalizedBeers.beers);

    const game = await env.DB.prepare("SELECT id FROM games WHERE id = ?")
        .bind(gameId)
        .first();
    if (!game) return json({ error: "Peliä ei löytynyt" }, 404);

    const existing = await env.DB.prepare(
        "SELECT id FROM beers WHERE game_id = ? ORDER BY sort_order ASC, id ASC"
    )
        .bind(gameId)
        .all();
    const existingIds = new Set((existing.results || []).map((b) => Number(b.id)));

    const seenIds = new Set();
    for (const beer of beers) {
        if (beer.id == null) continue;
        if (!existingIds.has(beer.id)) {
            return json({ error: `Virheellinen olut-ID: ${beer.id}` }, 400);
        }
        if (seenIds.has(beer.id)) {
            return json({ error: `Olut-ID esiintyy kahdesti: ${beer.id}` }, 400);
        }
        seenIds.add(beer.id);
    }

    const statements = [
        env.DB.prepare("UPDATE games SET name = ? WHERE id = ?").bind(
            gameName.value,
            gameId
        ),
    ];

    const insertStmt = env.DB.prepare(
        "INSERT INTO beers (game_id, name, image_url, sort_order, untappd_url, untappd_source, untappd_confidence, untappd_resolved_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    );
    const updateStmt = env.DB.prepare(
        "UPDATE beers SET name = ?, image_url = ?, sort_order = ?, untappd_url = ?, untappd_source = ?, untappd_confidence = ?, untappd_resolved_at = ? WHERE game_id = ? AND id = ?"
    );

    for (const beer of beers) {
        if (beer.id == null) {
            statements.push(
                insertStmt.bind(
                    gameId,
                    beer.name,
                    beer.image_url,
                    beer.sort_order,
                    beer.untappd_url,
                    beer.untappd_source,
                    beer.untappd_confidence,
                    beer.untappd_resolved_at
                )
            );
            continue;
        }

        statements.push(
            updateStmt.bind(
                beer.name,
                beer.image_url,
                beer.sort_order,
                beer.untappd_url,
                beer.untappd_source,
                beer.untappd_confidence,
                beer.untappd_resolved_at,
                gameId,
                beer.id
            )
        );
    }

    const deleteStmt = env.DB.prepare(
        "DELETE FROM beers WHERE game_id = ? AND id = ?"
    );
    for (const id of existingIds) {
        if (!seenIds.has(id)) {
            statements.push(deleteStmt.bind(gameId, id));
        }
    }

    await env.DB.batch(statements);

    const updated = await getGameWithBeers(env, gameId);
    if (!updated) return json({ error: "Peliä ei löytynyt" }, 404);

    return json({ ok: true, ...updated });
}

async function getOrCreatePlayerId(env, gameId, clientId) {
    const cleanClientId = normalizeClientId(clientId);
    if (!cleanClientId) return null;

    let player = await env.DB.prepare(
        "SELECT id FROM players WHERE game_id = ? AND client_id = ?"
    )
        .bind(gameId, cleanClientId)
        .first();

    if (player?.id) return player.id;

    await env.DB.prepare(
        "INSERT OR IGNORE INTO players (game_id, client_id) VALUES (?, ?)"
    )
        .bind(gameId, cleanClientId)
        .run();

    player = await env.DB.prepare(
        "SELECT id FROM players WHERE game_id = ? AND client_id = ?"
    )
        .bind(gameId, cleanClientId)
        .first();

    return player?.id || null;
}

function normalizeClientId(clientId) {
    const cleanClientId = String(clientId || "").trim();
    if (!cleanClientId || cleanClientId.length > 200) return null;
    return cleanClientId;
}

async function handleGetRatings(gameId, request, env) {
    const game = await env.DB.prepare("SELECT id FROM games WHERE id = ?")
        .bind(gameId)
        .first();
    if (!game) return json({ error: "Peliä ei löytynyt" }, 404);

    const url = new URL(request.url);
    const clientId = normalizeClientId(url.searchParams.get("clientId"));
    if (!clientId) {
        return json({ error: "clientId puuttuu tai virheellinen" }, 400);
    }

    const rows = await env.DB.prepare(`
    SELECT
      r.beer_id AS beerId,
      r.score AS score
    FROM ratings r
    INNER JOIN players p
      ON p.id = r.player_id
    WHERE r.game_id = ?
      AND p.game_id = ?
      AND p.client_id = ?
    ORDER BY r.beer_id ASC
  `)
        .bind(gameId, gameId, clientId)
        .all();

    const ratings = [];
    for (const row of rows.results || []) {
        const beerId = Number(row?.beerId);
        const score = Number(row?.score);
        if (!Number.isInteger(beerId) || !Number.isFinite(score)) continue;
        const clamped = Math.min(10, Math.max(0, score));
        ratings.push({ beerId, score: Number(clamped.toFixed(2)) });
    }

    return json({ ok: true, ratings });
}

async function handleSaveRatings(gameId, request, env) {
    const body = await parseJson(request);
    if (!body || !Array.isArray(body.ratings)) {
        return json({ error: "Invalid payload" }, 400);
    }

    const game = await env.DB.prepare("SELECT id FROM games WHERE id = ?")
        .bind(gameId)
        .first();
    if (!game) return json({ error: "Peliä ei löytynyt" }, 404);

    const playerId = await getOrCreatePlayerId(env, gameId, body.clientId);
    if (!playerId) return json({ error: "clientId puuttuu" }, 400);

    const beerIdsRes = await env.DB.prepare("SELECT id FROM beers WHERE game_id = ?")
        .bind(gameId)
        .all();
    const validBeerIds = new Set((beerIdsRes.results || []).map((r) => r.id));

    const normalized = [];
    for (const r of body.ratings) {
        const beerId = Number(r?.beerId);
        const score = Number(r?.score);
        if (!Number.isInteger(beerId) || !validBeerIds.has(beerId)) continue;
        if (!Number.isFinite(score)) continue;
        const clamped = Math.min(10, Math.max(0, score));
        normalized.push({ beerId, score: Number(clamped.toFixed(2)) });
    }

    if (normalized.length === 0) {
        return json({ error: "Ei tallennettavia arvosanoja" }, 400);
    }

    const stmt = env.DB.prepare(`
    INSERT INTO ratings (game_id, beer_id, player_id, score, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(game_id, beer_id, player_id)
    DO UPDATE SET score = excluded.score, updated_at = datetime('now')
  `);

    await env.DB.batch(
        normalized.map((r) => stmt.bind(gameId, r.beerId, playerId, r.score))
    );

    return json({ ok: true, saved: normalized.length });
}

async function handleGetResults(gameId, env) {
    await ensureUntappdLinksForGame(env, gameId);
    const game = await env.DB.prepare("SELECT id, name, created_at FROM games WHERE id = ?")
        .bind(gameId)
        .first();
    if (!game) return json({ error: "Peliä ei löytynyt" }, 404);

    const rows = await env.DB.prepare(`
    SELECT
      b.id,
      b.name,
      b.image_url,
      b.untappd_url,
      b.untappd_source,
      b.untappd_confidence,
      b.untappd_resolved_at,
      b.sort_order,
      ROUND(COALESCE(AVG(r.score), 0), 2) AS avg_score,
      COUNT(r.player_id) AS rating_count
    FROM beers b
    LEFT JOIN ratings r
      ON r.beer_id = b.id AND r.game_id = b.game_id
    WHERE b.game_id = ?
    GROUP BY
      b.id,
      b.name,
      b.image_url,
      b.untappd_url,
      b.untappd_source,
      b.untappd_confidence,
      b.untappd_resolved_at,
      b.sort_order
    ORDER BY avg_score DESC, b.sort_order ASC, b.id ASC
  `)
        .bind(gameId)
        .all();

    const playersCountRes = await env.DB.prepare(
        "SELECT COUNT(*) AS c FROM players WHERE game_id = ?"
    )
        .bind(gameId)
        .first();

    return json({
        game,
        summary: {
            players: Number(playersCountRes?.c || 0),
        },
        beers: rows.results || [],
    });
}

async function handleImageSearch(url, env) {
    const query = String(url.searchParams.get("q") || "").trim();
    if (query.length < 2 || query.length > 120) {
        return json({ error: "Kyselyn pituuden tulee olla 2-120 merkkiä" }, 400);
    }

    const count = clampInteger(url.searchParams.get("count"), 1, 12, 10);
    const apiKey = String(env.BRAVE_SEARCH_API_KEY || "").trim();
    if (!apiKey) {
        return json({ error: "Kuvahaku ei ole kaytossa (BRAVE_SEARCH_API_KEY puuttuu)" }, 503);
    }

    const endpoint = new URL("https://api.search.brave.com/res/v1/images/search");
    endpoint.searchParams.set("q", query);
    endpoint.searchParams.set("count", String(count));
    endpoint.searchParams.set("safesearch", "moderate");

    let payload = null;
    try {
        const res = await fetch(endpoint.toString(), {
            method: "GET",
            headers: {
                accept: "application/json",
                "X-Subscription-Token": apiKey,
            },
        });
        if (!res.ok) {
            return json({ error: "Kuvahaun pyynto epannistui" }, 502);
        }
        payload = await res.json();
    } catch {
        return json({ error: "Kuvahaku ei onnistunut juuri nyt" }, 502);
    }

    const rawResults = Array.isArray(payload?.results) ? payload.results : [];
    const unique = new Set();
    const results = [];
    for (const row of rawResults) {
        const normalized = normalizeBraveImageResult(row);
        if (!normalized) continue;
        if (unique.has(normalized.imageUrl)) continue;
        unique.add(normalized.imageUrl);
        results.push(normalized);
        if (results.length >= count) break;
    }

    return json({
        ok: true,
        provider: "brave",
        results,
    });
}

async function handleGetQr(url) {
    const target = String(url.searchParams.get("url") || "").trim();
    if (!target) {
        return json({ error: "url-parametri puuttuu" }, 400);
    }
    if (target.length > 2048) {
        return json({ error: "URL on liian pitkä" }, 400);
    }

    let parsed;
    try {
        parsed = new URL(target);
    } catch {
        return json({ error: "Virheellinen URL" }, 400);
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return json({ error: "Vain http/https URL:t sallitaan" }, 400);
    }

    const svg = await QRCode.toString(target, {
        type: "svg",
        width: 320,
        margin: 1,
        color: {
            dark: "#111111",
            light: "#ffffff",
        },
    });

    return new Response(svg, {
        headers: {
            "content-type": "image/svg+xml; charset=utf-8",
            "cache-control": "public, max-age=300",
        },
    });
}

function renderHtml() {
    return `<!doctype html>
<html lang="fi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Sahti as a Service</title>
  <style>
    :root {
      --bg: #0f1115;
      --card: #171a21;
      --muted: #9aa3b2;
      --text: #eef2f7;
      --line: #2a3140;
      --accent: #f59e0b;
      --accent2: #22c55e;
      --danger: #ef4444;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: var(--bg); color: var(--text); font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; }
    a { color: inherit; }
    .wrap { max-width: 760px; margin: 0 auto; padding: 16px; }
    .title { font-size: 24px; font-weight: 800; margin: 8px 0 4px; }
    .sub { color: var(--muted); font-size: 14px; margin-bottom: 16px; }
    .card { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 14px; margin-bottom: 12px; }
    .row { display: flex; gap: 10px; align-items: center; }
    .col { display: flex; flex-direction: column; gap: 8px; }
    .grow { flex: 1; }
    .btn {
      border: 1px solid var(--line);
      background: #1f2632;
      color: var(--text);
      padding: 11px 14px;
      border-radius: 12px;
      font-weight: 700;
      cursor: pointer;
      min-height: 44px;
    }
    .btn:hover { filter: brightness(1.05); }
    .btn:disabled { opacity: .5; cursor: not-allowed; }
    .btn.primary { background: var(--accent); color: #1f1300; border-color: #c07a05; }
    .btn.success { background: var(--accent2); color: #09210f; border-color: #138e3e; }
    .btn.danger { background: transparent; color: #ffb4b4; border-color: #6a2b2b; }
    .input, .join-input {
      width: 100%;
      background: #11151c;
      border: 1px solid var(--line);
      color: var(--text);
      border-radius: 10px;
      padding: 10px 12px;
      min-height: 42px;
    }
    .small { font-size: 12px; color: var(--muted); }
    .id-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .btn.qr-toggle-btn {
      min-height: 30px;
      padding: 5px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
    }
    .beer-card { display: grid; grid-template-columns: 72px 1fr; gap: 12px; align-items: start; }
    .beer-img {
      width: 72px; height: 72px; border-radius: 12px; border: 1px solid var(--line);
      background: #0d1117 center/cover no-repeat;
      display: flex; align-items: center; justify-content: center;
      color: var(--muted); font-size: 12px; text-align: center; padding: 4px;
      overflow: hidden;
    }
    .beer-name { font-weight: 700; margin-bottom: 8px; }
    .score-row { display: flex; align-items: center; gap: 10px; }
    .score-value {
      min-width: 56px; text-align: right; font-variant-numeric: tabular-nums;
      background: #11151c; border: 1px solid var(--line); border-radius: 10px; padding: 7px 8px;
    }
    input[type="range"] { width: 100%; }
    .toolbar { position: sticky; bottom: 0; background: linear-gradient(180deg, rgba(15,17,21,0), rgba(15,17,21,1) 30%); padding-top: 8px; }
    .toolbar .card { margin-top: 8px; }
    .muted { color: var(--muted); }
    .hidden { display: none !important; }
    .badge {
      display: inline-block; background: #11151c; border: 1px solid var(--line);
      border-radius: 999px; padding: 5px 10px; font-size: 12px; color: var(--muted);
    }
    .divider { height: 1px; background: var(--line); margin: 12px 0; }
    .file-note { font-size: 11px; color: var(--muted); }
    .empty { text-align: center; color: var(--muted); padding: 22px 10px; }
    .share-panel {
      border: 1px solid var(--line);
      background: #11151c;
      border-radius: 12px;
      padding: 12px;
    }
    .qr-wrap { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .qr-img {
      width: 132px;
      height: 132px;
      object-fit: contain;
      border-radius: 10px;
      border: 1px solid var(--line);
      background: #fff;
      padding: 6px;
      flex-shrink: 0;
    }
    .qr-status { min-height: 16px; font-size: 12px; color: var(--muted); }
    .share-link { font-size: 12px; word-break: break-all; overflow-wrap: anywhere; }
    .share-link a { color: var(--text); text-decoration: underline; }
    .untappd-link { color: #fbbf24; text-decoration: underline; }
    .untappd-link:hover { color: #fde68a; }
    .modal-overlay {
      position: fixed;
      inset: 0;
      z-index: 1000;
      background: rgba(6, 10, 16, 0.85);
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding: 16px;
    }
    .modal-card {
      width: min(760px, 100%);
      max-height: 92vh;
      overflow: hidden;
      background: #121722;
      border: 1px solid var(--line);
      border-radius: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 14px;
    }
    .modal-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }
    .modal-close-btn {
      min-height: 36px;
      padding: 7px 11px;
      border-radius: 10px;
      font-size: 13px;
    }
    .search-row { display: flex; gap: 8px; }
    .search-results {
      overflow: auto;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 10px;
      padding-right: 2px;
    }
    .search-card {
      border: 1px solid var(--line);
      border-radius: 10px;
      overflow: hidden;
      background: #0e131d;
      display: flex;
      flex-direction: column;
      min-height: 210px;
    }
    .search-card img {
      width: 100%;
      height: 120px;
      object-fit: cover;
      background: #0b1018;
      border-bottom: 1px solid var(--line);
    }
    .search-card-body {
      padding: 8px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      flex: 1;
    }
    .search-card-title {
      font-size: 12px;
      color: var(--text);
      line-height: 1.3;
      min-height: 32px;
      overflow: hidden;
    }
    .search-card-domain {
      font-size: 11px;
      color: var(--muted);
      word-break: break-word;
    }
    .search-status {
      min-height: 18px;
      font-size: 12px;
      color: var(--muted);
    }
    .row-image-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .btn.image-search-btn {
      min-height: 38px;
      padding: 8px 11px;
      font-size: 13px;
    }
    .untappd-preview {
      font-size: 12px;
      color: var(--muted);
      word-break: break-all;
      overflow-wrap: anywhere;
    }
    @media (min-width: 700px) {
      .modal-overlay {
        align-items: center;
      }
    }
  </style>
</head>
<body>
  <div class="wrap" id="app"></div>

<script>
(() => {
  const app = document.getElementById('app');
  const DRAFT_STORAGE_PREFIX = 'saas_ratings_draft_v1';
  const DRAFT_SAVE_DEBOUNCE_MS = 300;
  let draftSaveTimer = null;
  const state = {
    clientId: getClientId(),
    game: null,
    beers: [],
    ratings: {},        // beerId -> number
    savedRatings: {},   // beerId -> number
    showResults: false,
    editingGame: false,
    results: null,
    loading: false,
    error: '',
  };

  function readStorage(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }

  function removeStorage(key) {
    try {
      localStorage.removeItem(key);
    } catch {}
  }

  function normalizeScore(value) {
    const score = Number(value);
    if (!Number.isFinite(score)) return null;
    const clamped = Math.min(10, Math.max(0, score));
    return Number(clamped.toFixed(2));
  }

  function getClientId() {
    const key = 'saas_client_id';
    let id = readStorage(key);
    if (!id) {
      id = 'c_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      writeStorage(key, id);
    }
    return id;
  }

  function getPathGameId() {
    const m = location.pathname.match(/^\\/(\\d+)\\/?$/);
    return m ? Number(m[1]) : null;
  }

  function isRoot() {
    return location.pathname === '/' || location.pathname === '';
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'
    }[c]));
  }

  function imageStyle(url) {
    if (!url) return '';
    // allow data URLs and normal URLs
    return 'background-image:url("' + String(url).replace(/"/g, '&quot;') + '")';
  }

  function hasDirty() {
    const ids = state.beers.map(b => b.id);
    return ids.some((id) => {
      const localScore = normalizeScore(state.ratings[id]) ?? 0;
      const savedScore = normalizeScore(state.savedRatings[id]) ?? 0;
      return localScore !== savedScore;
    });
  }

  function formatScore(n) {
    return Number(normalizeScore(n) ?? 0).toFixed(2);
  }

  function gameDisplayName(gameId) {
    const name = String(state.game?.name || '').trim();
    return name || ('Peli #' + gameId);
  }

  function syncLocalRatingsWithBeers(beers) {
    const nextRatings = {};
    const nextSavedRatings = {};
    for (const beer of beers) {
      nextRatings[beer.id] = normalizeScore(state.ratings[beer.id]) ?? 0;
      nextSavedRatings[beer.id] = normalizeScore(state.savedRatings[beer.id]) ?? 0;
    }
    state.ratings = nextRatings;
    state.savedRatings = nextSavedRatings;
  }

  function applyGamePayload(game, beers) {
    state.game = game || null;
    state.beers = beers || [];
    syncLocalRatingsWithBeers(state.beers);
  }

  function getDraftStorageKey(gameId, clientId) {
    return DRAFT_STORAGE_PREFIX + ':' + gameId + ':' + clientId;
  }

  function loadDraft(gameId, clientId, validBeerIds) {
    const key = getDraftStorageKey(gameId, clientId);
    const raw = readStorage(key);
    if (!raw) return {};

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      removeStorage(key);
      return {};
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      removeStorage(key);
      return {};
    }

    const draft = {};
    for (const [beerIdRaw, scoreRaw] of Object.entries(parsed)) {
      const beerId = Number(beerIdRaw);
      if (!Number.isInteger(beerId) || !validBeerIds.has(beerId)) continue;
      const score = normalizeScore(scoreRaw);
      if (score == null) continue;
      draft[beerId] = score;
    }

    return draft;
  }

  function saveDraft(gameId, clientId, ratings) {
    const key = getDraftStorageKey(gameId, clientId);
    const payload = {};
    for (const beer of state.beers) {
      const beerId = Number(beer?.id);
      if (!Number.isInteger(beerId)) continue;
      const score = normalizeScore(ratings[beerId]);
      if (score == null) continue;
      payload[beerId] = score;
    }
    writeStorage(key, JSON.stringify(payload));
  }

  function clearDraft(gameId, clientId) {
    removeStorage(getDraftStorageKey(gameId, clientId));
  }

  function clearPendingDraftSave() {
    if (draftSaveTimer == null) return;
    clearTimeout(draftSaveTimer);
    draftSaveTimer = null;
  }

  function scheduleDraftSave(gameId, clientId) {
    clearPendingDraftSave();
    draftSaveTimer = setTimeout(() => {
      draftSaveTimer = null;
      saveDraft(gameId, clientId, state.ratings);
    }, DRAFT_SAVE_DEBOUNCE_MS);
  }

  async function fetchMyRatings(gameId, clientId) {
    const data = await api('/api/games/' + gameId + '/ratings?clientId=' + encodeURIComponent(clientId));
    const ratingsMap = {};
    const rows = Array.isArray(data?.ratings) ? data.ratings : [];
    for (const row of rows) {
      const beerId = Number(row?.beerId);
      const score = normalizeScore(row?.score);
      if (!Number.isInteger(beerId) || score == null) continue;
      ratingsMap[beerId] = score;
    }
    return ratingsMap;
  }

  async function hydrateRatingsState(gameId) {
    const backendRatings = await fetchMyRatings(gameId, state.clientId);
    const validBeerIds = new Set();
    const nextSavedRatings = {};
    const nextRatings = {};

    for (const beer of state.beers) {
      const beerId = Number(beer?.id);
      if (!Number.isInteger(beerId)) continue;
      validBeerIds.add(beerId);
      const savedScore = normalizeScore(backendRatings[beerId]) ?? 0;
      nextSavedRatings[beerId] = savedScore;
      nextRatings[beerId] = savedScore;
    }

    const draftRatings = loadDraft(gameId, state.clientId, validBeerIds);
    for (const [beerId, score] of Object.entries(draftRatings)) {
      nextRatings[beerId] = score;
    }

    state.savedRatings = nextSavedRatings;
    state.ratings = nextRatings;
  }

  function getGameUrl(gameId) {
    return location.origin + '/' + gameId;
  }

  function getQrApiPath(targetUrl) {
    return '/api/qr?url=' + encodeURIComponent(targetUrl);
  }

  function getUntappdSearchUrl(name) {
    return 'https://untappd.com/search?q=' + encodeURIComponent(String(name || '').trim());
  }

  function getBeerUntappdUrl(beer) {
    const explicit = String(beer?.untappd_url || '').trim();
    if (explicit) return explicit;
    return getUntappdSearchUrl(beer?.name || '');
  }

  function untappdLinkHtml(url) {
    const safeUrl = escapeHtml(url);
    return '<a class="untappd-link" href="' + safeUrl + '" target="_blank" rel="noopener noreferrer">Untappd</a>';
  }

  async function searchInternetImages(query, count) {
    const q = String(query || '').trim();
    if (q.length < 2) {
      throw new Error('Anna hakusanaksi vähintään 2 merkkiä');
    }
    const limit = Math.min(12, Math.max(1, Number(count) || 10));
    return await api('/api/image-search?q=' + encodeURIComponent(q) + '&count=' + limit, {
      method: 'GET'
    });
  }

  function openImageSearchModal(options = {}) {
    const initialQuery = String(options.initialQuery || '').trim();
    const onSelect = typeof options.onSelect === 'function' ? options.onSelect : null;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML =
      '<div class="modal-card" role="dialog" aria-modal="true" aria-label="Hae oluen kuva internetistä">' +
        '<div class="modal-head">' +
          '<div><strong>Hae internetistä</strong></div>' +
          '<button type="button" class="btn modal-close-btn" data-close-modal="1">Sulje</button>' +
        '</div>' +
        '<div class="small">Valitse kuvaehdotus. Tarkista aina kuvan käyttöoikeus ennen julkista käyttöä.</div>' +
        '<div class="search-row">' +
          '<input class="input" id="image-search-input" placeholder="Kirjoita oluen nimi..." />' +
          '<button type="button" class="btn primary" id="image-search-run">Hae</button>' +
        '</div>' +
        '<div class="search-status" id="image-search-status"></div>' +
        '<div class="search-results" id="image-search-results"></div>' +
      '</div>';

    const modalCard = overlay.querySelector('.modal-card');
    const closeBtn = overlay.querySelector('[data-close-modal="1"]');
    const searchInput = overlay.querySelector('#image-search-input');
    const searchBtn = overlay.querySelector('#image-search-run');
    const status = overlay.querySelector('#image-search-status');
    const results = overlay.querySelector('#image-search-results');
    let disposed = false;

    function closeModal() {
      if (disposed) return;
      disposed = true;
      document.removeEventListener('keydown', onKeyDown);
      overlay.remove();
    }

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        closeModal();
      }
    }

    function createResultCard(item) {
      const card = document.createElement('div');
      card.className = 'search-card';

      const img = document.createElement('img');
      img.src = item.thumbnailUrl || item.imageUrl;
      img.alt = item.title || 'Kuvaehdotus';
      card.appendChild(img);

      const body = document.createElement('div');
      body.className = 'search-card-body';
      card.appendChild(body);

      const title = document.createElement('div');
      title.className = 'search-card-title';
      title.textContent = item.title || 'Kuvaehdotus';
      body.appendChild(title);

      const domain = document.createElement('div');
      domain.className = 'search-card-domain';
      domain.textContent = item.sourceDomain || '';
      body.appendChild(domain);

      const useBtn = document.createElement('button');
      useBtn.type = 'button';
      useBtn.className = 'btn image-search-btn';
      useBtn.textContent = 'Valitse kuva';
      useBtn.onclick = () => {
        if (onSelect) {
          onSelect(item);
        }
        closeModal();
      };
      body.appendChild(useBtn);

      return card;
    }

    async function runSearch(query) {
      status.textContent = 'Haetaan kuvia...';
      results.innerHTML = '';
      searchBtn.disabled = true;
      try {
        const data = await searchInternetImages(query, 10);
        const list = Array.isArray(data?.results) ? data.results : [];
        if (!list.length) {
          status.textContent = 'Ei kuvaehdotuksia tällä haulla.';
          return;
        }

        status.textContent = 'Valitse sopiva kuvaehdotus.';
        for (const item of list) {
          const imageUrl = String(item?.imageUrl || '').trim();
          if (!imageUrl) continue;
          results.appendChild(createResultCard(item));
        }
      } catch (err) {
        status.textContent = err?.message || 'Kuvahaku epäonnistui.';
      } finally {
        searchBtn.disabled = false;
      }
    }

    closeBtn.onclick = closeModal;
    overlay.onclick = (e) => {
      if (e.target === overlay) closeModal();
    };
    searchBtn.onclick = () => {
      runSearch(searchInput.value);
    };
    searchInput.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        runSearch(searchInput.value);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.body.appendChild(overlay);
    searchInput.value = initialQuery;
    searchInput.focus();
    if (initialQuery.length >= 2) {
      runSearch(initialQuery);
    } else {
      status.textContent = 'Kirjoita oluen nimi ja hae kuvaehdotuksia.';
    }
    requestAnimationFrame(() => {
      if (!disposed) {
        modalCard.scrollTop = 0;
      }
    });
  }

  async function generateQrDataUrl(targetUrl) {
    const res = await fetch(getQrApiPath(targetUrl));
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error || 'QR-koodin lataus epäonnistui');
    }
    const svg = await res.text();
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  async function copyTextToClipboard(text) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    if (!ok) throw new Error('Kopiointi epäonnistui');
  }

  async function api(path, options = {}) {
    const res = await fetch(path, {
      headers: { 'content-type': 'application/json', ...(options.headers || {}) },
      ...options,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || ('HTTP ' + res.status));
    }
    return data;
  }

  async function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function render() {
    const gameId = getPathGameId();

    if (isRoot()) {
      renderRoot();
      return;
    }

    if (!gameId) {
      app.innerHTML = \`
        <div class="title">Sahti as a Service</div>
        <div class="card">Tuntematon osoite. Mene juureen <a href="/">/</a>.</div>
      \`;
      return;
    }

    renderGamePage(gameId);
  }

  function renderRoot() {
    app.innerHTML = \`
      <div class="title">Sahti as a Service</div>
      <div class="sub">Arvosanat oluille, mobiili edellä 🍺</div>

      <div class="card">
        <div class="col">
          <button class="btn primary" id="show-create">Luo peli</button>
          <div class="divider"></div>
          <label class="small" for="join-id">Liity peliin ID:llä</label>
          <div class="row">
            <input class="join-input grow" id="join-id" placeholder="esim. 12" inputmode="numeric" />
            <button class="btn" id="join-btn">Liity</button>
          </div>
        </div>
      </div>

      <div id="create-panel" class="hidden"></div>
    \`;

    document.getElementById('show-create').onclick = () => {
      const panel = document.getElementById('create-panel');
      panel.classList.toggle('hidden');
      if (!panel.dataset.init) {
        panel.dataset.init = '1';
        renderCreateForm(panel);
      }
    };

    document.getElementById('join-btn').onclick = () => {
      const v = document.getElementById('join-id').value.trim();
      if (!/^\\d+$/.test(v)) {
        alert('Syötä numeromuotoinen peli-ID');
        return;
      }
      location.href = '/' + v;
    };
  }

  function renderCreateForm(panel) {
    const draft = {
      gameName: '',
      beers: [{ name: '', imageUrl: '', file: null }],
      submitting: false,
    };

    function rowHtml(row, idx) {
      return \`
        <div class="card" data-row="\${idx}">
          <div class="col">
            <div class="row">
              <div class="grow"><strong>Olut \${idx + 1}</strong></div>
              <button type="button" class="btn danger remove-row" data-idx="\${idx}" \${draft.beers.length === 1 ? 'disabled' : ''}>Poista</button>
            </div>
            <label class="small">Nimi</label>
            <input class="input beer-name-input" data-idx="\${idx}" value="\${escapeHtml(row.name)}" placeholder="esim. Sahti Special 2026" />
            <label class="small">Kuva URL (optional)</label>
            <input class="input beer-image-url-input" data-idx="\${idx}" value="\${escapeHtml(row.imageUrl)}" placeholder="https://..." />
            <div class="row-image-actions">
              <button type="button" class="btn image-search-btn create-image-search-btn" data-idx="\${idx}">Hae internetistä</button>
            </div>
            <label class="small">Tai kuva tiedostona (optional)</label>
            <input class="input beer-file-input" data-idx="\${idx}" type="file" accept="image/*" />
            <div class="file-note">MVP: tiedosto tallennetaan data-URL:na D1:een, joten pidä kuvat pieniä (mieluiten pakattuja).</div>
            <div class="untappd-preview">Untappd: \${untappdLinkHtml(getUntappdSearchUrl(row.name))}</div>
          </div>
        </div>
      \`;
    }

    function rerender() {
      panel.innerHTML = \`
        <div class="card">
          <div class="col">
            <div><strong>Luo uusi peli</strong></div>
            <div class="small">Pelin nimi ja oluen nimi ovat pakollisia.</div>
            <label class="small">Pelin nimi</label>
            <input class="input" id="game-name-input" value="\${escapeHtml(draft.gameName)}" placeholder="esim. Sahtitesti 2026" />
          </div>
        </div>

        <div id="rows">
          \${draft.beers.map((b, i) => rowHtml(b, i)).join('')}
        </div>

        <div class="card">
          <div class="col">
            <button type="button" class="btn" id="add-row">+ Lisää rivi</button>
            <button type="button" class="btn primary" id="create-game-btn" \${draft.submitting ? 'disabled' : ''}>
              \${draft.submitting ? 'Luodaan...' : 'Tallenna ja luo peli'}
            </button>
          </div>
        </div>
      \`;

      panel.querySelectorAll('.beer-name-input').forEach(el => {
        el.oninput = (e) => { draft.beers[Number(e.target.dataset.idx)].name = e.target.value; };
      });
      const gameNameInput = document.getElementById('game-name-input');
      if (gameNameInput) {
        gameNameInput.oninput = (e) => { draft.gameName = e.target.value; };
      }
      panel.querySelectorAll('.beer-image-url-input').forEach(el => {
        el.oninput = (e) => { draft.beers[Number(e.target.dataset.idx)].imageUrl = e.target.value; };
      });
      panel.querySelectorAll('.beer-file-input').forEach(el => {
        el.onchange = (e) => { draft.beers[Number(e.target.dataset.idx)].file = e.target.files?.[0] || null; };
      });
      panel.querySelectorAll('.create-image-search-btn').forEach(btn => {
        btn.onclick = () => {
          const idx = Number(btn.dataset.idx);
          const row = draft.beers[idx];
          openImageSearchModal({
            initialQuery: row?.name || '',
            onSelect: (selected) => {
              if (!draft.beers[idx]) return;
              draft.beers[idx].imageUrl = String(selected?.imageUrl || '').trim();
              draft.beers[idx].file = null;
              rerender();
            }
          });
        };
      });
      panel.querySelectorAll('.remove-row').forEach(btn => {
        btn.onclick = () => {
          const idx = Number(btn.dataset.idx);
          draft.beers.splice(idx, 1);
          rerender();
        };
      });

      document.getElementById('add-row').onclick = () => {
        draft.beers.push({ name: '', imageUrl: '', file: null });
        rerender();
      };

      document.getElementById('create-game-btn').onclick = async () => {
        try {
          draft.submitting = true;
          rerender();

          const gameName = (draft.gameName || '').trim();
          if (!gameName) throw new Error('Anna pelille nimi');

          const payloadBeers = [];
          for (const row of draft.beers) {
            const name = (row.name || '').trim();
            if (!name) continue;

            let image_url = (row.imageUrl || '').trim() || null;

            if (!image_url && row.file) {
              // quick MVP path: store as data URL
              image_url = await fileToDataUrl(row.file);
              // basic guard to avoid huge rows
              if (image_url.length > 700000) {
                throw new Error('Kuvatiedosto liian iso MVP-versioon. Käytä pienempää kuvaa tai URL:ia.');
              }
            }

            payloadBeers.push({ name, image_url });
          }

          if (payloadBeers.length === 0) throw new Error('Lisää vähintään yksi olut');

          const res = await api('/api/create-game', {
            method: 'POST',
            body: JSON.stringify({
              name: gameName,
              beers: payloadBeers
            }),
          });

          location.href = '/' + res.gameId;
        } catch (err) {
          alert(err.message || String(err));
          draft.submitting = false;
          rerender();
        }
      };
    }

    rerender();
  }

  async function ensureGameLoaded(gameId) {
    if (!state.game || Number(state.game.id) !== Number(gameId) || !state.beers.length) {
      const data = await api('/api/games/' + gameId);
      applyGamePayload(data.game, data.beers);
    }
    await hydrateRatingsState(gameId);
  }

  function renderGamePage(gameId) {
    app.innerHTML = \`
      <div class="title">Sahti as a Service</div>
      <div class="sub">Peli #\${gameId} • Ladataan...</div>
      <div class="card">Ladataan...</div>
    \`;

    (async () => {
      try {
        await ensureGameLoaded(gameId);
        if (state.editingGame) {
          renderEditView(gameId);
        } else if (state.showResults) {
          await loadResults(gameId);
          renderResultsView(gameId);
        } else {
          renderPlayView(gameId);
        }
      } catch (err) {
        app.innerHTML = \`
          <div class="title">Sahti as a Service</div>
          <div class="card">
            <div><strong>Virhe</strong></div>
            <div class="muted">\${escapeHtml(err.message || String(err))}</div>
            <div style="margin-top:10px"><a href="/" class="btn" style="display:inline-block;text-decoration:none">Takaisin etusivulle</a></div>
          </div>
        \`;
      }
    })();
  }

  function beerCardHtml(beer, opts = {}) {
    const img = beer.image_url
      ? \`<div class="beer-img" style="\${imageStyle(beer.image_url)}"></div>\`
      : \`<div class="beer-img">Ei kuvaa</div>\`;
    const untappdUrl = getBeerUntappdUrl(beer);
    const untappdHtml = untappdUrl
      ? \`<div class="small">\${untappdLinkHtml(untappdUrl)}</div>\`
      : '';

    if (opts.results) {
      return \`
        <div class="card">
          <div class="beer-card">
            \${img}
            <div>
              <div class="beer-name">\${escapeHtml(beer.name)}</div>
              \${untappdHtml}
              <div class="row">
                <div class="score-value"><strong>\${formatScore(beer.avg_score)}</strong></div>
                <div class="small">keskiarvo</div>
                <div class="badge">\${Number(beer.rating_count || 0)} arvosanaa</div>
              </div>
            </div>
          </div>
        </div>
      \`;
    }

    const value = Number(state.ratings[beer.id] ?? 0);
    return \`
      <div class="card">
        <div class="beer-card">
          \${img}
          <div>
            <div class="beer-name">\${escapeHtml(beer.name)}</div>
            \${untappdHtml}
            <div class="score-row">
              <input type="range" min="0" max="10" step="0.01" value="\${value}" data-beer-id="\${beer.id}" class="score-slider" />
              <div class="score-value" id="score-val-\${beer.id}">\${formatScore(value)}</div>
            </div>
          </div>
        </div>
      </div>
    \`;
  }

  function renderPlayView(gameId) {
    const targetUrl = getGameUrl(gameId);
    app.innerHTML = \`
      <div class="title">Sahti as a Service</div>
      <div class="sub">\${escapeHtml(gameDisplayName(gameId))} • Arvostele oluet</div>

      <div class="card">
        <div class="col" style="gap:12px;">
          <div class="row" style="justify-content:space-between; align-items:flex-start;">
            <div class="col">
              <div><strong>\${escapeHtml(gameDisplayName(gameId))}</strong></div>
              <div class="id-row">
                <div class="small">Peli-ID: \${gameId} • \${state.beers.length} olutta</div>
                <button class="btn qr-toggle-btn" type="button" id="toggle-qr-btn" aria-expanded="false">QR</button>
              </div>
              <div class="small">Client ID: \${escapeHtml(state.clientId.slice(-8))} (selainkohtainen)</div>
            </div>
            <a href="/" class="btn" style="text-decoration:none">Etusivu</a>
          </div>
          <div class="row">
            <button class="btn grow" id="copy-game-url-btn">Kopioi pelin URL</button>
            <button class="btn" id="edit-game-btn">Muokkaa</button>
          </div>
          <div class="share-panel hidden" id="share-panel">
            <div class="qr-wrap">
              <img class="qr-img hidden" id="share-qr-img" alt="QR-koodi pelin linkille" />
              <div class="col grow" style="gap:6px;">
                <div class="small">Jaa peli skannaamalla QR-koodi tai kopioi URL-linkki.</div>
                <div class="qr-status" id="share-qr-status"></div>
                <div class="share-link">
                  <a id="share-game-link" href="\${escapeHtml(targetUrl)}">\${escapeHtml(targetUrl)}</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div id="beer-list">
        \${state.beers.map(b => beerCardHtml(b)).join('')}
      </div>

      <div class="toolbar">
        <div class="card">
          <div class="col">
            <button class="btn success" id="save-btn" \${hasDirty() ? '' : 'disabled'}>Tallenna</button>
            <button class="btn" id="results-btn">Näytä tulokset</button>
          </div>
        </div>
      </div>
    \`;

    app.querySelectorAll('.score-slider').forEach(sl => {
      sl.addEventListener('input', (e) => {
        const beerId = Number(e.target.dataset.beerId);
        const value = normalizeScore(e.target.value);
        state.ratings[beerId] = value ?? 0;
        const out = document.getElementById('score-val-' + beerId);
        if (out) out.textContent = formatScore(value ?? 0);

        const saveBtn = document.getElementById('save-btn');
        if (saveBtn) saveBtn.disabled = !hasDirty();
        scheduleDraftSave(gameId, state.clientId);
      });
    });

    const sharePanel = document.getElementById('share-panel');
    const toggleQrBtn = document.getElementById('toggle-qr-btn');
    const qrImg = document.getElementById('share-qr-img');
    const qrStatus = document.getElementById('share-qr-status');
    let qrDataReady = false;
    let qrGenerationPromise = null;

    toggleQrBtn.onclick = async () => {
      const opening = sharePanel.classList.contains('hidden');
      if (!opening) {
        sharePanel.classList.add('hidden');
        toggleQrBtn.setAttribute('aria-expanded', 'false');
        return;
      }

      sharePanel.classList.remove('hidden');
      toggleQrBtn.setAttribute('aria-expanded', 'true');

      if (qrDataReady) {
        return;
      }

      if (qrGenerationPromise) {
        qrStatus.textContent = 'Luodaan QR-koodia...';
        try {
          await qrGenerationPromise;
        } catch (_) {}
        return;
      }

      qrStatus.textContent = 'Luodaan QR-koodia...';
      qrGenerationPromise = generateQrDataUrl(targetUrl)
        .then((dataUrl) => {
          qrImg.src = dataUrl;
          qrImg.classList.remove('hidden');
          qrStatus.textContent = 'Skannaa QR avataksesi pelin';
          qrDataReady = true;
        })
        .catch((err) => {
          qrImg.classList.add('hidden');
          qrStatus.textContent =
            (err && err.message)
              ? err.message + ' - voit silti jakaa linkin.'
              : 'QR-koodin luonti epäonnistui - voit silti jakaa linkin.';
        })
        .finally(() => {
          qrGenerationPromise = null;
        });

      try {
        await qrGenerationPromise;
      } catch (_) {}
    };

    document.getElementById('copy-game-url-btn').onclick = async () => {
      const btn = document.getElementById('copy-game-url-btn');
      try {
        await copyTextToClipboard(targetUrl);
        btn.textContent = 'Kopioitu!';
        setTimeout(() => {
          const current = document.getElementById('copy-game-url-btn');
          if (current) current.textContent = 'Kopioi pelin URL';
        }, 900);
      } catch (err) {
        alert(err.message || 'URL:n kopiointi epäonnistui');
      }
    };

    document.getElementById('edit-game-btn').onclick = () => {
      state.editingGame = true;
      state.showResults = false;
      renderEditView(gameId);
    };

    document.getElementById('save-btn').onclick = async () => {
      const btn = document.getElementById('save-btn');
      try {
        btn.disabled = true;
        btn.textContent = 'Tallennetaan...';

        const changed = state.beers
          .map(b => ({
            beerId: b.id,
            score: normalizeScore(state.ratings[b.id]) ?? 0,
            prev: normalizeScore(state.savedRatings[b.id]) ?? 0
          }))
          .filter(x => x.score !== x.prev)
          .map(({ beerId, score }) => ({ beerId, score }));

        if (!changed.length) {
          btn.textContent = 'Tallenna';
          btn.disabled = true;
          return;
        }

        await api('/api/games/' + gameId + '/ratings', {
          method: 'POST',
          body: JSON.stringify({
            clientId: state.clientId,
            ratings: changed
          })
        });

        for (const item of changed) state.savedRatings[item.beerId] = item.score;
        clearPendingDraftSave();
        clearDraft(gameId, state.clientId);

        btn.textContent = 'Tallennettu';
        setTimeout(() => {
          const b = document.getElementById('save-btn');
          if (!b) return;
          b.textContent = 'Tallenna';
          b.disabled = !hasDirty();
        }, 800);
      } catch (err) {
        alert(err.message || String(err));
        btn.textContent = 'Tallenna';
        btn.disabled = !hasDirty();
      }
    };

    document.getElementById('results-btn').onclick = async () => {
      state.showResults = true;
      await loadResults(gameId);
      renderResultsView(gameId);
    };
  }

  function renderEditView(gameId) {
    const draft = {
      gameName: String(state.game?.name || ''),
      beers: state.beers.map((beer) => ({
        id: beer.id,
        name: beer.name || '',
        imageUrl: beer.image_url || '',
        untappdUrl: beer.untappd_url || '',
        file: null,
      })),
      submitting: false,
    };

    function rowHtml(row, idx) {
      return \`
        <div class="card">
          <div class="col">
            <div class="row">
              <div class="grow"><strong>Olut \${idx + 1}</strong></div>
              <button type="button" class="btn danger edit-remove-row" data-idx="\${idx}" \${draft.beers.length === 1 ? 'disabled' : ''}>Poista</button>
            </div>
            <label class="small">Nimi</label>
            <input class="input edit-beer-name" data-idx="\${idx}" value="\${escapeHtml(row.name)}" placeholder="esim. Sahti Special 2026" />
            <label class="small">Kuva URL (optional)</label>
            <input class="input edit-beer-image-url" data-idx="\${idx}" value="\${escapeHtml(row.imageUrl)}" placeholder="https://..." />
            <div class="row-image-actions">
              <button type="button" class="btn image-search-btn edit-image-search-btn" data-idx="\${idx}">Hae internetistä</button>
            </div>
            <label class="small">Tai uusi kuva tiedostona (optional)</label>
            <input class="input edit-beer-file" data-idx="\${idx}" type="file" accept="image/*" />
            <div class="file-note">Jos valitset tiedoston, se korvaa URL-kentän arvon tallennuksessa.</div>
            <div class="untappd-preview">Untappd: \${untappdLinkHtml(row.untappdUrl || getUntappdSearchUrl(row.name))}</div>
          </div>
        </div>
      \`;
    }

    function rerender() {
      app.innerHTML = \`
        <div class="title">Sahti as a Service</div>
        <div class="sub">\${escapeHtml(gameDisplayName(gameId))} • Muokkaa peliä</div>

        <div class="card">
          <div class="col">
            <label class="small">Pelin nimi</label>
            <input class="input" id="edit-game-name" value="\${escapeHtml(draft.gameName)}" placeholder="Pelin nimi" />
            <div class="small">Voit lisätä, poistaa ja muokata oluita.</div>
          </div>
        </div>

        <div>
          \${draft.beers.map((beer, idx) => rowHtml(beer, idx)).join('')}
        </div>

        <div class="card">
          <div class="col">
            <button type="button" class="btn" id="edit-add-row">+ Lisää olut</button>
            <button type="button" class="btn primary" id="save-game-edits" \${draft.submitting ? 'disabled' : ''}>
              \${draft.submitting ? 'Tallennetaan...' : 'Tallenna muutokset'}
            </button>
            <button type="button" class="btn" id="cancel-game-edits" \${draft.submitting ? 'disabled' : ''}>Peruuta</button>
          </div>
        </div>
      \`;

      const gameNameInput = document.getElementById('edit-game-name');
      if (gameNameInput) {
        gameNameInput.oninput = (e) => { draft.gameName = e.target.value; };
      }

      app.querySelectorAll('.edit-beer-name').forEach((el) => {
        el.oninput = (e) => { draft.beers[Number(e.target.dataset.idx)].name = e.target.value; };
      });
      app.querySelectorAll('.edit-beer-image-url').forEach((el) => {
        el.oninput = (e) => { draft.beers[Number(e.target.dataset.idx)].imageUrl = e.target.value; };
      });
      app.querySelectorAll('.edit-beer-file').forEach((el) => {
        el.onchange = (e) => { draft.beers[Number(e.target.dataset.idx)].file = e.target.files?.[0] || null; };
      });
      app.querySelectorAll('.edit-image-search-btn').forEach((btn) => {
        btn.onclick = () => {
          const idx = Number(btn.dataset.idx);
          const row = draft.beers[idx];
          openImageSearchModal({
            initialQuery: row?.name || '',
            onSelect: (selected) => {
              if (!draft.beers[idx]) return;
              draft.beers[idx].imageUrl = String(selected?.imageUrl || '').trim();
              draft.beers[idx].file = null;
              rerender();
            }
          });
        };
      });
      app.querySelectorAll('.edit-remove-row').forEach((btn) => {
        btn.onclick = () => {
          const idx = Number(btn.dataset.idx);
          draft.beers.splice(idx, 1);
          rerender();
        };
      });

      document.getElementById('edit-add-row').onclick = () => {
        draft.beers.push({ name: '', imageUrl: '', file: null });
        rerender();
      };

      document.getElementById('cancel-game-edits').onclick = () => {
        state.editingGame = false;
        renderPlayView(gameId);
      };

      document.getElementById('save-game-edits').onclick = async () => {
        try {
          draft.submitting = true;
          rerender();

          const gameName = (draft.gameName || '').trim();
          if (!gameName) throw new Error('Anna pelille nimi');

          const payloadBeers = [];
          for (const row of draft.beers) {
            const name = (row.name || '').trim();
            if (!name) continue;

            let image_url = (row.imageUrl || '').trim() || null;
            if (row.file) {
              image_url = await fileToDataUrl(row.file);
              if (image_url.length > 700000) {
                throw new Error('Kuvatiedosto liian iso MVP-versioon. Käytä pienempää kuvaa tai URL:ia.');
              }
            }

            const payloadRow = { name, image_url };
            if (row.id != null) payloadRow.id = row.id;
            payloadBeers.push(payloadRow);
          }

          if (!payloadBeers.length) throw new Error('Lisää vähintään yksi olut');

          const res = await api('/api/games/' + gameId, {
            method: 'PUT',
            body: JSON.stringify({
              name: gameName,
              beers: payloadBeers
            }),
          });

          applyGamePayload(res.game, res.beers);
          state.results = null;
          state.editingGame = false;
          renderPlayView(gameId);
        } catch (err) {
          alert(err.message || String(err));
          draft.submitting = false;
          rerender();
        }
      };
    }

    rerender();
  }

  async function loadResults(gameId) {
    state.results = await api('/api/games/' + gameId + '/results');
    if (state.results?.game) {
      state.game = state.results.game;
    }
  }

  function renderResultsView(gameId) {
    const r = state.results;
    app.innerHTML = \`
      <div class="title">Sahti as a Service</div>
      <div class="sub">\${escapeHtml(gameDisplayName(gameId))} • Tulokset</div>

      <div class="card">
        <div class="row" style="justify-content:space-between; align-items:center;">
          <div class="col">
            <div class="badge">Pelaajia: \${Number(r?.summary?.players || 0)}</div>
            <div class="small">Järjestetty keskiarvon mukaan</div>
          </div>
          <button class="btn" id="back-to-play">Paluu peliin</button>
        </div>
      </div>

      <div id="results-list">
        \${(r?.beers || []).length
          ? r.beers.map(b => beerCardHtml(b, { results: true })).join('')
          : '<div class="card empty">Ei tuloksia vielä</div>'
        }
      </div>

      <div class="toolbar">
        <div class="card">
          <div class="col">
            <button class="btn" id="refresh-results">Päivitä tulokset</button>
          </div>
        </div>
      </div>
    \`;

    document.getElementById('back-to-play').onclick = () => {
      state.showResults = false;
      renderPlayView(gameId);
    };

    document.getElementById('refresh-results').onclick = async () => {
      const btn = document.getElementById('refresh-results');
      btn.disabled = true;
      btn.textContent = 'Päivitetään...';
      try {
        await loadResults(gameId);
        renderResultsView(gameId);
      } catch (err) {
        alert(err.message || String(err));
        btn.disabled = false;
        btn.textContent = 'Päivitä tulokset';
      }
    };
  }

  // first render
  render();
})();
</script>
</body>
</html>`;
}
