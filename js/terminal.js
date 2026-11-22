/*!
 * terminal.js — the browser side of the portfolio.
 * Renders shell output, runs the boot sequence, handles keyboard/touch input,
 * theme switching, the Cinnamon desktop wrapper, and the plain (non-terminal) view.
 * Content comes from data.js, command logic from shell.js.
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
  var cinnamonDesktop = $("cinnamon-desktop");
  var bootSplash = $("boot-splash");
  var terminalWindow = $("terminal-window");
  var panelClock = $("panel-clock");
  var appmenuBtn = $("appmenu-btn");
  var appmenu = $("appmenu");
  var windowTitleText = $("window-title-text");

  var state = {
    theme: "graphite",
    busy: true,
    histIdx: -1,
    draft: "",
    plainOpen: false,
    bootId: 0,
    appmenuOpen: false,
    windowMaximized: false,
    windowMinimized: false,
    dragActive: false,
    dragOffX: 0,
    dragOffY: 0
  };
  var reduceMotion = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- safe storage ---------- */
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
    // Update window title with current path
    var path = shell.cwdLabel();
    if (titlePath) titlePath.textContent = path;
    if (windowTitleText) {
      windowTitleText.textContent = "Terminal — guest@ashutosh: " + path;
    }
  }
  function ctx() { return { theme: state.theme, asH1: !state.h1Used }; }

  /* ---------- themes ---------- */
  function applyTheme(name, persist) {
    // Map internal names to CSS data-theme values
    var cssName = { "dark": "graphite", "light": "chalk", "mint-y-teal": "mint-y-teal" }[name] || name;
    if (["graphite", "chalk", "mint-y-teal"].indexOf(cssName) < 0) cssName = "graphite";
    state.theme = name;
    document.documentElement.setAttribute("data-theme", cssName);
    // Update all theme-pick buttons
    Array.prototype.forEach.call(document.querySelectorAll(".th"), function (b) {
      var pick = b.getAttribute("data-theme-pick");
      // Map picks to canonical names
      var canon = { "graphite": "dark", "chalk": "light", "mint-y-teal": "mint-y-teal" }[pick] || pick;
      b.setAttribute("aria-pressed", canon === name ? "true" : "false");
    });
    // Update meta theme-color
    var bg = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta && bg) meta.setAttribute("content", bg);
    if (persist !== false) lset("theme", name);
  }

  /* ---------- panel window highlight ---------- */
  function markWindow(line) {
    var l = line.trim(), idx = -1;
    if (/^home\b/.test(l)) idx = 0;
    else if (/^about\b|about\.md/.test(l)) idx = 1;
    else if (/^projects\b|\/projects\//.test(l)) idx = 2;
    else if (/^skills\b/.test(l)) idx = 3;
    else if (/^achievements\b|\/achievements\//.test(l)) idx = 4;
    else if (/^roadmap\b|^timeline\b/.test(l)) idx = 5;
    else if (/^notes\b|^blog\b/.test(l)) idx = 6;
    else if (/^contact\b/.test(l)) idx = 7;
    // Update legacy .win buttons (hidden)
    Array.prototype.forEach.call(document.querySelectorAll(".win"), function (w) {
      w.classList.toggle("active", Number(w.getAttribute("data-win")) === idx);
    });
    // Update panel-win buttons
    Array.prototype.forEach.call(document.querySelectorAll(".panel-win"), function (w) {
      var wi = Number(w.getAttribute("data-win"));
      w.classList.toggle("active", wi === idx);
      w.setAttribute("aria-selected", wi === idx ? "true" : "false");
    });
    // Update desktop icons
    Array.prototype.forEach.call(document.querySelectorAll(".desktop-icon"), function (icon) {
      var cmd = icon.getAttribute("data-cmd") || "";
      icon.classList.toggle("active", cmd.trim() === l.trim());
    });
  }

  /* ---------- running commands ---------- */
  function openUrl(url) {
    if (/^mailto:/i.test(url)) window.location.href = url;
    else window.open(url, "_blank", "noopener,noreferrer");
  }
  function runProgram(a) {
    if (!window.PortfolioPrograms || !window.PortfolioPrograms[a.name]) {
      print(c("err", "program '" + a.name + "' is not available"));
      return;
    }
    state.busy = true;
    row.hidden = true;
    var pre = null;
    var stopped = false;
    function finish() {
      if (stopped) return;
      stopped = true;
      if (pre && pre.parentNode) pre.parentNode.removeChild(pre);
      window.removeEventListener("resize", updateDims);
      state.activeProgram = null;
      state.busy = false;
      row.hidden = false;
      refreshPrompt();
      if (!isTouch()) input.focus({ preventScroll: true });
      scrollDown();
    }
    function updateDims() {
      if (!termObj.screenEl) return;
      termObj.cols = Math.max(20, Math.floor((screen.clientWidth - 32) / 8.5));
      termObj.rows = Math.max(10, Math.floor((screen.clientHeight - 32) / 20));
    }
    var termObj = {
      cols: Math.max(20, Math.floor((screen.clientWidth - 32) / 8.5)),
      rows: Math.max(10, Math.floor((screen.clientHeight - 32) / 20)),
      screen: function () {
        if (!pre) {
          pre = document.createElement("pre");
          pre.className = "ln prog-canvas";
          pre.style.cssText = "margin:0;padding:0;font:inherit;line-height:1.2;overflow:hidden;user-select:none;";
          out.appendChild(pre);
          termObj.screenEl = pre;
          window.addEventListener("resize", updateDims);
          updateDims();
        }
        return pre;
      },
      println: function (html) {
        print(html);
        scrollDown();
      },
      exit: finish,
      esc: esc,
      bigText: S.bigText || function (s) { return [s]; }
    };
    var inst = window.PortfolioPrograms[a.name](termObj, a.args || [], a.input || null);
    state.activeProgram = { inst: inst, exit: finish };
  }
  function handleAction(a) {
    if (a.type === "clear") out.textContent = "";
    else if (a.type === "theme") applyTheme(a.name);
    else if (a.type === "open") openUrl(a.url);
    else if (a.type === "plain") showPlain();
    else if (a.type === "reboot") { state.busy = true; setTimeout(function () { boot({ fast: false }); }, 350); }
    else if (a.type === "exit") { if (terminalWindow) terminalWindow.classList.add("minimized"); state.windowMinimized = true; }
    else if (a.type === "logout") { showBootSplash(true); }
    else if (a.type === "program") { runProgram(a); }
    else if (a.type === "launch") {
      if (a.app === "resume") { if (D.links && D.links.resume) openUrl(D.links.resume); }
      else if (a.app === "projects") { runLine("projects"); }
      else if (a.app === "about") { runLine("cat ~/about.md"); }
      else if (a.app === "contact") { runLine("contact"); }
      else if (a.app === "files") { runLine("ls -la " + (a.path || "~")); }
      else if (a.app === "viewer") { runLine("cat " + (a.path || "~/about.md")); }
      else if (a.app === "guide") { runLine("help"); }
      else if (a.app === "terminal") { restoreWindow(); }
    }
  }
  function runLine(line) {
    if (state.busy) return;
    // If window was minimized, restore it first
    if (state.windowMinimized) restoreWindow();
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
    // Close app menu on outside click
    if (state.appmenuOpen && appmenu && !appmenu.contains(e.target) && e.target !== appmenuBtn && !appmenuBtn.contains(e.target)) {
      closeAppMenu();
    }
    var t = e.target.closest ? e.target.closest("[data-cmd]") : null;
    if (t) {
      e.preventDefault();
      if (state.plainOpen) hidePlain(true);
      if (state.appmenuOpen) closeAppMenu();
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
    if (state.activeProgram) {
      if (e.key === "q" || e.key === "Q" || e.key === "Escape" || (e.ctrlKey && (e.key === "c" || e.key === "C"))) {
        e.preventDefault();
        if (state.activeProgram.inst && typeof state.activeProgram.inst.stop === "function") {
          state.activeProgram.inst.stop();
        }
        state.activeProgram.exit();
        return;
      }
      if (state.activeProgram.inst && typeof state.activeProgram.inst.key === "function") {
        state.activeProgram.inst.key(e);
      }
      return;
    }
    var t = e.target;
    if (t && t.getAttribute && t.getAttribute("role") === "button" && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      t.click();
      return;
    }
    if (e.key === "Escape") {
      if (state.appmenuOpen) { closeAppMenu(); return; }
      if (state.plainOpen) { hidePlain(true); return; }
    }
    if (state.plainOpen) return;
    if (!state.busy && t !== input && t.tagName !== "BUTTON" && t.tagName !== "A" &&
        e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      input.focus({ preventScroll: true });
    }
  });

  /* ---------- BOOT SPLASH ---------- */
  var BOOT_STEPS = [
    { pct: 15, msg: "Initialising hardware..." },
    { pct: 30, msg: "Mounting /home/guest (read-only)..." },
    { pct: 50, msg: "Loading " + (D.projects || []).length + " projects..." },
    { pct: 65, msg: "Starting Cinnamon desktop environment..." },
    { pct: 80, msg: "Applying Mint-Y theme..." },
    { pct: 95, msg: "Preparing portfolio shell..." },
    { pct: 100, msg: "Ready." }
  ];

  function showBootSplash(logout) {
    if (bootSplash) {
      bootSplash.classList.remove("hiding");
      bootSplash.hidden = false;
    }
    if (logout) {
      setTimeout(function () { boot({ fast: false }); }, 400);
    }
  }

  function hideBootSplash(cb) {
    if (!bootSplash) { if (cb) cb(); return; }
    if (reduceMotion) {
      bootSplash.hidden = true;
      if (cb) cb();
      return;
    }
    bootSplash.classList.add("hiding");
    setTimeout(function () {
      bootSplash.hidden = true;
      if (cb) cb();
    }, 450);
  }

  function runBootSplash(onDone) {
    if (!bootSplash || reduceMotion) { onDone(); return; }
    var bar = $("splash-bar");
    var dots = $("splash-dots");
    var step = 0;
    var skipped = false;

    function skip() { skipped = true; }
    bootSplash.addEventListener("click", skip, { once: true });
    document.addEventListener("keydown", skip, { once: true });

    function next() {
      if (skipped || step >= BOOT_STEPS.length) {
        hideBootSplash(onDone);
        return;
      }
      var s = BOOT_STEPS[step++];
      if (bar) bar.style.width = s.pct + "%";
      if (dots) dots.textContent = s.msg;
      setTimeout(next, skipped ? 0 : (step === BOOT_STEPS.length ? 300 : 220));
    }
    next();
  }

  /* ---------- CLOCK ---------- */
  function updateClock() {
    if (!panelClock) return;
    var d = new Date();
    function z(n) { return n < 10 ? "0" + n : "" + n; }
    var days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    panelClock.textContent = days[d.getDay()] + " " + months[d.getMonth()] + " " + d.getDate() + "  " + z(d.getHours()) + ":" + z(d.getMinutes());
  }
  updateClock();
  setInterval(updateClock, 10000);

  /* ---------- APP MENU ---------- */
  function openAppMenu() {
    if (!appmenu) return;
    state.appmenuOpen = true;
    appmenu.hidden = false;
    appmenuBtn.classList.add("active");
    appmenuBtn.setAttribute("aria-expanded", "true");
    var search = $("appmenu-search");
    if (search) { search.value = ""; setTimeout(function () { search.focus(); }, 50); }
    // Filter logic
    if (search) {
      search.addEventListener("input", filterAppMenu);
    }
  }
  function closeAppMenu() {
    if (!appmenu) return;
    state.appmenuOpen = false;
    appmenu.hidden = true;
    appmenuBtn.classList.remove("active");
    appmenuBtn.setAttribute("aria-expanded", "false");
  }
  function filterAppMenu() {
    var search = $("appmenu-search");
    if (!search) return;
    var q = search.value.toLowerCase().trim();
    Array.prototype.forEach.call(document.querySelectorAll(".appmenu-item"), function (item) {
      var label = (item.querySelector(".appmenu-item-label") || {}).textContent || "";
      var desc = (item.querySelector(".appmenu-item-desc") || {}).textContent || "";
      var cmd = item.getAttribute("data-cmd") || "";
      var match = !q || label.toLowerCase().indexOf(q) >= 0 || desc.toLowerCase().indexOf(q) >= 0 || cmd.toLowerCase().indexOf(q) >= 0;
      item.hidden = !match;
    });
  }
  if (appmenuBtn) {
    appmenuBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      state.appmenuOpen ? closeAppMenu() : openAppMenu();
    });
  }
  var appmenuPlainBtn = $("appmenu-plain-btn");
  if (appmenuPlainBtn) {
    appmenuPlainBtn.addEventListener("click", function () { closeAppMenu(); showPlain(); });
  }

  /* ---------- WINDOW MANAGER ---------- */
  function maximizeWindow() {
    if (!terminalWindow) return;
    terminalWindow.classList.toggle("maximized");
    state.windowMaximized = !state.windowMaximized;
  }
  function minimizeWindow() {
    if (!terminalWindow) return;
    state.windowMinimized = true;
    terminalWindow.classList.add("minimized");
    // Keep focus on the panel
    var firstPanelWin = document.querySelector(".panel-win");
    if (firstPanelWin) firstPanelWin.focus();
  }
  function restoreWindow() {
    if (!terminalWindow) return;
    state.windowMinimized = false;
    terminalWindow.classList.remove("minimized");
    if (!state.busy && !isTouch()) input.focus({ preventScroll: true });
  }
  function closeWindow() {
    // "close" just minimizes (there's nowhere to go)
    minimizeWindow();
  }

  // Window control buttons
  var wcClose = $("wc-close"), wcMin = $("wc-min"), wcMax = $("wc-max");
  if (wcClose) wcClose.addEventListener("click", closeWindow);
  if (wcMin)   wcMin.addEventListener("click", minimizeWindow);
  if (wcMax)   wcMax.addEventListener("click", maximizeWindow);

  // Double-click titlebar = maximize
  var titlebar = $("terminal-titlebar");
  if (titlebar) {
    titlebar.addEventListener("dblclick", function (e) {
      if (!e.target.closest(".window-controls")) maximizeWindow();
    });
  }

  // Panel win click = restore and run command
  Array.prototype.forEach.call(document.querySelectorAll(".panel-win"), function (btn) {
    btn.addEventListener("click", function () {
      if (state.windowMinimized) restoreWindow();
      var cmd = btn.getAttribute("data-cmd");
      if (cmd) runLine(cmd);
      if (!isTouch()) input.focus({ preventScroll: true });
    });
  });

  /* ---------- DRAG (window manager) ---------- */
  if (titlebar && terminalWindow && !isTouch()) {
    titlebar.addEventListener("mousedown", function (e) {
      if (e.target.closest(".window-controls, .themes")) return;
      if (state.windowMaximized) return;
      state.dragActive = true;
      var rect = terminalWindow.getBoundingClientRect();
      state.dragOffX = e.clientX - rect.left;
      state.dragOffY = e.clientY - rect.top;
      e.preventDefault();
    });
    document.addEventListener("mousemove", function (e) {
      if (!state.dragActive) return;
      var deskRect = ($("desktop-area") || document.body).getBoundingClientRect();
      var newLeft = e.clientX - state.dragOffX - deskRect.left;
      var newTop  = e.clientY - state.dragOffY - deskRect.top;
      // Constrain to desktop area
      newLeft = Math.max(-50, Math.min(deskRect.width - 100, newLeft));
      newTop  = Math.max(0, Math.min(deskRect.height - 60, newTop));
      terminalWindow.style.left   = newLeft + "px";
      terminalWindow.style.top    = newTop  + "px";
      terminalWindow.style.right  = "auto";
      terminalWindow.style.bottom = "auto";
      terminalWindow.style.width  = terminalWindow.style.width || (terminalWindow.getBoundingClientRect().width + "px");
      terminalWindow.style.height = terminalWindow.style.height || (terminalWindow.getBoundingClientRect().height + "px");
    });
    document.addEventListener("mouseup", function () { state.dragActive = false; });
  }

  /* ---------- boot sequence ---------- */
  function bootLines() {
    return [
      [c("dim", "[ OK ] Mounted /home/guest (read-only)"), 120],
      [c("dim", "[ OK ] Loaded " + (D.projects || []).length + " projects"), 100],
      [c("dim", "[ OK ] Cinnamon desktop started"), 100],
      [c("dim", "[ OK ] Portfolio shell ready"), 200]
    ];
  }

  function boot(opts) {
    var myBoot = ++state.bootId;
    var fast = !!(opts && opts.fast);
    var skip = fast || reduceMotion;
    state.busy = true;
    row.hidden = true;
    out.setAttribute("aria-live", "off");
    out.textContent = "";
    state.histIdx = -1;
    input.value = "";

    function onSkip() { skip = true; }

    // Show the Cinnamon desktop shell (always, even if splash skipped)
    if (cinnamonDesktop) cinnamonDesktop.hidden = false;

    // For fast (repeat) boot, skip splash entirely
    if (fast) {
      _finishBoot(myBoot, skip);
      return;
    }

    // Run the boot splash, then do the terminal boot sequence
    runBootSplash(function () {
      window.addEventListener("keydown", onSkip, { once: false });
      window.addEventListener("pointerdown", onSkip, { once: false });
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
      chain.then(function () {
        window.removeEventListener("keydown", onSkip);
        window.removeEventListener("pointerdown", onSkip);
        _finishBoot(myBoot, skip);
      });
    });
  }

  function _finishBoot(myBoot, skip) {
    if (myBoot !== state.bootId) return;
    out.textContent = "";
    shell.exec("home", ctx(), { record: false }).html.forEach(function (h) { print(h); });
    state.h1Used = true;
    sset("booted", "1");
    state.busy = false;
    out.setAttribute("aria-live", "polite");
    row.hidden = false;
    refreshPrompt();
    if (!isTouch()) input.focus({ preventScroll: true });
    screen.scrollTop = 0;
  }

  /* ---------- plain (non-terminal) view — full CV design ---------- */
  function buildPlain() {
    var L = D.links, h = [];
    function link(url, text) {
      return '<a href="' + esc(S.safeUrl(url)) + '" target="_blank" rel="noopener noreferrer">' + esc(text) + "</a>";
    }
    function chip(text) {
      return '<span class="plain-chip">' + esc(text) + "</span>";
    }
    function stackTag(text) {
      return '<span class="plain-stack-tag">' + esc(text) + "</span>";
    }

    h.push('<div class="plain-inner">');
    h.push('<button type="button" class="plain-close" id="plain-close">← Back to terminal (Esc)</button>');

    // Header
    h.push('<div class="plain-header">');
    h.push("<h1>" + esc(D.name) + "</h1>");
    h.push('<p class="plain-role">' + esc(D.role) + "</p>");
    if (D.tagline) h.push('<p class="plain-tagline">' + esc(D.tagline) + "</p>");
    if (D.openToWork) {
      h.push('<div class="plain-ow-badge"><span class="plain-ow-dot"></span> Open to Work — Internship &amp; Part-time Roles</div>');
    }
    if (D.location) h.push('<p style="font-size:.88rem;color:var(--dim);margin:.2rem 0">' + esc(D.location) + "</p>");
    h.push('<div class="plain-links">');
    h.push(link(L.github, "GitHub"));
    h.push(link(L.linkedin, "LinkedIn"));
    h.push(link("mailto:" + L.email, L.email));
    if (L.resume) h.push(link(L.resume, "Résumé PDF"));
    h.push("</div>");
    h.push("</div>"); // /.plain-header

    // About
    h.push("<h2>About</h2>");
    var list = false;
    (D.about || []).forEach(function (line) {
      var isLi = /^- /.test(line);
      if (isLi && !list) { h.push("<ul>"); list = true; }
      if (!isLi && list) { h.push("</ul>"); list = false; }
      h.push(isLi ? "<li>" + esc(line.slice(2)) + "</li>" : "<p>" + esc(line) + "</p>");
    });
    if (list) h.push("</ul>");

    // Skills
    h.push("<h2>Skills</h2>");
    h.push('<div class="plain-skills-groups">');
    (D.skills || []).forEach(function (g) {
      var label = g.label || (D.skillLabels && D.skillLabels[g.id]) || g.id;
      h.push('<div class="plain-skill-group">');
      h.push('<span class="plain-skill-label">' + esc(label) + "</span>");
      h.push('<div class="plain-skill-chips">' + g.items.map(chip).join("") + "</div>");
      h.push("</div>");
    });
    h.push("</div>");

    // Experience
    if ((D.experience || []).length) {
      h.push("<h2>Experience</h2>");
      D.experience.forEach(function (x) {
        var when = [x.period, x.location].filter(Boolean).join("  ·  ");
        h.push('<div class="plain-exp-entry">');
        h.push('<div class="plain-exp-header">');
        h.push("<h3>" + esc(x.role) + ", " + esc(x.org) + "</h3>");
        if (when) h.push('<span class="plain-exp-when">' + esc(when) + "</span>");
        h.push("</div>");
        h.push('<p class="plain-exp-summary">' + esc(x.summary) + "</p>");
        if (x.points && x.points.length) {
          h.push('<ul class="plain-exp-points">' + x.points.map(function (pt) { return "<li>" + esc(pt) + "</li>"; }).join("") + "</ul>");
        }
        if (x.link) h.push('<p>' + link(x.link, "View work →") + "</p>");
        h.push("</div>");
      });
    }

    // Projects
    h.push("<h2>Projects</h2>");
    (D.projects || []).forEach(function (p) {
      h.push('<article class="plain-project">');
      h.push('<div class="plain-project-header">');
      h.push("<h3>" + esc(p.name) + (p.status ? ' <span class="plain-status-badge">' + esc(p.status) + "</span>" : "") + "</h3>");
      if (p.live || p.repo) {
        h.push('<div class="plain-project-links">');
        if (p.live) h.push(link(p.live, "Live site ↗"));
        if (p.repo) h.push(link(p.repo, "GitHub ↗"));
        h.push("</div>");
      }
      h.push("</div>");
      h.push("<p>" + esc(p.description) + "</p>");
      if (p.highlights && p.highlights.length) {
        h.push("<ul>" + p.highlights.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>");
      }
      if (p.role) h.push('<p class="plain-role-note">My part: ' + esc(p.role) + "</p>");
      if (p.stack && p.stack.length) {
        h.push('<div class="plain-stack">' + p.stack.map(stackTag).join("") + "</div>");
      }
      h.push("</article>");
    });

    // Achievements
    h.push("<h2>Achievements</h2>");
    (D.achievements || []).forEach(function (x) {
      h.push('<div class="plain-achievement">');
      h.push('<div class="plain-achievement-title">🏆 ' + esc(x.title) + "</div>");
      h.push('<div class="plain-achievement-detail">' + esc(x.detail) + "</div>");
      h.push("</div>");
    });

    // Certifications
    if ((D.certifications || []).length) {
      h.push("<h2>Certifications</h2>");
      h.push('<div class="plain-certs">');
      D.certifications.forEach(function (x) {
        var meta = [x.issuer, x.issued ? "Issued " + x.issued : "", x.expires ? "Expires " + x.expires : ""].filter(Boolean).join("  ·  ");
        h.push('<div class="plain-cert">');
        h.push('<span class="plain-cert-name">' + esc(x.title) + "</span>");
        if (meta) h.push('<span class="plain-cert-meta">' + esc(meta) + "</span>");
        h.push("</div>");
      });
      h.push("</div>");
    }

    // Roadmap
    if ((D.roadmap || []).length) {
      h.push("<h2>Career Roadmap</h2>");
      h.push('<div class="plain-roadmap">');
      D.roadmap.forEach(function (entry) {
        h.push('<div class="plain-roadmap-row">');
        h.push('<span class="plain-roadmap-year">' + esc(entry.year) + "</span>");
        h.push('<span class="plain-roadmap-item">' + esc(entry.item) + "</span>");
        h.push("</div>");
      });
      h.push("</div>");
    }

    // Contact + Hire CTA
    h.push("<h2>Contact</h2>");
    if (D.openToWork) {
      h.push('<div class="plain-contact-cta">');
      h.push("<p><strong>Open to Work</strong> — actively seeking internship or part-time roles in full-stack, Android, or applied AI.</p>");
      h.push('<p>' + link("mailto:" + L.email, L.email) + "  ·  " + link(L.linkedin, "LinkedIn") + "  ·  " + link(L.github, "GitHub") + "</p>");
      if (L.resume) h.push('<p>' + link(L.resume, "Download Résumé (PDF)") + "</p>");
      h.push("</div>");
    } else {
      h.push('<p>' + link("mailto:" + L.email, L.email) + "</p>");
    }

    // Education footer
    var edu = (D.education || []).filter(function (e) { return e.degree; });
    if (edu.length) {
      h.push('<div class="plain-edu">');
      h.push(edu.map(function (e) {
        return esc(e.degree + (e.institution ? ", " + e.institution : "") + (e.period ? " (" + e.period + ")" : "") + (e.cgpa ? "  ·  CGPA " + e.cgpa : ""));
      }).join("<br>"));
      h.push("</div>");
    }

    h.push("</div>");
    return h.join("");
  }

  function setInert(on) {
    var ids = ["screen", "cinnamon-panel", "terminal-window", "appmenu"];
    ids.forEach(function (id) { var el = $(id); if (el) el.inert = on; });
  }
  function showPlain() {
    if (state.plainOpen) return;
    plain.innerHTML = buildPlain();
    plain.hidden = false;
    plain.scrollTop = 0;
    state.plainOpen = true;
    setInert(true);
    var closeBtn = $("plain-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", function () { hidePlain(true); });
      closeBtn.focus();
    }
  }
  function hidePlain(refocus) {
    if (!state.plainOpen) return;
    plain.hidden = true;
    plain.innerHTML = "";
    state.plainOpen = false;
    setInert(false);
    if (refocus && !state.busy && !isTouch()) input.focus({ preventScroll: true });
  }

  // Plain btn listeners (there are several in the DOM now)
  Array.prototype.forEach.call(document.querySelectorAll("#btn-plain"), function (btn) {
    btn.addEventListener("click", showPlain);
  });

  // Theme buttons
  Array.prototype.forEach.call(document.querySelectorAll(".th"), function (b) {
    b.addEventListener("click", function () {
      var pick = b.getAttribute("data-theme-pick");
      // Map data-theme-pick value to canonical theme name
      var name = { "graphite": "dark", "chalk": "light", "mint-y-teal": "mint-y-teal" }[pick] || pick;
      applyTheme(name);
    });
  });

  // Desktop icon double-click support
  Array.prototype.forEach.call(document.querySelectorAll(".desktop-icon"), function (icon) {
    var timer = null;
    icon.addEventListener("click", function () {
      if (timer) {
        clearTimeout(timer);
        timer = null;
        // double click = run command
        var cmd = icon.getAttribute("data-cmd");
        if (cmd) runLine(cmd);
        if (!isTouch()) input.focus({ preventScroll: true });
      } else {
        timer = setTimeout(function () { timer = null; }, 400);
      }
    });
  });

  /* ---------- go ---------- */
  // Determine saved theme
  var savedTheme = lget("theme");
  // Map legacy CSS theme names to canonical
  var legacyMap = { graphite: "dark", chalk: "light", phosphor: "mint-y-teal" };
  if (savedTheme && legacyMap[savedTheme]) savedTheme = legacyMap[savedTheme];
  if (!savedTheme) savedTheme = window.matchMedia && matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  applyTheme(savedTheme, false);

  refreshPrompt();
  boot({ fast: sget("booted") === "1" });
})();