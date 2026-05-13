# Breview Roadmap

## Now

- Maintain this `plans/` directory as the source of truth for production direction.
- Keep `README.md` aligned with the agent workflow and current monorepo architecture.
- Keep the npm workspaces layout healthy across `apps/api`, `apps/web`, `apps/mobile`, `packages/shared`, and `packages/api-client`.
- Keep current Cloudflare resource names stable while the product brand changes.
- Keep paid web image search out of the production API surface; beer-name recognition uses Workers AI and Untappd remains outbound search-link only.
- Keep Workers AI beer-name recognition observable and robust: JSON-only name extraction, high-detail image input, Kimi reasoning handling, and clear distinction between uncertain images and upstream empty responses.
- Keep Workers AI beer-name recognition scoped to beverage labels, tap-handle badges, tap lists, drink menus, bottles, cans, and packages, with a 10-per-client daily limit, a same-day lock after repeated clearly non-beverage or inappropriate images, and rejection of checklist/question/category/status text such as `Check for beverage` or `Is it a beer can`.
- Keep AI recognition test locks easy to clear in local and remote D1 with the documented `ai:unlock:*` npm scripts.
- Keep browser uploads stable on mobile by converting selected images to managed JPEG blobs before R2 upload and by reusing the prepared recognition image for game creation.
- Keep the mobile app on Expo SDK 54 during the current Expo Go transition so local testing does not fight the other active SDK 54 project.
- Keep the Expo create, join, recent-games, rating, comments, save, results, share, edit, beer-reorder, native image-pick, R2 upload, and Workers AI recognition flows connected to the production Cloudflare API by default.
- Keep manual image URL entry out of web and mobile UI; image input happens through file, camera, or photo library, and `Tunnista nimi AI:lla` activates only after an image is selected.
- Keep local device image filenames hidden in mobile UI; selected image preview is enough feedback.
- Keep web and mobile localization backed by shared dictionaries. Current shipped locales are `fi`, `en`, `sv`, and `nl`; unsupported browser/device locales must fallback to English, with manual language selection available in web header and mobile account settings.
- Keep AI recognition warnings visible as popup/alert feedback in web and mobile, not only inline status text.
- Keep the `/makers` creator-support page provider-agnostic: web reads `SUPPORT_PAYMENT_URL`, mobile only opens `EXPO_PUBLIC_SUPPORT_PAGE_URL` externally, and no native payment flow is added.
- Keep optional email-code accounts working across web and mobile: Cloudflare Email Service sends login codes, resend cooldown UI prevents rapid repeat taps, D1 sessions link device ratings to accounts, and account deletion is shown only after login.
- Keep structured auth logs in Worker logs for login-code requests, send success/failure, verify success/failure, logout, and account deletion; user-facing auth errors must remain concise and non-leaky.
- Keep public `/privacy`, `/support`, and `/delete-account` pages reachable without login and linked from account/support surfaces.
- Keep new production sessions on unguessable `/s/:shareId` participant links and `/h/:shareId#hostToken` host links; numeric routes are legacy compatibility only.
- Keep old sessions backfilled with random public IDs through D1 migration `0008_backfill_game_public_ids.sql`; web account history and mobile recent/account history should open `/s/:shareId` whenever `publicId` exists.
- Keep host-only session editing, configurable rating scales, and hidden-result reveal behavior working across web and mobile.
- Keep UGC hardening active: safety acceptance before creation, basic abusive-text blocking, content report submission, and store-safe support/payment wording.
- Keep `plans/pre-release-improvements.md` as the current release-hardening plan before App Store and Google Play submission.
- Keep `breview://` plus prepared iOS universal links and Android app links for `https://breview.ing`; final production association still needs Apple Team ID and Android SHA-256 signing fingerprint.
- Keep privacy basics available from the account UI before login and link to the fuller public reviewer pages.
- Keep the mobile dark Breview visual direction aligned with the web UI while using NativeWind/React Native components.
- Keep mobile account/support/privacy actions in the top-right menu instead of the removed bottom tab bar.
- Keep the Expo shell's account, image upload, sharing, retry, permission-denied, settings, beer-reorder, and edit states release-grade while continuing to use SDK 54.

## Next

- Replace empty app-link association responses with final Apple Team ID and Android SHA-256 fingerprints once the release owner provides them.
- Test universal/app link behavior from Messages, Safari/Chrome, email, QR codes, and web fallback on real iOS and Android builds.
- Keep beer-name recognition on Cloudflare Workers AI, starting with Gemma 4 and escalating to Kimi K2.6 only if quality requires it.
- Keep Untappd as outbound search links only; do not use scraping, private endpoints, API calls, or Untappd branding.
- Expand localization beyond `fi`, `en`, `sv`, and `nl` only after the full-string QA process is ready; the planned top-language backlog includes `es`, `pt-BR`, `fr`, `de`, `zh-Hans`, `hi`, `ar`, `bn`, `id`, `ru`, and `ur`, with RTL layout required before `ar` or `ur` can be marked complete.

## Then

- Continue smoke-testing native account settings, edit/share/image capture states, permission copy, selective native haptics, loading states, and offline-friendly retry states on physical devices.
- Upgrade Breview and the other active mobile project to Expo SDK 55 together, or move Breview to an SDK 55 development build when Apple Developer/TestFlight setup is ready.

## Release

- Use `plans/release-checklist.md` as the store-release checklist and keep it current as Apple Developer, Google Play Console, and Expo/EAS setup decisions are made.
- Configure EAS production builds for `ing.breview.app` on iOS and Android.
- Create or confirm Apple Developer Program, Google Play Console, and Expo/EAS account ownership before store build work starts.
- Prepare TestFlight and Google Play internal/closed testing builds with reviewer-ready demo access.
- Complete App Store privacy details, Google Play Data safety, account deletion links, screenshots, descriptions, support URL, and review notes.
- Run production release checks: API migration, web deploy, mobile build verification, TestFlight smoke test, Play test smoke test, and post-release monitoring.
