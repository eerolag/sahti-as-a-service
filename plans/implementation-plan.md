# Breview Implementation Plan

## Goal

Breview is a production web, iOS, and Android app for creating beer tasting games, sharing them with players, collecting ratings and comments, and reviewing results. The web app remains the canonical public surface at `https://breview.ing`, and the native apps use the same Cloudflare API and share links.

## Architecture

- Backend stays Cloudflare-first: Workers for API and static web delivery, D1 for relational data, R2 for uploaded images, Workers AI for beer-name recognition, and Cloudflare Email Service for transactional authentication emails.
- Beer-name recognition starts with `@cf/google/gemma-4-26b-a4b-it` because it has vision support and the lowest confirmed cost among the currently selected Workers AI vision-capable models; use `@cf/moonshotai/kimi-k2.6` as the higher-cost fallback when Gemma is unavailable or unreliable.
- The repo is an npm-workspaces monorepo: `apps/api`, `apps/web`, `apps/mobile`, `packages/shared`, and `packages/api-client`.
- Web uses React, Vite, TypeScript, Tailwind, and shadcn/ui for production UI components in `apps/web`.
- Mobile uses Expo SDK 54, Expo Router, TypeScript, AniUI, and NativeWind for native iOS and Android screens in `apps/mobile`. SDK 54 is intentional for the current development window so Breview can share the App Store Expo Go version with the other active SDK 54 project; move to SDK 55 when both projects can use SDK 55 or development builds.
- Shared framework-agnostic contracts and domain logic live in `packages/shared`; web and mobile clients consume those contracts through `packages/api-client` instead of duplicating API shapes.
- Existing Cloudflare resource names may remain unchanged until a deliberate infrastructure rename is planned and tested.

## Workstreams

- Rebrand: update visible product copy, metadata, store copy, support/privacy pages, and share text to Breview with `breview.ing` as the canonical domain.
- Authentication: maintain optional email-code login using Cloudflare Email Service, D1-backed users, hashed login challenges, sessions, and account-linked rating history.
- Privacy and account deletion: keep in-app and web account deletion available only after login, keep privacy basics visible before login, and add full reviewer-ready policy/support pages before store submission.
- Mobile app: build a native Expo app with create/join/rate/results/edit/share/account flows, deep links, app links, image upload, and history sync.
- AI and image handling: use Workers AI via the `AI` binding for beer-name recognition, keep R2 for uploads, remove paid web image search from the production app and API surface, and keep provider failures graceful.
- Untappd: do not use scraping, private APIs, or the Untappd API. Keep only user-visible outbound search links unless legal/product review decides to remove them; avoid implying any affiliation or endorsement.
- Store release: configure EAS builds, TestFlight, Google Play testing tracks, store metadata, screenshots, review notes, versioning, and production rollout.
- Observability: add structured API errors, deployment checks, email/auth event logging, and lightweight release verification.

## Current Slice

This slice converts the repo to a production monorepo, keeps the existing Cloudflare Worker and web app running from workspace apps, and connects the first Expo mobile shell to the production Cloudflare API without changing Cloudflare infrastructure resource names.

Acceptance criteria:

- npm workspaces contain `apps/api`, `apps/web`, `apps/mobile`, `packages/shared`, and `packages/api-client`.
- Existing Cloudflare Worker code runs from `apps/api`.
- Existing web UI runs from `apps/web`.
- Shared contracts and domain logic run from `packages/shared`.
- Web and mobile can use the shared typed client from `packages/api-client`.
- Expo SDK 54 mobile shell exists in `apps/mobile` with Expo Router, AniUI, NativeWind, `breview://`, and `ing.breview.app`.
- Mobile create, join, recent-games, rating, comments, save, results, share, game-editing, beer-editing, image-picking, R2 upload, and Workers AI recognition flows call the shared API client or native mobile API helpers and default to `https://breview.ing`.
- Mobile and web share the same Breview dark visual direction while using shadcn/ui on web and AniUI/NativeWind components on mobile.
- Mobile uses `breview-logo.png` for in-app brand presentation and app icon configuration.
- Cloudflare D1/R2/Worker resource names are left unchanged.
- Kilo Gateway is replaced by Cloudflare Workers AI for beer-name recognition.
- Workers AI beer-name recognition requests use high-detail image input, JSON-only extraction, and Kimi reasoning handling so empty model responses are treated as service failures instead of user image failures.
- Workers AI beer-name recognition accepts beverage labels, tap-handle badges, tap lists, drink menus, bottles, cans, and packages; it rejects clearly non-beverage or inappropriate images with a user warning.
- Workers AI beer-name recognition must never accept model checklist, question, category, or status text such as `Check for beverage`, `Is it a beer can`, or `beer can` as a beer name.
- Image recognition is rate-limited to 10 attempts per client per day and locks for the day after the second clearly non-beverage or inappropriate image.
- Testers can reset the current day's AI recognition attempts, warnings, and locks with `npm --workspace @breview/api run ai:unlock:local` or `npm --workspace @breview/api run ai:unlock:remote`.
- Web image upload normalizes selected files into managed JPEG blobs before R2 upload, and reuses the prepared file after AI recognition to avoid mobile browser file-picker fetch failures.
- Web and mobile no longer expose manual image URL entry; users add images through file input, camera, or photo library while existing saved image URLs remain preserved internally.
- Mobile image pickers show the selected image preview but do not render the local device filename in the UI.
- Web and mobile show `Tunnista nimi AI:lla` as a separate action that becomes usable only after an image is selected.
- Web and mobile show AI recognition warnings in a clear popup/alert as well as inline status text.
- Web exposes a public `/makers` page for `Breview by Five Pint Sauna`, using `SUPPORT_PAYMENT_URL` and optional `SUPPORT_PAYMENT_LABEL` for a provider-agnostic external support CTA.
- Mobile account UI links to the public support page through `EXPO_PUBLIC_SUPPORT_PAGE_URL` and does not implement native payments.
- Web exposes `/account` with email-code login, account rating history, logout, deletion, and a privacy basics panel.
- Mobile account UI sends email login codes, verifies sessions, links this device's existing ratings to the account, shows account rating history, hides account deletion until logged in, and keeps privacy basics visible when logged out.
- Worker auth endpoints use Cloudflare Email Service binding `EMAIL`, D1 users/login challenges/sessions/user-player links, hashed login codes, and hashed bearer session tokens.
- Paid Brave image search is removed from the web UI, Worker route, shared API contracts, README, and runtime env.
- Untappd API resolution is removed; stored beer metadata is kept to outbound search links only.
- Tests, typecheck, and build pass.
