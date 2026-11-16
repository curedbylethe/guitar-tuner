# Agent guidance

This is a Vite + strict vanilla TypeScript static application with zero production
npm dependencies. Read README.md, docs/architecture.md and docs/testing.md first.

Keep the supplied Aporia interface and all tuner workflows. Add tests for changed
behavior; run `npm run verify`. Report blocked tests honestly. Keep audio ownership
in src/audio, calculations in src/tuning, validation in src/state and DOM in src/ui.
Do not introduce a framework or audio library without a demonstrated requirement.

Use incremental scoped Conventional Commits as work develops. Never enable push
triggers for Pages, modify repository administration, or publish without user intent.
Do not weaken tests or change thresholds merely to hide a failure.

Generated Aporia CSS is immutable: follow docs/design.md for synchronization.
Development browser harnesses under tests/browser must stay out of dist.
