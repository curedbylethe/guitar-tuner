# Design provenance and synchronization

The author's `guitar-tuner-v2.html` is the design/functional reference. Layout,
large note/cents readouts, red needle, square controls, string grid, typography,
presets, method disclosure and staged Custom guidance are retained. This is
Aporia Interface, not Editorial. HTML now uses a main landmark and a description.

`src/styles/vendor/aporia.css` is an unchanged copy of
[curedbylethe/Aporia dist/web/aporia.css](https://github.com/curedbylethe/Aporia/blob/main/dist/web/aporia.css),
Git blob `0c2a8624b9944cb58777e9c24e3269ea2280a06f`, retrieved 2026-11-16.
Apache-2.0 is taken from the actual upstream LICENSE (its README's no-license
sentence conflicts with that file). Attribution is retained in LICENSE and NOTICE.

The app fixes `data-theme="paper"` to preserve the supplied appearance. app.css
maps the reference's `--fg-muted` to canonical `--fg-secondary`, uses canonical
interactive roles, and derives a panel mix without introducing another palette.
The old opaque decorative border literal is replaced by the canonical role.

To synchronize:

1. In an upstream Aporia checkout, run `npm run verify`.
2. Copy its generated `dist/web/aporia.css` verbatim to our vendor path.
3. Record the upstream commit/blob and any token rename in this document.
4. Run our verification and inspect Paper mode at 320/360/768/1280 px.
5. Commit the token update separately. Never patch the generated file locally.

Mobile Custom mode closes the settings panel after choosing mode or base. A
selected-string dropdown in the meter puts selection, stability guidance, Record
and Clear together; users need not jump between the configuration and string grid.
The desktop panel remains visible. Selecting any string manually disables Auto.
