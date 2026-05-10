# Breview Store Release Checklist

This checklist tracks the remaining work to ship Breview to the Apple App Store and Google Play. It assumes the current production web/API path remains Cloudflare-first at `https://breview.ing` and the mobile app remains Expo-based.

Official references checked on 2026-05-10:

- Apple App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Apple Developer Program enrollment: https://developer.apple.com/help/account/membership/program-enrollment/
- Apple account deletion guidance: https://developer.apple.com/support/offering-account-deletion-in-your-app/
- Apple App Privacy Details: https://developer.apple.com/app-store/app-privacy-details/
- Google Play account deletion requirements: https://support.google.com/googleplay/android-developer/answer/13327111
- Google Play Console account setup: https://support.google.com/googleplay/android-developer/answer/6112435
- Expo distribution overview: https://docs.expo.dev/distribution/introduction/
- Expo EAS plans and billing: https://docs.expo.dev/billing/plans/

## Production Readiness

- [ ] Keep `plans/implementation-plan.md`, `plans/roadmap.md`, and this checklist current as release scope changes.
- [ ] Confirm production API and web are deployed from the intended branch.
- [ ] Confirm D1 migrations are applied remotely before each Worker deploy.
- [ ] Confirm R2 image serving works from `https://breview.ing/api/images/:key`.
- [ ] Confirm Workers AI image recognition works for beverage labels, tap handles, tap lists, and non-beverage rejection.
- [ ] Confirm Cloudflare Email Service is configured for `login@breview.ing` or the final chosen sender.
- [ ] Confirm support/payment env vars are set or intentionally blank:
  - `SUPPORT_PAYMENT_URL`
  - `SUPPORT_PAYMENT_LABEL`
  - `EXPO_PUBLIC_SUPPORT_PAGE_URL`
  - `EXPO_PUBLIC_API_BASE_URL`

## Public Web Pages

- [ ] Add `/privacy` as a public page reachable without login.
- [ ] Add `/support` as a public page reachable without login.
- [ ] Add `/delete-account` as a public page reachable without login and suitable for Google Play's account deletion web-link requirement.
- [ ] Make account deletion prominent on `/delete-account`; users who can log in should be able to complete deletion or receive exact instructions.
- [ ] Explain what data is deleted, what may be retained for security/legal reasons, and expected timing.
- [ ] Add links to `/privacy`, `/support`, and `/delete-account` from the app account UI and web footer/navigation where appropriate.
- [ ] Ensure public pages reference Breview and the developer/store listing name consistently.

## Privacy And Data Declarations

- [ ] Inventory data collected by Breview:
  - optional account email
  - anonymous client ID
  - nicknames
  - beer ratings and comments
  - uploaded beer images
  - account/session tokens
  - operational logs and auth events
  - AI image-recognition requests
- [ ] Decide exact App Store privacy labels based on the final data inventory.
- [ ] Complete Google Play Data safety based on the same inventory.
- [ ] Confirm no third-party advertising/tracking SDKs are included.
- [ ] Confirm AI/image processing and R2 storage are described plainly in the privacy policy.
- [ ] Confirm account deletion deletes account-linked player rows/ratings as implemented, and document any retained operational data.

## Auth Polish

- [ ] Add auth/login-code event logging for request, send success/failure, verify success/failure, logout, and account deletion.
- [ ] Add login-code resend cooldown UI; this means delaying "send code again" for a short period, not using the Resend service.
- [ ] Improve Cloudflare Email Service diagnostics shown to users and logs when sending fails.
- [ ] Keep user-facing auth errors concise and non-leaky.
- [ ] Confirm email login works in production with a real mailbox.
- [ ] Confirm account deletion is available only when logged in inside the app, while privacy basics remain visible when logged out.

## Deep Links And App Links

- [ ] Keep `breview://` scheme working for game links.
- [ ] Configure iOS associated domains for `https://breview.ing` when Apple Developer account is ready.
- [ ] Add and serve `/.well-known/apple-app-site-association` with the final iOS app identifier.
- [ ] Configure Android intent filters for `https://breview.ing` game links.
- [ ] Add and serve `/.well-known/assetlinks.json` with the final Android package and signing certificate fingerprint.
- [ ] Test link behavior from Messages, Safari/Chrome, email, and QR code on iOS and Android.
- [ ] Ensure fallback links still open the web app when the native app is not installed.

## Mobile UX Polish

- [ ] Add release-grade loading, retry, and offline states for create/join/rate/results/edit/account flows.
- [ ] Polish camera/photo permission copy and denial handling.
- [ ] Polish image capture and image library states.
- [ ] Polish edit/share flows and copy.
- [ ] Add haptics where useful without making repeated workflows noisy.
- [ ] Confirm local filenames are not rendered in mobile UI.
- [ ] Confirm account settings are understandable and not hidden behind unclear labels.
- [ ] Confirm the maker-support link opens externally and does not create a native payment flow.

## Untappd

- [ ] Keep Untappd as an outbound search link only.
- [ ] Do not use Untappd API calls, scraping, private endpoints, cached Untappd data, logos, badges, or wording that implies affiliation.
- [ ] Keep link text generic enough that the feature reads as an external search shortcut.

## Expo And Native Build Setup

- [ ] Create or confirm the Expo account and project owner/organization that will own Breview builds.
- [ ] Decide whether the EAS Free plan is enough for early internal builds or whether Breview should move to a paid Expo plan before repeated iOS/Android build cycles.
- [ ] Add billing details only when cloud build volume, priority, or EAS Update usage requires it.
- [ ] Decide when to move from Expo SDK 54 to SDK 55 or a development build.
- [ ] Install/login to EAS CLI when native build work starts.
- [ ] Run `eas init` for `apps/mobile`.
- [ ] Create `eas.json` profiles for development, preview/internal testing, and production.
- [ ] Confirm iOS bundle identifier remains `ing.breview.app`.
- [ ] Confirm Android package remains `ing.breview.app`.
- [ ] Configure app version/build number strategy.
- [ ] Configure app icons, adaptive icons, splash screen, and screenshots.
- [ ] Build internal iOS and Android test artifacts before store submission.

## Apple App Store

- [ ] Enroll/confirm Apple Developer Program membership for the person or organization that should own Breview.
- [ ] Keep the Apple Developer account holder, App Store Connect app owner, bundle ID owner, and EAS credentials aligned.
- [ ] Create App Store Connect app record for Breview.
- [ ] Configure bundle ID and signing credentials.
- [ ] Add Privacy Policy URL: `https://breview.ing/privacy`.
- [ ] Add Support URL: `https://breview.ing/support`.
- [ ] Complete App Privacy Details from the final data inventory.
- [ ] Confirm in-app account deletion path is easy to find after login.
- [ ] Prepare app description, keywords, category, age rating, screenshots, app preview if desired, and review notes.
- [ ] Submit TestFlight build and complete smoke testing.
- [ ] Submit App Store review after TestFlight confidence.

## Google Play

- [ ] Create/confirm the Google Play Console developer account for the person or organization that should own Breview.
- [ ] Complete Play Console registration payment, identity verification, and any new-account testing requirements before planning production rollout dates.
- [ ] Create Google Play Console app record for Breview.
- [ ] Complete app content declarations.
- [ ] Add Privacy Policy URL: `https://breview.ing/privacy`.
- [ ] Add account deletion web resource: `https://breview.ing/delete-account`.
- [ ] Complete Data safety form from the final data inventory.
- [ ] Configure internal testing track first.
- [ ] Upload Android build or submit via EAS Submit.
- [ ] Prepare app description, short description, category, content rating, screenshots, feature graphic, and review notes.
- [ ] Promote from internal testing to closed/open/production only after smoke testing.

## Release Verification

- [ ] Run `npm test`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run build`.
- [ ] Apply remote D1 migrations.
- [ ] Deploy Worker/web.
- [ ] Smoke test `https://breview.ing` on desktop and mobile browsers.
- [ ] Smoke test native iOS build:
  - create game
  - join game
  - rate beers
  - comments
  - results
  - edit beers/images
  - AI recognition success and non-beverage warning
  - account login/history/logout/deletion
  - share/deep links
- [ ] Smoke test native Android build with the same flows.
- [ ] Confirm support, privacy, and account deletion pages load from the public internet.
- [ ] Confirm release notes and known limitations are ready.

## Post-Release

- [ ] Monitor Cloudflare Worker errors.
- [ ] Monitor login-code delivery failures.
- [ ] Monitor image-recognition failure rates and rate-limit events.
- [ ] Watch App Store Connect and Play Console review feedback.
- [ ] Keep privacy/store declarations updated when data practices change.
