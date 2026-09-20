# Ashutosh Mishra: terminal portfolio

A portfolio that behaves like a Linux terminal. Visitors `ls`, `cd`, `cat`, `grep` and `tree`
their way through your projects, skills and achievements. It boots like a real machine, has
tab completion, command history, four colour themes, and a **plain view** for people who
would rather just read a normal page.

It is 100% static HTML, CSS and JavaScript. No build step, no dependencies, no server.

## Try these commands

```
about            projects         skills           achievements     contact
ls -la           cd projects      cat roadsos.md   tree             grep kotlin
open github      theme phosphor   neofetch         plain            help
```

Everything underlined is clickable, and the bar at the bottom works on phones.
There are a few hidden extras too (`ls -a`, `sudo hire ashutosh`, ...).

## Files

```
index.html          the page
404.html            "no such file or directory" page for wrong URLs
favicon.svg         browser tab icon
.nojekyll           optional; tells GitHub Pages to serve the files exactly as they are
css/style.css       layout and the four themes
js/data.js          YOUR CONTENT: the only file you normally edit
js/shell.js         the virtual Linux shell (commands, filesystem, tab completion)
js/terminal.js      the browser side (boot sequence, keyboard, themes, plain view)
tests/shell.test.js automated tests for the shell (node tests/shell.test.js)
```

## Edit your content

Open `js/data.js`. Everything the site shows comes from there:

- `links`: GitHub, LinkedIn, email, and an optional `resume` link (put `resume.pdf` in the folder and set `resume: "resume.pdf"`).
- `about`, `skills`, `education`, `experience`, `achievements`.
- `projects`: copy one block to add a project. `id` becomes the file name (`cat projects/<id>.md`).
  Fill in `live` with a demo URL and it is used by `open <id>`; fields left as `""` are hidden automatically.

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
| Code font looks different | The JetBrains Mono font loads from Google Fonts. Offline, a system monospace font is used instead. |

## Add a command

Commands live in `js/shell.js`. Each one is a `def("name", { group, usage, desc }, function (args, res) { ... })`
block. Push HTML strings to `res.html` (use `esc()` for anything untrusted) and UI actions to `res.actions`.
Add a test to `tests/shell.test.js` and run it.
