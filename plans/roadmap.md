# Breview Roadmap

## Now

- Maintain this `plans/` directory as the source of truth for production direction.
- Keep `README.md` aligned with the agent workflow and current monorepo architecture.
- Keep the npm workspaces layout healthy across `apps/api`, `apps/web`, `apps/mobile`, `packages/shared`, and `packages/api-client`.
- Keep current Cloudflare resource names stable while the product brand changes.
- Keep paid web image search out of the production API surface; beer-name recognition uses Workers AI and Untappd remains outbound search-link only.
- Keep Workers AI beer-name recognition observable and robust: JSON-only name extraction, high-detail image input, Kimi reasoning handling, and clear distinction between uncertain images and upstream empty responses.
- Keep browser uploads stable on mobile by converting selected images to managed JPEG blobs before R2 upload and by reusing the prepared recognition image for game creation.
- Keep the mobile app on Expo SDK 54 during the current Expo Go transition so local testing does not fight the other active SDK 54 project.
- Keep the Expo create, join, recent-games, rating, comments, save, results, share, edit, native image-pick, R2 upload, and Workers AI recognition flows connected to the production Cloudflare API by default.
- Keep the mobile dark Breview visual direction aligned with the web UI while using AniUI/NativeWind components.
- Grow the Expo shell from current native game editing, image upload, and sharing into account flows, deeper link handling, and release-grade review states using AniUI components.

## Next

- Add Cloudflare Email Service binding and D1 auth schema for email-code login.
- Add session handling, account history, logout, and account deletion endpoints.
- Add `/privacy`, `/support`, and `/delete-account` web pages suitable for App Store and Google Play review.
- Keep beer-name recognition on Cloudflare Workers AI, starting with Gemma 4 and escalating to Kimi K2.6 only if quality requires it.
- Decide whether Untappd outbound search links remain after legal/product review; do not use scraping, private endpoints, or Untappd branding.

## Then

- Implement native account settings and polish edit/share/image capture states for release.
- Add deep links and app links for `breview://` and `https://breview.ing`.
- Add mobile image picking/upload, camera/photo permission copy, haptics, loading states, and offline-friendly retry states.
- In mobile beer creation, ask after camera/photo capture whether the user wants AI recognition or manual name entry.
- Upgrade Breview and the other active mobile project to Expo SDK 55 together, or move Breview to an SDK 55 development build when Apple Developer/TestFlight setup is ready.

## Release

- Configure EAS production builds for `ing.breview.app` on iOS and Android.
- Prepare TestFlight and Google Play internal/closed testing builds with reviewer-ready demo access.
- Complete App Store privacy details, Google Play Data safety, account deletion links, screenshots, descriptions, support URL, and review notes.
- Run production release checks: API migration, web deploy, mobile build verification, TestFlight smoke test, Play test smoke test, and post-release monitoring.
