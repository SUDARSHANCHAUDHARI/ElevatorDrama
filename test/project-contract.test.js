import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(resolve(root, file), "utf8");

function contrastRatio(first, second) {
  const luminance = (hex) => {
    const channels = hex.slice(1).match(/.{2}/g).map((value) => Number.parseInt(value, 16) / 255);
    const linear = channels.map((value) => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  };
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

function ruleBody(source, selector) {
  const start = source.indexOf(`${selector} {`);
  assert.notEqual(start, -1, `Missing CSS rule ${selector}`);
  return source.slice(source.indexOf("{", start) + 1, source.indexOf("}", start));
}

function declaration(source, selector, property) {
  const match = ruleBody(source, selector).match(
    new RegExp(`(?:^|\\n)\\s*${property.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\s*:\\s*([\\s\\S]*?);`),
  );
  assert.ok(match, `Missing ${property} in ${selector}`);
  return match[1].trim();
}

function resolvedColor(source, value, seen = new Set()) {
  const variable = value.match(/^var\(--([^)]+)\)$/);
  if (!variable) {
    assert.match(value, /^#[0-9a-f]{6}$/i, `Unsupported color ${value}`);
    return value.toLowerCase();
  }
  assert.equal(seen.has(variable[1]), false, `Circular CSS variable --${variable[1]}`);
  seen.add(variable[1]);
  return resolvedColor(source, declaration(source, ":root", `--${variable[1]}`), seen);
}

test("the HTML exposes the complete interactive surface", () => {
  const html = read("index.html");
  for (const requiredId of [
    "doors",
    "floor-readout",
    "floor-controls",
    "status-board",
    "sound-toggle",
    "volume",
    "reset-button",
    "tiny-operator",
  ]) {
    assert.match(html, new RegExp(`id=["']${requiredId}["']`));
  }
  assert.equal((html.match(/class="floor-button"/g) ?? []).length, 8);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /type="module" src="app\.js"/);
  assert.match(html, /http-equiv="Content-Security-Policy"/);
  assert.match(html, /connect-src 'none'/);
});

test("the stylesheet includes responsive and reduced-motion rules", () => {
  const css = read("styles.css");
  assert.match(css, /@media \(max-width: 900px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /\.doors\[data-open="true"\]/);
});

test("the interface follows the shared TinyChaos UI family", () => {
  const html = read("index.html");
  const css = read("styles.css");
  const sharedPalette = ["#15152a", "#fff5df", "#ff5d5d", "#4f7cff", "#ffd166", "#58d6a9", "#b695ff"];

  sharedPalette.forEach((color) => assert.match(css, new RegExp(color, "i")));
  assert.match(html, /href="https:\/\/sudarshanchaudhari\.github\.io\/TinyChaos\/"/);
  assert.match(html, /ElevatorDrama · by Sudarshan Chaudhari/);
  assert.match(html, /Inspected by the Bureau of Unnecessary Suspense/);
  assert.match(css, /:focus-visible\s*\{[^}]*outline:\s*4px solid var\(--blue\)/s);
  assert.match(css, /\.floor-button\s*\{[^}]*border-radius:[^}]*box-shadow:[^}]*var\(--blue\)/s);
  assert.match(css, /\.utility-button\s*\{[^}]*border:\s*3px solid var\(--ink\)[^}]*border-radius:[^}]*var\(--blue\)/s);
  assert.match(css, /\.sound-toggle\[aria-pressed="false"\]\s*\{[^}]*color:\s*var\(--ink\)/s);
  assert.match(css, /\.title-lockup h1 em\s*\{[^}]*color:\s*var\(--alarm-text\)/s);
  assert.match(css, /--display-font:\s*Impact/);
  assert.match(css, /--body-font:\s*"Arial Rounded MT Bold"/);
  assert.match(css, /overflow-x:\s*clip/);
  assert.equal(declaration(css, ".floor-button", "border"), "3px solid var(--ink)");
  assert.equal(declaration(css, ".floor-button", "box-shadow"), "3px 3px 0 var(--blue)");
  assert.equal(declaration(css, ".volume-control", "border"), "3px solid var(--ink)");
  assert.equal(declaration(css, ".volume-control", "box-shadow"), "3px 3px 0 var(--blue)");

  const pageBackground = resolvedColor(css, declaration(css, "body", "background"));
  assert.ok(
    contrastRatio(resolvedColor(css, declaration(css, ".title-lockup h1 em", "color")), pageBackground) >= 4.5,
    "Title accent must meet WCAG AA",
  );
  assert.ok(
    contrastRatio(
      resolvedColor(css, declaration(css, ".noscript-message", "color")),
      resolvedColor(css, declaration(css, ".noscript-message", "background")),
    ) >= 4.5,
    "No-script message must meet WCAG AA",
  );
  assert.ok(
    contrastRatio(
      resolvedColor(css, declaration(css, ".floor-button", "color")),
      resolvedColor(css, declaration(css, ".floor-button", "background")),
    ) >= 4.5,
    "Floor control text must meet WCAG AA",
  );
  assert.ok(
    contrastRatio(
      resolvedColor(css, declaration(css, ".volume-control output", "color")),
      resolvedColor(css, declaration(css, ".volume-control", "background")),
    ) >= 4.5,
    "Volume output must meet WCAG AA",
  );

  const widths = [...css.matchAll(/@media \(max-width: (\d+)px\)\s*\{/g)].map((match) => Number(match[1]));
  assert.deepEqual(widths, [900, 620, 390], "Width breakpoints must cover tablet and 320/375px layouts");
  const positions = [
    css.indexOf("@media (max-width: 900px) {"),
    css.indexOf("@media (max-width: 620px) {"),
    css.indexOf("@media (max-width: 390px) {"),
    css.indexOf("@media (max-width: 640px) and (max-height: 500px) {"),
    css.indexOf("@media (prefers-reduced-motion: reduce) {"),
  ];
  assert.ok(positions.every((position) => position >= 0));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions, "Responsive cascade order changed");
  const narrowSection = css.slice(positions[3], positions[4]);
  assert.equal(declaration(narrowSection, ".experience", "padding-top"), "1rem");
  assert.doesNotMatch(css.slice(positions[4]), /\.experience\s*\{[^}]*padding-top\s*:/s);
  assert.equal(declaration(css, "body", "overflow-y"), "auto");
  assert.equal(declaration(css, "body", "overflow-x"), "clip");
  assert.equal(declaration(css, "html", "min-width"), "0");
  assert.doesNotMatch(ruleBody(css, "body"), /min-width\s*:\s*(?!0(?:px)?\s*;)/, "Body has a positive minimum width");
  assert.match(declaration(css, ".experience", "width"), /1180px/, "Base rule must retain laptop/desktop cap");
});

test("the app includes generated audio and cancellable sequences", () => {
  const app = read("app.js");
  assert.match(app, /AudioContext/);
  assert.match(app, /createOscillator/);
  assert.match(app, /new AbortController\(\)/);
  assert.match(app, /prefers-reduced-motion/);
});

test("every catalog event has an app handler", async () => {
  const app = read("app.js");
  const { TRIP_EVENTS } = await import("../elevator-engine.js");
  TRIP_EVENTS.forEach((event) => {
    assert.match(app, new RegExp(`["']?${event.id}["']?\\s*\\(`), `${event.id} needs a handler`);
  });
});

test("all local files referenced by index.html exist", () => {
  const html = read("index.html");
  const references = [...html.matchAll(/(?:href|src)="([^"#:]+)"/g)]
    .map((match) => match[1])
    .filter((reference) => !reference.startsWith("http"));

  references.forEach((reference) => {
    assert.equal(existsSync(resolve(root, reference)), true, `${reference} should exist`);
  });
});

test("deployment metadata is valid and applies security headers", () => {
  const manifest = JSON.parse(read("site.webmanifest"));
  const vercel = JSON.parse(read("vercel.json"));
  const netlify = read("netlify.toml");

  assert.equal(manifest.start_url, "./");
  assert.equal(vercel.headers[0].source, "/(.*)");
  assert.match(JSON.stringify(vercel), /Content-Security-Policy/);
  assert.match(netlify, /Content-Security-Policy/);
  assert.match(netlify, /X-Content-Type-Options/);
});

test("project documentation identifies the verified author and ownership", () => {
  const readme = read("README.md");
  const packageMetadata = JSON.parse(read("package.json"));

  assert.match(readme, /## Author/);
  assert.match(readme, /Sudarshan Chaudhari/);
  assert.match(readme, /SudarshanTechLabs/);
  assert.match(readme, /SUDARSHANCHAUDHARI/);
  assert.match(readme, /sudarshantechlabs@gmail\.com/);
  assert.equal(packageMetadata.author.name, "Sudarshan Chaudhari");
  assert.equal(packageMetadata.author.email, "sudarshantechlabs@gmail.com");
});
