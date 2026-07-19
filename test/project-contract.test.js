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
  assert.match(css, /:focus-visible\s*\{[^}]*outline:\s*4px solid var\(--blue\)/s);
  assert.match(css, /\.floor-button\s*\{[^}]*border-radius:[^}]*box-shadow:[^}]*var\(--blue\)/s);
  assert.match(css, /\.utility-button\s*\{[^}]*border:\s*3px solid var\(--ink\)[^}]*border-radius:[^}]*var\(--blue\)/s);
  assert.match(css, /\.sound-toggle\[aria-pressed="false"\]\s*\{[^}]*color:\s*var\(--ink\)/s);
  assert.match(css, /--display-font:\s*Impact/);
  assert.match(css, /--body-font:\s*"Arial Rounded MT Bold"/);
  assert.match(css, /overflow-x:\s*clip/);
  assert.ok(contrastRatio("#a83b44", "#fff5df") >= 4.5, "small coral text alias must meet WCAG AA");
  assert.ok(contrastRatio("#4f7cff", "#fff5df") >= 3, "blue focus must contrast with paper");
  assert.ok(contrastRatio("#4f7cff", "#15152a") >= 3, "blue focus must contrast with ink");

  for (const rule of css.matchAll(/(?:^|\n)(?:html|body)\s*\{([^}]*)\}/g)) {
    assert.doesNotMatch(rule[1], /min-width:\s*(?:280|320)px/);
  }
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
