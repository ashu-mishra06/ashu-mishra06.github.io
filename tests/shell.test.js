/*
 * Run with:  node tests/shell.test.js
 * No dependencies. Exits with a non-zero code if anything fails.
 */
"use strict";
const assert = require("assert");
const fsys = require("fs");
const path = require("path");
const D = require("../js/data.js");
const S = require("../js/shell.js");

let passed = 0, failed = 0;
const strip = (h) => String(h).replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/\u00a0/g, " ");
const text = (res) => res.html.map(strip).join("\n");
const fresh = () => S.createShell(D, { now: () => Date.UTC(2026, 8, 20, 12, 0, 0) });

function test(name, fn) {
  try { fn(); passed++; console.log("  ok   " + name); }
  catch (e) { failed++; console.log("  FAIL " + name + "\n       " + e.message); }
}

console.log("shell.js");

test("starts in ~ with a guest prompt", () => {
  const sh = fresh();
  assert.strictEqual(strip(sh.promptHTML()), "guest@ashutosh:~$");
});

test("ls lists every top-level item and hides dotfiles", () => {
  const out = text(fresh().exec("ls"));
  ["about.md", "contact.txt", "projects/", "skills/", "achievements/", "experience/", "certifications/", "education.txt", "resume.txt"].forEach((n) =>
    assert.ok(out.includes(n), "missing " + n + " in: " + out));
  assert.ok(!out.includes(".secrets"));
});

test("ls -a reveals .secrets", () => {
  assert.ok(text(fresh().exec("ls -a")).includes(".secrets"));
});

test("ls -l gives permissions and sizes", () => {
  const out = text(fresh().exec("ls -l"));
  assert.ok(/drwxr-xr-x 1 guest guest/.test(out));
  assert.ok(/-r--r--r-- 1 guest guest/.test(out));
});

test("ls rejects invalid flags and missing paths", () => {
  assert.ok(text(fresh().exec("ls -z")).includes("invalid option"));
  assert.ok(text(fresh().exec("ls nope")).includes("No such file or directory"));
});

test("cd / pwd / prompt follow the working directory", () => {
  const sh = fresh();
  sh.exec("cd projects");
  assert.strictEqual(strip(sh.promptHTML()), "guest@ashutosh:~/projects$");
  assert.strictEqual(text(sh.exec("pwd")), "/home/guest/projects");
  sh.exec("cd ..");
  assert.strictEqual(strip(sh.promptHTML()), "guest@ashutosh:~$");
  sh.exec("cd /");
  assert.strictEqual(strip(sh.promptHTML()), "guest@ashutosh:/$");
  sh.exec("cd");
  assert.strictEqual(sh.cwdLabel(), "~");
});

test("cd errors are helpful", () => {
  const sh = fresh();
  assert.ok(text(sh.exec("cd nowhere")).includes("no such file or directory"));
  assert.ok(text(sh.exec("cd about.md")).includes("not a directory"));
});

test("cd .. cannot escape past root", () => {
  const sh = fresh();
  sh.exec("cd ../../../../../..");
  assert.strictEqual(text(sh.exec("pwd")), "/");
});

test("cat prints about.md with real content", () => {
  const out = text(fresh().exec("cat about.md"));
  assert.ok(out.includes("Ashutosh Mishra"));
  assert.ok(out.includes("Atavishaala") && out.includes("Future 6.0"));
});

test("cat handles relative, ~ and absolute paths", () => {
  const sh = fresh();
  assert.ok(text(sh.exec("cat ~/projects/roadsos.md")).includes("RoadSOS"));
  assert.ok(text(sh.exec("cat /home/guest/contact.txt")).includes("github"));
  sh.exec("cd projects");
  assert.ok(text(sh.exec("cat roadsos.md")).includes("TensorFlow Lite"));
  assert.ok(text(sh.exec("cat ../about.md")).includes("Ashutosh"));
});

test("cat errors: missing, directory, no args", () => {
  const sh = fresh();
  assert.ok(text(sh.exec("cat ghost.txt")).includes("No such file or directory"));
  assert.ok(text(sh.exec("cat projects")).includes("Is a directory"));
  assert.ok(text(sh.exec("cat")).includes("missing file operand"));
});

test("every project has a readable file with a repo link", () => {
  const sh = fresh();
  D.projects.forEach((p) => {
    const out = text(sh.exec("cat ~/projects/" + p.id + ".md"));
    assert.ok(out.includes(p.name), p.id + " name");
    assert.ok(out.includes(p.repo), p.id + " repo link");
  });
});

test("optional empty fields are hidden (role, status, links)", () => {
  const sh = fresh();
  const chat = text(sh.exec("cat ~/projects/chatgraph.md"));
  assert.ok(!chat.includes("My part") && !chat.includes("## Links") && !chat.includes("repo:") && !chat.includes("live:"));
  assert.ok(chat.includes("In development"));
  const road = text(sh.exec("cat ~/projects/roadsos.md"));
  assert.ok(!road.includes("live:") && !road.includes("Status"));
  assert.ok(road.includes("My part") && road.includes("repo:"));
});

test("Couple-connect points at the right repo (with trailing dash) and the live Netlify site", () => {
  const html = fresh().exec("cat ~/projects/couple-connect.md").html.join("\n");
  assert.ok(html.includes('href="https://github.com/ashu-mishra06/Couple-connect-"'), "repo link keeps the trailing dash");
  assert.ok(html.includes('href="https://coupascup.netlify.app/"'), "live link");
});

test("the projects list offers live site + source only where they exist", () => {
  const html = fresh().exec("projects").html.join("\n");
  assert.ok(html.includes('data-cmd="open couple-connect"') && html.includes('data-cmd="open couple-connect repo"'));
  assert.ok(html.includes('data-cmd="open roadsos repo"') && !html.includes('data-cmd="open roadsos"'));
  assert.ok(!html.includes('data-cmd="open chatgraph'), "ChatGraph has no public link yet");
});

test("education is available but never a headline item", () => {
  const sh = fresh();
  assert.ok(text(sh.exec("cat education.txt")).includes("LNCT Group of Colleges"));
  assert.ok(text(sh.exec("education")).includes("2024–2028"));
  ["neofetch", "about", "experience", "projects", "achievements", "contact", "skills", "help"].forEach((cmd) =>
    assert.ok(!/LNCT/.test(text(sh.exec(cmd, { cols: 120 }))), cmd + " must not mention the college"));
  assert.ok(!/LNCT/.test(text(sh.exec("cat about.md"))));
});

test("certifications command and files", () => {
  const sh = fresh();
  const out = text(sh.exec("certifications"));
  ["Oracle Certified Foundations Associate", "Data Structures Bootcamp", "Python Certification", "The AI Advantage"].forEach((k) => assert.ok(out.includes(k), k));
  assert.ok(text(sh.exec("certs")).includes("Oracle"));
  assert.ok(text(sh.exec("cat ~/certifications/oracle-foundations-associate.md")).includes("expires Oct 2027"));
});

test("skills are readable as files and by group", () => {
  const sh = fresh();
  assert.ok(text(sh.exec("cat skills/ai-ml.txt")).includes("TensorFlow Lite"));
  assert.ok(text(sh.exec("ls skills")).includes("cloud-data.txt"));
});

test("data.js is consistent: unique ids, résumé file exists, links are safe", () => {
  const ids = D.projects.map((p) => p.id);
  assert.strictEqual(new Set(ids).size, ids.length, "project ids unique");
  D.projects.forEach((p) => { assert.ok(Array.isArray(p.stack) && p.stack.length, p.id + " needs a stack"); assert.ok(p.summary && p.description, p.id); });
  assert.ok(D.links.resume, "résumé is configured");
  assert.ok(fsys.existsSync(path.join(__dirname, "..", D.links.resume)), "résumé file is present next to index.html");
  [D.links.github, D.links.linkedin].forEach((u) => assert.ok(/^https:\/\//.test(u)));
  D.projects.forEach((p) => [p.repo, p.live].filter(Boolean).forEach((u) => assert.ok(/^https?:\/\//.test(u), p.id + " url " + u)));
  D.skills.forEach((g) => assert.ok(g.id && g.items.length, "skill group " + g.id));
});

test("URLs and e-mails in files become links; unsafe HTML is escaped", () => {
  const html = fresh().exec("cat contact.txt").html.join("\n");
  assert.ok(html.includes('href="https://github.com/ashu-mishra06"'));
  assert.ok(html.includes('href="mailto:' + D.links.email + '"'));
  assert.ok(html.includes('rel="noopener noreferrer"'));
  const echo = fresh().exec("echo <script>alert(1)</script>").html.join("");
  assert.ok(!echo.includes("<script>"), "script tag must be escaped");
});

test("tree shows the structure and a summary", () => {
  const out = text(fresh().exec("tree"));
  assert.ok(out.includes("|-- ") && out.includes("`-- "), "ASCII tree branches");
  assert.ok(!/[\u2500-\u257f]/.test(out), "no box-drawing glyphs (font-independent alignment)");
  assert.ok(out.includes("roadsos.md"));
  assert.ok(/\d+ directories, \d+ files/.test(out));
  assert.ok(!out.includes(".secrets"));
  assert.ok(text(fresh().exec("tree -a")).includes(".secrets"));
});

test("grep finds text across files, case-insensitively, without leaking dotfiles", () => {
  const out = text(fresh().exec("grep kotlin"));
  assert.ok(out.includes("roadsos.md"));
  assert.ok(out.toLowerCase().includes("kotlin"));
  assert.ok(text(fresh().exec("grep zzzznothing")).includes("no matches"));
  assert.ok(!text(fresh().exec("grep hidden file")).includes(".secrets"));
});

test("grep highlights matches and escapes output", () => {
  const html = fresh().exec("grep fastapi").html.join("\n");
  assert.ok(html.includes('class="hl"'));
});

test("shortcut commands print real data", () => {
  const sh = fresh();
  assert.ok(text(sh.exec("projects")).includes(D.projects.length + " projects"));
  D.projects.forEach((p) => assert.ok(text(sh.exec("projects")).includes(p.name)));
  const sk = text(sh.exec("skills"));
  ["Python", "C++", "Kotlin", "React.js", "Next.js", "Jetpack Compose", "Cloud Firestore", "TensorFlow Lite", "Git"].forEach((k) => assert.ok(sk.includes(k), k));
  assert.ok(text(sh.exec("achievements")).includes("Future 6.0"));
  assert.ok(text(sh.exec("achievements")).includes("Smart India Hackathon 2026"));
  assert.ok(text(sh.exec("achievements")).includes("Pull Shark"));
  assert.ok(text(sh.exec("experience")).includes("Cognifyz Technologies"));
  assert.ok(text(sh.exec("experience")).includes("Atavishaala"));
  assert.ok(text(sh.exec("experience")).includes("Dec 2025 – Jan 2026"));
  assert.ok(text(sh.exec("contact")).includes(D.links.email));
  assert.ok(text(sh.exec("about")).includes("Ashutosh"));
});

test("open returns an open action for github, linkedin, email and projects", () => {
  const sh = fresh();
  assert.deepStrictEqual(sh.exec("open github").actions, [{ type: "open", url: D.links.github }]);
  assert.deepStrictEqual(sh.exec("open linkedin").actions, [{ type: "open", url: D.links.linkedin }]);
  assert.deepStrictEqual(sh.exec("open email").actions, [{ type: "open", url: "mailto:" + D.links.email }]);
  assert.deepStrictEqual(sh.exec("open roadsos").actions, [{ type: "open", url: D.projects[0].repo }]);
  assert.deepStrictEqual(sh.exec("open couple-connect").actions, [{ type: "open", url: "https://coupascup.netlify.app/" }]);
  assert.deepStrictEqual(sh.exec("open couple-connect repo").actions, [{ type: "open", url: "https://github.com/ashu-mishra06/Couple-connect-" }]);
  assert.deepStrictEqual(sh.exec("open resume").actions, [{ type: "open", url: D.links.resume }]);
  assert.deepStrictEqual(sh.exec("resume").actions, [{ type: "open", url: D.links.resume }]);
  const chat = sh.exec("open chatgraph");
  assert.strictEqual(chat.actions.length, 0);
  assert.ok(text(chat).includes("no public link yet"));
  assert.strictEqual(sh.exec("open nonsense").actions.length, 0);
  assert.ok(text(sh.exec("open nonsense")).includes("unknown target"));
  assert.strictEqual(sh.exec("open").actions.length, 0);
});

test("neofetch is a plain aligned fact sheet: no ASCII art, no colour blocks", () => {
  const res = fresh().exec("neofetch", { theme: "chalk" });
  const out = text(res);
  ["guest@ashutosh", "GitHub Pages", "Intern at Atavishaala", "Future 6.0", "Python, C++, JavaScript, Kotlin", "chalk"].forEach((k) => assert.ok(out.includes(k), k));
  assert.ok(!/[\u2580-\u259f]|\|o_o/.test(out), "no block or Tux characters");
  const keyed = res.html.filter((h) => /class="k"/.test(h)).map((h) => strip(h));
  const cols = new Set(keyed.map((l) => l.search(/\S/) === 0 && l.slice(0, 11).trim().length ? l.slice(11).search(/\S/) : 0));
  assert.deepStrictEqual([...cols], [0], "values start in the same column");
});

test("home prints the front page: name, role, tagline, facts, quick links", () => {
  const res = fresh().exec("home");
  const out = text(res), html = res.html.join("\n");
  [D.name, D.role, D.tagline, D.now, D.award, D.links.email].forEach((k) => assert.ok(out.includes(k), k));
  assert.ok(html.includes('class="hero-name"') && html.includes('class="hero-role"'));
  ["about", "projects", "skills", "achievements", "contact", "resume"].forEach((n) => assert.ok(html.includes('data-cmd="' + n + '"'), "link to " + n));
  assert.ok(!/LNCT/.test(out));
  assert.ok(text(fresh().exec("help")).includes("the front page"));
});

test("help: underlines cover only the command, groups are plain labels", () => {
  const html = fresh().exec("help").html.join("\n");
  assert.ok(!/<span class="cmd[^>]*>[^<]* {2,}<\/span>/.test(html), "no padding inside clickable text");
  assert.ok(!text(fresh().exec("help")).includes("look around like it's a real Linux box"));
});

test("markdown bullets get a hanging-indent wrapper", () => {
  const html = fresh().exec("cat ~/projects/roadsos.md").html.join("\n");
  assert.ok(/<span class="li">/.test(html));
});

test("indented detail lines are real indented blocks (so wrapped text stays aligned)", () => {
  ["projects", "achievements", "experience"].forEach((cmd) => {
    const lines = fresh().exec(cmd).html;
    assert.ok(lines.some((h) => /^<span class="ind">/.test(h)), cmd + " uses hanging blocks");
    assert.ok(lines.every((h) => !/^ {2}/.test(h)), cmd + ": no line is indented with literal spaces");
  });
});

test("no double blank line at the end of projects / achievements", () => {
  ["projects", "achievements"].forEach((cmd) => {
    const h = fresh().exec(cmd).html;
    assert.notStrictEqual(h[h.length - 1], "", cmd + " ends cleanly");
  });
});

test("theme: list, set, reject", () => {
  const sh = fresh();
  assert.ok(text(sh.exec("theme", { theme: "graphite" })).includes("phosphor"));
  assert.deepStrictEqual(sh.exec("theme chalk").actions, [{ type: "theme", name: "chalk" }]);
  assert.deepStrictEqual(sh.exec("theme dark").actions, [{ type: "theme", name: "graphite" }], "dark is an alias");
  assert.deepStrictEqual(sh.exec("theme light").actions, [{ type: "theme", name: "chalk" }], "light is an alias");
  assert.deepStrictEqual(sh.exec("theme green").actions, [{ type: "theme", name: "phosphor" }], "green is an alias");
  assert.ok(text(sh.exec("theme neon")).includes("unknown theme"));
  assert.strictEqual(sh.exec("theme neon").actions.length, 0);
});

test("UI actions: clear, reboot/exit, plain/gui", () => {
  const sh = fresh();
  assert.deepStrictEqual(sh.exec("clear").actions, [{ type: "clear" }]);
  assert.deepStrictEqual(sh.exec("reboot").actions, [{ type: "reboot" }]);
  assert.deepStrictEqual(sh.exec("exit").actions, [{ type: "reboot" }]);
  assert.deepStrictEqual(sh.exec("plain").actions, [{ type: "plain" }]);
  assert.deepStrictEqual(sh.exec("gui").actions, [{ type: "plain" }]);
});

test("aliases: less, head, ll-style flags", () => {
  assert.ok(text(fresh().exec("less about.md")).includes("Ashutosh"));
});

test("';' runs several commands and quotes are honoured", () => {
  const sh = fresh();
  sh.exec("cd projects; ls");
  assert.strictEqual(sh.cwdLabel(), "~/projects");
  assert.ok(text(sh.exec('echo "hello ; world"')).includes("hello ; world"));
  assert.ok(text(sh.exec('echo "oops')).includes("unmatched"));
});

test("echo expands a few variables", () => {
  assert.strictEqual(text(fresh().exec("echo $USER on $HOSTNAME")), "guest on ashutosh");
});

test("unknown command suggests the closest match", () => {
  const out = text(fresh().exec("porjects"));
  assert.ok(out.includes("command not found: porjects"));
  assert.ok(out.includes("did you mean: projects"));
  assert.ok(text(fresh().exec("qqqqqqqq")).includes("type help"));
});

test("typing a filename explains permission and suggests cat", () => {
  const out = text(fresh().exec("about.md"));
  assert.ok(out.includes("permission denied"));
  assert.ok(out.includes("cat about.md"));
});

test("help lists all groups and clickable commands", () => {
  const res = fresh().exec("help");
  const out = text(res);
  ["portfolio", "explore", "links", "system", "projects", "grep", "neofetch"].forEach((k) => assert.ok(out.includes(k), k));
  assert.ok(res.html.join("").includes('data-cmd="cat ~/about.md"'));
});

test("man works and rejects unknown commands", () => {
  assert.ok(text(fresh().exec("man ls")).includes("USAGE"));
  assert.ok(text(fresh().exec("man wat")).includes("No manual entry"));
});

test("history records commands (deduping repeats) and opts.record=false skips", () => {
  const sh = fresh();
  sh.exec("ls"); sh.exec("ls"); sh.exec("pwd"); sh.exec("neofetch", {}, { record: false });
  assert.deepStrictEqual(sh.history(), ["ls", "pwd"]);
  assert.ok(text(sh.exec("history")).includes("pwd"));
});

test("easter eggs: sudo, rm -rf /, vim, .secrets, ./stats.sh", () => {
  const sh = fresh();
  assert.ok(text(sh.exec("sudo make me a sandwich")).includes("not in the sudoers file"));
  const hire = text(sh.exec("sudo hire ashutosh"));
  assert.ok(hire.includes("Password accepted") && hire.includes(D.links.email));
  assert.ok(text(sh.exec("rm -rf /")).includes("dangerous"));
  assert.ok(text(sh.exec("rm about.md")).includes("Read-only file system"));
  assert.ok(text(sh.exec("vim about.md")).includes("read-only"));
  assert.ok(text(sh.exec("cat .secrets")).includes("hidden file"));
  assert.ok(text(sh.exec("./stats.sh")).includes("projects"));
  assert.ok(text(sh.exec("mkdir x")).includes("Read-only"));
});

test("system commands respond", () => {
  const sh = fresh();
  assert.strictEqual(text(sh.exec("whoami")).split("\n")[0], "guest");
  assert.strictEqual(text(sh.exec("uname")), "Linux");
  assert.ok(text(sh.exec("uname -a")).includes("x86_64"));
  assert.ok(/Sun Sep 20 \d\d:\d\d:\d\d 2026/.test(text(sh.exec("date"))));
  assert.ok(text(sh.exec("uptime")).startsWith("up "));
  assert.strictEqual(text(sh.exec("hostname")), "ashutosh");
});

test("empty input does nothing", () => {
  const res = fresh().exec("   ");
  assert.strictEqual(res.html.length, 0);
  assert.strictEqual(res.actions.length, 0);
});

test("tab completion: commands", () => {
  const sh = fresh();
  assert.strictEqual(sh.complete("proj").line, "projects ");
  assert.strictEqual(sh.complete("neo").line, "neofetch ");
  const multi = sh.complete("c");
  assert.ok(multi.options.includes("cat") && multi.options.includes("cd") && multi.options.includes("contact"));
  assert.deepStrictEqual(multi.options, multi.options.slice().sort(), "options are alphabetical");
});

test("tab completion: paths, nested paths, hidden files", () => {
  const sh = fresh();
  assert.strictEqual(sh.complete("cat ab").line, "cat about.md ");
  assert.strictEqual(sh.complete("cd proj").line, "cd projects/");
  assert.strictEqual(sh.complete("cat projects/road").line, "cat projects/roadsos.md ");
  assert.strictEqual(sh.complete("cat ~/projects/cou").line, "cat ~/projects/couple-connect.md ");
  assert.strictEqual(sh.complete("cat .sec").line, "cat .secrets ");
  assert.ok(sh.complete("cat ").options.length > 3);
});

test("tab completion: open targets, themes, after ';'", () => {
  const sh = fresh();
  assert.strictEqual(sh.complete("open road").line, "open roadsos ");
  assert.strictEqual(sh.complete("open git").line, "open github ");
  assert.strictEqual(sh.complete("theme pho").line, "theme phosphor ");
  assert.strictEqual(sh.complete("theme li").line, "theme light ");
  assert.strictEqual(sh.complete("cd projects; proj").line, "cd projects; projects ");
  assert.strictEqual(sh.complete("zzz").line, "zzz");
});

test("tab completion: common prefix for ambiguous matches", () => {
  const sh = fresh();
  const r = sh.complete("cat ~/projects/");
  assert.ok(r.options.length === D.projects.length, "lists all projects");
});

console.log("\n" + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
