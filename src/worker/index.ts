import type { Env } from "./env";
import { json } from "./http";
import { routeApi } from "./router";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const apiResponse = await routeApi(request, env);
      if (apiResponse) {
        return apiResponse;
      }

      if ((request.method === "GET" || request.method === "HEAD") && env.ASSETS?.fetch) {
        return env.ASSETS.fetch(request);
      }

      return json({ error: "Not found" }, 404);
    } catch (err) {
      return json(
        { error: "Server error", details: String((err as Error)?.message ?? err) },
        500,
      );
    }
  },
};
