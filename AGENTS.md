# ElevatorDrama Contributor Guide

## Architecture

- `elevator-engine.js` owns legal state transitions, floor paths, and finite trip planning.
- `app.js` owns DOM updates, generated Web Audio, input handling, and abortable animation sequences.
- `index.html` and `styles.css` contain the semantic interface, inline SVG artwork, responsive layout, and reduced-motion behavior.
- Keep the project dependency-free unless a concrete requirement cannot be met with browser or Node platform APIs.

## Working rules

- Run `pnpm check` before claiming a change is complete.
- Add or update a Node test when changing state transitions, event planning, local asset references, or deployment metadata.
- Keep controls keyboard accessible and preserve the dedicated live status region.
- Every random trip must end after 2–4 failed attempts and successfully reach the selected floor.
- Reset must remain available during a trip and cancel pending asynchronous work.
- Do not commit environment files, credentials, signing material, generated output, or deployment caches.
- Do not add GitHub Actions without the repository owner's explicit approval.
- Do not use browser automation or create screenshots, recordings, traces, or other session captures.

## Deployment

The project is served directly from the repository root with no build step. Keep relative asset paths compatible with GitHub Pages subpaths. Vercel and Netlify security headers live in `vercel.json` and `netlify.toml`.
