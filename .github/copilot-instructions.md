# CreditBridge AI project instructions

## Product objectives

CreditBridge AI is an offline-first, privacy-aware financial inclusion
application for microentrepreneurs and small merchants, particularly in African
markets. Build practical tools that help people understand and document
business finances. Keep financial information under the user's control and
prefer local processing. Do not turn this foundation into unrequested product
features.

## Current architecture

- React, TypeScript, and Vite provide the web client.
- `src/lib/firebase.ts` initializes the modular Firebase Web SDK from Vite
  environment variables. Browser Firebase configuration is public client
  configuration, not authorization.
- `src/lib/appCheck.ts` owns App Check setup and sanitized diagnostics. Debug
  tokens are local development secrets and must only be read from ignored
  environment files.
- `src/lib/ai/` is the application boundary for Firebase AI Logic, inference
  modes, privacy authorization, error mapping, and transaction validation.
- `src/app/` contains lazy React Router layouts and theme, language, and demo
  data providers. `src/features/` contains route-level page modules.
- `src/demo/` contains synthetic sample transactions, Zod validation, and an
  isolated browser-local demonstration repository. It is not an account store
  and must not be connected to Firebase, Firestore, or Dexie by implication.
- `src/features/ai-playground/` is a development-only diagnostic route.
  Keep it lazy and exclude it from production routing and the initial bundle.
- The dashboard and transaction manager use the same synthetic MAD dataset.
  Manual demo entry and reviewed AI extraction must not silently convert
  currencies or mix real user records into this dataset.
- Tailwind CSS v4 is configured through the Vite plugin. Keep shared design
  tokens in `src/index.css`.
- Dexie is available for a future offline-first account-data implementation;
  it is not the demo repository. Cloud synchronization is not implemented and
  must remain explicit and optional.

## Coding conventions

- Prefer small, typed React components and modular Firebase imports.
- Reuse installed dependencies and project patterns; add dependencies only
  when the task requires them.
- Validate untrusted input at boundaries with Zod where appropriate.
- Keep interfaces responsive and accessible: semantic HTML, labels, keyboard
  support, visible focus states, and useful error feedback.
- Keep user-facing copy bilingual in English and French through the shared
  language context. Use the existing semantic theme tokens rather than
  hard-coded light-only colors.
- Use clear diagnostic states. SDK initialization is not proof of backend
  connectivity, authorization, synchronization, or successful inference.
- Do not log prompts, model output containing financial details, credentials,
  App Check tokens, or other personal information.

## Security and privacy requirements

- Never commit `.env.local`, `.env.development.local`, credentials, App Check
  debug tokens, or real financial data. Use `.env.example` only for
  placeholders. Never overwrite existing local environment values.
- Treat user transactions, receipt contents, bank information, identity
  information, customer information, and confidential business documents as
  sensitive.
- Enforce privacy in service code, not only in UI controls. Sensitive inputs
  must use `ONLY_ON_DEVICE`; cloud consent must never override this restriction.
  Reject before token acquisition or model invocation, and fail closed if an
  inference result cannot be confirmed as on-device.
- Only allowlisted, non-sensitive inputs may use cloud-capable modes. Obtain
  clear, request-scoped consent before a request that may use cloud inference.
- Use Firebase App Check for AI Logic calls. Do not confuse SDK initialization
  or a successfully acquired token with project-side App Check enforcement.
- Do not enable billing, deploy, or change Firebase project settings without
  explicit authorization. Do not make automated credit eligibility decisions
  or present generated output as a financial decision.

## Hybrid AI principles

- Use Firebase AI Logic through the service boundary and current supported
  model names. Prefer on-device inference for sensitive data.
- For private transaction extraction, pin the SDK mode to
  `ONLY_ON_DEVICE`; never reuse the general playground's selectable mode or
  consent state.
- Preserve `response.inferenceSource` and display only what the SDK reports.
  Never infer successful connectivity or inference source from the requested
  mode, browser online state, or successful SDK initialization.
- Validate structured model output strictly. Do not invent amounts, dates,
  currencies, or transactions. Keep `FCFA` unresolved between XAF and XOF
  unless an explicit business currency is configured.
- Keep transaction extraction editable and require human confirmation before
  adding reviewed values to the separate synthetic local demo repository.
  Never treat this flow as storage for real financial records. No automated
  lending decisions.
- Authentication and onboarding are previews only: do not accept credentials,
  simulate account creation, or persist the onboarding profile. Cloud sync
  remains off; cloud education consent is request-scoped and never carried
  forward from onboarding.
- Do not describe documentation readiness as a credit score or credit
  eligibility. Passport and loan features remain previews until implemented.
- Be explicit about uncertain browser and device support for on-device models.
  Never fabricate responses or silently fall back to cloud for sensitive input.

## Development and testing

- Preserve Firebase and GitHub project configuration.
- Copy `.env.example` only when no `.env.local` exists; fill it locally and
  keep local configuration ignored by Git.
- Run `npm run dev` for local work. For a registered Firebase project that has
  not provisioned AI Logic, confirm the active project and run
  `npx -y firebase-tools@latest init ailogic`.
- Run `npm test`, `npm run lint`, and `npm run build` for relevant changes.
- When changing page layout or navigation, validate narrow mobile, tablet,
  laptop, and wide desktop widths and check keyboard focus and both themes.
- Add focused tests for new privacy policy and validation behavior. Do not
  deploy or enable billing during local validation.
