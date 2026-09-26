# Ashutosh Mishra: terminal portfolio

A portfolio that behaves like a Linux terminal. Visitors `ls`, `cd`, `cat`, `grep` and `tree`
their way through your projects, skills and achievements. It boots like a real machine, has
tab completion and command history, a dark/light toggle (it follows the visitor's system setting on the
first visit), and a **plain view** for people who would rather just read a regular page. It also serves your résumé PDF.

It is 100% static HTML, CSS and JavaScript. No build step, no dependencies, no server.

## Try these commands

```
home             about            projects         skills           achievements
certifications   contact          resume           experience
ls -la           cd projects      cat roadsos.md   tree             grep kotlin
open github      theme green      neofetch         plain            help
```

Everything underlined is clickable, and the bar at the bottom works on phones.
There are a few hidden extras too (`ls -a`, `sudo hire ashutosh`, ...).

## Files

```
index.html          the page
404.html            "no such file or directory" page for wrong URLs
favicon.svg         browser tab icon
Ashutosh_Mishra_Resume.pdf   your résumé; `resume` and `open resume` serve it
robots.txt          tells search engines they may crawl the whole site
sitemap.xml         the one page on this site, for Google/Bing to index
<hex>.txt           IndexNow ownership key (see the SEO section below)
.nojekyll           optional; tells GitHub Pages to serve the files exactly as they are
css/style.css       layout, type and the three themes
js/data.js          YOUR CONTENT: the only file you normally edit
js/shell.js         the virtual Linux shell (commands, filesystem, tab completion)
js/terminal.js      the browser side (boot sequence, keyboard, themes, plain view)
tests/shell.test.js automated tests for the shell (node tests/shell.test.js)
```

## SEO: what's set up, and how to do the rest yourself

These files and tags are already in place so search engines and AI answer engines can find and understand
the site. Everything below is free and needs no server or root access — just files in this repo and a
few web dashboards.

**Already done, no action needed:**
- `robots.txt` and `sitemap.xml` at the root, so crawlers know the site is public and what page exists.
- A `<script type="application/ld+json">` block in `index.html`'s `<head>` — structured data that tells
  Google/Bing/AI crawlers your name, role and links (GitHub, LinkedIn) as machine-readable facts, not just prose.
- `<link rel="canonical">` and `og:url` pointing at `https://ashu-mishra06.github.io/`.
- An expanded `<noscript>` block: real project names, links and skills for any crawler or visitor that
  doesn't run JavaScript (most modern crawlers do, but this removes the risk entirely).
- A key file (`844e1aeae5f093234950757ed40e6111.txt`, containing just that string) proving you own this
  domain, for IndexNow — see step 4 below.

**⚠️ If you change your GitHub Pages URL or add a custom domain,** update the URL in four places: `robots.txt`,
`sitemap.xml`, and the `canonical`/`og:url` tags in `index.html`. Search for `ashu-mishra06.github.io` and replace it.

**⚠️ If you edit `js/data.js`** (add a project, change your role, etc.), the JSON-LD block and the
`<noscript>` block in `index.html` won't update automatically — there's no build step. Edit them by hand
to match, so search engines see the same facts as everyone else.

### Do the rest manually (about 20 minutes total)

**1. Google Search Console** — get indexed by Google, see search performance.
   1. Go to [search.google.com/search-console](https://search.google.com/search-console) and sign in with any Google account.
   2. Add property → choose **URL prefix** → enter `https://ashu-mishra06.github.io/`.
   3. Verify ownership with the **HTML tag** method: Google gives you a `<meta name="google-site-verification" ...>` tag.
      Paste it into `index.html`'s `<head>` (anywhere above `</head>`), commit and push, then click Verify.
   4. Once verified, go to **Indexing → Sitemaps** in the left sidebar, enter `sitemap.xml`, click Submit.
   5. Come back after a few days to see indexing status and any errors under **Pages**.

**2. Bing Webmaster Tools** — same idea, and this is what feeds ChatGPT Search and Copilot answers.
   1. Go to [bing.com/webmasters](https://www.bing.com/webmasters) and sign in with a Microsoft account.
   2. Choose **Import from Google Search Console** — it pulls in your verified site in two clicks, no separate
      verification file needed.
   3. Under **Sitemaps**, submit `https://ashu-mishra06.github.io/sitemap.xml`.

**3. IndexNow** — optional, but it's one command and pushes instant updates to Bing/Yandex without waiting for a crawl.
   The key file is already in this repo. After any future update to the live site, run:
   ```bash
   curl "https://api.indexnow.org/indexnow?url=https://ashu-mishra06.github.io/&key=844e1aeae5f093234950757ed40e6111"
   ```
   A `200` response means it was accepted. Google doesn't participate in IndexNow, so keep using Search Console for Google.

**4. Cross-link your profiles** (biggest impact, zero technical work):
   - **GitHub** → Settings → Profile → add the portfolio URL to the "Website" field. Also add it to your
     profile README (the repo named exactly `ashu-mishra06`, if you have one).
   - **LinkedIn** → Edit intro → Contact info → Website → add the portfolio URL. Also add it under the
     **Featured** section on your profile (Featured gets seen far more than Contact Info).
   - Make sure the portfolio links back to both (it already does, via `contact`, `open github`/`open linkedin`,
     and the plain view).

**5. Check your work:**
   - `https://search.google.com/test/rich-results` — paste your URL to confirm the JSON-LD is read correctly.
   - `https://ashu-mishra06.github.io/robots.txt` and `/sitemap.xml` — should load directly in a browser.
   - View source (`Ctrl+U`) on the live site and confirm the `<noscript>` block reads correctly — that's what
     a JS-less crawler sees.

## Design notes

- **Restraint over decoration.** Three greys and one muted accent (sage-teal). The accent appears only on the
  `$`, the caret and the active tab; everything else is weight and grey value. There are no icons, cards or chips.
- **Type.** IBM Plex Mono for the terminal and IBM Plex Sans (light) for the one large moment, your name.
  Both load from Google Fonts; without a connection the site falls back to the system monospace and sans fonts.
- **One column.** The header, the output and the footer all share the same ~78-character column, so lines stay readable.
- **Themes.** `graphite` (dark) and `chalk` (light) are in the toggle; `phosphor` (green) is a hidden extra: `theme green`.
  To change colours, edit the variables at the top of `css/style.css`.
- **Boot.** About a second, then it clears itself and leaves the front page. It is skipped on repeat visits, on any key press,
  and for visitors who prefer reduced motion.

## Edit your content

Open `js/data.js`. Everything the site shows comes from there:

- `links`: GitHub, LinkedIn, email and `resume`. To update your résumé, replace `Ashutosh_Mishra_Resume.pdf` with the new file (same name), or change the name in `resume:`.
- `about`, `skills`, `experience`, `achievements`, `certifications`.
- `education` is deliberately low-key: it appears only in `cat education.txt` and at the very bottom of the plain view, never in the headline areas.
- `projects`: copy one block to add a project. `id` becomes the file name (`cat projects/<id>.md`).
  `live` is your demo URL (`open <id>`), `repo` is the source (`open <id> repo`), `status` shows labels like "In development".
  Fields left as `""` are hidden automatically, so an unfinished project like ChatGraph shows no dead links.

The `<noscript>` block in `index.html` and the `<meta>` tags in its `<head>` repeat your name and
links for visitors without JavaScript and for link previews. Update them if your email or name changes.

## Run it on your computer

Either double-click `index.html`, or serve the folder (nicer, matches production):

```bash
cd ashu-mishra06.github.io
python3 -m http.server 8000
# open http://localhost:8000
```

Run the tests any time (needs only Node.js):

```bash
node tests/shell.test.js
```

## Deploy to GitHub Pages (free)

**Use a repository named exactly `ashu-mishra06.github.io`.** GitHub then serves it at
`https://ashu-mishra06.github.io`. This is a *different* repository from your profile-README repo
(`ashu-mishra06`), so leave that one alone.

1. On GitHub: **New repository** → name it `ashu-mishra06.github.io` → **Public** → Create.
2. Upload these files to the repository root (keep the folder structure; `index.html` must be at the top level).
   Either drag and drop them on the repository page, or from this folder run:

   ```bash
   git init -b main
   git add .
   git commit -m "Add terminal portfolio"
   git remote add origin https://github.com/ashu-mishra06/ashu-mishra06.github.io.git
   git push -u origin main
   ```

   (`.nojekyll` is a hidden, empty file that is included in the zip. It is optional: if you skip it when uploading by drag and drop, nothing breaks.)
3. Repository **Settings → Pages → Build and deployment**: Source = **Deploy from a branch**,
   Branch = **main**, folder = **/ (root)** → **Save**.
4. Wait a minute, then open `https://ashu-mishra06.github.io`. Every future `git push` redeploys automatically.

### Using a different repository name

The site also works at `https://ashu-mishra06.github.io/<repo-name>/`. In that case change the two
absolute paths in `404.html` (`href="/"` and the favicon `href="/favicon.svg"`) to `/<repo-name>/`.
Everything else uses relative paths and needs no change.

### Custom domain (optional)

Create a file called `CNAME` in the repository root containing only your domain (for example `ashutosh.dev`),
then add the DNS records GitHub lists under **Settings → Pages**.

## After it is live

- Add the URL to your GitHub profile (Profile → Edit → Website), to the top of your profile README, and to LinkedIn (Contact info → Website).
- Add the URL to the description of the `ashu-mishra06.github.io` repository so it shows on GitHub.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| 404 right after enabling Pages | Wait 1 to 2 minutes; check Settings → Pages shows "Your site is live". |
| Page loads but is unstyled or blank | File names are case-sensitive on GitHub. Keep `css/style.css`, `js/data.js`, `js/shell.js`, `js/terminal.js` exactly as named and in their folders. |
| Old version still showing | Hard refresh (Ctrl+Shift+R). GitHub Pages can take a minute to update. |
| Email link does nothing | Some browsers have no mail app set up. The address is also printed as text by `contact`. |
| Fonts look different | IBM Plex loads from Google Fonts. Offline, or if the request is blocked, system fonts are used instead. Nothing breaks. |

## Add a command

Commands live in `js/shell.js`. Each one is a `def("name", { group, usage, desc }, function (args, res) { ... })`
block. Push HTML strings to `res.html` (use `esc()` for anything untrusted) and UI actions to `res.actions`.
Add a test to `tests/shell.test.js` and run it.
