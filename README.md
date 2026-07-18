# ElevatorDrama

[![Version 1.0.0](https://img.shields.io/badge/version-1.0.0-e9a93f)](CHANGELOG.md)
[![License: MIT](https://img.shields.io/badge/license-MIT-182626)](LICENSE)
![Vanilla JavaScript](https://img.shields.io/badge/JavaScript-vanilla-f7df1e?logo=javascript&logoColor=182626)
![Runtime dependencies: 0](https://img.shields.io/badge/runtime_dependencies-0-6faf9b)

An interactive cartoon elevator that makes every trip unnecessarily dramatic. Choose a floor, endure a few entirely avoidable incidents, and eventually arrive where you asked to go.

ElevatorDrama is a standalone static web project built with semantic HTML, hand-written CSS, inline SVG artwork, and vanilla JavaScript. It has no runtime dependencies, no external fonts, and no prerecorded media.

## Features

- Animated elevator doors and step-by-step floor progression
- Eight keyboard-accessible floor controls and a digital indicator
- Ten random trip events, including wrong-way travel, strange locations, a tiny operator, and a dramatic countdown
- A finite trip planner that guarantees success after 2–4 failed attempts
- Explicit, guarded elevator state machine
- Synthesized elevator, countdown, suspense, and arrival sounds using the Web Audio API
- Sound toggle, volume control, and instant reset
- Responsive layouts for desktop, tablet, and mobile
- Live status announcements, visible focus states, semantic controls, and keyboard shortcuts
- Reduced-motion support in both CSS animations and JavaScript pacing
- Restrictive content-security policy and production security headers
- Dependency-free Node tests for state behavior and the project contract

## Technology

- **Structure:** Semantic HTML5
- **Presentation:** Hand-written responsive CSS and inline SVG artwork
- **Behavior:** Vanilla JavaScript using native ES modules
- **Audio:** Runtime-generated Web Audio API oscillators; no prerecorded media
- **Testing:** Node.js built-in test runner and static project-contract checks
- **Package commands:** pnpm, with no install-time or runtime dependencies
- **Deployment:** Portable static files with Vercel and Netlify security configurations

## Installation and local development

### Requirements

- Python 3 for the local static server
- Node.js 20 or newer for project checks
- pnpm 10 or newer for the documented commands

### Clone and run

```bash
git clone https://github.com/SUDARSHANCHAUDHARI/ElevatorDrama.git
cd ElevatorDrama
pnpm dev
```

Because the repository is private, cloning requires access through an authenticated GitHub account. Open [http://localhost:4173](http://localhost:4173) after the server starts.

No dependency installation or build step is required. You can also use any static file server; ES modules require the project to be served over HTTP rather than opened directly with a `file://` URL.

### Run from an existing checkout

```bash
pnpm dev
```

## Controls

- Click or tab to any numbered button to choose a floor.
- Press <kbd>1</kbd> through <kbd>8</kbd> to select a floor when focus is not in an input.
- Press <kbd>Esc</kbd> or use **Reset** to cancel the current sequence and return to floor 1.
- Use **Sound on/off** and the volume slider to control generated audio.

Floor controls are disabled while a trip runs. Sound and reset remain available at all times.

## Verify

Run the complete dependency-free check:

```bash
pnpm check
```

This validates JavaScript syntax and runs the Node test suite. To run only the tests:

```bash
pnpm test
```

## Project structure

```text
ElevatorDrama/
├── index.html                 # Semantic UI and inline SVG artwork
├── styles.css                # Responsive visuals, doors, and motion preferences
├── app.js                    # DOM director, trip events, sounds, and input handling
├── elevator-engine.js        # Testable state machine and trip planner
├── favicon.svg               # Scalable project icon
├── site.webmanifest          # Installable-site metadata
├── robots.txt                # Crawler policy
├── vercel.json               # Vercel security headers
├── netlify.toml              # Netlify security headers
├── test/                     # Dependency-free Node tests
├── package.json              # Local development and verification scripts
├── CHANGELOG.md              # User-facing release history
├── SECURITY.md               # Vulnerability reporting policy
├── AGENTS.md                 # Repository-specific contributor guidance
├── LICENSE                   # MIT license
└── README.md                 # Project and deployment guide
```

## Deployment

No build step is required. Deploy the repository root as a static site.

Both supported configurations add a restrictive content-security policy, clickjacking protection, MIME sniffing protection, and a limited browser permissions policy. The HTML also carries a CSP fallback for other static hosts.

### Vercel

1. Import the repository.
2. Choose **Other** as the framework preset.
3. Leave the build command empty.
4. Set the output directory to `.` and deploy.

The included `vercel.json` applies the production response headers automatically.

### Netlify

1. Import the repository.
2. Leave the build command empty.
3. Set the publish directory to `.` and deploy.

The included `netlify.toml` applies the production response headers automatically.

### GitHub Pages

Publish the repository root from the chosen Pages branch. All asset paths are relative, so the app works from a project subpath without configuration.

## Architecture notes

`ElevatorStateMachine` owns legal transitions and trip facts. `createTripPlan()` chooses 2–4 unique mishaps and always returns a final attempt. `app.js` executes that plan with abortable async sequences, while a reset aborts pending timers before restoring the model and UI.

Audio is generated only after a user interaction because browsers restrict autoplay. If Web Audio is unavailable, every visual and interactive feature continues to work without sound.

## Release checklist

1. Run `pnpm check` and confirm every check passes.
2. Review `CHANGELOG.md` and update the release date/version when behavior changes.
3. Deploy the repository root using one of the configurations above.
4. Verify one complete trip, reset, sound controls, keyboard shortcuts, and reduced-motion behavior in a real browser.
5. Keep the GitHub repository private until the deployment and manual browser review are accepted.

No rollback migration is required: the app stores no user data. Reverting the deployed commit restores the previous release.

## Security

ElevatorDrama has no backend, analytics, remote API calls, or persisted user data. See [SECURITY.md](SECURITY.md) for private vulnerability reporting instructions.

## Author

**Sudarshan Chaudhari**<br />
Founder and developer, **SudarshanTechLabs**

- **GitHub:** [@SUDARSHANCHAUDHARI](https://github.com/SUDARSHANCHAUDHARI)
- **Repository:** [SUDARSHANCHAUDHARI/ElevatorDrama](https://github.com/SUDARSHANCHAUDHARI/ElevatorDrama)
- **Business and project contact:** [sudarshantechlabs@gmail.com](mailto:sudarshantechlabs@gmail.com)
- **Based in:** Bangkok, Thailand

For suspected vulnerabilities, follow the private reporting process in [SECURITY.md](SECURITY.md) rather than opening a public issue.

## License

Copyright © 2026 Sudarshan Chaudhari / SudarshanTechLabs. Released under the [MIT License](LICENSE).
