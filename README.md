# hmayed.online

Portfolio site for Mohammad Hmayed, cinematographer and camera professional based in Lebanon.
Static HTML, CSS and vanilla JS served by GitHub Pages. No build step is needed to deploy.

## Structure

```
index.html, work.html, services.html, content-creation.html, about.html,
credits.html, everest.html, contact.html, thank-you.html, 404.html
cinema.html              redirect: the old /cinema URL now points to /work
_partials/               shared header and footer (source of truth)
assets/css/tokens.css    design tokens: fonts, palette, type scale, spacing, surfaces
assets/css/site.css      base, layout and components (uses semantic tokens only)
assets/js/site.js        menu, YouTube click-to-load, work filters, intro clip, contact form
assets/brand/            logos, monogram, icons, favicon
assets/fonts/            self-hosted Inter, Roboto Condensed and Cairo (Arabic)
assets/img/              generated responsive WebP images (do not edit by hand)
assets/video/            intro clip (WebM 720p/480p + MP4 fallback + poster)
content/                 source originals. Not published (see _config.yml)
tools/                   maintenance scripts. Not published
```

## Design system: "Viewfinder"

Built from the HMAYED brand marks: viewfinder corner brackets, a bold condensed wordmark,
ink `#1F1C1D` on bone `#F0F0EB`, and one signal colour, **tally** red, used sparingly
for state and emphasis (record dot, roles, focus rings).

- **Surfaces.** Put `surface-ink` (dark, default) or `surface-bone` (light) on a section.
  Every component reads semantic tokens (`--text`, `--text-muted`, `--line`, `--accent`,
  `--action-bg`...), so it works on either surface unchanged. Add `surface-ink-raised` to
  a dark section for the lifted variant.
- **Type.** `display` (hero), `display--page`, `heading-xl`, `heading-lg` use Roboto
  Condensed uppercase. `heading-md`, `heading-sm`, `lede` and body use Inter. Arabic text
  marked with `lang="ar" dir="rtl"` switches to Cairo automatically.
- **Signature.** Wrap media in `.frame` for viewfinder corner brackets. Use
  `.frame--on-hover` to show them only on hover or focus.
- **Shape.** Square corners (2px at most). Motion respects `prefers-reduced-motion`.
- All text and UI colours meet WCAG AA contrast on both surfaces.

## Common tasks

**Edit the header or footer.** Edit `_partials/header.html` or `_partials/footer.html`, then run:

```bash
node tools/sync-partials.mjs
```

This copies them into every page and marks the current nav item. Use `--check` to verify
without writing.

**Add or replace a photo.**

1. Put the original in `content/`.
2. Add an entry to `SOURCES` in `tools/build-images.py`.
3. Run the build. It needs Pillow (`pip install pillow`):

```bash
python tools/build-images.py
```

4. Reference the variants in HTML with `srcset`, following the existing `<img>` tags.

**Replace the intro video.** Save the new file as `assets/video/intro-source.mp4`, then run
the script below. It needs ffmpeg.

```bash
pwsh tools/encode-intro-video.ps1
```

## Contact form

Submissions go through [FormSubmit](https://formsubmit.co). With JS the form posts by AJAX
and redirects to `/thank-you`. Without JS it posts normally and FormSubmit redirects to
`_next`.
