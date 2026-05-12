# Parannuksia ennen julkaisua

## Summary

This plan tracks the release-hardening work needed before submitting Breview to App Store review and Google Play review. The current direction is to make Breview a host-controlled drink tasting session app with unguessable share links, clearer first-run guidance, configurable rating scales, safer UGC handling, and reviewer-ready store compliance.

Priority order:

1. Store-safety and policy hardening.
2. Unguessable share links, host ownership, hidden results, and rating scale options.
3. First-run welcome, logo-led onboarding, and UI polish.
4. Localization for Finnish, English, and major world languages.
5. Batch image import and AI recognition queue.
6. Final store build, metadata, and smoke-test checklist.

## Implemented In This Slice

- Added public session links with random `public_id` values and host-token protected edit/reveal endpoints.
- Added `/api/sessions/:shareId` routes for session load, update, ratings, results, reveal, and reports while keeping numeric game routes as legacy compatibility.
- Added D1 migration `0008_backfill_game_public_ids.sql` so legacy numeric sessions receive random public codes while staying loadable by old URLs.
- Added session settings for rating mode, score range, score step, and results visibility.
- Added host-reveal result hiding and reveal flow.
- Updated web creation to use the Breview logo, first-run welcome, safety acceptance, session copy, share links, host links, rating settings, and batch image import with a concurrency-limited AI naming queue.
- Updated mobile creation/link-opening basics to use session terminology, public session links, host-only edit controls, configurable rating settings, star/slider rating display, and host reveal.
- Added a content-report table, report endpoint, and web/mobile report actions for UGC review.
- Softened support/payment copy so it does not imply alcohol purchase or feature unlocks.
- Added shared locale utilities and welcome-copy resources for the planned localization set, including RTL metadata for Arabic and Urdu.
- Added self-hosted Figtree and JetBrains Mono font assets for web and mobile.
- Added minimal abusive-text blocking for names, nicknames, and comments.
- Removed the mobile bottom tab bar; account, support, and privacy actions now live behind the top-right menu.

## Product Changes

- User-facing Finnish copy should use `sessio` instead of `peli`; internal `game` naming may remain until a later refactor.
- Production UI should promote only unguessable session links:
  - participant link: `/s/:shareId`
  - host link: `/h/:shareId#hostToken`
  - numeric `/:id` links are legacy-only and should not be shown as the primary join mechanism.
- First-run onboarding should remain short and action-oriented: create session, invite tasters, reveal results.
- Session settings should stay available at creation and for the host:
  - rating input: `slider` or `stars`
  - slider ranges: `0-5`, `0-10`, `1-10`, or custom
  - result visibility: `live`, `after_submit`, or `host_reveal`
- Batch image import should remain a client-side concurrency-limited queue unless later telemetry shows a backend job is needed.

## Store Policy Hardening

- Treat names, comments, beer images, and session content as user-generated content.
- Keep report actions available for session, beer, image, comment, and participant targets.
- Avoid “drinking competition”, binge, dare, challenge, or “buy us a round” language.
- Describe Breview as tasting/reviewing, not alcohol consumption encouragement.
- Native support links must not unlock app features.
- Untappd-related surfaces must remain generic outbound search shortcuts, without logos, scraping, API claims, badges, or affiliation wording.
- Before native submission, confirm age rating, privacy labels, data safety, app links, account deletion, and reviewer demo access.

Policy references:

- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Apple account deletion guidance](https://developer.apple.com/support/offering-account-deletion-in-your-app/)
- [Apple App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/)
- [Google Play account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111)
- [Google Play UGC policy](https://support.google.com/googleplay/android-developer/answer/9876937)
- [Google Play Data safety](https://support.google.com/googleplay/android-developer/answer/10787469)
- [Google Play inappropriate content / tobacco and alcohol policy](https://support.google.com/googleplay/android-developer/answer/9878810?hl=en)
- [Google Play age-restricted physical goods guidance](https://support.google.com/googleplay/android-developer/answer/7444750?hl=en)

## Localization And UI

- Initial supported locale set: `fi`, `en`, `es`, `pt-BR`, `fr`, `de`, `zh-Hans`, `hi`, `ar`, `bn`, `id`, `ru`, `ur`.
- Locale selection default:
  - device/browser Finnish -> `fi`
  - supported device/browser locale -> matching locale
  - fallback -> `en`
- RTL work is required before marking `ar` or `ur` complete.
- Use self-hosted Figtree for UI and JetBrains Mono for scores/codes.
- Replace native-looking file inputs with polished image buttons and previews everywhere.
- Keep primary mobile navigation in clear top/app-shell surfaces; do not reintroduce the bottom tab bar unless it is intentionally redesigned and tested.

## Test Plan

- Unit tests:
  - public ID shape and uniqueness assumptions
  - rating config validation
  - score normalization per scale
  - host token validation
  - hidden results behavior
  - locale fallback
- API tests:
  - new sessions are reachable by `shareId`
  - participant cannot edit without host token
  - host can update and reveal
  - results hidden until reveal
  - legacy numeric sessions still load
  - reports can be submitted
- Web/mobile smoke tests:
  - first-run welcome
  - create session and share participant link
  - open shared link directly into the session
  - slider and star rating
  - batch image import with failures
  - Finnish and English locale switching
  - at least one RTL layout pass
- Store-readiness tests:
  - account deletion reachable in app and web
  - privacy/support/delete-account URLs work publicly
  - no native purchase unlock via support link
  - reviewer can use demo flow without private credentials
  - TestFlight and Play internal builds pass create/link-open/rate/results/edit/share/account flows

## Remaining Before Store Submission

- Keep remote D1 migrations applied through at least `0008_backfill_game_public_ids.sql` before deploys.
- Production `/s/:shareId` web fallback was smoke-tested after the 2026-05-12 deploy; native app-link behavior still needs real-device verification.
- Add final Apple Team ID and Android SHA-256 signing fingerprints.
- Complete App Store privacy labels and Google Play Data safety declarations from the final data inventory.
- Run TestFlight and Google Play internal testing with reviewer-ready demo notes.
