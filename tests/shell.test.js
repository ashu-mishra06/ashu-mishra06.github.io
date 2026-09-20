/*
 * Run with:  node tests/shell.test.js
 * No dependencies. Exits with a non-zero code if anything fails.
 */
"use strict";
const assert = require("assert");
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
  ["about.md", "contact.txt", "projects/", "skills/", "achievements/", "experience/", "resume.txt"].forEach((n) =>
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
  assert.ok(out.includes("Team Fuzeppers"));
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

test("optional empty fields are hidden (role, live)", () => {
  const out = text(fresh().exec("cat ~/projects/recurly.md"));
  assert.ok(!out.includes("My part"));
  assert.ok(!out.includes("live:"));
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
  assert.ok(out.includes("├── ") && out.includes("└── "));
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
  assert.ok(text(sh.exec("projects")).includes("5 projects"));
  D.projects.forEach((p) => assert.ok(text(sh.exec("projects")).includes(p.name)));
  const sk = text(sh.exec("skills"));
  ["Python", "Kotlin", "React", "Git"].forEach((k) => assert.ok(sk.includes(k), k));
  assert.ok(text(sh.exec("achievements")).includes("Smart India Hackathon 2026"));
  assert.ok(text(sh.exec("achievements")).includes("Pull Shark"));
  assert.ok(text(sh.exec("experience")).includes("Cognifyz"));
  assert.ok(text(sh.exec("contact")).includes(D.links.email));
  assert.ok(text(sh.exec("about")).includes("Ashutosh"));
});

test("open returns an open action for github, linkedin, email and projects", () => {
  const sh = fresh();
  assert.deepStrictEqual(sh.exec("open github").actions, [{ type: "open", url: D.links.github }]);
  assert.deepStrictEqual(sh.exec("open linkedin").actions, [{ type: "open", url: D.links.linkedin }]);
  assert.deepStrictEqual(sh.exec("open email").actions, [{ type: "open", url: "mailto:" + D.links.email }]);
  assert.deepStrictEqual(sh.exec("open roadsos").actions, [{ type: "open", url: D.projects[0].repo }]);
  assert.strictEqual(sh.exec("open nonsense").actions.length, 0);
  assert.ok(text(sh.exec("open nonsense")).includes("unknown target"));
  assert.strictEqual(sh.exec("open").actions.length, 0);
});

test("neofetch renders side-by-side on wide screens and stacked on narrow ones", () => {
  const wide = fresh().exec("neofetch", { cols: 100, theme: "paper" });
  const narrow = fresh().exec("neofetch", { cols: 40, theme: "paper" });
  assert.ok(strip(wide.html[0]).includes("guest@ashutosh"), "wide: art row carries first info line");
  assert.ok(!strip(narrow.html[0]).includes("guest@ashutosh"), "narrow: art stands alone");
  assert.ok(text(wide).includes("paper"));
  const maxLen = Math.max.apply(null, wide.html.map((h) => strip(h).length));
  assert.ok(maxLen <= 100, "wide layout must fit the terminal width, got " + maxLen);
  // A screen that is too narrow for the widest line must stack, whatever the exact numbers are.
  const tight = fresh().exec("neofetch", { cols: maxLen - 1 });
  assert.ok(!strip(tight.html[0]).includes("guest@ashutosh"), "must stack when the side-by-side layout would not fit");
  const justRight = fresh().exec("neofetch", { cols: maxLen + 2 });
  assert.ok(strip(justRight.html[0]).includes("guest@ashutosh"), "must go side by side once it fits");
});

test("theme: list, set, reject", () => {
  const sh = fresh();
  assert.ok(text(sh.exec("theme", { theme: "midnight" })).includes("phosphor"));
  assert.deepStrictEqual(sh.exec("theme amber").actions, [{ type: "theme", name: "amber" }]);
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
