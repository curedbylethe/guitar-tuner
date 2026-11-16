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

## Verified during implementation (2026-11-16, updated 2026-11-17)

- 102 Vitest tests passed; strict typecheck and Pages-subpath production build passed.
  Ten `octaveAmbiguous` cases cover 1200, −1200, 1180 and −1220 cents as ambiguous,
  and 0, 700, 1150, 1250, 2400 and −2400 cents as unambiguous.
- One Playwright case per viewport feeds 164.81 Hz (one octave above E2) through
  production YIN. The meter stays on Listening/No reading with no heard frequency and
  selection stays on E2 instead of moving to D3. Disabling the guard makes that case
  fail with selection on D3.
- Synthetic sine cases: 11 frequencies from 55.1 to 987.767 Hz at four sample rates
  (44.1, 48, 96, 192 kHz), each <3 cents error in those exact generated cases.
- Third-harmonic baseline measured at commit `b36d83f` on the same unit fixture,
  `signal(d, f, 0.1, 0, 1, 3)` (fundamental 20 dB below a third harmonic of
  amplitude 1.0), at 44.1, 48, 96 and 192 kHz for 65.406, 73.416, 82.407, 110,
  146.832, 196, 246.942 and 329.628 Hz, plus 55.1 Hz. All 36 readings were wrong:
  1903.3–1905.4 cents high at every rate except 246.942 Hz at 44.1 kHz, which
  reported 370.355 Hz (701.7 cents). A pure third harmonic with no fundamental
  read three times nominal at every rate (329.628 Hz read 988.9–989.0 Hz);
  recorded as an observation, not asserted. Single-threaded `detect` cost, three
  repeats of 600 calls at 44.1/48 kHz, 250 at 96 kHz and 120 at 192 kHz: 2.01–2.08,
  2.35–2.56, 9.72–10.00 and 35.46–38.80 ms per call, spread within a rate at most
  9%. The detector is unchanged here; these readings are the defect description.
- Deterministic weak/noisy and stronger-second-harmonic fixtures pass; silence, DC,
  random noise, invalid sample rates and malformed buffers are rejected.
- The real preview browser passed 11/11 development-harness workflow checks.
- Native keyboard radio-arrow mode navigation was also checked in the live browser.
- Real application constrained-viewport checks passed at 320, 360, 768 and 1280 px.
- Playwright discovers 42 cases (14 per viewport across three projects). All 42 passed
  in this workspace with a locally launched Chromium; none were skipped. An earlier
  sandbox denial of Chromium's singleton socket (`Operation not permitted`) no longer
  applies here, but release verification still needs a CI run.
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
