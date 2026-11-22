/*!
 * programs.js — the animated "fun" programs a terminal can run:
 * cmatrix, btop, htop, sl, nyancat, pipes, aafire, cbonsai, asciiquarium, hollywood,
 * snake, ping, yes, sleep, starwars, rain, clock, apt, vim/nano/emacs.
 *
 * Each program is  function (term, args, input) -> { stop: fn, key: fn(e) }
 * `term` is given by terminal.js:
 *   term.screen()        -> a <pre> covering the terminal (fullscreen mode); term.cols / term.rows are kept current
 *   term.println(html)   -> append a line to the normal output (stream mode)
 *   term.exit()          -> the program is finished; the prompt comes back
 *   term.esc(s)          -> HTML-escape
 *   term.bigText(s)      -> 5-row block letters (from shell.js)
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PortfolioPrograms = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var P = {};
  function rnd(n) { return Math.floor(Math.random() * n); }
  function pick(a) { return a[rnd(a.length)]; }
  function rep(ch, n) { return n > 0 ? new Array(n + 1).join(ch) : ""; }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function span(cls, s) { return '<span class="' + cls + '">' + s + "</span>"; }
  function isQuit(e) { return e.key === "q" || e.key === "Q" || e.key === "Escape" || (e.ctrlKey && (e.key === "c" || e.key === "C")); }
  function every(fn, ms) { var id = setInterval(fn, ms); return function () { clearInterval(id); }; }
  function grid(cols, rows, fill) { var g = []; for (var y = 0; y < rows; y++) { g.push(new Array(cols + 1).join(fill || " ").split("")); } return g; }
  function box(title, w, h, lines, cls) {
    /* draw a rounded box with a title; lines are HTML already sized to w-2 */
    var inner = w - 2, out = [];
    var t = title ? "┤ " + title + " ├" : "";
    var top = "╭" + t + rep("─", Math.max(0, inner - t.length)) + "╮";
    out.push(span(cls || "cd", top));
    for (var i = 0; i < h - 2; i++) {
      var l = lines[i] || "";
      out.push(span(cls || "cd", "│") + padHtml(l, inner) + span(cls || "cd", "│"));
    }
    out.push(span(cls || "cd", "╰" + rep("─", inner) + "╯"));
    return out;
  }
  function textLen(html) { return html.replace(/<[^>]+>/g, "").replace(/&[a-z]+;/g, "x").length; }
  function padHtml(html, w) { var n = w - textLen(html); return n > 0 ? html + rep(" ", n) : html; }
  function bar(frac, w, cls) {
    var n = Math.max(0, Math.min(w, Math.round(frac * w)));
    return span(cls || "cg", rep("█", n)) + span("cd", rep("░", w - n));
  }
  var SPARK = "▁▂▃▄▅▆▇█";
  function spark(hist, w) {
    var s = "", from = Math.max(0, hist.length - w);
    for (var i = from; i < hist.length; i++) s += SPARK[Math.min(7, Math.floor(hist[i] * 8))];
    return rep(" ", w - (hist.length - from)) + s;
  }
  function walk(v, step, lo, hi) { v += (Math.random() - 0.5) * step; return Math.max(lo, Math.min(hi, v)); }
  function clock2(d) { function z(n) { return n < 10 ? "0" + n : "" + n; } return z(d.getHours()) + ":" + z(d.getMinutes()) + ":" + z(d.getSeconds()); }

  /* ------------------------------------------------------------------ cmatrix */
  P.cmatrix = function (term, args) {
    var scr = term.screen(), rainbow = args.indexOf("-r") >= 0;
    var glyphs = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789ABCDEFXYZ<>*+=-$#%&";
    var cols, rows, drops, chars, colour;
    function reset() {
      cols = term.cols; rows = term.rows; drops = []; chars = grid(cols, rows, " "); colour = [];
      for (var x = 0; x < cols; x++) { drops.push({ y: rnd(rows * 2) - rows, len: 6 + rnd(14), speed: Math.random() < 0.3 ? 2 : 1 }); colour.push(rnd(6)); }
    }
    reset();
    var stop = every(function () {
      if (cols !== term.cols || rows !== term.rows) reset();
      var html = "", y, x;
      for (x = 0; x < cols; x++) {
        var d = drops[x];
        d.y += d.speed;
        if (d.y - d.len > rows) { d.y = -rnd(rows); d.len = 6 + rnd(14); colour[x] = rnd(6); }
        var head = Math.min(rows - 1, d.y);
        if (head >= 0 && Math.random() < 0.9) chars[head][x] = glyphs[rnd(glyphs.length)];
        if (Math.random() < 0.05) { var ry = rnd(rows); chars[ry][x] = glyphs[rnd(glyphs.length)]; }
      }
      for (y = 0; y < rows; y++) {
        var line = "";
        for (x = 0; x < cols; x++) {
          var d2 = drops[x], dist = d2.y - y;
          if (dist < 0 || dist > d2.len) { line += " "; continue; }
          var cls = dist === 0 ? "mx-h" : dist < 3 ? (rainbow ? "lc-" + colour[x] * 2 : "mx-1") : dist < d2.len - 3 ? (rainbow ? "lc-" + (colour[x] * 2 + 1) : "mx-2") : "mx-3";
          line += span(cls, esc(chars[y][x]));
        }
        html += line + "\n";
      }
      scr.innerHTML = html;
    }, 70);
    return { stop: stop, key: function (e) { if (isQuit(e)) term.exit(); } };
  };

  /* ------------------------------------------------------------------ btop */
  P.btop = function (term) {
    var scr = term.screen();
    var ncpu = 8, cpu = [], hist = [], mem = 0.21, memHist = [], net = { up: 0.1, down: 0.3 }, netHist = [], t0 = Date.now();
    for (var i = 0; i < ncpu; i++) { cpu.push(0.1 + Math.random() * 0.3); }
    var procs = [["cinnamon", "ashutosh", 2.1, 1.9], ["firefox", "guest", 7.4, 12.3], ["gnome-terminal", "guest", 0.8, 0.6], ["nemo", "guest", 0.3, 0.9], ["node tests/shell.test.js", "ashutosh", 0.2, 0.4],
                 ["python -m uvicorn driftguard:app", "ashutosh", 3.1, 2.2], ["streamlit run neel_tarang.py", "ashutosh", 2.6, 3.1], ["gradle --daemon", "ashutosh", 1.0, 6.5], ["coffee --refill", "guest", 0.0, 0.1], ["btop", "guest", 0.9, 0.3]];
    function frame() {
      var W = term.cols, H = term.rows, x, l;
      if (W < 40 || H < 12) { scr.innerHTML = span("cy", "btop needs a bigger window (" + W + "x" + H + "). Press q to quit."); return; }
      var total = 0;
      for (x = 0; x < ncpu; x++) { cpu[x] = walk(cpu[x], 0.25, 0.02, 0.98); total += cpu[x]; }
      total /= ncpu; hist.push(total); if (hist.length > 200) hist.shift();
      mem = walk(mem, 0.02, 0.15, 0.6); memHist.push(mem); if (memHist.length > 200) memHist.shift();
      net.up = walk(net.up, 0.2, 0, 1); net.down = walk(net.down, 0.3, 0, 1); netHist.push(net.down); if (netHist.length > 200) netHist.shift();
      var cpuH = Math.max(6, Math.floor(H * 0.38)), midH = Math.max(5, Math.floor(H * 0.22)), procH = H - cpuH - midH;
      var lines = [];
      /* cpu box */
      var inner = W - 2, cl = [];
      cl.push(" " + span("cw", "CPU ") + spark(hist, inner - 12) + " " + span("cg", (total * 100).toFixed(0) + "%"));
      var perRow = Math.max(1, Math.floor(inner / 18));
      for (x = 0; x < ncpu; x += perRow) {
        var row = "";
        for (var k = x; k < Math.min(ncpu, x + perRow); k++) row += " " + span("cd", "C" + k + " ") + bar(cpu[k], 8, cpu[k] > 0.7 ? "cr" : cpu[k] > 0.4 ? "cy" : "cg") + " " + span("cw", String(Math.round(cpu[k] * 100)).padStart(3) + "%");
        cl.push(row);
      }
      var up = Math.floor((Date.now() - t0) / 1000);
      cl.push(" " + span("cd", "load avg: ") + span("cw", (total * 2).toFixed(2) + " " + (total * 1.5).toFixed(2) + " " + (total).toFixed(2)) + span("cd", "   uptime ") + span("cw", up + "s"));
      lines = lines.concat(box("cpu", W, cpuH, cl, "cg"));
      /* mem + net side by side */
      var lw = Math.floor(W / 2), rw = W - lw;
      var ml = [" " + span("cw", "Total") + " 15.6 GiB", " " + span("cw", "Used ") + " " + bar(mem, lw - 16, "cm") + " " + (mem * 15.6).toFixed(1) + "G", " " + span("cw", "Cache") + " " + bar(0.19, lw - 16, "cb") + " 3.0G", " " + span("cw", "Swap ") + " " + bar(0.0, lw - 16, "cy") + " 0.0G"];
      var nl = [" " + span("cw", "▼ down ") + spark(netHist, rw - 18) + " " + span("cc", (net.down * 8.2).toFixed(1) + "MB/s"), " " + span("cw", "▲ up   ") + bar(net.up, rw - 18, "cy") + " " + span("cy", (net.up * 1.3).toFixed(1) + "MB/s"), " " + span("cd", "wlp3s0  192.168.1.42"), " " + span("cd", "(decorative: this page makes no requests)")];
      var mb = box("mem", lw, midH, ml, "cm"), nb = box("net", rw, midH, nl, "cc");
      for (l = 0; l < midH; l++) lines.push(mb[l] + nb[l]);
      /* procs */
      var pl = [" " + span("cw", "Pid:  Program:                           User:      Cpu%   Mem%")];
      procs.forEach(function (p, i) {
        p[2] = walk(p[2], 1.2, 0, 25); p[3] = walk(p[3], 0.1, 0, 20);
        pl.push(" " + span("cd", String(400 + i * 37).padStart(4)) + "  " + span(i === 0 ? "cg" : "cw", padHtml(esc(p[0]).slice(0, 34), 34)) + "  " + span("cd", padHtml(p[1], 9)) + "  " + span(p[2] > 5 ? "cy" : "cw", p[2].toFixed(1).padStart(5)) + "  " + span("cw", p[3].toFixed(1).padStart(5)));
      });
      lines = lines.concat(box("proc", W, procH, pl, "cy"));
      scr.innerHTML = lines.slice(0, H).join("\n");
    }
    frame();
    var stop = every(frame, 700);
    return { stop: stop, key: function (e) { if (isQuit(e)) term.exit(); } };
  };

  /* ------------------------------------------------------------------ htop */
  P.htop = function (term, args) {
    var scr = term.screen();
    var ncpu = 4, cpu = [0.2, 0.4, 0.1, 0.3], mem = 0.26;
    var procs = [[1, "root", "/sbin/init splash"], [503, "guest", "cinnamon --replace"], [611, "guest", "nemo-desktop"], [790, "guest", "gnome-terminal-server"], [812, "guest", "firefox"], [901, "ashutosh", "uvicorn driftguard:app"], [944, "ashutosh", "streamlit run app.py"], [1002, "guest", "htop"]];
    function frame() {
      var W = term.cols, bw = Math.max(10, Math.floor(W / 2) - 14), lines = [], i;
      for (i = 0; i < ncpu; i++) {
        cpu[i] = walk(cpu[i], 0.3, 0.01, 0.97);
        var n = Math.round(cpu[i] * bw);
        lines.push(span("cc", "  " + i + "  ") + span("cd", "[") + span(cpu[i] > 0.7 ? "cr" : "cg", rep("|", n)) + rep(" ", bw - n) + span("cw", (cpu[i] * 100).toFixed(1).padStart(5) + "%") + span("cd", "]"));
      }
      mem = walk(mem, 0.02, 0.1, 0.7);
      lines.push(span("cc", "  Mem") + span("cd", "[") + span("cg", rep("|", Math.round(mem * bw))) + rep(" ", bw - Math.round(mem * bw)) + span("cw", (mem * 15.6).toFixed(2) + "G/15.6G") + span("cd", "]"));
      lines.push(span("cc", "  Swp") + span("cd", "[") + rep(" ", bw) + span("cw", "0K/2.00G") + span("cd", "]"));
      lines.push(span("cd", "  Tasks: ") + span("cw", procs.length + ", 1 thr; 1 running") + span("cd", "   Load average: ") + span("cw", (cpu[0] + cpu[1]).toFixed(2) + " 0.31 0.17") + span("cd", "   Uptime: ") + span("cw", clock2(new Date())));
      lines.push("");
      lines.push(span("hdr", padHtml("  PID USER      PRI  NI    VIRT    RES  S CPU%  MEM%   TIME+  Command", W)));
      procs.forEach(function (p, idx) {
        var c = (Math.random() * 6).toFixed(1), m = (0.1 + Math.random() * 3).toFixed(1);
        lines.push(span("cw", String(p[0]).padStart(5)) + " " + span("cg", p[1].padEnd(9)) + "  20   0 " + span("cd", String(80000 + idx * 7331).padStart(7) + " " + String(10000 + idx * 911).padStart(6)) + "  " + (idx === procs.length - 1 ? "R" : "S") + " " + String(c).padStart(4) + "  " + String(m).padStart(4) + "  0:0" + idx + ".42  " + span(idx === procs.length - 1 ? "cg" : "cw", p[2]));
      });
      while (lines.length < term.rows - 1) lines.push("");
      lines.push(span("hdr", padHtml("F1Help  F2Setup F3Search F4Filter F5Tree  F6SortBy F7Nice - F8Nice + F9Kill  F10Quit (or q)", W)));
      scr.innerHTML = lines.slice(0, term.rows).join("\n");
    }
    frame();
    var stop = every(frame, 1000);
    return { stop: stop, key: function (e) { if (isQuit(e) || e.key === "F10") term.exit(); } };
  };

  /* ------------------------------------------------------------------ sl */
  P.sl = function (term) {
    var scr = term.screen();
    var smoke = ["  (@@@)   (@@)  (@)   ( )", "    (@@@@)   (@@)   ( )   "];
    var loco = [
      "      ====        ________                ___________ ",
      "  _D _|  |_______/        \\__I_I_____===__|_________| ",
      "   |(_)---  |   H\\________/ |   |        =|___ ___|   ",
      "   /     |  |   H  |  |     |   |         ||_| |_||   ",
      "  |      |  |   H  |__--------------------| [___] |   ",
      "  | ________|___H__/__|_____/[][]~\\_______|       |   ",
      "  |/ |   |-----------I_____I [][] []  D   |=======|__ "
    ];
    var wheels = [
      "__/ =| o |=-~~\\  /~~\\  /~~\\  /~~\\ ____Y___________|__ ",
      " |/-=|___|=    ||    ||    ||    |_____/~\\___/        ",
      "  \\_/      \\O=====O=====O=====O_/      \\_/            "
    ];
    var wheels2 = [
      "__/ =| o |=-O=====O=====O=====O \\ ____Y___________|__ ",
      " |/-=|___|=    ||    ||    ||    |_____/~\\___/        ",
      "  \\_/      \\__/  \\__/  \\__/  \\__/      \\_/            "
    ];
    var coach = [
      "                              ",
      "    _________________         ",
      "   |  ___ ___ ___ ___ |        ",
      "   |  |_| |_| |_| |_| |        ",
      "   |__________________|        ",
      "   |__________________|        ",
      "   |__________________|        ",
      "___|__________________|___     ",
      "    (O)        (O)             ",
      "                               "
    ];
    var x = term.cols, frame = 0;
    var stop = every(function () {
      var W = term.cols, H = term.rows, rows = [], top = Math.max(0, Math.floor(H / 2) - 7), i;
      var art = [smoke[frame % 2]].concat(loco).concat(frame % 2 ? wheels : wheels2);
      for (i = 0; i < top; i++) rows.push("");
      for (i = 0; i < art.length; i++) {
        var line = rep(" ", Math.max(0, x)) + art[i] + " " + (coach[i] || "") + (coach[i] || "");
        if (x < 0) line = (art[i] + " " + (coach[i] || "") + (coach[i] || "")).slice(-x);
        rows.push(span("cw", esc(line.slice(0, W))));
      }
      rows.push(span("cd", rep("─", W)));
      scr.innerHTML = rows.slice(0, H).join("\n");
      x -= 2; frame++;
      if (x < -140) term.exit();
    }, 60);
    return { stop: stop, key: function () { /* real sl ignores Ctrl+C; so does this one */ } };
  };

  /* ------------------------------------------------------------------ nyancat */
  P.nyancat = function (term) {
    var scr = term.screen(), t = 0, start = Date.now();
    var cat = [
      [" ,------,       ", " |   /\\_/\\      ", "~|__( ^ .^)     ", " \"\"  \"\"         "],
      [" ,------,       ", " |   /\\_/\\      ", "~|__( ^ .^)     ", "  \"\"  \"\"        "]
    ];
    var stop = every(function () {
      var W = term.cols, H = term.rows, cy = Math.floor(H / 2) - 2 + (t % 4 < 2 ? 0 : 1), cx = Math.floor(W / 2) - 8, rows = [], y;
      for (y = 0; y < H; y++) {
        var line = "";
        if (y >= cy - 2 && y < cy + 4) {
          var band = y - (cy - 2), cls = "lc-" + ((band * 2) % 12);
          var seg = "";
          for (var x = 0; x < cx; x++) seg += (Math.floor((x + t) / 4) % 2 === 0) ? "█" : "▀";
          line = span(cls, seg);
          var ci = y - cy;
          if (ci >= 0 && ci < 4) line += span("cw", esc(cat[t % 2][ci]));
        }
        if (Math.random() < 0.08) line += rep(" ", rnd(Math.max(1, W - cx - 20))) + span("cw", "·");
        rows.push(line);
      }
      rows[0] = span("cw", "nyan nyan nyan ~ " + ((Date.now() - start) / 1000).toFixed(1) + "s  (q to quit)");
      scr.innerHTML = rows.slice(0, H).join("\n"); t++;
    }, 110);
    return { stop: stop, key: function (e) { if (isQuit(e)) term.exit(); } };
  };

  /* ------------------------------------------------------------------ pipes */
  P.pipes = function (term) {
    var scr = term.screen(), cells, cols, rows, pipes, filled;
    var CH = { "00": "│", "11": "─", "22": "│", "33": "─", "01": "╭", "03": "╮", "21": "╰", "23": "╯", "10": "╯", "12": "╮", "30": "╰", "32": "╭" };
    function reset() {
      cols = term.cols; rows = term.rows; cells = grid(cols, rows, " "); pipes = []; filled = 0;
      for (var i = 0; i < 5; i++) pipes.push({ x: rnd(cols), y: rnd(rows), d: rnd(4), c: "lc-" + rnd(12) });
    }
    reset();
    var stop = every(function () {
      if (cols !== term.cols || rows !== term.rows) reset();
      pipes.forEach(function (p) {
        var nd = Math.random() < 0.15 ? (p.d + (Math.random() < 0.5 ? 1 : 3)) % 4 : p.d;
        var ch = CH[String(p.d) + String(nd)] || "+";
        if (p.y >= 0 && p.y < rows && p.x >= 0 && p.x < cols) { cells[p.y][p.x] = span(p.c, ch); filled++; }
        p.d = nd;
        if (p.d === 0) p.y--; else if (p.d === 1) p.x++; else if (p.d === 2) p.y++; else p.x--;
        if (p.x < 0 || p.x >= cols || p.y < 0 || p.y >= rows) { p.x = rnd(cols); p.y = rnd(rows); p.d = rnd(4); p.c = "lc-" + rnd(12); }
      });
      if (filled > cols * rows * 0.6) reset();
      scr.innerHTML = cells.map(function (r) { return r.join(""); }).join("\n");
    }, 40);
    return { stop: stop, key: function (e) { if (isQuit(e)) term.exit(); } };
  };

  /* ------------------------------------------------------------------ aafire */
  P.aafire = function (term) {
    var scr = term.screen(), buf, cols, rows;
    var ramp = " .:-=+*#%@", cls = ["fi-0", "fi-0", "fi-1", "fi-1", "fi-2", "fi-2", "fi-3", "fi-3", "fi-4", "fi-4"];
    function reset() { cols = term.cols; rows = term.rows; buf = []; for (var i = 0; i < cols * (rows + 2); i++) buf.push(0); }
    reset();
    var stop = every(function () {
      if (cols !== term.cols || rows !== term.rows) reset();
      var x, y, W = cols, H = rows + 2;
      for (x = 0; x < W; x++) { buf[(H - 1) * W + x] = Math.random() < 0.7 ? 9 : rnd(5); buf[(H - 2) * W + x] = Math.random() < 0.6 ? 9 : rnd(6); }
      for (y = 0; y < H - 2; y++) for (x = 0; x < W; x++) {
        var s = buf[(y + 1) * W + x] + buf[(y + 2) * W + x] + buf[(y + 1) * W + Math.max(0, x - 1)] + buf[(y + 1) * W + Math.min(W - 1, x + 1)];
        buf[y * W + x] = Math.max(0, s / 4.04 - (Math.random() < 0.35 ? 0.45 : 0));
      }
      var html = "";
      for (y = 0; y < rows; y++) {
        var line = "", cur = -1, run = "";
        for (x = 0; x < W; x++) {
          var v = Math.min(9, Math.floor(buf[y * W + x])), ch = ramp[v];
          if (v !== cur) { if (run) line += cur <= 0 ? run : span(cls[cur], run); run = ""; cur = v; }
          run += ch;
        }
        if (run) line += cur <= 0 ? run : span(cls[cur], run);
        html += line + "\n";
      }
      scr.innerHTML = html;
    }, 80);
    return { stop: stop, key: function (e) { if (isQuit(e)) term.exit(); } };
  };

  /* ------------------------------------------------------------------ cbonsai */
  P.cbonsai = function (term) {
    var scr = term.screen(), W = term.cols, H = term.rows, cells = grid(W, H, " "), growers = [], steps = 0, done = false;
    var baseY = H - 3, baseX = Math.floor(W / 2);
    var pot = ["(---------)", " (_______) "];
    growers.push({ x: baseX, y: baseY - 1, dx: 0, dy: -1, life: Math.min(28, Math.floor(H * 0.75)), type: "trunk", w: 3 });
    function put(x, y, s, cls) { if (y >= 0 && y < H && x >= 0 && x < W) cells[y][x] = span(cls, s); }
    function step() {
      var next = [];
      growers.forEach(function (g) {
        if (g.life <= 0) {
          if (g.type !== "leaf") { for (var k = 0; k < 6; k++) put(g.x + rnd(5) - 2, g.y + rnd(3) - 1, "&", Math.random() < 0.5 ? "cg" : "lc-4"); }
          return;
        }
        g.life--;
        var ch = g.type === "trunk" ? (g.dx === 0 ? "|" : g.dx > 0 ? "/" : "\\") : (g.dx === 0 ? "|" : g.dx > 0 ? "/" : "\\");
        if (g.type === "trunk" && g.w > 1) { put(g.x - 1, g.y, "/", "lc-2"); put(g.x, g.y, rep("|", 1), "lc-2"); put(g.x + 1, g.y, "\\", "lc-2"); }
        else put(g.x, g.y, ch, g.type === "trunk" ? "lc-2" : "lc-3");
        if (g.type === "trunk") { if (Math.random() < 0.3) g.dx = rnd(3) - 1; g.dy = -1; if (g.life < 18) g.w = 1; }
        else { if (Math.random() < 0.35) g.dx = rnd(3) - 1; g.dy = Math.random() < 0.6 ? -1 : 0; if (g.dx === 0 && g.dy === 0) g.dy = -1; }
        g.x += g.dx; g.y += g.dy;
        if ((g.type === "trunk" && g.life < 22 && Math.random() < 0.22) || (g.type === "branch" && Math.random() < 0.08)) {
          next.push({ x: g.x, y: g.y, dx: Math.random() < 0.5 ? -1 : 1, dy: -1, life: 4 + rnd(Math.max(3, g.life)), type: "branch" });
        }
        next.push(g);
      });
      growers = next.filter(function (g) { return g.life > 0 || g.type !== "leaf"; });
      growers = growers.filter(function (g) { return g.life > 0; }).concat([]);
      if (!growers.length) done = true;
      steps++;
    }
    function render() {
      var rows = cells.map(function (r) { return r.join(""); });
      rows[baseY] = rep(" ", baseX - 5) + span("cd", pot[0]);
      rows[baseY + 1] = rep(" ", baseX - 5) + span("cd", pot[1]);
      rows[H - 1] = span("cd", done ? "bonsai done. press any key" : "growing... (q to stop)");
      scr.innerHTML = rows.join("\n");
    }
    var stop = every(function () { if (!done) { step(); render(); } }, 90);
    return { stop: stop, key: function (e) { if (done || isQuit(e)) term.exit(); } };
  };

  /* ------------------------------------------------------------------ asciiquarium */
  P.asciiquarium = function (term) {
    var scr = term.screen();
    var FISH = [
      { r: ["  \\", "\\ /--\\", " >=  o>", "/ \\__/", "  /"], l: ["/  ", "/--\\ /", "<o  =<", "\\__/ \\", "  \\"] },
      { r: ["><(((º>"], l: ["<º)))><"] },
      { r: ["  ,", " /<)", "<_ )>", "  `"], l: ["  ,", "(>\\ ", "<( _>", "  `"] },
      { r: ["_\\/_", ">O >", " /\\ "], l: ["_\\/_", "< O<", " /\\ "] }
    ];
    var fish = [], bubbles = [], t = 0;
    function spawn() { var k = pick(FISH), dir = Math.random() < 0.5 ? 1 : -1; fish.push({ k: k, dir: dir, x: dir > 0 ? -10 : term.cols + 2, y: 3 + rnd(Math.max(1, term.rows - 9)), sp: 1 + rnd(2), c: "lc-" + rnd(12) }); }
    for (var i = 0; i < 6; i++) { spawn(); fish[i].x = rnd(term.cols); }
    var stop = every(function () {
      var W = term.cols, H = term.rows, cells = grid(W, H, " "), x, y;
      /* surface */
      for (x = 0; x < W; x++) { cells[1][x] = span("cc", "~~^~"[(x + t) % 4]); cells[2][x] = span("cb", (x + t) % 7 === 0 ? "^" : "~"); }
      /* seaweed */
      for (x = 3; x < W; x += Math.max(6, Math.floor(W / 7))) { for (y = H - 2; y > H - 6 - (x % 3); y--) cells[y][x + (((y + t) >> 2) % 2)] = span("cg", (y + t) % 2 ? "(" : ")"); }
      /* floor */
      for (x = 0; x < W; x++) cells[H - 1][x] = span("cy", (x * 7 + 3) % 11 === 0 ? "*" : "_");
      fish.forEach(function (f) {
        f.x += f.dir * f.sp * 0.5;
        var art = f.dir > 0 ? f.k.r : f.k.l;
        art.forEach(function (row, i) { for (var j = 0; j < row.length; j++) { var cx = Math.round(f.x) + j, cy = f.y + i; if (row[j] !== " " && cx >= 0 && cx < W && cy > 2 && cy < H - 1) cells[cy][cx] = span(f.c, esc(row[j])); } });
        if (Math.random() < 0.03) bubbles.push({ x: Math.round(f.x) + (f.dir > 0 ? art[0].length : 0), y: f.y });
      });
      fish = fish.filter(function (f) { return f.x > -15 && f.x < W + 15; });
      while (fish.length < 6) spawn();
      bubbles.forEach(function (b) { b.y -= 1; if (b.y > 2 && b.x >= 0 && b.x < W) cells[b.y][b.x] = span("cw", pick(["o", "O", "."])); });
      bubbles = bubbles.filter(function (b) { return b.y > 2; });
      var rows = cells.map(function (r) { return r.join(""); });
      rows[0] = span("cd", "asciiquarium  (q to quit)");
      scr.innerHTML = rows.join("\n"); t++;
    }, 120);
    return { stop: stop, key: function (e) { if (isQuit(e)) term.exit(); } };
  };

  /* ------------------------------------------------------------------ hollywood */
  P.hollywood = function (term) {
    var scr = term.screen();
    var src = ["def screen(csv):", "    df = pd.read_csv(csv)", "    z = (df - df.median()) / mad(df)", "    return verdict(z)", "@app.post('/analyze')", "async def analyze(file: UploadFile):", "    return JSONResponse(result)", "fun onCrashDetected() {", "    viewModel.startCountdown()", "}", "const graph = buildGraph(messages)", "export default function Dashboard()", "if (score > threshold) reject()", "git push origin main", "npm run build", "pytest -q tests/", "uvicorn main:app --reload", "sqlite3 roadsos.db '.tables'"];
    var logs = ["[ OK ] Started Network Manager", "[ OK ] Reached target Graphical Interface", "ACCESS GRANTED", "decrypting block 0x3f2a...", "ssh: connecting to 10.0.0.1", "bypassing firewall (just kidding)", "scanning ports 1-65535", "22/tcp open ssh", "80/tcp open http", "443/tcp open https", "compiling kernel module...", "Hash verified: 9f86d081884c7d65", "uploading payload: coffee.deb", "backdoor not found (good)", "reticulating splines"];
    var panes = [[], [], [], []], t = 0;
    function hex() { var s = String((t * 4096 + rnd(4096)).toString(16)).padStart(8, "0") + "  "; for (var i = 0; i < 8; i++) s += (rnd(256)).toString(16).padStart(2, "0") + " "; return s; }
    var stop = every(function () {
      var W = term.cols, H = term.rows, pw = Math.floor(W / 2) - 1, ph = Math.floor(H / 2) - 1;
      if (t % 2 === 0) panes[0].push(span("cg", esc(hex())));
      if (t % 3 === 0) panes[1].push(span(Math.random() < 0.2 ? "cy" : "cw", esc(pick(src))));
      if (t % 4 === 0) panes[2].push(span(Math.random() < 0.3 ? "cr" : "cc", esc("[" + clock2(new Date()) + "] " + pick(logs))));
      if (t % 1 === 0) { var l = ""; for (var i = 0; i < pw; i++) l += Math.random() < 0.5 ? "0" : "1"; panes[3].push(span("mx-2", l)); }
      panes.forEach(function (p) { while (p.length > ph) p.shift(); });
      var rows = [], y;
      for (y = 0; y < ph; y++) rows.push(padHtml((panes[0][y] || "").slice(0, 400), pw) + span("cd", "│") + (panes[1][y] || ""));
      rows.push(span("cd", rep("─", pw) + "┼" + rep("─", W - pw - 1)));
      for (y = 0; y < H - ph - 1; y++) rows.push(padHtml(panes[2][y] || "", pw) + span("cd", "│") + (panes[3][y] || ""));
      scr.innerHTML = rows.slice(0, H).join("\n"); t++;
    }, 90);
    return { stop: stop, key: function (e) { if (isQuit(e)) term.exit(); } };
  };

  /* ------------------------------------------------------------------ snake */
  P.snake = function (term) {
    var scr = term.screen(), W = Math.max(10, Math.min(term.cols, 60)), H = Math.max(8, Math.min(term.rows - 2, 24));
    var snake = [{ x: Math.floor(W / 2), y: Math.floor(H / 2) }], dir = { x: 1, y: 0 }, pending = dir, food, score = 0, over = false, best = 0;
    try { best = parseInt(localStorage.getItem("snake-best") || "0", 10) || 0; } catch (e) { best = 0; }
    function placeFood() { do { food = { x: 1 + rnd(W - 2), y: 1 + rnd(H - 2) }; } while (snake.some(function (s) { return s.x === food.x && s.y === food.y; })); }
    placeFood();
    function render() {
      var cells = grid(W, H, " "), x, y;
      for (x = 0; x < W; x++) { cells[0][x] = span("cd", "═"); cells[H - 1][x] = span("cd", "═"); }
      for (y = 0; y < H; y++) { cells[y][0] = span("cd", "║"); cells[y][W - 1] = span("cd", "║"); }
      cells[0][0] = span("cd", "╔"); cells[0][W - 1] = span("cd", "╗"); cells[H - 1][0] = span("cd", "╚"); cells[H - 1][W - 1] = span("cd", "╝");
      cells[food.y][food.x] = span("cr", "●");
      snake.forEach(function (s, i) { cells[s.y][s.x] = span(i === 0 ? "cw" : "cg", i === 0 ? "█" : "▓"); });
      var rows = cells.map(function (r) { return r.join(""); });
      rows.unshift(span("cw", " snake ") + span("cd", " score ") + span("cy", String(score)) + span("cd", "  best ") + span("cy", String(best)) + span("cd", "   arrows/wasd move, q quits"));
      if (over) rows.push(span("cr", " GAME OVER ") + span("cd", "- press r to restart, q to quit"));
      scr.innerHTML = rows.join("\n");
    }
    function tick() {
      if (over) return;
      dir = pending;
      var h = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
      if (h.x <= 0 || h.x >= W - 1 || h.y <= 0 || h.y >= H - 1 || snake.some(function (s) { return s.x === h.x && s.y === h.y; })) { over = true; if (score > best) { best = score; try { localStorage.setItem("snake-best", String(best)); } catch (e) { /* ignore */ } } render(); return; }
      snake.unshift(h);
      if (h.x === food.x && h.y === food.y) { score++; placeFood(); } else snake.pop();
      render();
    }
    render();
    var stop = every(tick, 110);
    return {
      stop: stop,
      key: function (e) {
        var k = e.key;
        if (k === "q" || k === "Q" || k === "Escape" || (e.ctrlKey && k === "c")) { term.exit(); return; }
        if (over && (k === "r" || k === "R")) { snake = [{ x: Math.floor(W / 2), y: Math.floor(H / 2) }]; dir = pending = { x: 1, y: 0 }; score = 0; over = false; placeFood(); return; }
        var nd = k === "ArrowUp" || k === "w" ? { x: 0, y: -1 } : k === "ArrowDown" || k === "s" ? { x: 0, y: 1 } : k === "ArrowLeft" || k === "a" ? { x: -1, y: 0 } : k === "ArrowRight" || k === "d" ? { x: 1, y: 0 } : null;
        if (nd && !(nd.x === -dir.x && nd.y === -dir.y)) pending = nd;
      },
      swipe: function (dx, dy) { var nd = Math.abs(dx) > Math.abs(dy) ? { x: dx > 0 ? 1 : -1, y: 0 } : { x: 0, y: dy > 0 ? 1 : -1 }; if (!(nd.x === -dir.x && nd.y === -dir.y)) pending = nd; }
    };
  };

  /* ------------------------------------------------------------------ ping / yes / sleep (stream mode) */
  P.ping = function (term, args) {
    var host = args.filter(function (x) { return x.charAt(0) !== "-"; })[0] || "github.com";
    var count = Infinity, i;
    for (i = 0; i < args.length; i++) if (args[i] === "-c" && args[i + 1]) count = parseInt(args[i + 1], 10) || 4;
    if (count === Infinity && args.length === 0) count = Infinity;
    var ip = host === "localhost" || host === "127.0.0.1" ? "127.0.0.1" : [140 + rnd(80), rnd(255), rnd(255), 1 + rnd(254)].join(".");
    var n = 0, sent = 0, times = [];
    term.println(esc("PING " + host + " (" + ip + ") 56(84) bytes of data."));
    function done() {
      term.println("");
      term.println(esc("--- " + host + " ping statistics ---"));
      term.println(esc(sent + " packets transmitted, " + times.length + " received, 0% packet loss, time " + sent * 1000 + "ms"));
      if (times.length) { var mn = Math.min.apply(null, times), mx = Math.max.apply(null, times), av = times.reduce(function (a, b) { return a + b; }, 0) / times.length; term.println(esc("rtt min/avg/max = " + mn.toFixed(1) + "/" + av.toFixed(1) + "/" + mx.toFixed(1) + " ms")); }
      term.exit();
    }
    var stop = every(function () {
      if (n >= count) { stop(); done(); return; }
      var t = host === "localhost" ? 0.02 + Math.random() * 0.05 : 18 + Math.random() * 30; times.push(t); sent++;
      term.println(esc("64 bytes from " + host + " (" + ip + "): icmp_seq=" + (++n) + " ttl=" + (52 + rnd(10)) + " time=" + t.toFixed(1) + " ms"));
      if (n >= count) { stop(); done(); }
    }, 1000);
    return { stop: stop, key: function (e) { if (e.ctrlKey && (e.key === "c" || e.key === "C")) { stop(); term.println("^C"); done(); } } };
  };
  P.yes = function (term, args) {
    var text = args.join(" ") || "y", n = 0;
    var stop = every(function () { for (var i = 0; i < 8; i++) term.println(esc(text)); n += 8; if (n > 4000) { stop(); term.println(span("cd", "yes: ok, that's enough yes for one visit")); term.exit(); } }, 50);
    return { stop: stop, key: function (e) { if (e.ctrlKey && (e.key === "c" || e.key === "C")) { stop(); term.println("^C"); term.exit(); } } };
  };
  P.sleep = function (term, args) {
    var s = Math.min(10, Math.max(0, parseFloat(args[0]) || 1));
    var id = setTimeout(function () { term.exit(); }, s * 1000);
    return { stop: function () { clearTimeout(id); }, key: function (e) { if (e.ctrlKey && (e.key === "c" || e.key === "C")) { clearTimeout(id); term.println("^C"); term.exit(); } } };
  };

  /* ------------------------------------------------------------------ starwars (a short crawl) */
  P.starwars = function (term) {
    var scr = term.screen(), y0 = term.rows, t = 0;
    var text = ["Trying towel.blinkenlights.nl...", "Connected (well, pretend).", "", "", "A long time ago, in a repo far,", "far away....", "", "", "        EPISODE IV", "     A NEW PORTFOLIO", "", "It is a period of hackathons.", "Rebel students, striking from", "a hidden terminal, have won", "their first victory against", "the evil Empire of Bugs.", "", "During the battle, Team", "Secretos managed to ship", "RoadSOS, an app with enough", "power to detect an entire", "crash... offline.", "", "Pursued by deadlines, the", "author races home aboard his", "laptop, custodian of the", "resume that can save his", "people and restore freedom", "to the job market....", "", "", "        (q to skip)"];
    var stop = every(function () {
      var W = term.cols, H = term.rows, rows = [], i;
      for (i = 0; i < H; i++) {
        var li = i - (y0 - t);
        var line = li >= 0 && li < text.length ? text[li] : "";
        var padL = Math.max(0, Math.floor((W - 34) / 2));
        rows.push(rep(" ", padL) + span("cy", esc(line)));
      }
      scr.innerHTML = rows.join("\n"); t++;
      if (t > y0 + text.length + 2) term.exit();
    }, 350);
    return { stop: stop, key: function (e) { if (isQuit(e)) term.exit(); } };
  };

  /* ------------------------------------------------------------------ rain */
  P.rain = function (term) {
    var scr = term.screen(), drops = [];
    var stop = every(function () {
      var W = term.cols, H = term.rows, cells = grid(W, H, " ");
      for (var i = 0; i < Math.max(1, Math.floor(W / 6)); i++) drops.push({ x: rnd(W), y: 0, s: 1 + rnd(2) });
      drops.forEach(function (d) { d.y += d.s; if (d.y < H - 1) cells[d.y][d.x] = span("cb", d.s > 1 ? "|" : "'"); else if (d.y < H + 1) { cells[H - 1][d.x] = span("cc", "o"); } });
      drops = drops.filter(function (d) { return d.y < H + 1; });
      var rows = cells.map(function (r) { return r.join(""); }); rows[0] = span("cd", "rain  (q to quit)");
      scr.innerHTML = rows.join("\n");
    }, 70);
    return { stop: stop, key: function (e) { if (isQuit(e)) term.exit(); } };
  };

  /* ------------------------------------------------------------------ clock */
  P.clock = function (term) {
    var scr = term.screen();
    function frame() {
      var big = term.bigText(clock2(new Date())), W = term.cols, H = term.rows, rows = [], i;
      var w = Math.max.apply(null, big.map(function (l) { return l.length; }));
      var top = Math.max(0, Math.floor(H / 2) - 4), left = Math.max(0, Math.floor((W - w) / 2));
      for (i = 0; i < top; i++) rows.push("");
      big.forEach(function (l) { rows.push(rep(" ", left) + span("cc", esc(l))); });
      rows.push("");
      var d = new Date().toDateString();
      rows.push(rep(" ", Math.max(0, Math.floor((W - d.length) / 2))) + span("cd", d));
      rows.push(rep(" ", Math.max(0, Math.floor((W - 11) / 2))) + span("cd", "(q to quit)"));
      scr.innerHTML = rows.join("\n");
    }
    frame();
    var stop = every(frame, 1000);
    return { stop: stop, key: function (e) { if (isQuit(e)) term.exit(); } };
  };

  /* ------------------------------------------------------------------ apt (stream mode) */
  P.apt = function (term, args) {
    var pkg = (args[0] || "something").toLowerCase(), step = 0, bars = 0;
    var special = {
      coffee: span("cg", "☕ coffee is now installed. Productivity +20%, sleep -20%."),
      tea: span("cg", "🍵 tea installed. Calm +30%."),
      linux: span("cd", "linux is already the newest version (6.9.0-curious)."),
      windows: span("cr", "E: Package 'windows' has no installation candidate on this system. Good."),
      girlfriend: span("cr", "E: Unable to locate package. Have you tried: contact"),
      boyfriend: span("cr", "E: Unable to locate package. Have you tried: contact"),
      job: span("cg", "job: dependencies satisfied by ") + '<span class="cmd" role="button" tabindex="0" data-cmd="sudo hire ashutosh">sudo hire ashutosh</span>',
      internship: span("cg", "internship: dependencies satisfied by ") + '<span class="cmd" role="button" tabindex="0" data-cmd="contact">contact</span>',
      motivation: span("cy", "motivation: installed, but it will expire by Monday."),
      sleep: span("cy", "E: sleep conflicts with installed package 'deadline'."),
      "linux-mint": span("cg", "You are already running Linux Mint. Excellent taste."),
      vim: span("cg", "vim is already installed. (So is the argument about editors.)"),
      emacs: span("cy", "emacs: this would also install an operating system. Skipping."),
      python3: span("cd", "python3 is already the newest version. Of course it is.")
    };
    var lines = ["Reading package lists... Done", "Building dependency tree... Done", "Reading state information... Done",
      "The following NEW packages will be installed:", "  " + pkg, "0 upgraded, 1 newly installed, 0 to remove and 0 not upgraded.", "Need to get 1,337 kB of archives."];
    var progressEl = null;
    var stop = every(function () {
      if (step < lines.length) { term.println(esc(lines[step++])); return; }
      if (bars <= 20) {
        var html = span("cd", "Get:1 https://packages.ashu.dev wilma/main " + pkg + " [") + bar(bars / 20, 20, "cg") + span("cd", "] " + Math.round(bars * 5) + "%");
        if (!progressEl) progressEl = term.println(html); else progressEl.innerHTML = html;
        bars++; return;
      }
      stop();
      term.println(esc("Selecting previously unselected package " + pkg + "."));
      term.println(esc("Unpacking " + pkg + " (1.0-ashu) ..."));
      term.println(esc("Setting up " + pkg + " (1.0-ashu) ..."));
      term.println(special[pkg] || span("cd", pkg + " installed. (Not really: this is a portfolio. But it was a nice moment.)"));
      term.exit();
    }, 90);
    return { stop: stop, key: function (e) { if (e.ctrlKey && (e.key === "c" || e.key === "C")) { stop(); term.println("^C"); term.exit(); } } };
  };

  /* ------------------------------------------------------------------ vim / nano / emacs */
  P.vim = function (term, args, input) {
    var scr = term.screen(), file = args[0] || "[No Name]", lines = input === null || input === undefined ? [] : String(input).split("\n");
    var top = 0, mode = "normal", cmd = "", msg = file ? '"' + file + '" [readonly] ' + lines.length + "L" : "";
    var count = 0;
    function render() {
      var W = term.cols, H = term.rows, rows = [], body = H - 2, i;
      for (i = 0; i < body; i++) {
        var li = top + i;
        if (li < lines.length) rows.push(span("cy", String(li + 1).padStart(4)) + " " + esc(lines[li]).slice(0, W * 2));
        else rows.push(span("cb", "~"));
      }
      var status = mode === "insert" ? span("cw", "-- INSERT -- (readonly, nothing you type will save)") : mode === "cmd" ? ":" + esc(cmd) : msg;
      rows.push(padHtml(span("hdr", padHtml(" " + esc(file) + " [RO] ", W)), W));
      rows.push(status);
      scr.innerHTML = rows.join("\n");
    }
    render();
    return {
      stop: function () {},
      key: function (e) {
        var k = e.key, body = term.rows - 2;
        if (mode === "cmd") {
          if (k === "Enter") {
            var c = cmd.trim();
            mode = "normal"; cmd = "";
            if (/^(q|q!|qa|qa!|wq|wq!|x|exit|quit)$/.test(c)) { term.exit(); return; }
            if (/^w/.test(c)) msg = span("cr", "E45: 'readonly' option is set (add ! to override... no, still no)");
            else if (/^h(elp)?$/.test(c)) msg = span("cw", "This is a read-only vim. :q to quit, j/k or arrows to scroll, G and gg to jump.");
            else if (/^\d+$/.test(c)) { top = Math.max(0, Math.min(lines.length - 1, parseInt(c, 10) - 1)); msg = ""; }
            else msg = span("cr", "E492: Not an editor command: " + esc(c));
          } else if (k === "Escape") { mode = "normal"; cmd = ""; }
          else if (k === "Backspace") { cmd = cmd.slice(0, -1); if (!cmd) mode = "normal"; }
          else if (k.length === 1 && !e.ctrlKey && !e.metaKey) cmd += k;
          render(); return;
        }
        if (mode === "insert") { if (k === "Escape") { mode = "normal"; msg = ""; } render(); return; }
        if (k === ":" ) { mode = "cmd"; cmd = ""; }
        else if (k === "i" || k === "a" || k === "o" || k === "I" || k === "A" || k === "O") { mode = "insert"; }
        else if (k === "j" || k === "ArrowDown" || k === "Enter") top = Math.min(Math.max(0, lines.length - 1), top + 1);
        else if (k === "k" || k === "ArrowUp") top = Math.max(0, top - 1);
        else if (k === "G") top = Math.max(0, lines.length - body);
        else if (k === "g") { if (count === -1) { top = 0; count = 0; } else count = -1; return; }
        else if (k === "PageDown" || (e.ctrlKey && k === "f")) top = Math.min(Math.max(0, lines.length - 1), top + body);
        else if (k === "PageUp" || (e.ctrlKey && k === "b")) top = Math.max(0, top - body);
        else if (k === "Z") { if (count === -2) { term.exit(); return; } count = -2; return; }
        else if (e.ctrlKey && k === "c") msg = span("cw", "Type  :q  and press <Enter> to exit Vim");
        else if (k === "Escape") msg = "";
        else if (k === "q" && !lines.length) { term.exit(); return; }
        count = 0;
        render();
      }
    };
  };
  P.nano = function (term, args, input) {
    var scr = term.screen(), file = args[0] || "New Buffer", lines = input === null || input === undefined ? [""] : String(input).split("\n"), top = 0;
    function render() {
      var W = term.cols, H = term.rows, rows = [], i;
      rows.push(span("hdr", padHtml("  GNU nano 7.2 (read-only)" + rep(" ", Math.max(1, Math.floor((W - file.length) / 2) - 28)) + esc(file), W)));
      for (i = 0; i < H - 4; i++) rows.push(esc(lines[top + i] === undefined ? "" : lines[top + i]));
      rows.push(span("cd", "[ File is read-only: Ctrl+X or q leaves, arrows scroll ]"));
      rows.push(span("hdr", "^G") + " Help      " + span("hdr", "^O") + " Write Out " + span("hdr", "^W") + " Where Is  " + span("hdr", "^K") + " Cut       " + span("hdr", "^T") + " Execute");
      rows.push(span("hdr", "^X") + " Exit      " + span("hdr", "^R") + " Read File " + span("hdr", "^\\") + " Replace   " + span("hdr", "^U") + " Paste     " + span("hdr", "^J") + " Justify");
      scr.innerHTML = rows.join("\n");
    }
    render();
    return { stop: function () {}, key: function (e) {
      if ((e.ctrlKey && (e.key === "x" || e.key === "X")) || e.key === "q" || e.key === "Escape") { term.exit(); return; }
      if (e.key === "ArrowDown" || e.key === "Enter") top = Math.min(Math.max(0, lines.length - 1), top + 1);
      if (e.key === "ArrowUp") top = Math.max(0, top - 1);
      if (e.ctrlKey && (e.key === "o" || e.key === "O")) lines[0] = lines[0];
      render();
    } };
  };
  P.emacs = function (term, args, input) {
    var scr = term.screen(), file = args[0] || "*scratch*", lines = input === null || input === undefined ? [";; This buffer is for notes you don't want to save.", ";; (Here, nothing saves anyway.)"] : String(input).split("\n"), top = 0, cx = false;
    function render() {
      var W = term.cols, H = term.rows, rows = [], i;
      for (i = 0; i < H - 2; i++) rows.push(esc(lines[top + i] === undefined ? "" : lines[top + i]));
      rows.push(span("hdr", padHtml("-UUU:%%--F1  " + esc(file) + "   All L" + (top + 1) + "    (Fundamental, read-only)", W)));
      rows.push(cx ? "C-x -" : span("cd", "Welcome to GNU Emacs, one component of a great operating system. C-x C-c quits. (q works too; nobody will tell.)"));
      scr.innerHTML = rows.join("\n");
    }
    render();
    return { stop: function () {}, key: function (e) {
      if (e.ctrlKey && (e.key === "x" || e.key === "X")) { cx = true; render(); return; }
      if ((cx && e.ctrlKey && (e.key === "c" || e.key === "C")) || e.key === "q" || e.key === "Escape") { term.exit(); return; }
      cx = false;
      if (e.key === "ArrowDown" || (e.ctrlKey && e.key === "n")) top = Math.min(Math.max(0, lines.length - 1), top + 1);
      if (e.key === "ArrowUp" || (e.ctrlKey && e.key === "p")) top = Math.max(0, top - 1);
      render();
    } };
  };

  return P;
});
