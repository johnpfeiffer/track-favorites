# Favorites

A small Convex and React app for tracking progress through saved links. Google Sign-In identifies returning users, while favorites and their status history are stored durably in Convex.

## Features

- Save an HTTP or HTTPS link using the exact submitted string.
- Choose an initial status, defaulting to `todo`.
- Track `todo`, `in progress`, `completed`, and `cancelled` statuses.
- Move directly between any statuses.
- Record ISO 8601 started, updated, completed, and cancelled dates.
- Reject duplicate URLs per user—including variants differing only by a trailing slash—with helpful feedback.
- Sort by modified date or URL ID in either direction and collapse the saved-links listing.
- Confirm before changing an existing favorite to `cancelled`.
- Change status directly in a responsive Material UI list without a separate details panel.
- Explore imported entities in connected clusters where node size and placement
  emphasize highly connected hubs.
- Select or deselect relationship types without moving the graph nodes.
- Compare the stable clustered layout with a deterministic force-directed view.
- Return from another browser with the same Google account and see the same favorites.
- Verify Google ID tokens in Convex before favorites data can be read or changed.

## Local development

Requirements: a current Node.js release supported by Vite and a Convex account.

```sh
cd app
npm ci
npx convex dev
```

The first `convex dev` run connects or creates a Convex project, deploys the schema and functions, generates the typed client API, and writes `VITE_CONVEX_URL` to `.env.local`. Keep that command running and start the UI in another terminal:

```sh
cd app
npm run dev
```

Open the local address printed by Vite.

Google Identity Services uses the public web client ID in
`app/models/googleAuth.ts`. In the Google Cloud console, the OAuth client must
be a **Web application**. For local development, Google requires both
`http://localhost` and the local Vite origin (normally
`http://localhost:5173`) in **Authorized JavaScript origins**. Add each deployed
origin there as well. The app supplies Google's required localhost referrer
policy. This ID-token callback flow does not use a client secret or redirect
URI, so redirect URIs for other integrations may coexist without affecting it.
Restart `npx convex dev` after changing `convex/auth.config.ts` so Convex deploys
the JWT verification configuration.

The graph viewer is available from the **View favorites graph** button or at the
relative `graph` route (for example, `/favorites/graph` when the app is mounted
at `/favorites/`). Its deployable data snapshot lives in `app/src/graph/data/`
and is derived from the ignored source files in `app/IMPORT/graph/`. The base
relationships live in `edges.json`; additional classification relationships in
`is_a_person-edges.json` are composed into the same validated graph at build time.
All relationship types except **Is a person** start selected. Its 86 edges are
available on demand but excluded from the initial layout calculation so the
shared `Person` target does not collapse otherwise useful clusters into one hub.
Select a colored relationship chip to remove or restore that type's edges while
keeping node positions stable. The color-matched number below each chip shows
that type's total edge count. Use the **Clustered** and **Force-directed** buttons
to switch between the stable component layout and a deterministic spring-and-
repulsion simulation.

## Validation

The UI is pinned to Material UI **9.4.0**, with its resolved dependencies in
`app/package-lock.json`. Use `npm ci` to reproduce the verified install.
`npm run validate` runs tests, Convex type checking, lint, and the production
build together; the individual checks are:

```sh
cd app
npm test
npm run typecheck:convex
npm run lint
npm run build
npm audit
```

`npm test` exercises the public Convex functions with `convex-test`, verifies the
main user-visible UI states with Testing Library, and checks graph validation and
rendering. The cancellation dialog also has a keyboard regression test for
Escape dismissal, focus restoration, and leaving the item's status unchanged.

The production build intentionally uses one JavaScript bundle for the monorepo
middleware (see below), so Vite's 500 kB chunk warning is expected.

## Monorepo deployment

The runnable project lives in `app/`. From the repository root, copy its deployment-safe files into the sibling `codespaces-react` monorepo:

```sh
./cloud-deploy.sh
```

This targets `../codespaces-react/apps/track-favorites/` and excludes dependencies, build output, local environment files, and tests. The monorepo build environment must provide `VITE_CONVEX_URL` for the intended Convex deployment. Deploy the Convex functions as well so the Google auth provider and authenticated function signatures match the UI.

The app intentionally keeps Vite's `base` at `/`. In production, the
`codespaces-react` Cloudflare middleware recognizes `track-favorites`, serves
the app below `/track-favorites/`, injects that HTML base, and rewrites the
root-relative entry-script and stylesheet URLs. The auto-sync script already
mirrors `track-favorites:app`; the middleware allowlist and sync list must keep
that name because it becomes the public route.

The middleware rewrites the initial HTML response, not URLs embedded inside a
compiled JavaScript body. For that reason the graph is statically bundled with
the main application rather than loaded as a Vite lazy chunk. `npm run build`
runs `scripts/verify-build.mjs`, which fails if multiple JavaScript bundles are
emitted and could escape to `/assets/` instead of
`/track-favorites/assets/`.

Set `DEST` to override the copy destination for validation or another checkout.
The manual copy preserves the monorepo's `.sync-sha` provenance file.

### Convex

Ensure the VITE_CONVEX_URL variable is set (i.e. in Cloudflare)

Also, in the dev environment logged into convex, run:

`npx convex deploy --cmd 'npm run build'`

<https://docs.convex.dev/production/hosting/custom>

## Authentication and identity

The browser sends Google's ID-token JWT directly to Convex. Convex verifies its
issuer, signature, expiry, and audience before exposing the Google identity to
server functions. The JWT is cached only in session storage and is cleared on
sign-out or shortly before expiration; there is intentionally no application
session or refresh-token service yet.

### Post-login token lifecycle

`ConvexProviderWithAuth` first sends the cached Google JWT to Convex. After the
server confirms it, Convex immediately calls the auth adapter again with
`forceRefreshToken: true`. Google Identity Services does not expose a silent
refresh-token API for this callback flow, so the adapter returns the same JWT
while it remains valid. Here, “forced” means bypassing an auth-provider cache;
it does not mean the current token is invalid or that the user should be signed
out. Malformed, expired, or nearly expired JWTs still clear the local auth state
and return the user to Google's sign-in button.

This distinction is covered by a regression test. Treating every forced fetch
as sign-out allows the backend to authenticate and briefly run user queries,
but tears down the app UI immediately afterward.

To preserve `INV-001`, the first verified Google sign-in creates a UUIDv1 user
record and binds it to Google's stable token identifier. If the current browser
already has an older device-local UUIDv1 user, that unclaimed record is linked
once so its existing favorites remain available. Later browsers resolve the same
UUIDv1 through the verified Google identity. Favorites functions never accept a
caller-supplied owner ID.

See [architecture.md](architecture.md) for the system design and user journey. The governing requirements remain in `KERNEL/`; derived interpretations and checks are in `SPEC/` and `VALIDATION/`.
