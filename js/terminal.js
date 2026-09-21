/*!
 * terminal.js — the browser side of the portfolio.
 * Renders shell output, runs the boot sequence, handles keyboard/touch input,
 * theme switching and the plain (non-terminal) view. Content comes from data.js,
 * command logic from shell.js.
 */
(function () {
  "use strict";

  var D = window.PORTFOLIO;
  var S = window.PortfolioShell;
  var esc = S.esc, c = S.c, cmdLink = S.cmdLink;
  var shell = S.createShell(D);

  function $(id) { return document.getElementById(id); }
  var out = $("out"), row = $("row"), input = $("cmd"), promptEl = $("prompt"), screen = $("screen");
  var titlePath = $("title-path");
  var plainBtn = $("btn-plain"), plain = $("plain");

  var state = { theme: "graphite", busy: true, histIdx: -1, draft: "", plainOpen: false, bootId: 0 };
  var reduceMotion = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- safe storage (private mode / blocked storage must not break the site) ---------- */
  function lget(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lset(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  function sget(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function sset(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  function isTouch() { return window.matchMedia && matchMedia("(pointer: coarse)").matches; }

  /* ---------- output ---------- */
  function print(html, cls) {
    var d = document.createElement("div");
    d.className = "ln" + (cls ? " " + cls : "");
    d.innerHTML = html;
    out.appendChild(d);
    return d;
  }
  function scrollDown() { screen.scrollTop = screen.scrollHeight; }
  function refreshPrompt() {
    promptEl.innerHTML = shell.promptHTML();
    titlePath.textContent = shell.cwdLabel();
  }
  function ctx() { return { theme: state.theme }; }

  /* ---------- themes ---------- */
  function applyTheme(name, persist) {
    if (S.THEMES.indexOf(name) < 0) name = "graphite";
    state.theme = name;
    document.documentElement.setAttribute("data-theme", name);
    Array.prototype.forEach.call(document.querySelectorAll(".th"), function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-theme-pick") === name ? "true" : "false");
    });
    var bg = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta && bg) meta.setAttribute("content", bg);
    if (persist !== false) lset("theme", name);
  }

  /* ---------- tmux window highlight ---------- */
  function markWindow(line) {
    var l = line.trim(), idx = -1;
    if (/^home\b/.test(l)) idx = 0;
    else if (/^about\b|about\.md/.test(l)) idx = 1;
    else if (/^projects\b|\/projects\//.test(l)) idx = 2;
    else if (/^skills\b/.test(l)) idx = 3;
    else if (/^achievements\b|\/achievements\//.test(l)) idx = 4;
    else if (/^contact\b/.test(l)) idx = 5;
    else if (/^help\b/.test(l)) idx = 6;
    if (idx < 0) return;
    Array.prototype.forEach.call(document.querySelectorAll(".win"), function (w) {
      w.classList.toggle("active", Number(w.getAttribute("data-win")) === idx);
    });
  }
  /* ---------- running commands ---------- */
  function openUrl(url) {
    if (/^mailto:/i.test(url)) window.location.href = url;
    else window.open(url, "_blank", "noopener,noreferrer");
  }
  function handleAction(a) {
    if (a.type === "clear") out.textContent = "";
    else if (a.type === "theme") applyTheme(a.name);
    else if (a.type === "open") openUrl(a.url);
    else if (a.type === "plain") showPlain();
    else if (a.type === "reboot") { state.busy = true; setTimeout(function () { boot({ fast: false }); }, 350); }
  }
  function runLine(line) {
    if (state.busy) return;
    line = String(line);
    print(shell.promptHTML() + " " + '<span class="typed">' + esc(line) + "</span>", "echo");
    var res = shell.exec(line, ctx());
    res.html.forEach(function (h) { print(h); });
    res.actions.forEach(handleAction);
    markWindow(line);
    refreshPrompt();
    scrollDown();
  }

  /* ---------- keyboard ---------- */
  function setInput(v) {
    input.value = v;
    var n = v.length;
    requestAnimationFrame(function () { try { input.setSelectionRange(n, n); } catch (e) { /* ignore */ } });
  }
  function submit() {
    var v = input.value;
    input.value = "";
    state.histIdx = -1;
    state.draft = "";
    if (!v.trim()) { print(shell.promptHTML(), "echo"); scrollDown(); return; }
    runLine(v);
  }
  input.addEventListener("keydown", function (e) {
    if (state.busy) { e.preventDefault(); return; }
    var h = shell.history();
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!h.length) return;
      if (state.histIdx === -1) { state.draft = input.value; state.histIdx = h.length - 1; }
      else state.histIdx = Math.max(0, state.histIdx - 1);
      setInput(h[state.histIdx]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (state.histIdx === -1) return;
      state.histIdx++;
      if (state.histIdx >= h.length) { state.histIdx = -1; setInput(state.draft); }
      else setInput(h[state.histIdx]);
    } else if (e.key === "Tab") {
      e.preventDefault();
      var r = shell.complete(input.value);
      var changed = r.line !== input.value;
      if (changed) setInput(r.line);
      if (!changed && r.options.length > 1) {
        print(shell.promptHTML() + " " + '<span class="typed">' + esc(input.value) + "</span>", "echo");
        print(c("dim", r.options.join("  ")));
        scrollDown();
      }
    } else if (e.ctrlKey && (e.key === "l" || e.key === "L")) {
      e.preventDefault();
      out.textContent = "";
    } else if (e.ctrlKey && (e.key === "c" || e.key === "C") && !window.getSelection().toString()) {
      e.preventDefault();
      print(shell.promptHTML() + " " + '<span class="typed">' + esc(input.value) + "^C</span>", "echo");
      input.value = "";
      state.histIdx = -1;
      scrollDown();
    }
  });

  /* ---------- clicks: commands, chips, focus ---------- */
  document.addEventListener("click", function (e) {
    var t = e.target.closest ? e.target.closest("[data-cmd]") : null;
    if (t) {
      e.preventDefault();
      if (state.plainOpen) hidePlain(true);
      runLine(t.getAttribute("data-cmd"));
      if (!isTouch()) input.focus({ preventScroll: true });
      return;
    }
    if (state.plainOpen || state.busy) return;
    if (e.target.closest("a, button")) return;
    var sel = window.getSelection && window.getSelection().toString();
    if (!sel) input.focus({ preventScroll: true });
  });
  document.addEventListener("keydown", function (e) {
    var t = e.target;
    if (t && t.getAttribute && t.getAttribute("role") === "button" && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      t.click();
      return;
    }
    if (state.plainOpen) { if (e.key === "Escape") hidePlain(true); return; }
    if (!state.busy && t !== input && t.tagName !== "BUTTON" && t.tagName !== "A" &&
        e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      input.focus({ preventScroll: true });
    }
  });

  /* ---------- boot sequence ---------- */
  function bootLines() {
    return [
      [c("dim", "ashutosh-os 6.9 x86_64"), 150],
      [c("dim", "mounting /home/guest (read-only)"), 130],
      [c("dim", "loading " + (D.projects || []).length + " projects"), 130],
      [c("dim", "ready"), 260]
    ];
  }
  function boot(opts) {
    var myBoot = ++state.bootId;
    var skip = !!(opts && opts.fast) || reduceMotion;
    state.busy = true;
    row.hidden = true;
    out.setAttribute("aria-live", "off");
    out.textContent = "";
    state.histIdx = -1;
    input.value = "";

    function onSkip() { skip = true; }
    window.addEventListener("keydown", onSkip);
    window.addEventListener("pointerdown", onSkip);
    function wait(ms) { return skip ? Promise.resolve() : new Promise(function (r) { setTimeout(r, ms); }); }

    var chain = Promise.resolve();
    if (!skip) {
      bootLines().forEach(function (l) {
        chain = chain.then(function () {
          if (myBoot !== state.bootId || skip) return;
          print(l[0]);
          return wait(l[1]);
        });
      });
    }
    return chain.then(function () {
      window.removeEventListener("keydown", onSkip);
      window.removeEventListener("pointerdown", onSkip);
      if (myBoot !== state.bootId) return;
      out.textContent = "";
      shell.exec("home", ctx(), { record: false }).html.forEach(function (h) { print(h); });
      sset("booted", "1");
      state.busy = false;
      out.setAttribute("aria-live", "polite");
      row.hidden = false;
      refreshPrompt();
      if (!isTouch()) input.focus({ preventScroll: true });
      screen.scrollTop = 0;
    });
  }

  /* ---------- plain (non-terminal) view ---------- */
  function buildPlain() {
    var L = D.links, h = [];
    function link(url, text) { return '<a href="' + esc(S.safeUrl(url)) + '" target="_blank" rel="noopener noreferrer">' + esc(text) + "</a>"; }
    function skillLabel(g) { return g.label || (D.skillLabels && D.skillLabels[g.id]) || g.id; }
    h.push('<div class="plain-inner">');
    h.push('<button type="button" class="plain-close" id="plain-close">Back to terminal (Esc)</button>');
    h.push("<h1>" + esc(D.name) + "</h1>");
    h.push('<p class="lede">' + esc(D.role) + (D.now ? ". Now: " + esc(D.now) : "") + ".</p>");
    h.push('<p class="linkrow">' + link(L.github, "GitHub") + link(L.linkedin, "LinkedIn") + link("mailto:" + L.email, L.email) +
      (L.resume ? link(L.resume, "Résumé (PDF)") : "") + "</p>");

    h.push("<h2>About</h2>");
    var list = false;
    (D.about || []).forEach(function (line) {
      var isLi = /^- /.test(line);
      if (isLi && !list) { h.push("<ul>"); list = true; }
      if (!isLi && list) { h.push("</ul>"); list = false; }
      h.push(isLi ? "<li>" + esc(line.slice(2)) + "</li>" : "<p>" + esc(line) + "</p>");
    });
    if (list) h.push("</ul>");

    h.push("<h2>Projects</h2>");
    (D.projects || []).forEach(function (p) {
      h.push('<article class="project"><h3>' + esc(p.name) + (p.status ? ' <span class="meta">' + esc(p.status) + "</span>" : "") + "</h3><p>" + esc(p.description) + "</p>");
      if (p.highlights && p.highlights.length) {
        h.push("<ul>" + p.highlights.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>");
      }
      h.push('<p class="meta">' + esc(p.stack.join(", ")) + "</p>");
      if (p.role) h.push('<p class="meta">My part: ' + esc(p.role) + "</p>");
      if (p.live || p.repo) {
        h.push('<p class="linkrow">' + (p.live ? link(p.live, "Live site") : "") + (p.repo ? link(p.repo, "Source on GitHub") : "") + "</p>");
      }
      h.push("</article>");
    });

    h.push("<h2>Skills</h2><dl>");
    (D.skills || []).forEach(function (g) {
      h.push("<dt>" + esc(skillLabel(g)) + "</dt><dd>" + g.items.map(esc).join(", ") + "</dd>");
    });
    h.push("</dl>");

    h.push("<h2>Achievements</h2><ul>");
    (D.achievements || []).forEach(function (x) { h.push("<li><strong>" + esc(x.title) + ".</strong> " + esc(x.detail) + "</li>"); });
    h.push("</ul>");

    if ((D.experience || []).length) {
      h.push("<h2>Experience</h2>");
      D.experience.forEach(function (x) {
        var when = [x.period, x.location].filter(Boolean).join(", ");
        h.push("<p><strong>" + esc(x.role) + ", " + esc(x.org) + "</strong>" + (when ? '<br><span class="meta">' + esc(when) + "</span>" : "") +
          "<br>" + esc(x.summary) + (x.link ? " " + link(x.link, "View work") : "") + "</p>");
        if (x.points && x.points.length) h.push("<ul>" + x.points.map(function (pt) { return "<li>" + esc(pt) + "</li>"; }).join("") + "</ul>");
      });
    }

    if ((D.certifications || []).length) {
      h.push("<h2>Certifications</h2><ul>");
      D.certifications.forEach(function (x) {
        var meta = [x.issuer, x.issued ? "issued " + x.issued : ""].filter(Boolean).join(", ");
        h.push("<li>" + esc(x.title) + (meta ? ' <span class="meta">(' + esc(meta) + ")</span>" : "") + "</li>");
      });
      h.push("</ul>");
    }

    h.push("<h2>Contact</h2><p>" + link("mailto:" + L.email, L.email) + "</p>");

    var edu = (D.education || []).filter(function (e) { return e.degree; });
    if (edu.length) {
      h.push('<p class="meta plain-edu">' + edu.map(function (e) {
        return esc(e.degree + (e.institution ? ", " + e.institution : "") + (e.period ? " (" + e.period + ")" : ""));
      }).join("<br>") + "</p>");
    }
    h.push("</div>");
    return h.join("");
  }
  function setInert(on) {
    ["screen"].forEach(function (id) { $(id).inert = on; });
    Array.prototype.forEach.call(document.querySelectorAll(".titlebar, .tmux"), function (el) { el.inert = on; });
  }
  function showPlain() {
    if (state.plainOpen) return;
    plain.innerHTML = buildPlain();
    plain.hidden = false;
    plain.scrollTop = 0;
    state.plainOpen = true;
    setInert(true);
    $("plain-close").addEventListener("click", function () { hidePlain(true); });
    $("plain-close").focus();
  }
  function hidePlain(refocus) {
    if (!state.plainOpen) return;
    plain.hidden = true;
    plain.innerHTML = "";
    state.plainOpen = false;
    setInert(false);
    if (refocus && !state.busy && !isTouch()) input.focus({ preventScroll: true });
  }
  plainBtn.addEventListener("click", showPlain);
  Array.prototype.forEach.call(document.querySelectorAll(".th"), function (b) {
    b.addEventListener("click", function () { applyTheme(b.getAttribute("data-theme-pick")); });
  });

  /* ---------- go ---------- */
  applyTheme(lget("theme") || (window.matchMedia && matchMedia("(prefers-color-scheme: light)").matches ? "chalk" : "graphite"), false);
  refreshPrompt();
  boot({ fast: sget("booted") === "1" });
})();
