# CreditBridge AI

CreditBridge AI is an offline-first, privacy-aware financial inclusion
application for microentrepreneurs and small merchants, with particular focus
on African markets.

## Current implementation

This repository currently provides the Firebase and hybrid-AI foundation:

- Modular Firebase Web SDK initialization from Vite environment variables.
- Firebase App Check initialization with reCAPTCHA Enterprise and a
  development-only, environment-based debug-token path.
- Firebase AI Logic playground with all four hybrid inference policies.
- A private transaction extraction path hard-restricted to
  `ONLY_ON_DEVICE`; it discards outputs unless the SDK reports on-device
  inference.
- Strict transaction output validation, including ambiguity handling for
  `FCFA`, and editable human-review previews.
- Local manual-entry preview as an alternative when on-device AI is unavailable.

Transaction previews and manual entries are held only in page memory. This
phase does not save to Dexie, Firestore, or another data store. There is no
automated credit decisioning, production AI coach, financial passport, or
repayment simulator yet.

## Architecture and privacy boundary

The UI calls the application AI service in `src/lib/ai/`. Every model request
passes through the privacy policy before App Check token acquisition or a
Firebase AI Logic call. Financial transaction data is permitted only with
`ONLY_ON_DEVICE`; consent cannot override that restriction. Only predefined,
non-sensitive scenarios can request cloud-capable inference, and they require
explicit consent for the current request.

The app reports inference source only when Firebase AI Logic includes it in the
SDK response. A requested mode is not treated as proof of where inference ran.
Sensitive extraction results are discarded if the source is missing or not
on-device. App Check initialization and token acquisition do not prove that
Firebase project enforcement is enabled.

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

## Validation

```powershell
npm test
npm run lint
npm run build
```

The tests cover the sensitive-data policy gate, explicit cloud consent,
transaction schema validation, malformed responses, multiple transactions,
and ambiguous currency. `npm run build` type-checks and builds the app.

## Manual checks and limitations

- Verify the App Check token diagnostic in a browser with the registered local
  debug token and allowed reCAPTCHA domain.
- Check the browser's real on-device model availability before attempting
  local extraction. Browser version, hardware, language, and model download
  state affect availability.
- Use only synthetic text when trying cloud-capable playground scenarios.
  Private extraction has no cloud fallback, regardless of UI mode or consent.
- Confirm AI Logic provider activation, App Check enforcement, quota, and
  project settings in Firebase Console; this client does not inspect them.
- An actual request and SDK-reported inference source are required before the
  UI reports a successful cloud or on-device inference.

No billing was enabled and the application was not deployed as part of this
work.
