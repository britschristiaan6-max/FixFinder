# TradeConnect — agent guide

TradeConnect ("good help, close to home") matches South African homeowners with
local trade professionals. Two audiences:

- **Homeowners** describe a job on the landing page and browse the directory.
- **Trade professionals** create an account, fill in a profile, and publish it
  to appear in that directory.

Hosted on Netlify as the site `fixfinder-sa`.

## Layout

| Path                        | What it is |
| --------------------------- | ---------- |
| `public/`                   | **Everything that ships.** The publish directory — nothing outside it is served. |
| `public/index.html`         | Landing page: hero, `#how`, featured pros, `#request` job form, `#professionals`. |
| `public/find-a-pro.html`    | Public directory with trade filters and search. |
| `public/for-pros.html`      | Pro portal. Signup / sign in when there's no session, profile editor when there is. |
| `public/404.html`           | Not-found page, served automatically by Netlify. |
| `public/style.css`          | Original landing-page styling. **Minified to one line** — see below. |
| `public/app.css`            | Everything styled since. Normal multi-line CSS. Loads *after* `style.css`. |
| `public/common.js`          | Shared: `window.TC` helpers, scroll reveals, cursor glow. Loaded first on every page. |
| `public/script.js`          | Landing page only. |
| `public/directory.js`       | `find-a-pro.html` only. |
| `public/pro-portal.js`      | `for-pros.html` only. |
| `db/schema.ts`              | Drizzle schema — the source of truth for the database. |
| `lib/shared.ts`             | Trade list and all server-side validation. |
| `netlify/functions/*.mts`   | The API. See below. |
| `netlify/database/migrations/` | Generated SQL. Netlify applies these at deploy; never apply them yourself. |

## There *is* a build now

This used to be a pure static folder with no `package.json`. It isn't anymore:
functions, Drizzle and Identity all come from npm. Netlify installs
dependencies and bundles `netlify/functions/*.mts` with esbuild on deploy.

Static files still ship byte-for-byte from `public/`, so a typo in HTML or CSS
will publish successfully and simply look wrong. Load the pages before pushing.

## The API

All four functions use in-code `config.path`, so the paths below are canonical
(not `/.netlify/functions/...`).

| Route | Purpose |
| ----- | ------- |
| `POST /api/auth/:action` | `signup`, `login`, `logout`, `confirm`. `GET /api/auth/me` reads the session. |
| `GET`/`PUT /api/profile` | The signed-in pro's own profile. |
| `GET /api/pros`, `/api/pros/:id` | Public directory. Published profiles only. |
| `POST /api/requests` | Homeowner job enquiries. |

## Auth: server-side on purpose

The browser loads no auth SDK. Pages `fetch` our own endpoints and
`netlify/functions/auth.mts` calls `@netlify/identity` server-side; the
Functions runtime sets the `nf_jwt` cookie, and the page then does a **full
navigation** so the next request carries it.

This is deliberate — `@netlify/identity` in the browser would need a bundler,
and the pages are plain `<script>` tags. Keep Identity calls server-side.

Rules that matter:

- `verifyRequestOrigin(req)` guards every auth mutation (CSRF). Don't drop it.
- `user_id` comes from the verified JWT, **never** from a request body. A pro
  can only ever read or write their own row.
- `/api/pros` selects an explicit column list. Don't `select()` there — it would
  leak emails and unpublished drafts.
- Signups need email confirmation unless autoconfirm is on in **Project
  configuration > Identity**. `for-pros.html` handles the
  `#confirmation_token=` callback.

## Database

Netlify Postgres via Drizzle. `drizzle-orm`/`drizzle-kit` must stay on the
`@beta` dist-tag — the `netlify-db` adapter only exists there.

After changing `db/schema.ts`:

```
npx drizzle-kit generate --name <verb_snake_case>
```

Migrations land in `netlify/database/migrations/` and are applied by the
platform. Never run `drizzle-kit migrate`/`push`, and never issue DDL through
`netlify db connect`.

**The database branch only exists once a deploy has been published.** Before
that, every DB-backed route answers `503` locally. That is expected, not a bug —
the routes are wrapped in `databaseError()` so it surfaces as a readable message
instead of a stack trace.

## Editing `public/style.css` — read this first

The whole file is one long line. Do not "reformat while you're in there" — a
wholesale reindent turns every future diff into a single unreadable changed line.

To change a rule, match its selector plus enough of its body to be unique and
replace just that span; keep the compact style (no spaces after `:` or `;`,
shorthand hex, `.5` not `0.5`). **New rules belong in `app.css`**, which loads
afterwards and can override by source order.

## Conventions

- **Design tokens** live in `:root` at the start of `style.css`: `--ink`
  `--muted` `--cream` `--paper` `--blue` `--orange` `--line`. Use the variable.
- **Type** is fluid `clamp()` with negative `letter-spacing`; `<em>` inside a
  heading renders as a Georgia serif in `--blue`.
- **Icons** are an inline `<symbol>` sprite per page, referenced with
  `<use href="#i-name">`. No emoji in UI text.
- **Breakpoints**: `800px` in `style.css`; `app.css` adds `980px` for the
  two-column directory and portal layouts.
- **Scroll reveals**: add class `reveal`; `common.js` adds `in-view`.
- **User content is only ever set via `textContent`** (see `TC.element`), never
  `innerHTML`. Profile text is attacker-controlled.
- **Interaction states**: skeletons while loading, a composed empty state, and a
  distinct error state. Don't collapse the last two — a failed request must not
  read as "nothing here yet".
- **Accessibility** is load-bearing: skip links, visible `:focus-visible` rings,
  `aria-invalid` + `aria-describedby` on field errors, decorative nodes
  `aria-hidden`, and a `prefers-reduced-motion` block that every new animation
  must opt into.

## Previewing

```
netlify dev --port 8889
```

Use the CLI, not a bare static server — the functions and Identity endpoint need
emulating. Remember that DB routes 503 until the first deploy.

## Deploying

Pushing to the default branch deploys. Netlify installs dependencies, bundles
functions, applies pending migrations, then publishes.

Netlify Identity is enabled for this site via the platform feature flag. If it
ever needs re-enabling, run `node scripts/enable.cjs` from the `netlify-identity`
skill directory — with the repo root as the working directory.
