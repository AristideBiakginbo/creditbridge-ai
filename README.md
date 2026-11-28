# CreditBridge AI

CreditBridge AI is an offline-first, privacy-aware financial inclusion
application for microentrepreneurs and small merchants, with particular focus
on African markets.

## Current implementation

This repository provides a responsive, bilingual product foundation on top of
the Firebase and hybrid-AI services:

- Modular Firebase Web SDK initialization from Vite environment variables.
- Firebase App Check initialization with reCAPTCHA Enterprise and a
  development-only, environment-based debug-token path.
- Lazy React Router routes for the public site, preview onboarding, and
  demonstration workspace.
- Theme and English/French preferences, shared design tokens, and accessible
  responsive navigation.
- A dashboard and transaction manager backed by one labeled synthetic dataset.
- Local demonstration transaction create, edit, delete, reset, filtering,
  sorting, pagination, and MAD-only manual entry.
- An authenticated local workspace with account- and business-scoped
  transaction create, read, update, delete, search, filters, pagination, bulk
  deletion, and local CSV export.
- Smart Capture for text notes and receipt images. Proposals are validated,
  editable, checked for possible duplicates, and saved only after explicit
  confirmation through an atomic local batch.
- A real dashboard calculated from the selected business's IndexedDB records,
  with currency-aware totals, period filters, comparisons, recent activity,
  and expense-category visualizations.
- A private transaction extraction path hard-restricted to
  `ONLY_ON_DEVICE`; it discards outputs unless the SDK reports on-device
  inference. Reviewed records are added only after explicit user confirmation.
- A predefined-prompt financial education assistant. Cloud-capable requests
  require fresh, request-scoped consent; arbitrary prompts and private records
  are not accepted by this view.
- A development-only hybrid-AI diagnostic playground at `/dev/hybrid-ai`.

The demonstration repository uses a dedicated versioned `localStorage` key,
separate from Firebase, Firestore, and Dexie. All bundled demonstration records
are synthetic and denominated in MAD. Real authentication and account workspaces
are separate from this demonstration repository. No financial cloud
synchronization is connected.

The Financial Passport, loan simulator, advanced analytics, budgets, debts, and
notifications remain clearly labeled previews. Account settings support the
display name and business timezone. There is no automated credit eligibility
decision, generated credit score, or certified financial document.

## Architecture and privacy boundary

The UI calls the application AI service in `src/lib/ai/`. Every model request
passes through the privacy policy before App Check token acquisition or a
Firebase AI Logic call. Financial transaction data is permitted only with
`ONLY_ON_DEVICE`; consent cannot override that restriction. Transaction
extraction is discarded unless the SDK reports on-device inference. Only
predefined, non-sensitive education prompts can request cloud inference, with
explicit consent for that request.

`src/app/` contains the lazy route layouts and theme, language, and demo data
providers. `src/features/` contains route-level page modules. `src/demo/`
contains the synthetic dataset, local repository, and onboarding validation.
Demo data mutations validate before writing and report local-storage errors;
they never silently fall back to a cloud or alternate store.

The authenticated workspace uses Dexie/IndexedDB, scoped by authenticated UID
and active business ID. It supports MAD, XAF, XOF, EUR, and USD; amounts are
stored as integer minor units (XAF/XOF use zero decimal places, the other
supported currencies use two). Totals and charts never combine currencies.
Transaction batches are validated before an IndexedDB transaction, and a
local idempotency record prevents retrying a confirmed capture batch from
creating another copy. This local batch marker is metadata, not cloud sync.

Smart Capture calls the existing Firebase AI Logic service boundary with
`ONLY_ON_DEVICE` for private transaction text and receipt contents. It discards
results unless the SDK reports `on-device`, validates the structured response,
and requires human review before local persistence. Cloud inference is never
used as a fallback for these inputs. Receipt images are restricted to JPEG/PNG,
decoded and dimension-checked in the browser, kept in memory, and never written
to IndexedDB or uploaded. The installed SDK supports multimodal on-device Web
inference on desktop Chrome 139+ when the browser's image-input capability is
available; actual model availability depends on the user's browser/device and
was not verified in this environment. When unavailable, the UI offers manual
transcription and manual transaction entry. Receipt proposals require the user
to confirm the currency explicitly.

The income/expense register is a simple cash-flow record, not full accrual
accounting. It does not model receivables or link a customer payment to an
original credit sale. Avoid recording payment for a sale again as income if
that sale was already counted.

The app reports inference source only when Firebase AI Logic includes it in the
SDK response. A requested mode is not treated as proof of where inference ran.
Sensitive extraction results are discarded if the source is missing or not
on-device. App Check initialization and token acquisition do not prove that
Firebase project enforcement is enabled.

Business-local date calculations validate IANA timezone identifiers before
formatting. The legacy `Africa/Rabat` identifier is normalized to
`Africa/Casablanca` in memory; known country defaults are used only for
recognized countries. Unknown invalid values require correction in account
settings, where only the authenticated owner's business timezone and server
`updatedAt` are updated. Smart Capture and the dashboard read their business
metadata from the local Dexie cache, so an out-of-band Firestore correction
does not refresh that cache automatically; these read boundaries normalize
legacy values before use. No transaction dates or records are migrated.

## Local setup

Use Node.js 22.12+ and npm (the test command uses Node's built-in TypeScript
stripping support). Install the locked dependencies with `npm ci`.

1. Copy `.env.example` to `.env.local` only if `.env.local` does not already
   exist; preserve any existing local values.
2. Fill in the registered Firebase Web app configuration and the public
   reCAPTCHA Enterprise site key. These are client configuration values, not
   authorization secrets.
3. For local App Check debug mode, store the registered debug token as
   `VITE_FIREBASE_APPCHECK_DEBUG_TOKEN` in the ignored
   `.env.development.local` file. Never commit or print the token. If this
   local token is not configured, App Check initialization intentionally
   remains unavailable.
4. Confirm the correct Firebase project before provisioning Firebase AI Logic.
   If it has not already been provisioned, run
   `npx -y firebase-tools@latest init ailogic` from this repository. This
   project has not been checked remotely for provider activation or App Check
   enforcement.

Start the local development server with:

```powershell
npm run dev
```

## Phase 4 foundation

Phase 4 adds Firebase email/password and Google authentication, route guards,
email verification, password recovery, persistent business onboarding, and
owner-scoped Firestore profile metadata. The real workspace is protected and
keeps financial transactions in a versioned account-scoped IndexedDB database
implemented with Dexie.

- Firestore profiles: `users/{uid}`.
- Business profiles: `users/{uid}/businesses/{businessId}`.
- Preferences: `users/{uid}/preferences/settings`.
- Financial transactions remain local only in account/business-scoped
  IndexedDB. The Firestore rules deny financial transaction collections and
  unknown collections. Cloud financial synchronization is not implemented.
- Monetary amounts use integer minor units. MAD, EUR, and USD use two decimal
  places; XAF and XOF use zero decimal places.
- The demonstration workspace remains at `/demo` and cannot access account
  records or write to Firestore.
- IndexedDB is browser storage, not encrypted storage. Shared-device use,
  private browsing, eviction, and first-time offline authentication have the
  limitations described in the Privacy Center.

Firebase Console configuration is still required manually: enable Email/Password
and Google providers, add authorized domains, and create/provision the
Firestore database. The CLI session must be reauthenticated before listing or
deploying remote configuration.

The configured database has been confirmed as Firestore Standard / Native mode.
Rules require server timestamps, preserve user/business identity and creation
metadata, and permit onboarding completion only when the corresponding
owner-scoped business exists after the batch. Financial transaction paths and
unknown collections are denied. These rules are a prototype and should be
reviewed before production use.

Run the local Firestore Emulator rules suite with:

```powershell
npm run test:rules
```

The suite uses the `demo-creditbridge-rules` demo project ID and never connects
to or modifies the remote `creditbridge-ai` database. It requires Java and the
Firebase CLI; the standard test run skips emulator-only cases when no emulator
is active. Tests use `@firebase/rules-unit-testing`.

## Validation

```powershell
npm test
npm run lint
npm run build
```

The tests cover the sensitive-data policy gate, explicit cloud consent,
transaction schema validation, malformed responses, multiple transactions,
ambiguous currency, dashboard calculations, local demo repository operations,
onboarding privacy defaults, authentication error mapping, currency precision,
Dexie persistence/account/business isolation, atomic and idempotent batch
insertion, duplicate detection, date/currency-aware calculations, filters, and
CSV formula-injection handling. Timezone tests cover legacy alias handling,
country defaults, invalid and missing zones, and business-local midnight
boundaries. Firestore emulator tests require Java and the
Firebase CLI; the default `npm test` run skips those cases when no emulator is
active. `npm run build` type-checks and builds the app.

## Manual checks and limitations

- Open `/` for the public site, `/onboarding` for the non-persistent setup
  preview, and `/demo/dashboard` for the isolated synthetic workspace.
- In an authenticated account with an active business, use `/app/dashboard`
  for actual local records, `/app/transactions` for CRUD/search/filter/export,
  `/app/capture` for Smart Capture, or `/app/capture?mode=receipt` to scan a
  receipt. Smart Capture requires explicit review and confirmation.
- Correct the business timezone in `/app/settings` if it is invalid. The
  country default is a suggestion, not a restriction on other regions within
  multi-timezone countries.
- Verify on-device text/image availability before attempting extraction.
  Receipt image inference requires desktop Chrome 139+ with multimodal image
  input available. No successful inference is claimed until the SDK returns
  and confirms its source. Use manual entry when the local model is unavailable.
- Open `/dev/hybrid-ai` only on a Vite development server; that diagnostic
  route is excluded from production routing and initial page chunks.
- Verify the App Check token diagnostic in the development playground only
  with the registered local debug token and allowed reCAPTCHA domain.
- Check the browser's real on-device model availability before attempting
  local extraction. Browser version, hardware, language, and model download
  state affect availability.
- Use only synthetic text when trying cloud-capable education scenarios.
  Private extraction has no cloud fallback, regardless of UI mode or consent.
- Test responsive layouts at narrow mobile, tablet, laptop, and wide desktop
  widths, and test keyboard navigation, focus handling, reduced motion, and
  both themes.
- Confirm AI Logic provider activation, App Check enforcement, quota, and
  project settings in Firebase Console; this client does not inspect them.
- An actual request and SDK-reported inference source are required before the
  UI reports a successful cloud or on-device inference.

No billing was enabled and the application was not deployed as part of this
work.
