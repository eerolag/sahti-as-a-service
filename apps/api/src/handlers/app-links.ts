import type { Env } from "../env";

const DEFAULT_APP_ID = "ing.breview.app";

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function splitCsv(value: unknown): string[] {
  return clean(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function wellKnownJson(request: Request, payload: unknown): Response {
  return new Response(request.method === "HEAD" ? null : JSON.stringify(payload), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export function handleAppleAppSiteAssociation(request: Request, env: Env): Response {
  const teamId = clean(env.IOS_APPLE_TEAM_ID);
  const bundleId = clean(env.IOS_BUNDLE_IDENTIFIER) || DEFAULT_APP_ID;
  const appId = teamId ? `${teamId}.${bundleId}` : "";

  return wellKnownJson(request, {
    applinks: {
      apps: [],
      details: appId
        ? [
            {
              appID: appId,
              paths: ["/*"],
            },
          ]
        : [],
    },
  });
}

export function handleAndroidAssetLinks(request: Request, env: Env): Response {
  const packageName = clean(env.ANDROID_PACKAGE_NAME) || DEFAULT_APP_ID;
  const fingerprints = splitCsv(env.ANDROID_SHA256_CERT_FINGERPRINTS);

  return wellKnownJson(
    request,
    fingerprints.length
      ? [
          {
            relation: ["delegate_permission/common.handle_all_urls"],
            target: {
              namespace: "android_app",
              package_name: packageName,
              sha256_cert_fingerprints: fingerprints,
            },
          },
        ]
      : [],
  );
}
