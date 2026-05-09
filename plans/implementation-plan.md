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
- Authentication: add optional email-code login using Cloudflare Email Service, D1-backed users, hashed login challenges, sessions, and account-linked game history.
- Privacy and account deletion: add in-app and web deletion paths, privacy policy, support contact, store data declarations, and reviewer-ready demo access.
- Mobile app: build a native Expo app with create/join/rate/results/edit/share/account flows, deep links, app links, image upload, and history sync.
- AI and image handling: use Workers AI via the `AI` binding for beer-name recognition, keep R2 for uploads, remove paid web image search from the production app and API surface, and keep provider failures graceful.
- Untappd: do not use scraping, private APIs, or the Untappd API. Keep only user-visible outbound search links unless legal/product review decides to remove them; avoid implying any affiliation or endorsement.
- Store release: configure EAS builds, TestFlight, Google Play testing tracks, store metadata, screenshots, review notes, versioning, and production rollout.
- Observability: add structured API errors, deployment checks, email/auth event logging, and lightweight release verification.

## Current Slice

This slice converts the repo to a production monorepo, keeps the existing Cloudflare Worker and web app running from workspace apps, and scaffolds the first Expo mobile shell without changing Cloudflare infrastructure resource names.

Acceptance criteria:

- npm workspaces contain `apps/api`, `apps/web`, `apps/mobile`, `packages/shared`, and `packages/api-client`.
- Existing Cloudflare Worker code runs from `apps/api`.
- Existing web UI runs from `apps/web`.
- Shared contracts and domain logic run from `packages/shared`.
- Web and mobile can use the shared typed client from `packages/api-client`.
- Expo SDK 54 mobile shell exists in `apps/mobile` with Expo Router, AniUI, NativeWind, `breview://`, and `ing.breview.app`.
- Cloudflare D1/R2/Worker resource names are left unchanged.
- Kilo Gateway is replaced by Cloudflare Workers AI for beer-name recognition.
- Paid Brave image search is removed from the web UI, Worker route, shared API contracts, README, and runtime env.
- Untappd API resolution is removed; stored beer metadata is kept to outbound search links only.
- Tests, typecheck, and build pass.
