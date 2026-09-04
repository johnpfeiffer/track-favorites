# Favorites MVP Validation

These checks are derived proof obligations. They do not supersede `/KERNEL/`.

| Kernel property | Proof obligation |
| --- | --- |
| INV-001 | Reject non-UUIDv1 user IDs; resolving the same verified Google identity is idempotent and returns one UUIDv1 across proposed IDs. |
| Authentication | Reject unauthenticated user registration and favorites reads/writes; scope every operation to the UUIDv1 bound to the verified token identifier. |
| Migration | A verified Google identity can claim an existing unclaimed browser UUIDv1 without losing its tracked items. |
| INV-002 | A created item contains the owner, exact submitted URL, status, started date, updated date, and optional terminal dates. |
| INV-002 | The same submitted URL, or one differing only by one trailing path slash, is rejected for the same user but may be stored by different users. |
| INV-002 | No API operation can modify an item's URL after creation. |
| INV-002 | All application-created dates are valid ISO 8601 strings. |
| INV-003 | Reject statuses outside the four-value union. |
| Unrestricted transitions | Every valid status can change directly to every other valid status. |
| Same-status no-op | Updating to the current status returns the unchanged item and dates. |
| Convex integration | Schema, query, and mutation code type-checks against generated Convex types. |
| Presentation | UI tests cover the Feneky header link, loading, empty, initial status, duplicate feedback, collapse, Date/ID sorting, inline status handling, and cancellation confirmation without a detail panel. JWT helper tests cover profile decoding and expiry rejection. |
| Google localhost compatibility | The HTML entry point supplies Google's required `no-referrer-when-downgrade` policy for HTTP localhost development. |
| Convex token lifecycle | A still-valid Google JWT is reused when Convex requests a forced token fetch; malformed or nearly expired JWTs are rejected. |
| Monorepo production assets | Vite retains `base: '/'`; the production build emits one JavaScript bundle so all required asset URLs occur in middleware-rewritten HTML rather than lazy preload code. |

## Commands

```sh
cd app
npm test
npm run typecheck:convex
npm run lint
npm run build
```

## Material UI 9.4.0 upgrade

Validated on 2026-09-03 against the
[upstream 9.4.0 release](https://github.com/mui/material-ui/releases/tag/v9.4.0).

- Preserve the in-progress exact 9.4.0 pin and matching lockfile; verify with
  `npm ci --no-audit --no-fund` and `npm run validate` from `app/`.
- The presentation suite exercises actual MUI components, including labeled
  native selects, TextField submission, cancellation confirmation, sorting,
  graph relationship chips, and graph layout buttons.
- The keyboard regression checks that Escape dismisses the cancellation dialog,
  restores focus to the status select, and does not call the status mutation.
  Removing the dialog's `onClose` handler makes this test fail; restoring it
  passes. No application source changes are required for this upgrade.
- The single-bundle production-asset verifier must continue to pass. The
  resulting Vite chunk-size warning is expected; code splitting would violate
  the existing middleware asset boundary.

Result: clean install succeeded; all 35 tests, Convex type checking, lint,
production compilation, and middleware asset verification passed. A browser
smoke check reached the rendered Google sign-in screen. Authenticated live
favorites operations were not exercised; their UI and backend paths were
covered by automated tests. `npm audit` could not complete because the npm
security advisory endpoint timed out, including a retry with network approval.
The install also warned about the existing unapproved `esbuild@0.27.0`
postinstall script; no install-script permissions were changed.
