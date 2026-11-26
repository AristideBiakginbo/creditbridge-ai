# CreditBridge AI project instructions

## Objectives

CreditBridge AI is an offline-first, privacy-aware financial inclusion app for
microentrepreneurs and small merchants, with particular focus on African
markets. Build practical tools that help people understand and document their
business finances. The initial phase establishes a safe technical foundation;
do not expand it into unrequested product features.

## Technical architecture

- Use React, TypeScript, and Vite for the web client.
- Use the modular Firebase Web SDK from `src/lib/firebase.ts`. Read client
  configuration only from `VITE_` environment variables.
- Keep financial records local-first (Dexie is available) and make cloud
  synchronization an explicit, optional feature.
- Keep AI access behind a clear application boundary. Prefer on-device
  processing where supported and use Firebase AI Logic only for an intentional
  cloud request.
- Use Tailwind CSS v4 through its Vite plugin. Keep shared design tokens in
  `src/index.css`.
- Validate untrusted input at boundaries with Zod where appropriate.

## Coding conventions

- Prefer small, typed React components and modular Firebase imports.
- Reuse installed dependencies and existing project configuration; do not add
  dependencies without a concrete need.
- Keep UI responsive and accessible: semantic HTML, labels, keyboard support,
  and visible focus states.
- Keep user-facing status accurate. SDK initialization is not proof of backend
  connectivity, authorization, synchronization, or successful AI inference.
- Run `npm run build` and `npm run lint` after changes; add focused tests when
  introducing testable behavior.

## Security and privacy

- Never commit `.env.local`, credentials, App Check debug tokens, or real
  financial data. Use `.env.example` only for placeholders.
- Never log credentials, personal information, or financial transactions.
- Treat browser Firebase configuration as public client configuration, not as
  authorization. Enforce access controls with Firebase Security Rules and
  App Check when services are introduced.
- Do not transmit private financial information to cloud services or AI without
  clear, informed user consent. Minimize and explain any data sent.
- Do not enable billing, deploy, or change Firebase project settings as part of
  ordinary local development.
- Do not make automated credit eligibility decisions or present AI output as a
  financial decision.

## Hybrid AI principles

- Clearly distinguish on-device inference, cloud inference, and unavailable or
  untested states.
- Prefer on-device processing for sensitive financial inputs when technically
  supported; obtain explicit consent before any cloud inference.
- Do not fabricate AI responses, connectivity checks, or successful inference.
- Show uncertainty, allow users to review extracted financial information, and
  keep consequential decisions under human control.

## Development and testing workflow

- Copy `.env.example` to `.env.local` and fill it with the registered Firebase
  Web app configuration; never overwrite existing local values.
- Start the app locally with `npm run dev`.
- Validate changes with `npm run build` and `npm run lint`.
- Do not deploy or enable billing unless explicitly requested.
