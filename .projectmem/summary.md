# projectmem - guitar-tuner-checkout

_Last updated: 2026-11-16_

## Project purpose
A six-string guitar tuner that analyzes pitch on your device. Eleven presets, automatic or manual string selection, reference tones and relative custom tuning, in the supplied Aporia Interface design. Built with strict vanilla TypeScript, Vite and native Web Audio; zero production npm dependencies.

## Recent issues
- [DONE] #legacy_e93c Legacy issue: fix(tuning): reject custom references outside the supported target range (fixed)
- [DONE] #legacy_d7e7 Legacy issue: fix(audio): decouple pitch sampling from animation frame cadence (fixed)
- [DONE] #legacy_8072 Legacy issue: fix(audio): own microphone and tone resources through cancellation and cleanup (fixed)

## Decisions
- No decisions logged yet.

## Notes
- feat(tuning): extract presets, relative calibration and validated settings
- feat(audio): extract sample-rate-aware yin and stable pitch tracking
- feat(ui): connect typed tuner modules to the supplied aporia interface
- feat(ui): keep custom string selection beside reference recording controls
- test(ui): add deterministic browser workflows and responsive verification harnesses
- test(ui): isolate browser checks from external font requests
- ci: add validation and manual-only github pages deployment
- refactor: format typed modules and preserve microphone reset feedback
- chore(design): retain byte-identical upstream tokens and license
- docs: document tuner architecture, verification limits and manual deployment

## Key files
- `.gitignore`
- `.nvmrc`
- `LICENSE`
- `NOTICE`
- `README.md`
- `docs/implementation.md`
- `index.html`
- `package-lock.json`
- `package.json`
- `src/main.ts`
- `tsconfig.json`
- `vite.config.ts`
- `src/state/settings.ts`
- `src/tuning/notes.ts`
- `src/tuning/presets.ts`
- `tests/unit/tuning.test.ts`
- `src/audio/stability.ts`
- `src/audio/yin.ts`
- `src/tuning/feedback.ts`
- `src/tuning/selection.ts`

## Open questions
- None logged yet.
