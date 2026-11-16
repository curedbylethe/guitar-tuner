# Architecture and decisions

The application has no server, account or production npm dependency. Vite bundles
native DOM and Web Audio code for `/guitar-tuner/`. `index.html` and `app.css` retain
the author's supplied design. No original standalone file is needed at runtime.

| Module | Responsibility |
| --- | --- |
| `src/tuning/notes.ts` | Note parsing, equal temperament at A4=440 Hz, cents and median |
| `src/tuning/presets.ts` | Eleven presets, low-to-high string order, relative tuning bounds |
| `src/tuning/selection.ts` | Three-sample, 20-cent automatic-selection hysteresis |
| `src/tuning/feedback.ts` | Stable input and 5/8-cent in-tune hysteresis |
| `src/audio/yin.ts` | Reusable sample-rate-dependent difference buffers |
| `src/audio/stability.ts` | Smoothing, freshness, spread and pluck transitions |
| `src/audio/microphone.ts` | Permission generation, context, nodes and track ownership |
| `src/audio/tone.ts` | Short-lived oscillator graph and independent context |
| `src/state/settings.ts` | Validate persisted data; gracefully handle storage failures |
| `src/ui/` | Typed DOM views and accessible announcements |
| `src/main.ts` | Event wiring, 20 Hz analysis timer and animation presentation |

## Audio ownership

Start resumes a new AudioContext during the user gesture, then requests raw input
with echo cancellation, automatic gain and noise suppression disabled. Permission
requests cannot actually be aborted by the browser API. Stop increments a generation;
a late stream is immediately stopped without replacing newer ownership. Repeated
start is ignored while requesting/listening. Errors release the graph, tracks and
context. A context interruption or ended device stops listening and explains retry.

Tone playback owns a separate context so stopping the microphone cannot break a
reference tone. Its two oscillators (triangle fundamental and quieter sine harmonic)
share an exponential envelope lasting 2.4 seconds. Manual stop, natural end, errors,
page hide and pending-resume cancellation release all nodes and close that context.
While playing a tone, pitch history is reset and reference capture is disabled.
Room echo after stopping a tone cannot be distinguished perfectly from an instrument.

Hidden documents and pagehide stop microphone and tone, clear analysis scheduling
and history, and cancel animation. Returning restarts the timers but never requests
the microphone automatically. Sampling runs every 50 ms independently of animation
cadence: a throttled renderer must not make stable audio continually reset.

## YIN and confidence

The reference's YIN cumulative mean normalized difference method and threshold 0.12
are retained. The integration window scales from 2048 samples at 48 kHz (~42.7 ms).
Maximum lag is `ceil(sampleRate / 55) + 1`; analysis input is the next power of two
covering window + max lag + one interpolation sample. At 48 kHz that is 4096 samples;
at 96 kHz 8192; at 192 kHz 16384. Accepted frequency range is 55–1000 Hz; all current
preset targets (C2 through E4) lie inside it. Detection is decided by the normalized
difference falling below 0.12, independent of input level. Only a numeric silence
floor on the mean-removed variance (1e-8, RMS about 1e-4, roughly -80 dBFS) rejects
silence, DC and denormals; quiet strings are accepted. Invalid/non-finite and
too-short input is also rejected.

The first threshold basin is searched for its lowest normalized difference within
25% of the threshold lag. This corrects a noisy-signal early-local-minimum bias found
by a deterministic regression test. An extension step then doubles the basin lag while
the doubled position fits clearly better: it scans ±8 % around that centre, breaks when
the raw normalized difference at the current lag is below `RESIDUAL` (0.002), and
accepts a candidate only when it improves that value by at least `MARGIN` (0.001).
Doubling is iterated; lags at the ceiling skip it. The comparison uses `nd`, the raw
squared difference divided by `2 × window × variance`, not the cumulative-mean
difference used for the threshold. `nd` has no cumulative-mean lag trend, so it is
comparable across lags. Extension also stops above three quarters of the maximum
frequency, where doubling would leave the guitar band and create a spurious low
subharmonic. Three-point parabolic interpolation refines the chosen lag. Runtime is
O(window × maximum lag); two per-lag work buffers (`difference` and `raw`) are reused,
but no ephemeral array is allocated per lag. The upper supported sample rate is
192 kHz. Main-thread analysis may be expensive on older mobile devices at high sample
rates; profiling is needed before introducing a worker or AudioWorklet. This is a
monophonic detector, not chord recognition.

History keeps eight samples; presentation uses the median of five. Stability needs
six observations with <10-cent spread. A >70-cent jump or >200 ms gap resets history;
a reading expires after 200 ms without a usable signal. Every unstable reading says
Settling, including readings far from the target. In tune enters within 5 cents and
stays until 8 cents, while still requiring stability. Automatic selection requires
three fresh stable detections with a >20-cent advantage over the current string.
An offset within 50 cents of a single octave either way (±1200 cents) is unusable:
no verdict, no heard frequency, no automatic-selection move and no reference
recording. Some presets put two strings an exact octave apart (D2/D3 in Drop D,
E2/E3 in Open E, C2/C3 in Open C); such a string must be chosen manually, while
standard tuning has no octave pair. The extension resolves a fundamental that sits
20–26 dB below a dominant second harmonic (all six open strings, with and without
noise). It does not resolve a dominant third or higher harmonic, or a fundamental
about 30 dB down; those
readings can still be reported an octave high when the guard does not catch them.

## Custom calibration and persistence

A recorded frequency anchors the selected base-tuning string. Other targets equal
`referenceHz * 2 ** ((targetMidi - referenceMidi) / 12)`. This is relative equal
temperament, not a changed musical scale. Recording is disabled unless fresh and
stable; references placing any string outside 55–1000 Hz are rejected. Changing the
base clears the previous reference because its musical meaning has changed.

Validated JSON under `aporia-tuner` stores mode, preset, base, string, automatic
selection and a numeric reference; no audio recording or permission state is saved.
Old malformed settings and unavailable localStorage fall back safely. References
recorded in a labelled `?state=` simulation cannot be persisted.

## Design and privacy tradeoffs

Canonical generated Aporia CSS is vendored unchanged to avoid a package or runtime
network dependency. Font links from the reference remain optional Google Fonts
requests; when unavailable the declared local fallbacks render. No audio is uploaded.
See design.md for provenance and testing.md for evidence and unverified claims.
