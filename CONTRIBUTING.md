# Contributing

Use the Node version in `.nvmrc`, then `npm ci` and `npx playwright install chromium`.
Run `npm run verify` before proposing changes. Unit tests must remain deterministic;
browser tests use fake browser APIs and feed real samples through production YIN.
Never require a real microphone, instrument or external service in CI.

Use scoped Conventional Commits (`fix(audio): …`, `feat(tuning): …`, `test(ui): …`).
Commit cohesive stages as they become verified; do not squash a whole implementation
into one initialization commit. A pull request describes the behavior, tradeoffs and
actual validation results, including checks blocked by the environment.

Keep zero production dependencies. Explain additions to development tooling.
Preserve the reference interface. Prefer pure calculations and explicit resource
ownership over global mutable state. Comment numerical assumptions and browser
constraints, not obvious statements. Never edit vendored generated tokens by hand.

Do not commit `dist/`, dependencies, credentials or generated test reports.
Deployment remains manual until the owner explicitly changes the trigger.
Apache-2.0 applies to contributions. Keep LICENSE and NOTICE when redistributing.
