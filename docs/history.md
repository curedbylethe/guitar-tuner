# Development history

Commits were made as stages passed their available checks. The final documentation commit follows this table.

| Commit | Stage |
| --- | --- |
| `ef2564a` | chore: initialize vite and strict typescript project |
| `fcafb81` | feat(tuning): extract presets, relative calibration and validated settings |
| `1161256` | feat(audio): extract sample-rate-aware yin and stable pitch tracking |
| `8072fd5` | fix(audio): own microphone and tone resources through cancellation and cleanup |
| `bfbb1ae` | feat(ui): connect typed tuner modules to the supplied aporia interface |
| `3b1345f` | feat(ui): keep custom string selection beside reference recording controls |
| `d7e7f7d` | fix(audio): decouple pitch sampling from animation frame cadence |
| `e93ca31` | fix(tuning): reject custom references outside the supported target range |
| `9f4788d` | test(ui): add deterministic browser workflows and responsive verification harnesses |
| `7dc8073` | test(ui): isolate browser checks from external font requests |
| `89ebedf` | ci: add validation and manual-only github pages deployment |
| `42facd6` | refactor: format typed modules and preserve microphone reset feedback |
| `1c1af72` | chore(design): retain byte-identical upstream tokens and license |

The final source includes all stages and the tests/docs described in README.md.
The Git bundle in the delivery ZIP retains this history, including the final documentation commit.
No repository was created or pushed from the implementation environment because the
connector lacks repository creation and the CLI/browser have no signed-in session.
No Pages configuration or production deployment was changed.
