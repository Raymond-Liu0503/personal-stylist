# Personal Stylist

An iPhone-first invited beta for outfit assessment. A photo is the only required analysis input after Apple sign-in and explicit adult/AI-processing consent. Only explicitly saved text reports enter history.

The workspace includes an Expo 57 app, public Zod contracts, Supabase API and migrations, bounded outfit specialist, deterministic mock provider, privacy controls, and verification tooling. Live inference is disabled until its provider configuration is explicitly reviewed. This repository is an implementation candidate, not a verified TestFlight release.

Start with [setup](docs/setup.md). See [architecture](docs/architecture.md), [privacy data flow](docs/privacy-dataflow.md), and [release checklist](docs/release.md).

```sh
npm ci
npm run skills:build
npm test
npm run typecheck
npm run lint
npm run export:ios
```

Use Node 22.23.2. Copy the two `.env.example` files to local `.env` files and follow setup for Supabase and Apple configuration. No private credentials belong in mobile configuration.
