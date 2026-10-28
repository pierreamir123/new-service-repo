# Volunteer website

Static Arabic (RTL) site on Firebase Hosting. Live at https://malaknewservice.web.app (project `malaknewservice`). Public page `public/index.html` (vision, scripture journal, five personas, join form). Admin page `public/admin.html` (Google sign-in, charts, table, CSV). Registrations are stored in Firestore collection `volunteers`.

## Before the first deploy (owner)

1. Firebase console: pick or create a project, note its **project ID**.
2. Build > Firestore Database > Create database (production mode).
3. Build > Authentication > Sign-in method > enable **Google**.
4. Project settings > Your apps > add a **Web app**; copy its config into `public/js/firebase.js` (`firebaseConfig`). These values are public by design; access is enforced by `firestore.rules`.
5. In `firestore.rules`, replace `admin@example.com` in `isAdmin()` with the real admin Google address(es).
6. In `.firebaserc`, replace `demo-church-volunteers` with the real project ID.
7. In a terminal: `npx firebase-tools login`

## Deploy

```bash
cd website
npx firebase-tools deploy --only hosting,firestore
```

Then open `https://<project-id>.web.app`, submit one test registration, sign in at `/admin.html` with the admin account, confirm it appears, and delete the test row.

## Firebase MCP (optional)

`.mcp.json` registers the official Firebase MCP server (`firebase-tools mcp`) for Claude Code sessions started in this folder. It uses the same login as the CLI (`npx firebase-tools login`) and the project in `.firebaserc`. Approve it when Claude Code asks, then restart the session.

## Local testing

- Static preview: `cd public && python -m http.server 5050`, open `http://127.0.0.1:5050/index.html`. On `localhost` the pages talk to the Firebase emulators with a demo project, so production data is never touched.
- Emulators: run `.\tools\start-emulators.ps1` in a normal PowerShell window. It uses a portable Java 17 in `tools/java` (git-ignored) and firebase-tools 13 (firebase-tools 15 requires Java 21, which failed on this machine). Run it from your own terminal: from the restricted Claude shell, Java cannot open its internal sockets.
- Rules tests (need the Firestore emulator running (port 8085)): `npm run test:rules`.

## Files

| Path | Purpose |
|---|---|
| `public/js/verses.js` | Scripture text (Arabic Smith and Van Dyck, fetched 2026-10-28). Exact phrases, do not retype |
| `public/js/personas.js` | The five personas (Arabic copy from the church vault) and form options |
| `public/js/join.js` | Form, validation, Firestore write |
| `public/js/admin.js` | Admin auth, charts, table, CSV |
| `public/css/theme.css` | Base theme: 8am Showcase layout and components, handwritten Bible journal |
| `public/css/coptic.css` | Dark red and gold palette plus the Coptic Orthodox visuals (loaded after theme.css and overrides its colours) |
| `public/css/scenes.css`, `public/js/scenes.js` | Scroll chapters (snap, progress bar, chapter rail), reveal-on-scroll, hero parallax, stacking persona cards, live ticket, extra Coptic assets. All motion is off for prefers-reduced-motion |
| `public/css/story.css`, `public/js/children.js` | Vision, Goal and "children" chapters. The children chapter shows the method as concepts only (owner rule, 2026-10-28): no plan details such as group names, schedules, ranks or XP. Keep it that way |
| `public/css/goal.css` | The "هنوصل لإيه؟" (Goal) chapter: radiating mission banner, four goals on a gold path, arch cards, medal values |
| `public/css/mobile.css`, `public/js/mobile.js` | Phone layer: menu sheet, back-to-top, swipeable persona carousel with dots, compact pillars and ranks, wider form, touch behaviour, safe-area padding |
| `public/img/personas/` | Cropped web images from the generated character sheets |
| `tools/crop-assets.mjs` | Re-creates the images from the vault's `Service Domains/` sheets |
| `firestore.rules` | Public may create a valid registration, never read; only the admin reads and changes status |

## Privacy

Volunteer names and phone numbers are private. No analytics or third-party form services. Do not copy real registrations into the Obsidian vault.
