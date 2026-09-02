# TradeConnect — agent guide

Marketing landing page for TradeConnect ("good help, close to home"): a visitor
describes a home-repair job, and the page pitches matching them with local trade
professionals.

Hosted on Netlify as the site `fixfinder-sa`. Deploys are plain static-file
uploads — **there is no build step, no bundler, and no package.json.** What is in
the repo is exactly what ships.

## Files

| Path                   | What it is |
| ---------------------- | ---------- |
| `index.html`           | The entire site. One page, sections keyed by `id`: `#top` (hero), `#how`, `#request` (the job form), `#professionals`. |
| `style.css`            | All styling. **Minified to a single line** — see the warning below. |
| `script.js`            | All behaviour. Vanilla ES2020, no imports, loaded with a plain `<script>` at the end of `<body>`. |
| `assets/local-pro.svg` | The hero illustration. Only asset. |
| `netlify.toml`         | Publish directory and cache headers. |

Fonts (Manrope, DM Mono) load from Google Fonts via `<link>` in `<head>`.
Nothing else is fetched at runtime.

## Editing `style.css` — read this first

The whole stylesheet is one long line with no newlines between rules. Do not
"reformat while you're in there" — a wholesale reindent turns every future diff
into a single unreadable changed line and makes review impossible.

To change a rule, match its selector plus enough of its body to be unique, and
replace just that span. To add a rule, append it directly after a related
selector on the same line. Keep the existing compact style: no spaces after `:`
or `;`, shorthand hex, `.5` not `0.5`.

## Conventions

- **Design tokens** live in `:root` at the very start of `style.css`:
  `--ink` `--muted` `--cream` `--paper` `--blue` `--orange` `--line`. Use the
  variable, not the literal hex, for anything that maps to one of these.
- **Type scale** is fluid — headings use `clamp()` with negative
  `letter-spacing`. Italic accents inside headings use `<em>`, which is styled
  as a Georgia serif in `--blue`.
- **Responsive** behaviour is one breakpoint: `@media(max-width:800px)` at the
  end of the stylesheet. Add mobile overrides there rather than introducing new
  breakpoints.
- **Scroll reveals**: add class `reveal` to an element and an `IntersectionObserver`
  in `script.js` adds `in-view` when it scrolls into frame. No JS wiring needed.
- **Accessibility** is already accounted for and should stay that way: an
  `@media(prefers-reduced-motion:reduce)` block disables all animation, decorative
  nodes carry `aria-hidden="true"`, and sections have `aria-label`s. Keep new
  decorative elements out of the accessibility tree and new motion inside the
  reduced-motion opt-out.

## The job form is a prototype

`#jobForm` in `script.js` calls `preventDefault()` and writes the submission to
`localStorage` under `latestTradeConnectRequest`. Nothing is sent anywhere and no
one is notified. The "become a pro" button just fires an `alert()`.

If the ask is to make submissions actually arrive, do not invent a backend or
write to a local file — wire it to a Netlify primitive (Netlify Forms for
plain notification-style capture, or a function in `netlify/functions` plus
Netlify Database if the data needs querying). Netlify Forms in particular
requires an activation step at deploy time, so follow the platform docs rather
than hand-rolling it.

## Previewing

Open `index.html` directly in a browser, or serve the folder:

```
npx serve .        # or: python3 -m http.server 8000
```

Use the Netlify CLI (`netlify dev`) only when you have added functions, headers,
or redirects that need local emulation — for pure HTML/CSS/JS changes a static
server is faster and sufficient.

## Deploying

Pushing to the default branch is the deploy. Netlify picks up the commit,
uploads the files, and the site is live in seconds — there is no build to break,
so the main risk is shipping a typo, not a failed compile. Load the page once
before pushing.
