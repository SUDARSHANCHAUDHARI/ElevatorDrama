# ElevatorDrama

[![Version 1.0.0](https://img.shields.io/badge/version-1.0.0-e9a93f)](CHANGELOG.md)
[![License: MIT](https://img.shields.io/badge/license-MIT-182626)](LICENSE)
![Vanilla JavaScript](https://img.shields.io/badge/JavaScript-vanilla-f7df1e?logo=javascript&logoColor=182626)
![Runtime dependencies: 0](https://img.shields.io/badge/runtime_dependencies-0-6faf9b)

An interactive cartoon elevator that makes every trip unnecessarily dramatic. Choose a floor, endure a few entirely avoidable incidents, and eventually arrive where you asked to go.

ElevatorDrama is a standalone static web project built with semantic HTML, hand-written CSS, inline SVG artwork, and vanilla JavaScript. It has no runtime dependencies, no external fonts, and no prerecorded media.

## Table of Contents

- [Features](#features)
- [Technology](#technology)
- [Installation and local development](#installation-and-local-development)
- [Controls](#controls)
- [Verify](#verify)
- [Project structure](#project-structure)
- [Deployment](#deployment)
- [Architecture notes](#architecture-notes)
- [Release checklist](#release-checklist)
- [Security](#security)
- [License](#license)
- [About](#about)

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

## License

Copyright © 2026 Sudarshan Chaudhari / SudarshanTechLabs. Released under the [MIT License](LICENSE).

---

## About

I'm Sudarshan Chaudhari, a Senior Quality Engineer, Test Automation specialist, and AI systems builder based in Bangkok, Thailand.

I have 13+ years of experience in software quality engineering, working across SaaS, fintech, gaming, web, mobile, cloud, and digital signage platforms. My background combines hands-on test automation with QA leadership, test strategy, CI/CD, release quality, production investigation, and cross-platform validation.

Alongside my professional QA career, I run [SudarshanTechLabs](https://sudarshantechlabs.com/), my independent engineering and product lab where I design, build, test, and ship software across Android, web, AI, cybersecurity, developer tooling, and cross-platform applications.

### What I work on

- ⚙️ **Quality Engineering & Test Automation** — Playwright, Selenium, Cypress, Appium, API testing, automation frameworks, end-to-end testing, CI/CD, release gates, GitHub Actions, risk-based testing, and production validation
- 🤖 **AI Systems & Automation** — AI agents, multi-agent orchestration, MCP servers, AI-assisted QA, prompt tooling, developer workflows, automation systems, and Claude Code plugins
- 📱 **Mobile & Cross-Platform Applications** — Android applications built with Kotlin and Jetpack Compose, Google Play releases, automated build and publishing pipelines, and cross-platform development spanning iOS, web, Windows, and macOS
- 🌐 **Web Applications & Platforms** — Full-stack applications using Next.js, TypeScript, Firebase, Cloudflare, REST APIs, and modern web infrastructure
- 🛠️ **Developer Tooling & CLI Engineering** — Rust, Python, TypeScript, CLI utilities, multi-repository tooling, build automation, release tooling, and engineering productivity systems
- 🛡️ **Cybersecurity & Observability** — Threat detection, log analysis, security auditing, vulnerability assessment, monitoring, and security-focused developer tools
- 📺 **Digital Signage & Device Platforms** — Content validation, playback testing, device compatibility, production investigation, monitoring, and QA across diverse hardware and operating-system environments

My work sits at the intersection of quality engineering, automation, AI, and software development. I approach products with a QA mindset from the beginning: understanding failure modes, designing for testability, automating repetitive work, and building release confidence into the engineering process.

Through SudarshanTechLabs, I also build products and tools from idea to production, covering architecture, development, testing, CI/CD, release automation, monitoring, and ongoing maintenance.

🌐 [sudarshantechlabs.com](https://sudarshantechlabs.com/) · 💼 [LinkedIn](https://linkedin.com/in/sudarshan-chaudhari) · 🐙 [GitHub](https://github.com/SUDARSHANCHAUDHARI) · ✉️ [sunny.sudarshan@gmail.com](mailto:sunny.sudarshan@gmail.com)
