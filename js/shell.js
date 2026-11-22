/*!
 * shell.js — a small virtual Linux shell for the portfolio.
 * Pure logic: no DOM access, so it can be tested in Node (see tests/shell.test.js).
 * The browser UI lives in terminal.js; animated programs (cmatrix, btop, sl, ...) in programs.js.
 *
 * A command pushes HTML lines to res.html and UI requests to res.actions. Action types:
 *   clear, theme, open (url), plain, reboot, logout, shutdown, exit,
 *   launch (app, path), program (name, args, input)
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PortfolioShell = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var THEMES = ["dark", "light", "mint-y-teal"];
  var THEME_ALIAS = { graphite: "dark", chalk: "light", phosphor: "mint-y-teal", green: "mint-y-teal",
    "mint": "mint-y-teal", "teal": "mint-y-teal", "mint-y-dark": "mint-y-teal",
    "mint-y-light": "light", "mint-y": "mint-y-teal" };
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var APPS = ["terminal", "files", "projects", "about", "resume", "contact", "guide", "viewer"];

  /* ---------- tiny HTML helpers (everything user-facing goes through esc) ---------- */
  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function unesc(s) {
    return String(s).replace(/<[^>]+>/g, "").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&nbsp;/g, " ").replace(/\u00a0/g, " ").replace(/&amp;/g, "&");
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
  function lpad(s, n) { s = String(s); while (s.length < n) s = " " + s; return s; }
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

  /* Split a line into commands on ';', pipelines on '|' and tokens on whitespace, honouring quotes.
     Returns { cmds: [ pipeline, ... ] } where a pipeline is [ argv, argv, ... ]. */
  function parseLine(s) {
    var cmds = [], pipe = [], argv = [], cur = "", q = null, has = false, i, ch;
    function endTok() { if (cur || has) argv.push(cur); cur = ""; has = false; }
    function endStage() { endTok(); if (argv.length) pipe.push(argv); argv = []; }
    function endCmd() { endStage(); if (pipe.length) cmds.push(pipe); pipe = []; }
    for (i = 0; i < s.length; i++) {
      ch = s[i];
      if (q) { if (ch === q) q = null; else cur += ch; }
      else if (ch === '"' || ch === "'") { q = ch; has = true; }
      else if (ch === ";" || ch === "\n") endCmd();
      else if (ch === "&" && s[i + 1] === "&") { endCmd(); i++; }
      else if (ch === "|") { endStage(); if (s[i + 1] === "|") i++; }
      else if (/\s/.test(ch)) endTok();
      else cur += ch;
    }
    if (q) return { error: "unmatched " + q, cmds: [] };
    endCmd();
    return { cmds: cmds };
  }

  /* ---------- fun data ---------- */
  var FORTUNES = [
    "There are only two hard things in computer science: cache invalidation, naming things, and off-by-one errors.",
    "It works on my machine. Ship the machine.",
    "A good programmer looks both ways before crossing a one-way street.",
    "99 little bugs in the code, 99 little bugs. Take one down, patch it around, 127 little bugs in the code.",
    "Weeks of coding can save you hours of planning.",
    "The best code is no code at all. The second best is code someone else maintains.",
    "Real programmers count from 0.",
    "sudo make me a sandwich.",
    "There is no place like 127.0.0.1.",
    "Unix is user-friendly. It is just picky about who its friends are.",
    "Linux: because rebooting is for adding hardware.",
    "In theory, theory and practice are the same. In practice, they are not.",
    "Documentation is a love letter you write to your future self.",
    "Debugging: being the detective in a crime movie where you are also the murderer.",
    "Any code of your own that you haven't looked at for six months might as well have been written by someone else.",
    "If at first you don't succeed, call it version 1.0.",
    "Talk is cheap. Show me the code. (Linus Torvalds)",
    "First, solve the problem. Then, write the code. (John Johnson)",
    "Simplicity is prerequisite for reliability. (Edsger W. Dijkstra)",
    "Programs must be written for people to read, and only incidentally for machines to execute.",
    "The computer was born to solve problems that did not exist before.",
    "Premature optimization is the root of all evil. (Donald Knuth)",
    "Today's fortune: your pull request will be merged without a single comment.",
    "Rebooting the universe... please wait.",
    "You will meet a tall, dark segfault.",
    "Coffee: the other dependency.",
    "Code never lies, comments sometimes do.",
    "A byte walks into a bar looking miserable. Bartender: 'What's wrong?' Byte: 'Parity error.'",
    "Have you tried turning it off and on again?",
    "The cloud is just someone else's computer.",
    "Keep calm and git commit.",
    "Ashutosh's loop: Code → Debug → Improve → Repeat."
  ];

  /* 5-row block font for figlet / banner (A–Z, 0–9 and a little punctuation). */
  var FONT = {
    A: [".###.", "#...#", "#####", "#...#", "#...#"], B: ["####.", "#...#", "####.", "#...#", "####."],
    C: [".####", "#....", "#....", "#....", ".####"], D: ["####.", "#...#", "#...#", "#...#", "####."],
    E: ["#####", "#....", "###..", "#....", "#####"], F: ["#####", "#....", "###..", "#....", "#...."],
    G: [".####", "#....", "#..##", "#...#", ".####"], H: ["#...#", "#...#", "#####", "#...#", "#...#"],
    I: ["#####", "..#..", "..#..", "..#..", "#####"], J: ["#####", "...#.", "...#.", "#..#.", ".##.."],
    K: ["#...#", "#..#.", "###..", "#..#.", "#...#"], L: ["#....", "#....", "#....", "#....", "#####"],
    M: ["#...#", "##.##", "#.#.#", "#...#", "#...#"], N: ["#...#", "##..#", "#.#.#", "#..##", "#...#"],
    O: [".###.", "#...#", "#...#", "#...#", ".###."], P: ["####.", "#...#", "####.", "#....", "#...."],
    Q: [".###.", "#...#", "#.#.#", "#..#.", ".##.#"], R: ["####.", "#...#", "####.", "#..#.", "#...#"],
    S: [".####", "#....", ".###.", "....#", "####."], T: ["#####", "..#..", "..#..", "..#..", "..#.."],
    U: ["#...#", "#...#", "#...#", "#...#", ".###."], V: ["#...#", "#...#", "#...#", ".#.#.", "..#.."],
    W: ["#...#", "#...#", "#.#.#", "##.##", "#...#"], X: ["#...#", ".#.#.", "..#..", ".#.#.", "#...#"],
    Y: ["#...#", ".#.#.", "..#..", "..#..", "..#.."], Z: ["#####", "...#.", "..#..", ".#...", "#####"],
    "0": [".###.", "#..##", "#.#.#", "##..#", ".###."], "1": ["..#..", ".##..", "..#..", "..#..", ".###."],
    "2": [".###.", "#...#", "...#.", "..#..", "#####"], "3": ["####.", "....#", ".###.", "....#", "####."],
    "4": ["#...#", "#...#", "#####", "....#", "....#"], "5": ["#####", "#....", "####.", "....#", "####."],
    "6": [".###.", "#....", "####.", "#...#", ".###."], "7": ["#####", "....#", "...#.", "..#..", "..#.."],
    "8": [".###.", "#...#", ".###.", "#...#", ".###."], "9": [".###.", "#...#", ".####", "....#", ".###."],
    " ": ["...", "...", "...", "...", "..."], "!": ["#", "#", "#", ".", "#"], ".": [".", ".", ".", ".", "#"],
    ",": [".", ".", ".", "#", "#"], "'": ["#", "#", ".", ".", "."], ":": [".", "#", ".", "#", "."],
    "-": [".....", ".....", "#####", ".....", "....."], "_": [".....", ".....", ".....", ".....", "#####"],
    "?": [".###.", "#...#", "...#.", ".....", "..#.."], "+": ["..#..", "..#..", "#####", "..#..", "..#.."],
    "=": [".....", "#####", ".....", "#####", "....."], "/": ["....#", "...#.", "..#..", ".#...", "#...."],
    "#": [".#.#.", "#####", ".#.#.", "#####", ".#.#."], "@": [".###.", "#.###", "#.#.#", "#.###", ".###."],
    "(": ["..#", ".#.", "#..", ".#.", "..#"], ")": ["#..", ".#.", "..#", ".#.", "#.."],
    "<": ["..#", ".#.", "#..", ".#.", "..#"], ">": ["#..", ".#.", "..#", ".#.", "#.."],
    "*": [".....", "#.#.#", ".###.", "#.#.#", "....."], "$": [".###.", "#.#..", ".###.", "..#.#", ".###."]
  };
  function bigText(text, fill) {
    var rows = ["", "", "", "", ""];
    text = String(text).toUpperCase().slice(0, 24);
    for (var i = 0; i < text.length; i++) {
      var g = FONT[text[i]] || FONT["?"];
      for (var r = 0; r < 5; r++) rows[r] += g[r] + ".";
    }
    return rows.map(function (r) { return r.replace(/#/g, fill || "█").replace(/\./g, " ").replace(/\s+$/, ""); });
  }

  function wrapWords(text, width) {
    var words = String(text).split(/\s+/).filter(Boolean), lines = [], cur = "";
    words.forEach(function (w) {
      if ((cur + " " + w).trim().length > width && cur) { lines.push(cur); cur = w; }
      else cur = (cur + " " + w).trim();
    });
    if (cur || !lines.length) lines.push(cur);
    return lines;
  }
  var COWS = {
    default: ["        \\   ^__^", "         \\  (oo)\\_______", "            (__)\\       )\\/\\", "                ||----w |", "                ||     ||"],
    tux: ["   \\", "    \\", "        .--.", "       |o_o |", "       |:_/ |", "      //   \\ \\", "     (|     | )", "    /'\\_   _/`\\", "    \\___)=(___/"],
    dragon: ["      \\                    / \\  //\\", "       \\    |\\___/|      /   \\//  \\\\", "            /0  0  \\__  /    //  | \\ \\", "           /     /  \\/_/    //   |  \\  \\", "           @_^_@'/   \\/_   //    |   \\   \\", "           //_^_/     \\/_ //     |    \\    \\", "        ( //) |        \\///      |     \\     \\", "      ( / /) _|_ /   )  //       |      \\     _\\", "    ( // /) '/,_ _ _/  ( ; -.    |    _ _\\.-~        .-~~~^-.", "  (( / / )) ,-{        _      `-.|.-~-.           .~         `.", " (( // / ))  '/\\      /                 ~-. _ .-~      .-~^-.  \\", " (( /// ))      `.   {            }                   /      \\  \\", "  (( / ))     .----~-.\\        \\-'                 .~         \\  `. \\^-.", "             ///.----..>        \\             _ -~             `.  ^-`  ^-_", "               ///-._ _ _ _ _ _ _}^ - - - - ~                     ~-- ,.-~", "                                                                  /.-~"],
    mint: ["        \\  .-----------.", "         \\ |  L  M     |", "           |  █  ███   |", "           |  █  █ █   |", "           |  ███ █ █  |", "           '-----------'"]
  };
  function cowsay(text, think, cow) {
    var lines = wrapWords(text, 40);
    var w = Math.max.apply(null, lines.map(function (l) { return l.length; }));
    var out = [" " + new Array(w + 3).join("_")];
    var L = think ? "(" : "<", R = think ? ")" : ">";
    if (lines.length === 1) out.push(L + " " + pad(lines[0], w) + " " + R);
    else lines.forEach(function (l, i) {
      var l2 = i === 0 ? "/" : i === lines.length - 1 ? "\\" : "|";
      var r2 = i === 0 ? "\\" : i === lines.length - 1 ? "/" : "|";
      out.push(l2 + " " + pad(l, w) + " " + r2);
    });
    out.push(" " + new Array(w + 3).join("-"));
    var art = COWS[cow] || COWS.default;
    art.forEach(function (l) { out.push(think ? l.replace(/\\/g, "o") : l); });
    return out;
  }
  function lolcat(text, offset) {
    var html = "", i, k = offset || 0;
    for (i = 0; i < text.length; i++) {
      var ch = text[i];
      html += ch === " " ? " " : '<span class="lc lc-' + ((k + i) % 12) + '">' + esc(ch) + "</span>";
    }
    return html;
  }

  /* Safe arithmetic (bc / calc): numbers, + - * / % ^, parentheses. No eval. */
  function calc(expr) {
    var s = String(expr).replace(/\s+/g, ""), pos = 0;
    function peek() { return s[pos]; }
    function num() {
      if (peek() === "(") { pos++; var v = add(); if (peek() !== ")") throw new Error("missing )"); pos++; return v; }
      if (peek() === "-") { pos++; return -num(); }
      if (peek() === "+") { pos++; return num(); }
      var m = /^\d*\.?\d+(e[+-]?\d+)?/i.exec(s.slice(pos));
      if (!m) throw new Error("syntax error near '" + (s.slice(pos, pos + 6) || "end") + "'");
      pos += m[0].length;
      return parseFloat(m[0]);
    }
    function pow() { var v = num(); while (peek() === "^") { pos++; v = Math.pow(v, num()); } return v; }
    function mul() {
      var v = pow();
      while (peek() === "*" || peek() === "/" || peek() === "%") {
        var op = s[pos++], r = pow();
        if (op === "*") v *= r; else if (op === "/") { if (r === 0) throw new Error("divide by zero"); v /= r; } else v %= r;
      }
      return v;
    }
    function add() { var v = mul(); while (peek() === "+" || peek() === "-") { var op = s[pos++], r = mul(); v = op === "+" ? v + r : v - r; } return v; }
    if (!s) throw new Error("nothing to evaluate");
    var v = add();
    if (pos < s.length) throw new Error("syntax error near '" + s.slice(pos, pos + 6) + "'");
    return Math.round(v * 1e10) / 1e10;
  }

  function calendar(d) {
    var y = d.getFullYear(), m = d.getMonth();
    var first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate();
    var title = MONTHS[m] + " " + y;
    var lead = Math.floor((20 - title.length) / 2);
    var rows = [nbsp(lead) + title, "Su Mo Tu We Th Fr Sa"];
    var line = nbsp(first * 3), day;
    for (day = 1; day <= days; day++) {
      var cell = lpad(String(day), 2);
      line += (day === d.getDate() ? c("hl", cell) : cell) + " ";
      if ((first + day) % 7 === 0) { rows.push(line.replace(/\s+$/, "")); line = ""; }
    }
    if (line) rows.push(line.replace(/\s+$/, ""));
    return rows;
  }

  /* ================================================================== */
  function createShell(D, env) {
    env = env || {};
    var now = env.now || function () { return Date.now(); };
    var rand = env.random || Math.random;
    var startedAt = now();
    var USER = "guest";
    var HOST = D.handle || "portfolio";
    var HOME = ["home", USER];
    var cwd = HOME.slice();
    var history = [];
    var fs = buildFS(D);
    var COMMANDS = {};
    var lolOffset = 0;

    /* ---------- virtual filesystem ---------- */
    function file(text) { return { type: "file", text: text }; }
    function dir(children) { return { type: "dir", children: children }; }
    function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }

    function eduLines() {
      return (D.education || []).filter(function (e) { return e.degree; }).map(function (e) {
        return e.degree + (e.institution ? ", " + e.institution : "") + (e.period ? " (" + e.period + ")" : "") + (e.cgpa ? ", CGPA " + e.cgpa : "");
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

      var nt = {};
      (D.notes || []).forEach(function (n) {
        nt[n.id + ".md"] = file(["# " + n.title, "Date: " + n.date, "", n.body].join("\n"));
      });
      if (Object.keys(nt).length) home["notes"] = dir(nt);

      home[".secrets"] = file(
        "you found the hidden file.\n" +
        "Still learning. Still building. Still improving.\n" +
        "Want to build something together? Try: sudo hire ashutosh"
      );
      home[".bashrc"] = file(
        "# ~/.bashrc for guest\n" +
        "alias ll='ls -l'\nalias la='ls -a'\nalias matrix='cmatrix'\nalias please='sudo'\n" +
        "export EDITOR=vim\nexport PS1='\\u@\\h:\\w\\$ '\n" +
        "# fun things to type: cmatrix, btop, sl, cowsay, fortune | lolcat, nyancat, pipes, aafire, snake"
      );

      var etc = {
        "hostname": file(HOST),
        "os-release": file("NAME=\"Linux Mint\"\nVERSION=\"22 (Ashu edition)\"\nID=linuxmint\nID_LIKE=\"ubuntu debian\"\nPRETTY_NAME=\"Linux Mint 22 Ashu Edition\"\nHOME_URL=\"" + (L.portfolio || "") + "\""),
        "motd": file("Welcome to Linux Mint, Ashu edition.\nThis is a portfolio, not a server: everything is read-only and nothing here phones home.")
      };
      return dir({ home: dir({ guest: dir(home) }), etc: dir(etc), tmp: dir({}) });
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

    /* Public filesystem API for the Files window and viewer. */
    var FS_API = {
      node: function (path) {
        var segs = absSegs(path || "~"), n = nodeAt(segs);
        if (!n) return null;
        var out = { path: "/" + segs.join("/"), label: tilde(segs), name: segs[segs.length - 1] || "/", type: n.type, segs: segs };
        if (n.type === "dir") out.entries = listNames(n, false).map(function (k) {
          return { name: k, type: n.children[k].type, path: "/" + segs.concat(k).join("/") };
        });
        else out.text = n.text;
        return out;
      },
      home: "/" + HOME.join("/"),
      format: function (name, text) { return formatText(name, text); }
    };

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
    /* Text a command receives from the pipe (null when nothing was piped in). */
    function stdinOf(res) { return res.stdin === undefined ? null : res.stdin; }
    /* Lines from stdin, or from the given files, or from args as text. */
    function inputLines(args, res, opts) {
      opts = opts || {};
      var si = stdinOf(res);
      var files = args.filter(function (x) { return x.charAt(0) !== "-"; });
      if (files.length && !opts.argsAreText) {
        var lines = [];
        files.forEach(function (p) {
          var n = nodeAt(absSegs(p));
          if (!n) res.html.push(err(opts.name + ": " + p + ": No such file or directory"));
          else if (n.type === "dir") res.html.push(err(opts.name + ": " + p + ": Is a directory"));
          else lines = lines.concat(n.text.split("\n"));
        });
        return lines;
      }
      if (si !== null) return si.replace(/\n$/, "").split("\n");
      if (opts.argsAreText && files.length) return [files.join(" ")];
      return null;
    }
    function program(res, name, args, input) {
      res.actions.push({ type: "program", name: name, args: args || [], input: input === undefined ? null : input });
    }
    function launch(res, app, extra) {
      var act = { type: "launch", app: app };
      if (extra) for (var k in extra) if (has(extra, k)) act[k] = extra[k];
      res.actions.push(act);
    }

    /* ================= commands ================= */

    def("help", { group: "system", usage: "help [group]", desc: "show this list" }, function (args, res) {
      var groups = [["portfolio", "about me"], ["explore", "walk the filesystem"], ["desktop", "windows and apps"], ["fun", "things to type when bored"], ["system", "the usual suspects"]];
      var only = args[0];
      if (only && !groups.some(function (g) { return g[0] === only; })) { res.html.push(err("help: unknown group '" + only + "'. Groups: " + groups.map(function (g) { return g[0]; }).join(", "))); return; }
      if (!only) res.html.push(c("dim", "Tab completes, arrow keys recall history, underlined text is clickable. man <command> explains one."),
        c("dim", "Pipes work too: ") + cmdLink("fortune | cowsay | lolcat", "fortune | cowsay | lolcat"), "");
      groups.forEach(function (g) {
        if (only && g[0] !== only) return;
        res.html.push(c("hd", g[0]) + c("dim", "  " + g[1]));
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
      if (args[0] === "--gui" || args[0] === "-g") { launch(res, "about"); return; }
      run("cat ~/about.md", res, ctx);
      res.html.push("", c("dim", "Window version: ") + cmdLink("launch about", "launch about"));
    });

    def("projects", { group: "portfolio", usage: "projects", desc: "things I've built" }, function (args, res) {
      if (args[0] === "--gui" || args[0] === "-g") { launch(res, "projects"); return; }
      res.html.push(c("dim", (D.projects || []).length + " projects in ~/projects  (window version: ") + cmdLink("launch projects", "launch projects") + c("dim", ")"), "");
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

    def("achievements", { group: "portfolio", usage: "achievements", desc: "hackathons and awards" }, function (args, res) {
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

    def("stats", { group: "portfolio", usage: "stats", desc: "GitHub & portfolio numbers" }, function (args, res) {
      var gs = D.githubStats || {};
      var total = skillGroups().reduce(function (n, g) { return n + g.items.length; }, 0);
      var w = 20;
      function row(k, v) { return '<span class="stats-key">' + esc(pad(k, w)) + '</span><span class="stats-val">' + esc(String(v)) + '</span>'; }
      res.html.push(c("t-h1", "Stats"));
      res.html.push("");
      res.html.push(c("t-h2", "GitHub"));
      if (gs.repos)          res.html.push(row("Repositories",    gs.repos));
      if (gs.stars)          res.html.push(row("Stars",           gs.stars));
      if (gs.followers)      res.html.push(row("Followers",       gs.followers));
      if (gs.contributions2026) res.html.push(row("Contributions (2026)", gs.contributions2026));
      res.html.push("");
      res.html.push(c("t-h2", "Portfolio"));
      res.html.push(row("Projects",       (D.projects || []).length + " in ~/projects"));
      res.html.push(row("Skill items",    total + " across " + skillGroups().length + " groups"));
      res.html.push(row("Achievements",   (D.achievements || []).length));
      res.html.push(row("Certifications", (D.certifications || []).length));
      res.html.push(row("Experiences",    (D.experience || []).length));
      res.html.push("");
      res.html.push(c("dim", "GitHub: ") + a(D.links.github));
    });

    def(["roadmap", "timeline", "journey"], { group: "portfolio", usage: "roadmap", desc: "learning timeline and goals" }, function (args, res) {
      var items = D.roadmap || [];
      if (!items.length) { res.html.push(c("dim", "No roadmap defined yet.")); return; }
      res.html.push(c("t-h1", "Roadmap"));
      res.html.push("");
      items.forEach(function (entry) {
        var yearPart = '<span class="roadmap-year">' + esc(entry.year) + '</span>';
        var dot = '<span class="roadmap-dot">●</span>';
        var item = '<span class="roadmap-item">' + esc(entry.item) + '</span>';
        res.html.push('<span class="roadmap-line">' + yearPart + "  " + dot + "  " + item + "</span>");
      });
      res.html.push("");
      res.html.push(c("dim", "Still writing the next chapters. ") + cmdLink("contact", "Get in touch"));
    });

    def(["notes", "blog", "writing"], { group: "portfolio", usage: "notes", desc: "notes & blog posts" }, function (args, res) {
      var items = D.notes || [];
      if (!items.length) { res.html.push(c("dim", "No notes yet.")); return; }
      res.html.push(c("t-h1", "Notes"));
      res.html.push("");
      items.forEach(function (n, i) {
        if (i) res.html.push("");
        res.html.push(cmdLink("cat ~/notes/" + n.id + ".md", n.title, "pname"));
        res.html.push(ind(c("dim", n.date + "  ·  " + n.body.slice(0, 80) + (n.body.length > 80 ? "…" : ""))));
      });
      res.html.push("");
      res.html.push(c("dim", "Read a note: ") + cmdLink("cat ~/notes/" + items[0].id + ".md", "cat ~/notes/" + items[0].id + ".md"));
    });

    def(["hire", "hire-me", "opportunity"], { group: "portfolio", usage: "hire", desc: "open to work — reach out!" }, function (args, res) {
      var L = D.links;
      res.html.push(c("acc", "┌─────────────────────────────────────────────────────┐"));
      res.html.push(c("acc", "│") + c("b", "  Open to Work — Ashutosh Mishra               ") + c("acc", "│"));
      res.html.push(c("acc", "└─────────────────────────────────────────────────────┘"));
      res.html.push("");
      res.html.push("Seeking internship / part-time roles in:");
      res.html.push(ind(c("acc", "→ ") + "Full-stack development (React, Node.js, TypeScript)"));
      res.html.push(ind(c("acc", "→ ") + "Android development (Kotlin, Jetpack Compose)"));
      res.html.push(ind(c("acc", "→ ") + "Applied AI / ML (Python, FastAPI, scikit-learn)"));
      res.html.push("");
      res.html.push(c("k", pad("email",    10)) + a("mailto:" + L.email, L.email));
      res.html.push(c("k", pad("linkedin", 10)) + a(L.linkedin));
      res.html.push(c("k", pad("github",   10)) + a(L.github));
      if (L.resume) res.html.push(c("k", pad("resume",   10)) + a(L.resume));
      res.html.push("");
      res.html.push(c("dim", "Or try: ") + cmdLink("sudo hire ashutosh", "sudo hire ashutosh"));
      if (L.linkedin) res.actions.push({ type: "open", url: L.linkedin });
    });

    def("contact", { group: "portfolio", usage: "contact", desc: "email, GitHub, LinkedIn" }, function (args, res) {
      if (args[0] === "--gui" || args[0] === "-g") { launch(res, "contact"); return; }
      var L = D.links;
      res.html.push(c("k", "email     ") + a("mailto:" + L.email, L.email));
      res.html.push(c("k", "github    ") + a(L.github));
      res.html.push(c("k", "linkedin  ") + a(L.linkedin));
      if (L.resume) res.html.push(c("k", "resume    ") + a(L.resume));
    });

    def(["resume", "cv"], { group: "portfolio", usage: "resume", desc: "open my résumé (PDF)" }, function (args, res) {
      var L = D.links;
      if (L.resume) { res.html.push("Résumé: " + a(L.resume) + c("dim", "  (opening the Resume window)")); launch(res, "resume"); }
      else res.html.push("No PDF résumé hosted here. Full history is on LinkedIn: " + a(L.linkedin));
    });

    /* --- explore --- */
    def(["ls", "ll", "la", "dir"], { group: "explore", usage: "ls [-a] [-l] [path]", desc: "list files (-a hidden, -l long)", example: "ls -la ~" }, function (args, res, ctx, name) {
      var flags = {}, paths = [];
      if (name === "ll") flags.l = true;
      if (name === "la") flags.a = true;
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

    def(["cat", "less", "more", "bat"], { group: "explore", usage: "cat <file>", desc: "read a file", example: "cat ~/about.md" }, function (args, res) {
      var si = stdinOf(res);
      if (!args.length) {
        if (si !== null) { si.replace(/\n$/, "").split("\n").forEach(function (l) { res.html.push(linkify(l)); }); return; }
        res.html.push(err("cat: missing file operand. Try: cat about.md")); return;
      }
      args.forEach(function (p) {
        var segs = absSegs(p), n = nodeAt(segs);
        if (!n) res.html.push(err("cat: " + p + ": No such file or directory"));
        else if (n.type === "dir") res.html.push(err("cat: " + p + ": Is a directory"));
        else formatText(segs[segs.length - 1], n.text).forEach(function (l) { res.html.push(l); });
      });
    });

    def(["head", "tail"], { group: "explore", usage: "head [-n N] <file>", desc: "first (or last) lines of a file", hidden: true }, function (args, res, ctx, name) {
      var n = 10, rest = [];
      for (var i = 0; i < args.length; i++) {
        if (args[i] === "-n" && args[i + 1]) { n = parseInt(args[++i], 10) || 10; }
        else if (/^-\d+$/.test(args[i])) n = parseInt(args[i].slice(1), 10);
        else rest.push(args[i]);
      }
      var lines = inputLines(rest, res, { name: name });
      if (!lines) { res.html.push(err(name + ": missing file operand")); return; }
      (name === "head" ? lines.slice(0, n) : lines.slice(-n)).forEach(function (l) { res.html.push(linkify(l)); });
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

    def("grep", { group: "explore", usage: "grep <text> [path]", desc: "search every file (case-insensitive)", example: "grep python" }, function (args, res) {
      var rest = args.filter(function (x) { return x.charAt(0) !== "-"; });
      if (!rest.length) { res.html.push(err("usage: grep <text> [path]   (try: grep python)")); return; }
      var needle = rest[0].toLowerCase();
      function hilite(line) {
        var lower = line.toLowerCase(), idx = lower.indexOf(needle), html = "", last = 0;
        if (idx < 0) return null;
        while (idx >= 0) {
          html += esc(line.slice(last, idx)) + c("hl", line.slice(idx, idx + needle.length));
          last = idx + needle.length;
          idx = lower.indexOf(needle, last);
        }
        return html + esc(line.slice(last));
      }
      var si = stdinOf(res);
      if (si !== null && !rest[1]) {
        var any = false;
        si.replace(/\n$/, "").split("\n").forEach(function (l) { var h = hilite(l); if (h !== null) { res.html.push(h); any = true; } });
        if (!any) res.html.push(c("dim", "no matches for '" + rest[0] + "'"));
        return;
      }
      var start = rest[1] || ".";
      var segs = absSegs(start), n = nodeAt(segs);
      if (!n) { res.html.push(err("grep: " + start + ": No such file or directory")); return; }
      var hits = 0, cap = 40;
      function scan(node, s) {
        if (hits >= cap) return;
        if (node.type === "file") {
          node.text.split("\n").forEach(function (line) {
            if (hits >= cap) return;
            var h = hilite(line);
            if (h === null) return;
            res.html.push(cmdLink("cat " + tilde(s), tilde(s), "k") + c("dim", ":") + h);
            hits++;
          });
        } else {
          listNames(node, false).forEach(function (k) { scan(node.children[k], s.concat(k)); });
        }
      }
      scan(n, segs);
      if (!hits) res.html.push(c("dim", "no matches for '" + rest[0] + "'"));
    });

    def(["find", "locate"], { group: "explore", usage: "find <name>", desc: "find files by name", hidden: true }, function (args, res) {
      var needle = (args.filter(function (x) { return x.charAt(0) !== "-" && x !== "."; })[0] || "").toLowerCase().replace(/\*/g, "");
      var hits = 0;
      (function walk(node, s) {
        listNames(node, true).forEach(function (k) {
          var child = node.children[k], cs = s.concat(k);
          if (!needle || k.toLowerCase().indexOf(needle) >= 0) { res.html.push(child.type === "dir" ? cmdLink("cd " + tilde(cs) + "; ls", tilde(cs)) : cmdLink("cat " + tilde(cs), tilde(cs))); hits++; }
          if (child.type === "dir") walk(child, cs);
        });
      })(nodeAt(HOME), HOME);
      if (!hits) res.html.push(c("dim", "nothing matches '" + needle + "'"));
    });

    def(["wc"], { group: "system", usage: "wc [file]", desc: "count lines, words, chars", hidden: true }, function (args, res) {
      var lines = inputLines(args, res, { name: "wc" });
      if (!lines) { res.html.push(err("wc: missing file operand")); return; }
      var text = lines.join("\n");
      res.html.push(lpad(lines.length, 6) + lpad(text.split(/\s+/).filter(Boolean).length, 7) + lpad(text.length, 7));
    });
    def("sort", { group: "system", usage: "sort [file]", desc: "sort lines", hidden: true }, function (args, res) {
      var lines = inputLines(args, res, { name: "sort" });
      if (!lines) { res.html.push(err("sort: missing input")); return; }
      lines = lines.slice().sort();
      if (args.indexOf("-r") >= 0) lines.reverse();
      lines.forEach(function (l) { res.html.push(linkify(l)); });
    });
    def("uniq", { group: "system", usage: "uniq [file]", desc: "drop repeated lines", hidden: true }, function (args, res) {
      var lines = inputLines(args, res, { name: "uniq" });
      if (!lines) { res.html.push(err("uniq: missing input")); return; }
      lines.forEach(function (l, i) { if (i === 0 || l !== lines[i - 1]) res.html.push(linkify(l)); });
    });
    def("tac", { group: "system", usage: "tac [file]", desc: "cat, backwards", hidden: true }, function (args, res) {
      var lines = inputLines(args, res, { name: "tac" });
      if (!lines) { res.html.push(err("tac: missing input")); return; }
      lines.slice().reverse().forEach(function (l) { res.html.push(linkify(l)); });
    });
    def("rev", { group: "fun", usage: "rev <text>", desc: "reverse text", example: "echo hello | rev" }, function (args, res) {
      var lines = inputLines(args, res, { name: "rev", argsAreText: true });
      if (!lines) { res.html.push(err("rev: give me some text, or pipe something in")); return; }
      lines.forEach(function (l) { res.html.push(esc(l.split("").reverse().join(""))); });
    });
    def("base64", { group: "system", usage: "base64 [-d] <text>", desc: "encode or decode", hidden: true }, function (args, res) {
      var dec = args[0] === "-d" || args[0] === "--decode";
      var lines = inputLines(args.filter(function (x) { return x !== "-d" && x !== "--decode"; }), res, { name: "base64", argsAreText: true });
      if (!lines) { res.html.push(err("base64: nothing to encode")); return; }
      var s = lines.join("\n");
      try {
        var b = typeof btoa === "function" ? (dec ? atob(s) : btoa(unescape(encodeURIComponent(s)))) :
          (dec ? Buffer.from(s, "base64").toString("utf8") : Buffer.from(s, "utf8").toString("base64"));
        res.html.push(esc(b));
      } catch (e) { res.html.push(err("base64: invalid input")); }
    });

    /* --- links --- */
    def("open", { group: "explore", usage: "open <name>", desc: "open a project, github, linkedin or email", example: "open" }, function (args, res) {
      var t = (args[0] || "").toLowerCase(), L = D.links, url = null, label = t;
      if (!t) {
        res.html.push(c("dim", "usage: open <name>   (opens in a new tab)"));
        (D.projects || []).map(function (p) { return p.id; }).concat(["github", "linkedin", "email", "resume"]).forEach(function (n) {
          res.html.push("  " + cmdLink("open " + n, "open " + n));
        });
        return;
      }
      if (t === "github") url = L.github;
      else if (t === "linkedin") url = L.linkedin;
      else if (t === "email" || t === "mail") url = "mailto:" + L.email;
      else if (t === "resume" || t === "cv") { run("resume", res, {}); return; }
      else {
        var p = (D.projects || []).filter(function (x) { return x.id === t || x.name.toLowerCase() === t; })[0];
        if (p) {
          var wantRepo = /^(repo|source|code|github)$/i.test(args[1] || "");
          url = wantRepo ? (p.repo || p.live) : (p.live || p.repo);
          label = p.name;
          if (!url) { res.html.push(c("dim", p.name + " has no public link yet. ") + cmdLink("cat ~/projects/" + p.id + ".md", "read about it here")); return; }
        } else {
          var n = nodeAt(absSegs(args[0]));
          if (n) { launch(res, n.type === "dir" ? "files" : "viewer", { path: "/" + absSegs(args[0]).join("/") }); return; }
        }
      }
      if (!url) { res.html.push(err("open: unknown target '" + args[0] + "'. Try: " + (D.projects || []).map(function (p) { return p.id; }).join(", ") + ", github, linkedin, email")); return; }
      res.html.push(c("dim", "opening " + label + " → ") + a(url));
      res.actions.push({ type: "open", url: url });
    });

    /* --- desktop --- */
    def(["launch", "app", "start"], { group: "desktop", usage: "launch <app>", desc: "open a window: " + APPS.slice(0, 7).join(", "), example: "launch projects" }, function (args, res) {
      var t = (args[0] || "").toLowerCase();
      if (!t) { res.html.push(c("dim", "usage: launch <app>")); APPS.slice(0, 7).forEach(function (n) { res.html.push("  " + cmdLink("launch " + n, "launch " + n)); }); return; }
      if (APPS.indexOf(t) < 0) { res.html.push(err("launch: no app called '" + t + "'. Apps: " + APPS.slice(0, 7).join(", "))); return; }
      launch(res, t, args[1] ? { path: "/" + absSegs(args[1]).join("/") } : null);
      res.html.push(c("dim", "opening " + t + " window"));
    });
    def(["nemo", "files", "explorer", "thunar", "nautilus"], { group: "desktop", usage: "nemo [path]", desc: "open the Files window", example: "nemo ~/projects" }, function (args, res) {
      var p = args[0] || ".", segs = absSegs(p), n = nodeAt(segs);
      if (!n) { res.html.push(err("nemo: " + p + ": No such file or directory")); return; }
      launch(res, n.type === "dir" ? "files" : "viewer", { path: "/" + segs.join("/") });
      res.html.push(c("dim", "opening " + tilde(segs) + " in Files"));
    });
    def(["xed", "gedit", "xdg-open", "code", "subl"], { group: "desktop", usage: "xed <file>", desc: "open a file in the text viewer window", example: "xed ~/about.md" }, function (args, res, ctx, name) {
      if (!args[0]) { res.html.push(err(name + ": which file? Example: " + name + " ~/about.md")); return; }
      var segs = absSegs(args[0]), n = nodeAt(segs);
      if (!n) { res.html.push(err(name + ": " + args[0] + ": No such file or directory")); return; }
      launch(res, n.type === "dir" ? "files" : "viewer", { path: "/" + segs.join("/") });
    });
    def(["guide", "welcome", "tour"], { group: "desktop", usage: "guide", desc: "the little user guide popup" }, function (args, res) { launch(res, "guide"); });
    def(["gnome-terminal", "xterm", "terminal", "konsole"], { group: "desktop", usage: "terminal", desc: "open another terminal window" }, function (args, res) { launch(res, "terminal"); });
    def(["plain", "gui", "reader"], { group: "desktop", usage: "plain", desc: "a normal, scrollable page instead of the desktop" }, function (args, res) {
      res.html.push(c("dim", "opening plain view (Esc returns)"));
      res.actions.push({ type: "plain" });
    });
    def("theme", { group: "desktop", usage: "theme [dark|light]", desc: "Mint-Y dark or light", example: "theme" }, function (args, res, ctx) {
      if (!args[0]) {
        THEMES.forEach(function (t) {
          res.html.push((ctx && ctx.theme === t ? c("st", "> ") : "  ") + cmdLink("theme " + t, "Mint-Y " + t));
        });
        return;
      }
      var name = THEME_ALIAS[args[0]] || args[0];
      if (THEMES.indexOf(name) < 0) { res.html.push(err("theme: unknown theme '" + args[0] + "'. Choose: " + THEMES.join(", "))); return; }
      res.actions.push({ type: "theme", name: name });
      res.html.push(c("dim", "theme: Mint-Y " + name));
    });
    def("exit", { group: "desktop", usage: "exit", desc: "close this terminal window" }, function (args, res) { res.actions.push({ type: "exit" }); });
    def("logout", { group: "desktop", usage: "logout", desc: "back to the login screen" }, function (args, res) { res.html.push(c("dim", "logout")); res.actions.push({ type: "logout" }); });
    def("reboot", { group: "desktop", usage: "reboot", desc: "replay the boot sequence" }, function (args, res) { res.html.push(c("dim", "rebooting...")); res.actions.push({ type: "reboot" }); });
    def(["shutdown", "poweroff", "halt"], { group: "desktop", usage: "shutdown", desc: "power off (it comes back, promise)" }, function (args, res) {
      if (args.indexOf("-r") >= 0) { run("reboot", res, {}); return; }
      res.html.push(c("dim", "The system is going down for power off NOW!"));
      res.actions.push({ type: "shutdown" });
    });

    /* --- system --- */
    function neofetch(args, res, ctx) {
      var L = D.links;
      var gs = D.githubStats || {};
      var logo = [
        " ███████████████ ",
        " ██           ██ ",
        " ██ ██  █████ ██ ",
        " ██ ██  █ █ █ ██ ",
        " ██ ██  █ █ █ ██ ",
        " ██ ██████  █ ██ ",
        " ██           ██ ",
        " ███████████████ "
      ];
      var rows = [
        [USER + "@" + HOST, ""],
        ["-------------", ""],
        ["OS", "Linux Mint 22 Ashu Edition x86_64"],
        ["Host", "GitHub Pages"],
        ["Kernel", "6.9.0-curious"],
        ["Uptime", uptimeStr()],
        ["Shell", "ashsh 1.0 (simulated)"],
        ["DE", "Cinnamon (web)"],
        ["Theme", "Mint-Y " + ((ctx && ctx.theme) || "dark")],
        ["Role", D.role],
        D.now ? ["Now", D.now] : null,
        D.award ? ["Award", D.award] : null,
        ["Projects", (D.projects || []).length + " in ~/projects"],
        gs.repos ? ["GitHub", gs.repos + " repos · " + gs.stars + " ★ · " + gs.followers + " followers"] : null,
        (D.focus || []).length ? ["Focus", D.focus.join(" · ")] : null,
        ["Contact", L.email]
      ].filter(Boolean);
      var n = Math.max(logo.length, rows.length);
      for (var i = 0; i < n; i++) {
        var left = c("mint", pad(logo[i] || "", 17)), r = rows[i];
        var right = !r ? "" : r[1] === "" ? c("b", r[0]) : c("k", r[0] + ": ") + esc(r[1]);
        res.html.push(left + "  " + right);
      }
    }
    def(["neofetch", "screenfetch", "fastfetch"], { group: "system", usage: "neofetch", desc: "system facts with a logo" }, neofetch);

    def("home", { group: "portfolio", usage: "home", desc: "the front page" }, function (args, res, ctx) {
      var L = D.links;
      // The page gets exactly one real <h1> (the first render, at boot). Re-running
      // "home" later reprints the same text as a <p> so the document never ends up
      // with two <h1> elements in one session.
      var tag = ctx && ctx.asH1 ? "h1" : "p";
      res.html.push("");
      res.html.push("<" + tag + ' class="hero-name">' + esc(D.name) + "</" + tag + ">");
      res.html.push('<span class="hero-role">' + esc(D.role) + "</span>");
      res.html.push("");
      if (D.tagline) res.html.push(esc(D.tagline), "");
      if (D.openToWork) {
        res.html.push(c("acc", "● ") + c("b", "Open to Work") + c("dim", "  — seeking internships in full-stack, Android, or applied AI"));
        res.html.push('  ' + cmdLink("hire", "→ hire me") + c("dim", "   ") + cmdLink("contact", "contact"));
        res.html.push("");
      }
      if (D.now) res.html.push(c("k", pad("now", 8)) + esc(D.now));
      if (D.award) res.html.push(c("k", pad("award", 8)) + esc(D.award));
      res.html.push(c("k", pad("email", 8)) + a("mailto:" + L.email, L.email));
      res.html.push("");
      var links = ["about", "projects", "skills", "achievements", "experience", "roadmap", "notes", "contact"];
      if (L.resume) links.push("resume");
      res.html.push(links.map(function (n) { return cmdLink(n, n); }).join("   "));
      res.html.push("");
      res.html.push(c("dim", "Type ") + cmdLink("help", "help") + c("dim", " for every command, ") + cmdLink("neofetch", "neofetch") + c("dim", " for system info, or ") + cmdLink("guide", "guide") + c("dim", " for the tour."));
    });

    def("whoami", { group: "system", usage: "whoami", desc: "who are you? who am I?" }, function (args, res) {
      res.html.push(USER);
      res.html.push(c("dim", "you're browsing as a guest. The person who built this is " + D.name + ": ") + cmdLink("cat ~/about.md", "cat ~/about.md"));
    });
    def("id", { group: "system", usage: "id", desc: "uid and groups", hidden: true }, function (args, res) {
      res.html.push("uid=1000(" + USER + ") gid=1000(" + USER + ") groups=1000(" + USER + "),4(adm),27(sudo-but-not-really),999(visitors)");
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
    def("cal", { group: "system", usage: "cal", desc: "this month's calendar" }, function (args, res) {
      calendar(new Date(now())).forEach(function (l) { res.html.push(l); });
    });
    def("uptime", { group: "system", usage: "uptime", desc: "how long you've been here" }, function (args, res) {
      res.html.push("up " + esc(uptimeStr()) + ",  1 user (you),  load average: 0.42, 0.13, 0.07");
    });
    def("history", { group: "system", usage: "history", desc: "commands you've run" }, function (args, res) {
      history.forEach(function (h, i) { res.html.push(c("dim", pad(String(i + 1), 4)) + " " + esc(h)); });
    });
    function envMap() {
      return { USER: USER, HOME: "/" + HOME.join("/"), SHELL: "/bin/ashsh", PWD: "/" + cwd.join("/"), HOSTNAME: HOST, LANG: "en_IN.UTF-8", TERM: "xterm-256color", EDITOR: "vim", DESKTOP_SESSION: "cinnamon", XDG_CURRENT_DESKTOP: "X-Cinnamon", PATH: "/usr/local/bin:/usr/bin:/bin:/home/guest/.local/bin", RANDOM: String(Math.floor(rand() * 32768)) };
    }
    def("echo", { group: "system", usage: "echo <text>", desc: "print text" }, function (args, res) {
      var map = envMap();
      res.html.push(esc(args.join(" ").replace(/\$\{?(\w+)\}?/g, function (m, k) { return has(map, k) ? map[k] : ""; })));
    });
    def("printf", { group: "system", usage: "printf <text>", desc: "print text", hidden: true }, function (args, res) { run("echo " + args.join(" "), res, {}); });
    def(["env", "printenv"], { group: "system", usage: "env", desc: "environment variables", hidden: true }, function (args, res) {
      var map = envMap();
      Object.keys(map).forEach(function (k) { res.html.push(c("k", k + "=") + esc(map[k])); });
    });
    def("export", { group: "system", usage: "export", desc: "set a variable", hidden: true }, function (args, res) {
      res.html.push(c("dim", "exported " + (args[0] || "nothing") + " into the void (this shell forgets everything on logout)"));
    });
    def("alias", { group: "system", usage: "alias", desc: "list aliases", hidden: true }, function (args, res) {
      ["alias ll='ls -l'", "alias la='ls -a'", "alias matrix='cmatrix'", "alias please='sudo'", "alias hack='hollywood'"].forEach(function (l) { res.html.push(esc(l)); });
    });
    def(["which", "whereis", "type", "command"], { group: "system", usage: "which <command>", desc: "where a command lives", hidden: true }, function (args, res) {
      if (!args[0]) { res.html.push(err("which: missing argument")); return; }
      if (has(COMMANDS, args[0])) res.html.push("/usr/bin/" + esc(args[0]));
      else res.html.push(err("which: no " + args[0] + " in (/usr/local/bin:/usr/bin:/bin)"));
    });
    def("clear", { group: "system", usage: "clear", desc: "clear the screen (Ctrl+L)" }, function (args, res) { res.actions.push({ type: "clear" }); });
    def("./stats.sh", { group: "system", usage: "./stats.sh", desc: "quick numbers", hidden: true }, function (args, res) {
      var total = skillGroups().reduce(function (n, g) { return n + g.items.length; }, 0);
      res.html.push(c("k", "projects      ") + (D.projects || []).length);
      res.html.push(c("k", "skills        ") + total);
      res.html.push(c("k", "achievements  ") + (D.achievements || []).length);
      res.html.push(c("k", "commands      ") + allNames().length);
      res.html.push(c("k", "loop          ") + esc(D.loop));
    });
    def("ps", { group: "system", usage: "ps [aux]", desc: "running processes" }, function (args, res) {
      res.html.push(c("dim", "  PID USER     %CPU %MEM COMMAND"));
      [["1", "root", "0.0", "0.1", "/sbin/init splash"], ["412", "root", "0.0", "0.3", "cinnamon-session"], ["503", USER, "1.2", "2.4", "cinnamon --replace"],
       ["611", USER, "0.3", "0.9", "nemo-desktop"], ["790", USER, "0.8", "1.1", "gnome-terminal-server"], ["791", USER, "0.0", "0.2", "ashsh"],
       ["802", USER, "0.0", "0.1", "coffee --refill"], ["913", USER, "0.1", "0.4", "ps " + args.join(" ")]]
        .forEach(function (r) { res.html.push(lpad(r[0], 5) + " " + pad(r[1], 8) + " " + lpad(r[2], 4) + " " + lpad(r[3], 4) + " " + esc(r[4])); });
    });
    def(["kill", "killall", "pkill"], { group: "system", usage: "kill <pid>", desc: "nope", hidden: true }, function (args, res) {
      if (!args.length) { res.html.push(err("kill: usage: kill <pid>")); return; }
      res.html.push(err("kill: (" + args[args.length - 1] + "): Operation not permitted"));
      res.html.push(c("dim", "every process here is load-bearing"));
    });
    def("free", { group: "system", usage: "free -h", desc: "memory usage", hidden: true }, function (args, res) {
      res.html.push(c("dim", "               total        used        free      shared  buff/cache   available"));
      res.html.push("Mem:            15Gi       3.1Gi       9.2Gi       412Mi       3.0Gi        12Gi");
      res.html.push("Swap:          2.0Gi          0B       2.0Gi");
    });
    def("df", { group: "system", usage: "df -h", desc: "disk usage", hidden: true }, function (args, res) {
      res.html.push(c("dim", "Filesystem      Size  Used Avail Use% Mounted on"));
      res.html.push("/dev/sda2       238G   41G  185G  19% /");
      res.html.push("portfolio        16K   16K     0 100% /home/guest");
      res.html.push("tmpfs           7.7G     0  7.7G   0% /tmp");
    });
    def("du", { group: "system", usage: "du", desc: "disk usage of files", hidden: true }, function (args, res) {
      var n = nodeAt(absSegs(args[0] || ".")), total = 0;
      if (!n) { res.html.push(err("du: cannot access '" + args[0] + "'")); return; }
      (function walk(node) { if (node.type === "file") total += node.text.length; else Object.keys(node.children).forEach(function (k) { walk(node.children[k]); }); })(n);
      res.html.push(lpad(Math.max(4, Math.ceil(total / 1024) * 4), 6) + "\t" + esc(args[0] || "."));
    });
    def("lscpu", { group: "system", usage: "lscpu", desc: "cpu facts", hidden: true }, function (args, res) {
      [["Architecture", "x86_64"], ["CPU(s)", "8"], ["Model name", "Imaginary Core i7 (web edition)"], ["Thread(s) per core", "2"], ["L2 cache", "2 MiB"], ["Virtualization", "browser tab"]]
        .forEach(function (r) { res.html.push(c("k", pad(r[0] + ":", 22)) + esc(r[1])); });
    });
    def("lsblk", { group: "system", usage: "lsblk", desc: "block devices", hidden: true }, function (args, res) {
      res.html.push(c("dim", "NAME   MAJ:MIN RM  SIZE RO TYPE MOUNTPOINT"));
      res.html.push("sda      8:0    0  238G  0 disk");
      res.html.push("├─sda1   8:1    0  512M  0 part /boot/efi");
      res.html.push("└─sda2   8:2    0  238G  0 part /");
      res.html.push("sr0     11:0    1  1024M 0 rom  (linuxmint-22-cinnamon.iso)");
    });
    def(["ip", "ifconfig"], { group: "system", usage: "ip a", desc: "network interfaces", hidden: true }, function (args, res) {
      res.html.push("1: lo: <LOOPBACK,UP> mtu 65536");
      res.html.push("    inet 127.0.0.1/8 scope host lo");
      res.html.push("2: wlp3s0: <BROADCAST,MULTICAST,UP> mtu 1500");
      res.html.push("    inet 192.168.1.42/24 brd 192.168.1.255 scope global dynamic wlp3s0");
      res.html.push(c("dim", "    (all addresses are decorative; this site makes no network requests of its own)"));
    });
    def("dmesg", { group: "system", usage: "dmesg", desc: "kernel log", hidden: true }, function (args, res) {
      ["[    0.000000] Linux version 6.9.0-curious (ashutosh@mint) (gcc 13.2.0)", "[    0.412345] portfolio: mounting /home/guest read-only", "[    0.512345] portfolio: loaded " + (D.projects || []).length + " projects", "[    1.000000] coffee: level nominal", "[    1.337000] fun: cmatrix, btop, sl, nyancat ready"]
        .forEach(function (l) { res.html.push(c("dim", l)); });
    });
    def(["systemctl", "service", "journalctl"], { group: "system", usage: "systemctl", desc: "services", hidden: true }, function (args, res) {
      res.html.push(c("ok", "● portfolio.service") + " - Ashutosh's portfolio");
      res.html.push("     Active: " + c("ok", "active (running)") + " since boot; uptime " + esc(uptimeStr()));
      res.html.push("   Main PID: 1 (index.html)");
    });
    def(["apt", "apt-get", "aptitude", "dnf", "yum", "pacman", "pip", "pip3", "npm", "snap", "flatpak", "brew"], { group: "fun", usage: "apt install <pkg>", desc: "fake package manager (try: apt install coffee)", example: "sudo apt install coffee" }, function (args, res, ctx, name) {
      var sub = (args[0] || "").toLowerCase(), pkg = args.slice(1).filter(function (x) { return x.charAt(0) !== "-"; }).join(" ");
      if (name === "pacman") { sub = /S/.test(args[0] || "") ? "install" : sub; pkg = args.slice(1).join(" "); }
      if (!sub) { res.html.push(name + ": usage: " + name + " install <package>"); return; }
      if (/^(update|upgrade|-Syu)$/.test(sub)) {
        res.html.push("Hit:1 https://packages.linuxmint.com wilma InRelease", "Reading package lists... Done", "Building dependency tree... Done", c("ok", "All packages are up to date. (The site updates when I push to GitHub.)"));
        return;
      }
      if (/^(remove|purge|uninstall|-R)$/.test(sub)) { res.html.push(err("E: Cannot remove '" + (pkg || "?") + "': it is holding the portfolio together")); return; }
      if (!/^(install|add|i|-S)$/.test(sub)) { res.html.push(err("E: Invalid operation " + sub)); return; }
      if (!pkg) { res.html.push(err("E: Nothing to install. Try: " + name + " install coffee")); return; }
      program(res, "apt", [pkg]);
    });
    def(["wget", "curl", "ssh", "scp", "ftp", "nc", "nmap"], { group: "system", usage: "curl <url>", desc: "network is read-only", hidden: true }, function (args, res, ctx, name) {
      res.html.push(err(name + ": could not resolve host: this portfolio keeps its hands in its own pockets."));
      res.html.push(c("dim", "to actually visit something, try: ") + cmdLink("open github", "open github"));
    });
    def("git", { group: "fun", usage: "git log", desc: "the project history, sort of", example: "git log" }, function (args, res) {
      var sub = args[0];
      if (sub === "status") { res.html.push("On branch main", "Your branch is up to date with 'origin/main'.", "", "nothing to commit, working tree clean", c("dim", "(sleep schedule: modified)")); return; }
      if (sub === "log" || !sub) {
        var items = (D.experience || []).map(function (x) { return [x.period, x.role + " @ " + x.org]; })
          .concat((D.achievements || []).map(function (x) { return ["", x.title]; }))
          .concat((D.projects || []).map(function (p) { return ["", "feat: " + p.name + " — " + p.summary]; }));
        items.forEach(function (it, i) {
          var hash = (0x1a2b3c + i * 0x9e37).toString(16).slice(0, 7);
          res.html.push(c("st", hash) + " " + esc(it[1]) + (it[0] ? c("dim", "  (" + it[0] + ")") : ""));
        });
        return;
      }
      if (sub === "push") { res.html.push(err("fatal: you are a guest. The author pushes; you browse.")); return; }
      if (sub === "blame") { res.html.push(c("dim", "it was ") + esc(D.name) + c("dim", ". it is always ") + esc(D.name) + "."); return; }
      res.html.push(c("dim", "git: '" + sub + "' is not supported here. Try: git log, git status, git blame"));
    });

    /* --- fun (pure text) --- */
    def(["cowsay", "cowthink"], { group: "fun", usage: "cowsay <text>", desc: "a cow says it (-f tux|dragon|mint)", example: "cowsay moo" }, function (args, res, ctx, name) {
      var cow = "default", rest = [];
      for (var i = 0; i < args.length; i++) { if (args[i] === "-f" && args[i + 1]) cow = args[++i]; else rest.push(args[i]); }
      var lines = inputLines(rest, res, { name: name, argsAreText: true });
      var text = lines ? lines.join(" ") : "Moo. Try: cowsay hello";
      cowsay(text, name === "cowthink", cow).forEach(function (l) { res.html.push(esc(l)); });
    });
    def("fortune", { group: "fun", usage: "fortune", desc: "a random programmer fortune", example: "fortune | cowsay" }, function (args, res) {
      res.html.push(esc(FORTUNES[Math.floor(rand() * FORTUNES.length)]));
    });
    def(["figlet", "toilet", "banner"], { group: "fun", usage: "figlet <text>", desc: "big block letters", example: "figlet hello" }, function (args, res) {
      var lines = inputLines(args, res, { name: "figlet", argsAreText: true });
      if (!lines) { res.html.push(err("figlet: give me some text")); return; }
      bigText(lines.join(" ")).forEach(function (l) { res.html.push(esc(l)); });
    });
    def("lolcat", { group: "fun", usage: "lolcat", desc: "rainbow everything", example: "fortune | lolcat" }, function (args, res) {
      var lines = inputLines(args, res, { name: "lolcat", argsAreText: true });
      if (!lines) { res.html.push(err("lolcat: pipe something in, e.g. fortune | lolcat")); return; }
      lines.forEach(function (l, i) { res.html.push(lolcat(l, lolOffset + i)); });
      lolOffset += 3;
    });
    def(["bc", "calc", "expr"], { group: "fun", usage: "bc <expression>", desc: "calculator", example: "bc 2^10 + 7" }, function (args, res) {
      var lines = inputLines(args, res, { name: "bc", argsAreText: true });
      if (!lines) { res.html.push(err("bc: give me an expression, e.g. bc (3+4)*5")); return; }
      try { res.html.push(esc(String(calc(lines.join(" "))))); } catch (e) { res.html.push(err("bc: " + e.message)); }
    });
    def("seq", { group: "system", usage: "seq <n>", desc: "count", hidden: true }, function (args, res) {
      var a1 = parseInt(args[0], 10), b = parseInt(args[1], 10);
      var from = isNaN(b) ? 1 : a1, to = isNaN(b) ? a1 : b;
      if (isNaN(to)) { res.html.push(err("seq: missing operand")); return; }
      for (var i = from; i <= Math.min(to, from + 199); i++) res.html.push(String(i));
      if (to > from + 199) res.html.push(c("dim", "... (stopping at 200 lines, this is a portfolio)"));
    });
    def("weather", { group: "fun", usage: "weather", desc: "forecast for Bhopal (made up)" }, function (args, res) {
      var city = args.join(" ") || (D.location || "Bhopal").split(",")[0];
      var sun = ["    \\   /    ", "     .-.     ", "  ― (   ) ―  ", "     `-’     ", "    /   \\    "];
      var temp = 24 + Math.floor(rand() * 10), wind = 5 + Math.floor(rand() * 15);
      var info = [c("b", "Weather report: " + city), "Sunny, like a merged pull request", temp + "..." + (temp + 3) + " °C", "↗ " + wind + " km/h", "visibility: 10 km, confidence: 0 (I made this up)"];
      sun.forEach(function (l, i) { res.html.push(c("sun", l) + " " + (info[i] || "")); });
    });
    def("coffee", { group: "fun", usage: "coffee", desc: "brew one" }, function (args, res) {
      ["      ( (", "       ) )", "    ........", "    |      |]", "    \\      /", "     `----'"].forEach(function (l) { res.html.push(esc(l)); });
      res.html.push(c("dim", "brewed. now go read ") + cmdLink("projects", "projects"));
    });
    def(["sudo", "doas", "please"], { group: "system", usage: "sudo <command>", desc: "try it", hidden: true }, function (args, res, ctx) {
      if (!args.length) { res.html.push("usage: sudo <command>"); return; }
      res.html.push("[sudo] password for " + USER + ": " + c("dim", "********"));
      var joined = args.join(" ");
      if (/hire|job|intern/i.test(joined)) {
        res.html.push(c("ok", "Password accepted. Good call."));
        run("contact", res, ctx);
      } else if (/^(apt|apt-get|dnf|yum|pacman|pip|pip3|npm|snap|flatpak|shutdown|reboot|poweroff|halt|rm|su)\b/.test(joined)) {
        run(joined, res, ctx);
      } else {
        res.html.push(err(USER + " is not in the sudoers file. This incident will be reported."));
        res.html.push(c("dim", "(hint: try 'sudo hire " + HOST + "')"));
      }
    });
    def("su", { group: "system", usage: "su", desc: "become root", hidden: true }, function (args, res) {
      res.html.push("Password: " + c("dim", "********"), err("su: Authentication failure"), c("dim", "root is " + D.name + ". You are a very welcome guest."));
    });
    def("rm", { group: "system", usage: "rm", desc: "nope", hidden: true }, function (args, res) {
      var joined = args.join(" ");
      if (/-\w*r/.test(joined) && /(^|\s)\/\*?(\s|$)/.test(joined)) {
        res.html.push(err("rm: it is dangerous to operate recursively on '/'"));
        res.html.push(err("rm: use --no-preserve-root to override this safety measure"));
        res.html.push(c("dim", "(it's a read-only portfolio, but thanks for the confidence)"));
      } else res.html.push(err("rm: cannot remove '" + (args.filter(function (x) { return x[0] !== "-"; })[0] || "?") + "': Read-only file system"));
    });
    ["mkdir", "touch", "mv", "cp", "chmod", "chown", "ln", "rmdir", "dd", "mkfs"].forEach(function (n) {
      def(n, { group: "system", usage: n, desc: "read-only", hidden: true }, function (args, res) {
        res.html.push(err(n + ": Read-only file system (this is a portfolio, not a server)"));
      });
    });
    def(["vim", "vi", "nvim", "nano", "emacs", "micro"], { group: "fun", usage: "vim <file>", desc: "open a file the hard way (:q to leave)", example: "vim ~/about.md" }, function (args, res, ctx, name) {
      var p = args.filter(function (x) { return x.charAt(0) !== "-"; })[0];
      var n = p ? nodeAt(absSegs(p)) : null;
      if (p && !n) { res.html.push(err(name + ": " + p + ": No such file or directory (and the filesystem is read-only, so no new files)")); return; }
      if (n && n.type === "dir") { res.html.push(err(name + ": " + p + ": is a directory")); return; }
      program(res, name === "nano" || name === "micro" ? "nano" : name === "emacs" ? "emacs" : "vim", [p ? tilde(absSegs(p)) : ""], n ? n.text : null);
    });

    /* --- fun (animated: handed to programs.js through a 'program' action) --- */
    function fun(names, usage, desc, prog, example) {
      def(names, { group: "fun", usage: usage, desc: desc, example: example }, function (args, res) { program(res, prog || names[0], args, stdinOf(res)); });
    }
    fun(["cmatrix", "matrix"], "cmatrix [-r]", "the matrix rain (q to quit, -r rainbow)");
    fun(["btop", "bpytop", "bashtop"], "btop", "a pretty system monitor (q to quit)");
    fun(["htop", "top", "glances"], "htop", "process viewer (q to quit)");
    fun(["sl"], "sl", "a steam locomotive, because you typed ls wrong");
    fun(["nyancat", "nyan"], "nyancat", "nyan nyan nyan");
    fun(["pipes", "pipes.sh"], "pipes", "screensaver pipes (q to quit)");
    fun(["aafire", "fire"], "aafire", "ascii fire (q to quit)");
    fun(["cbonsai", "bonsai"], "cbonsai", "grow a bonsai tree");
    fun(["asciiquarium", "aquarium"], "asciiquarium", "fish (q to quit)");
    fun(["hollywood", "hack", "hackertyper"], "hollywood", "look busy like in the movies (q to quit)");
    fun(["snake"], "snake", "the game (arrow keys, q to quit)");
    fun(["ping"], "ping <host>", "ping something (Ctrl+C to stop)", null, "ping github.com");
    fun(["yes"], "yes [text]", "say yes forever (Ctrl+C to stop)");
    fun(["sleep"], "sleep <seconds>", "wait (max 10)", null, "sleep 2");
    fun(["telnet", "starwars"], "starwars", "the famous towel.blinkenlights.nl", "starwars");
    fun(["rain"], "rain", "it rains (q to quit)");
    fun(["clock", "tty-clock"], "clock", "a big clock (q to quit)");

    /* ================= execution ================= */
    function runOne(argv, res, ctx) {
      var name = argv[0], args = argv.slice(1);
      var m = has(COMMANDS, name) ? COMMANDS[name] : null;
      if (m) { m.run(args, res, ctx || {}, name); return; }
      var n = nodeAt(absSegs(name));
      if (n && n.type === "file") {
        res.html.push(err("ashsh: permission denied: " + name));
        res.html.push(c("dim", "did you mean: ") + cmdLink("cat " + name, "cat " + name));
        return;
      }
      if (n && n.type === "dir") { res.html.push(err("ashsh: " + name + ": Is a directory"), c("dim", "did you mean: ") + cmdLink("cd " + name, "cd " + name)); return; }
      var best = null, bd = 3;
      allNames().forEach(function (k) {
        if (COMMANDS[k].hidden) return;
        var dst = levenshtein(name.toLowerCase(), k);
        if (dst < bd) { bd = dst; best = k; }
      });
      res.html.push(err("ashsh: command not found: " + name));
      res.html.push(best
        ? c("dim", "did you mean: ") + cmdLink(best, best) + c("dim", "  (or type ") + cmdLink("help", "help") + c("dim", ")")
        : c("dim", "type ") + cmdLink("help", "help") + c("dim", " to see what's available"));
    }
    function runPipeline(stages, res, ctx) {
      var stdin;
      for (var i = 0; i < stages.length; i++) {
        var last = i === stages.length - 1;
        var sres = { html: [], actions: [], piped: !last };
        if (stdin !== undefined) sres.stdin = stdin;
        runOne(stages[i], sres, ctx);
        if (last) { sres.html.forEach(function (h) { res.html.push(h); }); }
        else stdin = sres.html.map(unesc).join("\n") + "\n";
        sres.actions.forEach(function (x) { if (x.type === "program" && !last) x.input = x.input; res.actions.push(x); });
      }
    }
    function run(line, res, ctx) {
      if (/^\s*:\s*\(\s*\)\s*\{/.test(line)) {
        res.html.push(err("ashsh: fork bomb detected. The kernel politely declines."), c("dim", "nice try though. have a cow instead: ") + cmdLink("cowsay boom", "cowsay boom"));
        return;
      }
      var parsed = parseLine(line);
      if (parsed.error) { res.html.push(err("ashsh: " + parsed.error + " quote")); return; }
      parsed.cmds.forEach(function (pipeline) { runPipeline(pipeline, res, ctx); });
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
      var pc = parseLine(head).cmds, afterSep = /[;|]\s*$/.test(head);
      var lastPipe = pc[pc.length - 1] || [];
      var parts = afterSep ? [] : (lastPipe[lastPipe.length - 1] || []);
      var cands, pathMode = false;
      if (!parts.length) cands = visibleCommands().concat(["./stats.sh"]);
      else {
        var cmd = parts[0];
        if (cmd === "theme") cands = THEMES.concat(Object.keys(THEME_ALIAS));
        else if (cmd === "man" || cmd === "help" || cmd === "which") cands = visibleCommands();
        else if (cmd === "launch" || cmd === "app" || cmd === "start") cands = APPS.slice(0, 7);
        else if (cmd === "open") {
          cands = (D.projects || []).map(function (p) { return p.id; }).concat(["github", "linkedin", "email", "resume"]);
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
      commands: visibleCommands,
      fs: FS_API
    };
  }

  return { createShell: createShell, THEMES: THEMES, THEME_ALIAS: THEME_ALIAS, APPS: APPS, esc: esc, unesc: unesc, safeUrl: safeUrl, linkify: linkify, c: c, a: a, cmdLink: cmdLink, parseLine: parseLine, calc: calc, bigText: bigText, cowsay: cowsay, FORTUNES: FORTUNES };
});
