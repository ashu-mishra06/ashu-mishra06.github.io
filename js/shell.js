/*!
 * shell.js — a small virtual Linux shell for the portfolio.
 * Pure logic: no DOM access, so it can be tested in Node (see tests/shell.test.js).
 * The browser UI lives in terminal.js.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PortfolioShell = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var THEMES = ["graphite", "chalk", "phosphor"];
  var THEME_ALIAS = { dark: "graphite", light: "chalk", green: "phosphor" };
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  /* ---------- tiny HTML helpers (everything user-facing goes through esc) ---------- */
  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function safeUrl(u) {
    return /^(https?:\/\/|mailto:|\.\/|[\w.-]+\.(pdf|html)$)/i.test(u) ? u : "#";
  }
  function c(cls, text) { return '<span class="' + cls + '">' + esc(text) + "</span>"; }
  function a(url, text) {
    return '<a href="' + esc(safeUrl(url)) + '" target="_blank" rel="noopener noreferrer">' +
      esc(text === undefined ? url : text) + "</a>";
  }
  function cmdLink(cmd, text, cls) {
    return '<span class="cmd ' + (cls || "") + '" role="button" tabindex="0" data-cmd="' +
      esc(cmd) + '">' + esc(text) + "</span>";
  }
  function ind(html) { return '<span class="ind">' + html + "</span>"; }
  function pad(s, n) { s = String(s); while (s.length < n) s += " "; return s; }
  function nbsp(n) { return new Array(n + 1).join("\u00a0"); }

  /* Turn plain text into safe HTML with clickable URLs and e-mail addresses. */
  function linkify(raw) {
    var re = /(https?:\/\/[^\s<>"']*[^\s<>"'.,;:!?)])|([\w.+-]+@[\w-]+(?:\.[\w-]+)+)/g;
    var out = "", last = 0, m;
    while ((m = re.exec(raw))) {
      out += esc(raw.slice(last, m.index));
      out += m[1] ? a(m[1]) : a("mailto:" + m[2], m[2]);
      last = m.index + m[0].length;
    }
    return out + esc(raw.slice(last));
  }

  function levenshtein(x, y) {
    var prev = [], i, j;
    for (j = 0; j <= y.length; j++) prev[j] = j;
    for (i = 1; i <= x.length; i++) {
      var cur = [i];
      for (j = 1; j <= y.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
      }
      prev = cur;
    }
    return prev[y.length];
  }

  /* Split a line into commands on ';' and tokens on whitespace, honouring quotes. */
  function parseLine(s) {
    var cmds = [], argv = [], cur = "", q = null, has = false, i, ch;
    function endTok() { if (cur || has) argv.push(cur); cur = ""; has = false; }
    function endCmd() { endTok(); if (argv.length) cmds.push(argv); argv = []; }
    for (i = 0; i < s.length; i++) {
      ch = s[i];
      if (q) { if (ch === q) q = null; else cur += ch; }
      else if (ch === '"' || ch === "'") { q = ch; has = true; }
      else if (ch === ";") endCmd();
      else if (/\s/.test(ch)) endTok();
      else cur += ch;
    }
    if (q) return { error: "unmatched " + q, cmds: [] };
    endCmd();
    return { cmds: cmds };
  }

  /* ================================================================== */
  function createShell(D, env) {
    env = env || {};
    var now = env.now || function () { return Date.now(); };
    var startedAt = now();
    var USER = "guest";
    var HOST = D.handle || "portfolio";
    var HOME = ["home", USER];
    var cwd = HOME.slice();
    var history = [];
    var fs = buildFS(D);
    var COMMANDS = {};

    /* ---------- virtual filesystem ---------- */
    function file(text) { return { type: "file", text: text }; }
    function dir(children) { return { type: "dir", children: children }; }
    function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }

    function eduLines() {
      return (D.education || []).filter(function (e) { return e.degree; }).map(function (e) {
        return e.degree + (e.institution ? ", " + e.institution : "") + (e.period ? " (" + e.period + ")" : "");
      });
    }
    function skillGroups() { return D.skills || []; }

    function buildFS(D) {
      var L = D.links || {};
      var home = {};

      home["about.md"] = file(["# " + D.name, D.role + " — " + D.tagline, ""].concat(D.about || []).join("\n"));

      var contact = ["email     " + L.email, "github    " + L.github, "linkedin  " + L.linkedin];
      if (L.resume) contact.push("resume    " + L.resume);
      home["contact.txt"] = file(contact.join("\n"));

      home["resume.txt"] = file(
        (L.resume ? "Résumé (PDF): " + L.resume + "\n" : "") +
        "Full work and education history: " + L.linkedin
      );

      var edu = eduLines();
      if (edu.length) home["education.txt"] = file(edu.join("\n"));

      var sk = {};
      (D.skills || []).forEach(function (g) { sk[g.id + ".txt"] = file(g.items.join("\n")); });
      home["skills"] = dir(sk);

      var pr = {};
      (D.projects || []).forEach(function (p) {
        var t = ["# " + p.name, p.summary, "", "## What it does", p.description];
        if (p.highlights && p.highlights.length) {
          t.push("", "## Highlights");
          p.highlights.forEach(function (h) { t.push("- " + h); });
        }
        t.push("", "## Stack", p.stack.join(", "));
        if (p.role) t.push("", "## My part", p.role);
        if (p.status) t.push("", "## Status", p.status);
        if (p.live || p.repo) {
          t.push("", "## Links");
          if (p.live) t.push("live: " + p.live);
          if (p.repo) t.push("repo: " + p.repo);
        }
        pr[p.id + ".md"] = file(t.join("\n"));
      });
      home["projects"] = dir(pr);

      var ac = {};
      (D.achievements || []).forEach(function (x) {
        ac[x.id + ".md"] = file(["# " + x.title, x.detail].join("\n"));
      });
      home["achievements"] = dir(ac);

      var ce = {};
      (D.certifications || []).forEach(function (x) {
        var t = ["# " + x.title];
        if (x.issuer) t.push(x.issuer);
        if (x.issued) t.push("Issued " + x.issued + (x.expires ? ", expires " + x.expires : ""));
        ce[x.id + ".md"] = file(t.join("\n"));
      });
      home["certifications"] = dir(ce);

      var ex = {};
      (D.experience || []).forEach(function (x) {
        var t = ["# " + x.role + ", " + x.org];
        var when = [x.period, x.location].filter(Boolean).join(", ");
        if (when) t.push(when);
        t.push("", x.summary);
        if (x.points && x.points.length) {
          t.push("", "## What I did");
          x.points.forEach(function (pt) { t.push("- " + pt); });
        }
        if (x.link) t.push("", x.link);
        ex[x.id + ".md"] = file(t.join("\n"));
      });
      home["experience"] = dir(ex);

      home[".secrets"] = file(
        "you found the hidden file.\n" +
        "Still learning. Still building. Still improving.\n" +
        "Want to build something together? Try: sudo hire ashutosh"
      );

      return dir({ home: dir({ guest: dir(home) }) });
    }

    /* ---------- paths ---------- */
    function absSegs(path, base) {
      var segs;
      path = String(path);
      if (path === "~" || path.indexOf("~/") === 0) { segs = HOME.slice(); path = path.slice(1); }
      else if (path.charAt(0) === "/") segs = [];
      else segs = (base || cwd).slice();
      path.split("/").forEach(function (p) {
        if (!p || p === ".") return;
        if (p === "..") segs.pop(); else segs.push(p);
      });
      return segs;
    }
    function nodeAt(segs) {
      var n = fs;
      for (var i = 0; i < segs.length; i++) {
        if (n.type !== "dir" || !has(n.children, segs[i])) return null;
        n = n.children[segs[i]];
      }
      return n;
    }
    function tilde(segs) {
      var inHome = segs.length >= HOME.length && HOME.every(function (h, i) { return segs[i] === h; });
      if (inHome) return segs.length === HOME.length ? "~" : "~/" + segs.slice(HOME.length).join("/");
      return "/" + segs.join("/");
    }
    function listNames(n, showHidden) {
      return Object.keys(n.children)
        .filter(function (k) { return showHidden || k.charAt(0) !== "."; })
        .sort(function (x, y) {
          var dx = n.children[x].type === "dir", dy = n.children[y].type === "dir";
          if (dx !== dy) return dx ? -1 : 1;
          return x.toLowerCase() < y.toLowerCase() ? -1 : 1;
        });
    }
    function entryHTML(name, n, segs) {
      var hidden = name.charAt(0) === ".";
      var p = tilde(segs);
      if (n.type === "dir") return cmdLink("cd " + p + "; ls", name + "/", "d" + (hidden ? " dim" : ""));
      return cmdLink("cat " + p, name, "f" + (hidden ? " dim" : ""));
    }
    function err(msg) { return c("err", msg); }

    /* ---------- prompt ---------- */
    function promptHTML() {
      return c("p-user", USER + "@" + HOST) + c("p-sep", ":") + c("p-path", tilde(cwd)) + c("p-dollar", "$");
    }

    /* ---------- registry ---------- */
    function def(names, meta, fn) {
      names = [].concat(names);
      meta.name = names[0];
      meta.run = fn;
      names.forEach(function (n) { COMMANDS[n] = meta; });
    }
    function visibleCommands() {
      return Object.keys(COMMANDS).filter(function (k) { return !COMMANDS[k].hidden && COMMANDS[k].name === k; });
    }
    function allNames() { return Object.keys(COMMANDS); }

    function formatText(name, text) {
      var md = /\.md$/.test(name);
      return text.split("\n").map(function (line) {
        if (md && line.indexOf("# ") === 0) return c("t-h1", line.slice(2));
        if (md && line.indexOf("## ") === 0) return c("t-h2", line.slice(3));
        if (md && /^- /.test(line)) return '<span class="li">' + c("dim", "-") + " " + linkify(line.slice(2)) + "</span>";
        return linkify(line);
      });
    }
    function uptimeStr() {
      var s = Math.max(0, Math.floor((now() - startedAt) / 1000));
      if (s < 60) return s + " sec";
      var m = Math.floor(s / 60);
      return m < 60 ? m + " min" : Math.floor(m / 60) + " h " + (m % 60) + " min";
    }

    /* ================= commands ================= */

    def("help", { group: "system", usage: "help", desc: "show this list" }, function (args, res) {
      var groups = [["portfolio"], ["explore"], ["links"], ["system"]];
      res.html.push(c("dim", "Tab completes, arrow keys recall history, underlined text is clickable. man <command> explains one."), "");
      groups.forEach(function (g) {
        res.html.push(c("hd", g[0]));
        visibleCommands().filter(function (k) { return COMMANDS[k].group === g[0]; }).forEach(function (k) {
          var m = COMMANDS[k];
          res.html.push("  " + cmdLink(m.example || k, m.usage) + pad("", Math.max(2, 24 - m.usage.length)) + c("dim", m.desc));
        });
        res.html.push("");
      });
    });

    def("man", { group: "system", usage: "man <command>", desc: "read a command's manual", example: "man ls" }, function (args, res) {
      if (!args[0]) { res.html.push(err("What manual page do you want? Example: man ls")); return; }
      var m = COMMANDS[args[0]];
      if (!m || m.hidden && !m.desc) { res.html.push(err("No manual entry for " + args[0])); return; }
      res.html.push(c("t-h2", m.name.toUpperCase()), "  " + m.desc, "", c("t-h2", "USAGE"), "  " + m.usage);
      if (m.example) res.html.push("", c("t-h2", "EXAMPLE"), "  " + cmdLink(m.example, m.example));
    });

    /* --- portfolio shortcuts --- */
    def("about", { group: "portfolio", usage: "about", desc: "who I am", example: "cat ~/about.md" }, function (args, res, ctx) {
      run("cat ~/about.md", res, ctx);
    });

    def("projects", { group: "portfolio", usage: "projects", desc: "things I've built" }, function (args, res) {
      res.html.push(c("dim", (D.projects || []).length + " projects in ~/projects"), "");
      (D.projects || []).forEach(function (p, i) {
        if (i) res.html.push("");
        res.html.push(cmdLink("cat ~/projects/" + p.id + ".md", p.name, "pname"));
        res.html.push(ind(esc(p.summary)));
        if (p.status) res.html.push(ind(c("st", p.status)));
        res.html.push(ind(c("dim", "stack: " + p.stack.join(", "))));
        var acts = [cmdLink("cat ~/projects/" + p.id + ".md", "read more")];
        if (p.live) acts.push(cmdLink("open " + p.id, "live site"));
        if (p.repo) acts.push(cmdLink("open " + p.id + " repo", "source"));
        res.html.push(ind(acts.join(c("dim", "   "))));
      });
    });

    def("skills", { group: "portfolio", usage: "skills", desc: "languages, frameworks, tools" }, function (args, res) {
      var g = skillGroups();
      var w = Math.max.apply(null, g.map(function (x) { return x.id.length; })) + 2;
      g.forEach(function (x) {
        res.html.push(c("k", pad(x.id, w)) + x.items.map(esc).join(", "));
      });
    });

    def("achievements", { group: "portfolio", usage: "achievements", desc: "hackathons and badges" }, function (args, res) {
      (D.achievements || []).forEach(function (x, i) {
        if (i) res.html.push("");
        res.html.push(cmdLink("cat ~/achievements/" + x.id + ".md", x.title, "pname"));
        res.html.push(ind(c("dim", x.detail)));
      });
    });

    def("experience", { group: "portfolio", usage: "experience", desc: "internships and work" }, function (args, res) {
      (D.experience || []).forEach(function (x) {
        res.html.push(cmdLink("cat ~/experience/" + x.id + ".md", x.role + ", " + x.org, "b"));
        var when = [x.period, x.location].filter(Boolean).join(", ");
        if (when) res.html.push(ind(c("dim", when)));
        res.html.push(ind(esc(x.summary)));
      });
    });

    def(["certifications", "certs"], { group: "portfolio", usage: "certifications", desc: "courses and certificates" }, function (args, res) {
      (D.certifications || []).forEach(function (x) {
        var meta = [x.issuer, x.issued ? "issued " + x.issued : ""].filter(Boolean).join(", ");
        res.html.push(cmdLink("cat ~/certifications/" + x.id + ".md", x.title, "pname") + (meta ? c("dim", "  " + meta) : ""));
      });
    });

    def("education", { group: "system", usage: "education", desc: "degree", hidden: true }, function (args, res) {
      eduLines().forEach(function (l) { res.html.push(esc(l)); });
    });

    def("contact", { group: "portfolio", usage: "contact", desc: "email, GitHub, LinkedIn" }, function (args, res) {
      var L = D.links;
      res.html.push(c("k", "email     ") + a("mailto:" + L.email, L.email));
      res.html.push(c("k", "github    ") + a(L.github));
      res.html.push(c("k", "linkedin  ") + a(L.linkedin));
      if (L.resume) res.html.push(c("k", "resume    ") + a(L.resume));
    });

    def("resume", { group: "portfolio", usage: "resume", desc: "résumé / full history" }, function (args, res) {
      var L = D.links;
      if (L.resume) { res.html.push("Résumé: " + a(L.resume)); res.actions.push({ type: "open", url: L.resume }); }
      else res.html.push("No PDF résumé hosted here. Full history is on LinkedIn: " + a(L.linkedin));
    });

    /* --- explore --- */
    def("ls", { group: "explore", usage: "ls [-a] [-l] [path]", desc: "list files (-a hidden, -l long)", example: "ls -la ~" }, function (args, res) {
      var flags = {}, paths = [];
      for (var i = 0; i < args.length; i++) {
        if (args[i].charAt(0) === "-" && args[i].length > 1) {
          for (var k = 1; k < args[i].length; k++) {
            var f = args[i].charAt(k);
            if ("al1h".indexOf(f) < 0) { res.html.push(err("ls: invalid option -- '" + f + "'")); return; }
            flags[f] = true;
          }
        } else paths.push(args[i]);
      }
      if (!paths.length) paths.push(".");
      paths.forEach(function (p, idx) {
        var segs = absSegs(p), n = nodeAt(segs);
        if (!n) { res.html.push(err("ls: cannot access '" + p + "': No such file or directory")); return; }
        if (paths.length > 1) { if (idx) res.html.push(""); res.html.push(c("dim", p + ":")); }
        var d = new Date(now());
        var stamp = MONTHS[d.getMonth()] + " " + pad(String(d.getDate()), 2);
        function longRow(name, node, es) {
          var isDir = node.type === "dir";
          var size = isDir ? 4096 : node.text.length;
          return c("dim", (isDir ? "drwxr-xr-x" : "-r--r--r--") + " 1 " + USER + " " + USER + " " +
            pad("", 5 - String(size).length) + size + " " + stamp + " ") + entryHTML(name, node, es);
        }
        if (n.type === "file") {
          var nm = segs[segs.length - 1];
          res.html.push(flags.l ? longRow(nm, n, segs) : entryHTML(nm, n, segs));
          return;
        }
        var names = listNames(n, flags.a);
        if (flags.a) names = [".", ".."].concat(names);
        var rows = names.map(function (name) {
          if (name === "." || name === "..") {
            var pseg = name === "." ? segs : segs.slice(0, -1);
            var pn = nodeAt(pseg) || n;
            return flags.l ? longRow(name, pn, pseg) : cmdLink("cd " + tilde(pseg) + "; ls", name + "/", "d dim");
          }
          var es = segs.concat(name);
          return flags.l ? longRow(name, n.children[name], es) : entryHTML(name, n.children[name], es);
        });
        if (flags.l) { res.html.push(c("dim", "total " + names.length)); rows.forEach(function (r) { res.html.push(r); }); }
        else if (flags["1"]) rows.forEach(function (r) { res.html.push(r); });
        else res.html.push(rows.join("  ") || "");
      });
    });

    def("cd", { group: "explore", usage: "cd <dir>", desc: "change directory (cd .. goes up)", example: "cd ~/projects; ls" }, function (args, res) {
      var target = args[0] === undefined ? "~" : args[0];
      var segs = absSegs(target), n = nodeAt(segs);
      if (!n) res.html.push(err("cd: no such file or directory: " + target));
      else if (n.type !== "dir") res.html.push(err("cd: not a directory: " + target));
      else cwd = segs;
    });

    def("pwd", { group: "explore", usage: "pwd", desc: "print working directory" }, function (args, res) {
      res.html.push(esc("/" + cwd.join("/")));
    });

    def(["cat", "less", "more", "head", "tail", "bat"], { group: "explore", usage: "cat <file>", desc: "read a file", example: "cat ~/about.md" }, function (args, res) {
      if (!args.length) { res.html.push(err("cat: missing file operand. Try: cat about.md")); return; }
      args.forEach(function (p) {
        var segs = absSegs(p), n = nodeAt(segs);
        if (!n) res.html.push(err("cat: " + p + ": No such file or directory"));
        else if (n.type === "dir") res.html.push(err("cat: " + p + ": Is a directory"));
        else formatText(segs[segs.length - 1], n.text).forEach(function (l) { res.html.push(l); });
      });
    });

    def("tree", { group: "explore", usage: "tree [-a] [path]", desc: "show the folder tree", example: "tree" }, function (args, res) {
      var showHidden = args.indexOf("-a") >= 0;
      var p = args.filter(function (x) { return x.charAt(0) !== "-"; })[0] || ".";
      var segs = absSegs(p), n = nodeAt(segs);
      if (!n) { res.html.push(err("tree: " + p + ": No such file or directory")); return; }
      var counts = { d: 0, f: 0 };
      res.html.push(c("pname", p === "." ? "." : p));
      (function walk(node, prefix, s) {
        if (node.type !== "dir") return;
        var names = listNames(node, showHidden);
        names.forEach(function (name, i) {
          var last = i === names.length - 1, child = node.children[name], cs = s.concat(name);
          res.html.push(c("dim", prefix + (last ? "`-- " : "|-- ")) + entryHTML(name, child, cs));
          if (child.type === "dir") { counts.d++; walk(child, prefix + (last ? "    " : "|   "), cs); }
          else counts.f++;
        });
      })(n, "", segs);
      res.html.push("", c("dim", counts.d + " directories, " + counts.f + " files"));
    });

    def("grep", { group: "explore", usage: "grep <text> [path]", desc: "search every file (case-insensitive)", example: "grep kotlin" }, function (args, res) {
      var rest = args.filter(function (x) { return x.charAt(0) !== "-"; });
      if (!rest.length) { res.html.push(err("usage: grep <text> [path]   (try: grep kotlin)")); return; }
      var needle = rest[0].toLowerCase(), start = rest[1] || ".";
      var segs = absSegs(start), n = nodeAt(segs);
      if (!n) { res.html.push(err("grep: " + start + ": No such file or directory")); return; }
      var hits = 0, cap = 40;
      function scan(node, s) {
        if (hits >= cap) return;
        if (node.type === "file") {
          node.text.split("\n").forEach(function (line) {
            if (hits >= cap) return;
            var lower = line.toLowerCase(), idx = lower.indexOf(needle);
            if (idx < 0) return;
            var html = "", last = 0;
            while (idx >= 0) {
              html += esc(line.slice(last, idx)) + c("hl", line.slice(idx, idx + needle.length));
              last = idx + needle.length;
              idx = lower.indexOf(needle, last);
            }
            html += esc(line.slice(last));
            res.html.push(cmdLink("cat " + tilde(s), tilde(s), "k") + c("dim", ":") + html);
            hits++;
          });
        } else {
          listNames(node, false).forEach(function (k) { scan(node.children[k], s.concat(k)); });
        }
      }
      scan(n, segs);
      if (!hits) res.html.push(c("dim", "no matches for '" + rest[0] + "'"));
    });

    /* --- links --- */
    def("open", { group: "links", usage: "open <name>", desc: "open a project, github, linkedin or email", example: "open" }, function (args, res) {
      var t = (args[0] || "").toLowerCase(), L = D.links, url = null, label = t;
      if (!t) {
        res.html.push(c("dim", "usage: open <name>   (opens in a new tab)"));
        (D.projects || []).map(function (p) { return p.id; }).concat(["github", "linkedin", "email"]).forEach(function (n) {
          res.html.push("  " + cmdLink("open " + n, "open " + n));
        });
        return;
      }
      if (t === "github") url = L.github;
      else if (t === "linkedin") url = L.linkedin;
      else if (t === "email" || t === "mail") url = "mailto:" + L.email;
      else if (t === "resume" && L.resume) url = L.resume;
      else {
        var p = (D.projects || []).filter(function (x) { return x.id === t || x.name.toLowerCase() === t; })[0];
        if (p) {
          var wantRepo = /^(repo|source|code|github)$/i.test(args[1] || "");
          url = wantRepo ? (p.repo || p.live) : (p.live || p.repo);
          label = p.name;
          if (!url) { res.html.push(c("dim", p.name + " has no public link yet. ") + cmdLink("cat ~/projects/" + p.id + ".md", "read about it here")); return; }
        }
      }
      if (!url) { res.html.push(err("open: unknown target '" + args[0] + "'. Try: " + (D.projects || []).map(function (p) { return p.id; }).join(", ") + ", github, linkedin, email")); return; }
      res.html.push(c("dim", "opening " + label + " → ") + a(url));
      res.actions.push({ type: "open", url: url });
    });

    /* --- system --- */
    def("neofetch", { group: "system", usage: "neofetch", desc: "system facts" }, function (args, res, ctx) {
      var L = D.links;
      var rows = [
        ["os", "Ashu Linux x86_64"],
        ["host", "GitHub Pages"],
        ["shell", "zsh (simulated)"],
        ["uptime", uptimeStr()],
        ["role", D.role],
        D.now ? ["now", D.now] : null,
        D.award ? ["award", D.award] : null,
        ["focus", (D.focus || []).join(", ")],
        ["languages", (skillGroups()[0] ? skillGroups()[0].items : []).join(", ")],
        ["projects", (D.projects || []).length + " in ~/projects"],
        ["contact", L.email],
        ["theme", (ctx && ctx.theme) || "graphite"]
      ].filter(Boolean);
      res.html.push(c("b", USER + "@" + HOST), c("dim", "-------------"));
      rows.forEach(function (r) { res.html.push(c("k", pad(r[0], 11)) + esc(r[1])); });
    });

    def("home", { group: "portfolio", usage: "home", desc: "the front page" }, function (args, res) {
      var L = D.links;
      res.html.push("");
      res.html.push('<span class="hero-name">' + esc(D.name) + "</span>");
      res.html.push('<span class="hero-role">' + esc(D.role) + "</span>");
      res.html.push("");
      if (D.tagline) res.html.push(esc(D.tagline), "");
      if (D.now) res.html.push(c("k", pad("now", 8)) + esc(D.now));
      if (D.award) res.html.push(c("k", pad("award", 8)) + esc(D.award));
      res.html.push(c("k", pad("email", 8)) + a("mailto:" + L.email, L.email));
      res.html.push("");
      var links = ["about", "projects", "skills", "achievements", "contact"];
      if (L.resume) links.push("resume");
      res.html.push(links.map(function (n) { return cmdLink(n, n); }).join("   "));
      res.html.push("");
      res.html.push(c("dim", "Type ") + cmdLink("help", "help") + c("dim", " for every command, or ") + cmdLink("plain", "plain") + c("dim", " for a regular page."));
    });

    def("whoami", { group: "system", usage: "whoami", desc: "who are you? who am I?" }, function (args, res) {
      res.html.push(USER);
      res.html.push(c("dim", "you're browsing as a guest. The person who built this is " + D.name + ": ") + cmdLink("cat ~/about.md", "cat ~/about.md"));
    });

    def("hostname", { group: "system", usage: "hostname", desc: "print host name", hidden: true }, function (args, res) { res.html.push(esc(HOST)); });
    def("uname", { group: "system", usage: "uname [-a]", desc: "kernel information" }, function (args, res) {
      res.html.push(args.indexOf("-a") >= 0 ? "Linux " + esc(HOST) + " 6.9.0-curious #1 SMP PREEMPT x86_64 GNU/Linux" : "Linux");
    });
    def("date", { group: "system", usage: "date", desc: "current date and time" }, function (args, res) {
      var d = new Date(now());
      function z(n) { return n < 10 ? "0" + n : "" + n; }
      res.html.push(DAYS[d.getDay()] + " " + MONTHS[d.getMonth()] + " " + z(d.getDate()) + " " +
        z(d.getHours()) + ":" + z(d.getMinutes()) + ":" + z(d.getSeconds()) + " " + d.getFullYear());
    });
    def("uptime", { group: "system", usage: "uptime", desc: "how long you've been here" }, function (args, res) {
      res.html.push("up " + esc(uptimeStr()) + ",  1 user (you),  load average: 0.42, 0.13, 0.07");
    });
    def("history", { group: "system", usage: "history", desc: "commands you've run" }, function (args, res) {
      history.forEach(function (h, i) { res.html.push(c("dim", pad(String(i + 1), 4)) + " " + esc(h)); });
    });
    def("echo", { group: "system", usage: "echo <text>", desc: "print text" }, function (args, res) {
      var map = { USER: USER, HOME: "/" + HOME.join("/"), SHELL: "/bin/zsh", PWD: "/" + cwd.join("/"), HOSTNAME: HOST };
      res.html.push(esc(args.join(" ").replace(/\$(\w+)/g, function (m, k) { return has(map, k) ? map[k] : ""; })));
    });
    def("theme", { group: "system", usage: "theme [name]", desc: "graphite (dark), chalk (light), phosphor", example: "theme" }, function (args, res, ctx) {
      if (!args[0]) {
        THEMES.forEach(function (t) {
          res.html.push((ctx && ctx.theme === t ? c("st", "> ") : "  ") + cmdLink("theme " + t, t));
        });
        res.html.push("", c("dim", "'dark', 'light' and 'green' work too"));
        return;
      }
      var name = THEME_ALIAS[args[0]] || args[0];
      if (THEMES.indexOf(name) < 0) { res.html.push(err("theme: unknown theme '" + args[0] + "'. Choose: " + THEMES.join(", "))); return; }
      res.actions.push({ type: "theme", name: name });
      res.html.push(c("dim", "theme: " + name));
    });
    def(["plain", "gui"], { group: "system", usage: "plain", desc: "switch to a normal, non-terminal page" }, function (args, res) {
      res.html.push(c("dim", "opening plain view (Esc returns to the terminal)"));
      res.actions.push({ type: "plain" });
    });
    def("clear", { group: "system", usage: "clear", desc: "clear the screen (Ctrl+L)" }, function (args, res) { res.actions.push({ type: "clear" }); });
    def(["reboot", "exit", "logout"], { group: "system", usage: "reboot", desc: "replay the boot sequence" }, function (args, res) {
      res.html.push(c("dim", "logout"));
      res.actions.push({ type: "reboot" });
    });
    def("./stats.sh", { group: "system", usage: "./stats.sh", desc: "quick numbers", hidden: true }, function (args, res) {
      var total = skillGroups().reduce(function (n, g) { return n + g.items.length; }, 0);
      res.html.push(c("k", "projects      ") + (D.projects || []).length);
      res.html.push(c("k", "skills        ") + total);
      res.html.push(c("k", "achievements  ") + (D.achievements || []).length);
      res.html.push(c("k", "loop          ") + esc(D.loop));
    });

    /* --- jokes that double as extra contact routes --- */
    def("sudo", { group: "system", usage: "sudo <command>", desc: "try it", hidden: true }, function (args, res) {
      if (!args.length) { res.html.push("usage: sudo <command>"); return; }
      res.html.push("[sudo] password for " + USER + ": " + c("dim", "********"));
      if (/hire|job|intern/i.test(args.join(" "))) {
        res.html.push(c("ok", "Password accepted. Good call."));
        run("contact", res, {});
      } else {
        res.html.push(err(USER + " is not in the sudoers file. This incident will be reported."));
        res.html.push(c("dim", "(hint: try 'sudo hire " + HOST + "')"));
      }
    });
    def("rm", { group: "system", usage: "rm", desc: "nope", hidden: true }, function (args, res) {
      var joined = args.join(" ");
      if (/-\w*r/.test(joined) && /(^|\s)\/\*?(\s|$)/.test(joined)) {
        res.html.push(err("rm: it is dangerous to operate recursively on '/'"));
        res.html.push(err("rm: use --no-preserve-root to override this safety measure"));
        res.html.push(c("dim", "(it's a read-only portfolio, but thanks for the confidence)"));
      } else res.html.push(err("rm: cannot remove '" + (args.filter(function (x) { return x[0] !== "-"; })[0] || "?") + "': Read-only file system"));
    });
    ["mkdir", "touch", "mv", "cp", "chmod", "chown", "ln"].forEach(function (n) {
      def(n, { group: "system", usage: n, desc: "read-only", hidden: true }, function (args, res) {
        res.html.push(err(n + ": Read-only file system (this is a portfolio, not a server)"));
      });
    });
    ["vim", "vi", "nano", "emacs"].forEach(function (n) {
      def(n, { group: "system", usage: n, desc: "editor", hidden: true }, function (args, res) {
        res.html.push(err(n + ": the filesystem is read-only, so there's nothing to save. To read a file use: cat <file>"));
      });
    });

    /* ================= execution ================= */
    function run(line, res, ctx) {
      var parsed = parseLine(line);
      if (parsed.error) { res.html.push(err("zsh: " + parsed.error + " quote")); return; }
      parsed.cmds.forEach(function (argv) {
        var name = argv[0], args = argv.slice(1);
        var m = has(COMMANDS, name) ? COMMANDS[name] : null;
        if (m) { m.run(args, res, ctx || {}); return; }
        var n = nodeAt(absSegs(name));
        if (n && n.type === "file") {
          res.html.push(err("zsh: permission denied: " + name));
          res.html.push(c("dim", "did you mean: ") + cmdLink("cat " + name, "cat " + name));
          return;
        }
        var best = null, bd = 3;
        allNames().forEach(function (k) {
          if (COMMANDS[k].hidden) return;
          var dst = levenshtein(name.toLowerCase(), k);
          if (dst < bd) { bd = dst; best = k; }
        });
        res.html.push(err("zsh: command not found: " + name));
        res.html.push(best
          ? c("dim", "did you mean: ") + cmdLink(best, best) + c("dim", "  (or type ") + cmdLink("help", "help") + c("dim", ")")
          : c("dim", "type ") + cmdLink("help", "help") + c("dim", " to see what's available"));
      });
    }

    function exec(line, ctx, opts) {
      var res = { html: [], actions: [] };
      if (!String(line).trim()) return res;
      if (!opts || opts.record !== false) {
        if (history[history.length - 1] !== line) history.push(line);
      }
      run(line, res, ctx || {});
      return res;
    }

    /* ================= tab completion ================= */
    function commonPrefix(list) {
      var p = list[0] || "";
      list.forEach(function (s) { while (s.indexOf(p) !== 0) p = p.slice(0, -1); });
      return p;
    }
    function complete(line) {
      var m = /^([\s\S]*?)(\S*)$/.exec(line), head = m[1], tok = m[2];
      var pc = parseLine(head).cmds, afterSemi = /;\s*$/.test(head);
      var parts = afterSemi ? [] : (pc[pc.length - 1] || []);
      var cands, pathMode = false;
      if (!parts.length) cands = visibleCommands().concat(["./stats.sh"]);
      else {
        var cmd = parts[0];
        if (cmd === "theme") cands = THEMES.concat(Object.keys(THEME_ALIAS));
        else if (cmd === "man" || cmd === "help") cands = visibleCommands();
        else if (cmd === "open") {
          cands = (D.projects || []).map(function (p) { return p.id; }).concat(["github", "linkedin", "email"]);
        } else pathMode = true;
      }
      if (pathMode) {
        var slash = tok.lastIndexOf("/");
        var dirPart = slash >= 0 ? tok.slice(0, slash + 1) : "";
        var namePart = slash >= 0 ? tok.slice(slash + 1) : tok;
        var dn = nodeAt(absSegs(dirPart || "."));
        if (!dn || dn.type !== "dir") return { line: line, options: [] };
        cands = listNames(dn, namePart.charAt(0) === ".").map(function (k) {
          return dirPart + k + (dn.children[k].type === "dir" ? "/" : "");
        });
      }
      var matches = cands.filter(function (x) { return x.indexOf(tok) === 0; });
      if (!pathMode) matches.sort();
      if (!matches.length) return { line: line, options: [] };
      if (matches.length === 1) {
        var only = matches[0];
        return { line: head + only + (/\/$/.test(only) ? "" : " "), options: [] };
      }
      var cp = commonPrefix(matches);
      return { line: head + (cp.length > tok.length ? cp : tok), options: matches };
    }

    return {
      exec: exec,
      complete: complete,
      promptHTML: promptHTML,
      cwdLabel: function () { return tilde(cwd); },
      history: function () { return history.slice(); },
      commands: visibleCommands
    };
  }

  return { createShell: createShell, THEMES: THEMES, esc: esc, safeUrl: safeUrl, linkify: linkify, c: c, a: a, cmdLink: cmdLink };
});
