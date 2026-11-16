# Testing and evidence

```sh
npm ci
npx playwright install chromium
npm test                       # deterministic domain, signal and ownership tests
npm run typecheck              # includes production, unit, browser harness and E2E sources
npm run build                  # typecheck + static production output
npm run test:e2e                # build first; starts a preview of dist
npm run verify                 # tests + build + browser tests
```

Playwright has desktop (1440×1000), tablet (768×1024) and mobile (360×800) projects.
It tests startup, responsive grids, preset/manual/auto selection, reload persistence,
Custom capture/clear/base changes, synthetic audio, tone isolation/cleanup,
permission denial/retry, pending-request cancellation, keyboard radio/string
navigation, corrupt state and labelled simulation. The browser fixture replaces
only Web Audio/media permission boundaries. Actual samples flow through production
YIN, smoothing, selection and feedback. No instrument or microphone is needed.

`PLAYWRIGHT_BASE_URL` can reuse a running preview. Normally omit it. For a locally
installed Chromium, `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` is an optional override;
CI uses the version installed by Playwright. Reports and traces are ignored by Git.

## Verified during implementation (2026-11-16)

- 74 Vitest tests passed; strict typecheck and Pages-subpath production build passed.
- Synthetic sine cases: 11 frequencies from 55.1 to 987.767 Hz at four sample rates
  (44.1, 48, 96, 192 kHz), each <3 cents error in those exact generated cases.
- Deterministic weak/noisy and stronger-second-harmonic fixtures pass; silence, DC,
  random noise, invalid sample rates and malformed buffers are rejected.
- The real preview browser passed 11/11 development-harness workflow checks.
- Native keyboard radio-arrow mode navigation was also checked in the live browser.
- Real application constrained-viewport checks passed at 320, 360, 768 and 1280 px.
- Playwright discovers 39 cases. It could not launch Chromium in the implementation
  workspace: OS denial of the process-singleton socket (`Operation not permitted`).
  No Playwright assertion ran there. The full suite must pass on a normal machine
  or GitHub Actions before calling release verification complete.
- No coverage percentage was measured. Passing synthetic tests is not a calibrated
  physical accuracy claim. Safari, Firefox, real-device audio, hearing/output
  hardware and older-mobile performance have not been verified.

## Development-only browser checks

If an environment has a usable preview browser but cannot launch a test process:
run `npm run dev`, open `/guitar-tuner/tests/browser/index.html`, and press **Run
browser checks**. The page labels its fake audio and reports individual outcomes.
`tests/browser/layout.html` embeds the real UI at selectable viewport widths.
Neither harness is included in the production build. These checks supplement,
not replace, Playwright: keyboard navigation and reload scenarios still need that
suite or manual verification.

## Manual release checks

Use headphones when checking tones with a live microphone. Test each string on a
real guitar (Standard and Open C), slow/fast plucks, noisy rooms, strong harmonics,
weak notes, manual/automatic selection, custom reference, and beyond-scale readings.
Compare against a calibrated reference before publishing numerical accuracy claims.
Try denied/revoked permission, unplugging the device, background/foreground,
repeated start/stop and Safari iOS audio interruptions. Check no recording indicator
remains after stopping or hiding the page. Check keyboard order, visible focus,
radio arrows, screen-reader meter words and live announcements without flooding.
