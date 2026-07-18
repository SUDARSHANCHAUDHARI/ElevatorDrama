import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(resolve(root, file), "utf8");

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
