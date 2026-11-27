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
- `src/features/ai-playground/` contains diagnostic UI and preview-only
  transaction entry. No transaction persistence is implemented.
- Tailwind CSS v4 is configured through the Vite plugin. Keep shared design
  tokens in `src/index.css`.
- Dexie is available for future offline-first records but is not yet wired to
  the current transaction previews. Cloud synchronization must remain
  explicit and optional.

## Coding conventions

- Prefer small, typed React components and modular Firebase imports.
- Reuse installed dependencies and project patterns; add dependencies only
  when the task requires them.
- Validate untrusted input at boundaries with Zod where appropriate.
- Keep interfaces responsive and accessible: semantic HTML, labels, keyboard
  support, visible focus states, and useful error feedback.
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
- Keep transaction extraction editable and preview-only until a separately
  authorized persistence workflow exists. Human review is required; no
  automated lending decisions.
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
- Add focused tests for new privacy policy and validation behavior. Do not
  deploy or enable billing during local validation.
