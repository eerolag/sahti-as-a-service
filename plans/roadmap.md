# Breview Roadmap

## Now

- Maintain this `plans/` directory as the source of truth for production direction.
- Keep `README.md` aligned with the agent workflow and current architecture.
- Complete the Breview naming and canonical-domain baseline across user-visible web copy and documentation.
- Keep current Cloudflare resource names stable while the product brand changes.
- Keep paid web image search out of the production API surface; beer-name recognition uses Workers AI and Untappd remains outbound search-link only.

## Next

- Add Cloudflare Email Service binding and D1 auth schema for email-code login.
- Add session handling, account history, logout, and account deletion endpoints.
- Add `/privacy`, `/support`, and `/delete-account` web pages suitable for App Store and Google Play review.
- Keep beer-name recognition on Cloudflare Workers AI, starting with Gemma 4 and escalating to Kimi K2.6 only if quality requires it.
- Decide whether Untappd outbound search links remain after legal/product review; do not use scraping, private endpoints, or Untappd branding.

## Then

- Create the Expo mobile app shell with Expo Router, TypeScript, AniUI, NativeWind, and shared API contracts.
- Implement native screens for home/history, create game, join game, rating, results, game editing, sharing, and account settings.
- Add deep links and app links for `breview://` and `https://breview.ing`.
- Add mobile image picking/upload, camera/photo permission copy, haptics, loading states, and offline-friendly retry states.
- In mobile beer creation, ask after camera/photo capture whether the user wants AI recognition or manual name entry.

## Release

- Configure EAS production builds for `ing.breview.app` on iOS and Android.
- Prepare TestFlight and Google Play internal/closed testing builds with reviewer-ready demo access.
- Complete App Store privacy details, Google Play Data safety, account deletion links, screenshots, descriptions, support URL, and review notes.
- Run production release checks: API migration, web deploy, mobile build verification, TestFlight smoke test, Play test smoke test, and post-release monitoring.
