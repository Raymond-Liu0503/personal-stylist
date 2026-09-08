# Setup

## Toolchain and workspace

Node 22.23.2 (minimum 22.13), npm 10.9.8, Expo SDK 57 / React Native 0.86 / React 19.2.3, Supabase CLI 2.75.0, Deno 2.2.15. npm pins CLI tools locally; use `npx supabase` and `npx deno`. The npm lockfile and Edge Deno lockfile pin transitive resolution. Install compatible native modules using `npx expo install` from `apps/mobile`.

Keep Deno pinned at 2.2.15 while using this Supabase Edge runtime: it writes the supported version 4 lockfile. Deno 2.3+ writes version 5, which this runtime rejects with `InvalidWorkerCreation`. Use `npm run check:edge` and `npm run test:edge` so a globally installed newer Deno does not rewrite `supabase/functions/deno.lock`. When deliberately updating Edge dependencies, regenerate the lockfile with `npx deno cache --config supabase/functions/deno.json supabase/functions/api/index.ts`, then run both checks and test a local API request before committing it.

The Expo 57 compatibility requirements were checked against the [official Expo reference](https://docs.expo.dev/versions/latest/): iOS 16.4+, Node 22.13+, Xcode 26.4+ for native builds. Windows can run Metro and EAS; a local iOS native build requires macOS. Use Docker Desktop's WSL integration for the backend. Avoid sharing a node_modules directory between Windows npm and WSL npm: install dependencies in the environment running Metro.

## Local

1. `npm ci` and `npm run skills:build`.
2. `npx supabase start`, then `npx supabase db reset`.
3. Copy `supabase/functions/.env.example` to `supabase/functions/.env`, replace the signing secret with at least 32 random characters. Local mock mode must have `APP_ENV=local`, `AI_PROVIDER=mock`, `ANALYSIS_ENABLED=true`, and `OUTFIT_ENABLED=true`. `supabase functions serve` injects `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`; do not put these in the mobile `.env` file. If you invoke the handler outside the Supabase CLI, provide those three values yourself.
4. `npx supabase functions serve api --env-file supabase/functions/.env`.
5. Copy `apps/mobile/.env.example` to `apps/mobile/.env`. Obtain the anon/publishable key from `npx supabase status`. `127.0.0.1` works only in an iOS simulator on the same machine. For a physical iPhone, replace it with the Windows host's LAN IPv4 address (for example, `http://192.168.1.20:54321`) and allow the Supabase/API ports through the trusted private-network firewall. Keep `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` only; never use the service-role key here.
6. Configure native Sign in with Apple for your actual bundle ID. The example bundle ID must be replaced before device distribution. Local API automation can use local Supabase test users; the app intentionally has no production auth bypass.
7. Enable each tester administratively: `insert into public.beta_access(user_id,enabled) values ('USER_UUID',true) on conflict (user_id) do update set enabled=true;`. Never expose a service key to the app.
8. From `apps/mobile`, `npx eas-cli build --profile development --platform ios`, install the development build, then `npm start`. An Apple developer account and registered device are required.

### Fast local smoke test

Use two terminals from the repository root:

```sh
# terminal 1
npx supabase start
npx supabase db reset
npx supabase functions serve api --env-file supabase/functions/.env

# terminal 2
cd apps/mobile
npx expo start --dev-client
```

For Expo Go testing without Apple setup, run `npm run local:user` from the repository root after starting Supabase and applying migrations. It creates a confirmed local email/password account with beta access and an admin-managed daily quota exemption, and prints its credentials. Start Expo with `npx expo start --go --tunnel` from `apps/mobile`, enable the age and consent switches, and enter those credentials under **Local test login**. Consent is recorded only when you accept it in the app. The app labels these accounts “Unlimited daily analyses · test account”; usage is still counted and the monthly spending ceiling, reservations, duplicate protection and receipts still apply. Normal accounts retain three daily analyses. Only an administrator can set or revoke `beta_access.daily_quota_exempt`; migrations do not exempt any accounts automatically. The provisioning script is restricted to local Supabase. The test-login UI appears only in development with `EXPO_PUBLIC_ENVIRONMENT=local` and an HTTP localhost/private-LAN Supabase URL on port 54321. No extra public secret or login flag is needed.

If iOS reports missing native modules such as `ExpoAsset` or `ExponentConstants`, the installed client does not match SDK 57. Update Expo Go to the SDK 57-compatible version and restart Metro from `apps/mobile` with `npx expo start --go --clear`, or install the SDK 57 development build and use `npx expo start --dev-client --clear`. Do not open an SDK 57 bundle in an older Expo Go client; the resulting `main has not been registered` message is a follow-on error from the native module failure.

For Apple-specific tests, configure Sign in with Apple for the development bundle ID and use a test Apple account. After the first sign-in, find the user's UUID in Supabase Studio and enable beta access with the SQL from step 7. `AI_PROVIDER=mock` makes assessments deterministic and does not call OpenRouter. Set `MOCK_SCENARIO=tools`, `partial`, `retake`, or `malformed` to exercise those paths. Email test users cannot exercise Apple grant revocation/account deletion.

For backend-only checks that do not need a phone or Apple credentials:

```sh
npm test
npm run typecheck
npm run lint
npx supabase test db
node scripts/test-concurrency.mjs
```

The concurrency script needs the local Docker database running. Camera and AppleAuthentication are included in compatible iOS Expo Go versions; Apple identifiers can differ from standalone builds. Use the local email login for the mock flow in Expo Go and a configured development build to verify this app's own Apple identity and deletion flow.

## Development and beta

Use distinct hosted Supabase projects, database credentials, signing secrets, and OpenRouter keys. Configure the four public EAS variables: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `EXPO_PUBLIC_API_VERSION=v1`, and `EXPO_PUBLIC_ENVIRONMENT` (`development` or `beta`). Profiles `development`, `preview`, `production` select their corresponding EAS environments. Preview is a TestFlight/store-distributed beta.

Deploy migrations before the API: `npx supabase db push --linked`, then `npx supabase functions deploy api`. Native Apple tokens are verified by `supabase.auth.getUser` middleware; gateway JWT verification is disabled deliberately to support current publishable/signing keys. Application endpoints always require a verified Supabase token.

Backend-only secrets: Supabase service credentials, `REPORT_SIGNING_SECRET`, `OPENROUTER_API_KEY`, `OPENROUTER_PROVIDERS`, `APPLE_CLIENT_ID`, `APPLE_CLIENT_SECRET`. Apple client secret is a short-lived developer-generated JWT; rotate it before expiry. Enable Apple in hosted Supabase Auth with the native bundle ID and required developer credentials. See [Supabase Apple setup](https://supabase.com/docs/guides/auth/social-login/auth-apple).

Paid dispatch additionally requires `APP_ENV=development|beta`, `AI_PROVIDER=openrouter`, `ANALYSIS_ENABLED=true`, `OUTFIT_ENABLED=true`, `OPENROUTER_CONFIG_APPROVED=true`, an explicit reviewed provider list, beta access and current consent. Before setting approval, verify `google/gemini-3.1-flash-lite` supports images, tools, strict schema, minimal reasoning, `zdr`, and `data_collection=deny` on that exact route. Review pricing to ensure the maximum two-round run fits the 100,000 microdollar reservation; the restricted OpenRouter key should also have a $20 limit. The application-level ledger cannot prevent unexpected upstream pricing changes. No automatic/provider fallback is enabled. References: [provider routing](https://openrouter.ai/docs/guides/routing/provider-selection), [structured output](https://openrouter.ai/docs/guides/features/structured-outputs).

## Verification

`npm test`, `npm run typecheck`, `npm run lint`, `npm run export:ios`, `npm run test:edge`, `npm run check:edge`. Database: `npx supabase test db`, then `node scripts/test-concurrency.mjs` with Docker running. Use a disposable local project for tests. `npm run test -w @stylist/mobile` runs component and image-service tests.

With the local API running in mock mode, `node --import tsx scripts/test-upload.mjs` verifies Expo multipart encoding, assessment, signed receipt, duplicate prevention, quota, and Save/history. It sends only a generated one-pixel JPEG, creates a temporary test account, and removes that account afterward. Mobile uploads use `File` from `expo-file-system` with `expo/fetch`; Expo's encoder rejects React Native's legacy `{uri, type, name}` descriptors before network dispatch.

Schedule `select public.maintain_analysis()` once a minute with Supabase Cron in each hosted project; local setup can invoke it manually. Reconcile uncertain runs through privileged `settle_analysis` only after provider billing evidence establishes actual cost. Never assume a timed-out request was free. At 30 days maintenance conservatively settles unresolved reservations at the reserved cost before deleting operational rows.

Keep live calls out of CI. Build native binaries for native dependency/configuration changes or release candidates. Preserve `/v1` compatibility and retain the prior skill/model configuration for rollback. Run the release checklist before TestFlight invitations.
