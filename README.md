<div align="center">
  <img src="./public/favicon.svg" width="72" alt="DeckForge">
  <h1>DeckForge</h1>
  <p><strong>Zero-backend visual editor for HTML presentations</strong></p>
  <p>Edit AI-generated HTML slides like PowerPoint — with a local AI agent on call. Runs entirely in your browser.</p>

  <p>
    <a href="./LICENSE"><img src="https://img.shields.io/badge/License-MIT-34C759?style=flat-square" alt="License"></a>
    <a href="https://react.dev"><img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react" alt="React"></a>
    <a href="https://vitejs.dev"><img src="https://img.shields.io/badge/Vite-8.1-646CFF?style=flat-square&logo=vite" alt="Vite"></a>
    <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-6.0-3178C6?style=flat-square&logo=typescript" alt="TypeScript"></a>
    <a href="https://tailwindcss.com"><img src="https://img.shields.io/badge/Tailwind_CSS-4.3-06B6D4?style=flat-square&logo=tailwindcss" alt="Tailwind CSS"></a>
  </p>
</div>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Quick Start](#quick-start)
- [Usage](#usage)
- [AI Editing with Local Codex](#ai-editing-with-local-codex)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Browser Support](#browser-support)
- [Deployment](#deployment)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

DeckForge turns static HTML presentations into editable decks. Instead of editing markup by hand, you interact with slides visually: select elements, edit text, drag and resize on canvas, manage pages, and save everything straight back to the original file.

The application is a single-page React app that runs entirely in the browser. There is no backend: imported files never leave your machine, edits are autosaved to a local IndexedDB draft, and saving writes to the original HTML file through the browser's File System Access API.

Optionally, you can connect a local OpenAI **Codex CLI** through a tiny localhost bridge and edit slides with natural language — the agent locks the page it is working on so it never clashes with your own edits.

### Why DeckForge?

Modern AI tools generate high-quality HTML slides, but making small edits afterwards is painful. DeckForge bridges that gap by providing a visual layer on top of existing HTML decks, preserving the original design while enabling fast, local edits — by hand or by agent.

---

## Features

| Feature | Description |
| --- | --- |
| **Visual Editing** | Click to select, double-click to edit text, adjust styles in the right panel. Drag elements on canvas and resize with 8 handles; nudge with arrow keys. |
| **AI Slide Editing** | Describe a change in natural language; a local Codex CLI agent edits the page through the agent bridge. The target page is temporarily locked during the run, and the last AI edit can be reverted with one click. |
| **Snapshot Undo / Redo** | Per-slide snapshot history (up to 50 steps) that covers every edit type — styles, text, images, inserts, deletions. |
| **Slide Management** | Page list panel: add, duplicate, delete, and drag to reorder pages; newly added pages inherit the deck's look. |
| **Multi-select & Align** | Shift-click to select multiple elements, then align or distribute them (left/center/right, top/middle/bottom, horizontal/vertical distribution). |
| **Element Insertion** | Insert text boxes, rectangles, circles, and lines anywhere on a page. |
| **Inline Rich Text** | Floating toolbar for bold/italic/underline, font size, and alignment while editing text. |
| **Format Painter** | Copy styles from one element and apply them to others, with single-shot and continuous modes. |
| **Image Tools** | Replace images, adjust corner radius and shadow, and fine-tune brightness/contrast/saturation. |
| **Save to Original File** | Saving writes back to the imported HTML file in place via the File System Access API. No export-copy shuffling. |
| **Autosave Drafts** | Edits are debounced-saved to IndexedDB; the home screen offers one-click draft restore after a refresh or crash. |
| **Light & Dark Themes** | Switch between the dark workspace and an ivory light theme; the preference is remembered locally. |
| **Privacy First** | Zero backend. Files, drafts, and AI runs all stay on your machine. |

---

## Quick Start

### Prerequisites

- Node.js 20 or later
- npm 10 or later
- (Optional, for AI editing) [OpenAI Codex CLI](https://developers.openai.com/codex/cli/) installed and logged in

### Local Development

```bash
# Clone the repository
git clone https://github.com/haokuang/deckforge.git
cd deckforge

# Install dependencies
npm install

# Start the development server
npm run dev

# (Optional) start the local AI agent bridge on 127.0.0.1:8787
npm run agent

# Build for production
npm run build

# Preview the production build
npm run preview

# Run the linter
npm run lint
```

### Docker

```bash
# Build and run with Docker Compose
docker compose up -d

# Or build the image manually
docker build -t deckforge .
docker run -d -p 8080:80 --name deckforge deckforge
```

The Docker image serves the static build via Nginx on port `8080`. Note that browser file-system features may be limited inside the container; local development provides the full experience.

---

## Usage

### 1. Import a Presentation

Click **Select HTML** (or drag a file onto the drop zone) to import a single self-contained HTML presentation. DeckForge keeps a write handle to the original file so edits can be saved back to it later.

### 2. Toggle Edit Mode

Click the **Enter Edit** button in the top bar or press `Ctrl + E`. The preview area becomes interactive; **Exit Edit** saves and returns to the clean preview.

### 3. Edit Content

- **Select an element** with a single click to edit its styles in the right panel (text, image, layout, effects).
- **Edit text** by double-clicking a text element; a floating toolbar offers bold/italic/underline, size, and alignment.
- **Drag and resize** elements directly on the canvas; use arrow keys to nudge, `Delete` to remove, `Ctrl + D` to duplicate.
- **Right-click** an element for a context menu with copy/paste/duplicate/delete and insertion actions.
- **Format Painter**: select a source element, click the Format Painter button, then click a target element. Double-click the button to keep it active across multiple targets.
- **Insert elements**: use the context menu or toolbar to add text boxes, rectangles, circles, and lines.

### 4. Manage Slides

The left panel lists every detected page with its title. Click to switch, drag to reorder, hover for duplicate/delete actions, or use **Add Page** to append a new page styled like the current one.

### 5. Save and Drafts

- **Save** (`Ctrl + S`): writes the current deck back to the original HTML file. If the file was drag-imported without a write handle, DeckForge asks you to point at the original file once; afterwards saving is always silent.
- **Autosave drafts**: edits are saved to IndexedDB a moment after every change. The home screen detects leftover drafts and offers one-click restore or discard.
- **Close**: the top-bar Close button returns to the home screen, keeping the draft.

### 6. AI Editing with Local Codex

No cloud, no API keys — the AI panel drives the **Codex CLI installed on your own machine**:

1. Install and authenticate the Codex CLI.
2. Run `npm run agent` to start the bridge on `http://127.0.0.1:8787` (test the connection in **Settings**).
3. Open the **AI** panel on the right, describe the change (e.g. "把标题改成红色并居中", "add a footer with today's date"), and run.
4. The bridge locks the current page, exports its HTML to Codex, applies the returned markup, and unlocks. Other pages stay fully editable while the agent works.
5. Not happy with the result? One click reverts the entire AI edit via the snapshot history.

The bridge wraps `codex exec --sandbox read-only`, listens only on localhost, and processes one task at a time. Configuration (port, Codex binary, model, timeout) and the HTTP API are documented in [`agent-bridge/README.md`](./agent-bridge/README.md).

---

## Keyboard Shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl + S` | Save to the original file |
| `Ctrl + Z` / `Ctrl + Shift + Z` | Undo / Redo |
| `Ctrl + E` | Toggle edit / preview mode (exiting also saves) |
| `Ctrl + C` / `Ctrl + V` / `Ctrl + D` | Copy / paste / duplicate selected element (inside editor) |
| `Delete` | Delete selected element(s) |
| `Arrow keys` | Nudge selected element (Shift for larger steps) |
| `Esc` | Clear selection, deactivate Format Painter, or close menus |

---

## Tech Stack

- **Framework**: React 19
- **Language**: TypeScript 6
- **Build Tool**: Vite 8
- **Styling**: Tailwind CSS 4 with a custom Liquid Glass design system
- **State Management**: Zustand 5
- **Icons**: Lucide React
- **AI Bridge**: zero-dependency Node.js HTTP server (`agent-bridge/`)
- **Container (optional)**: Nginx on Alpine Linux

---

## Project Structure

```
deckforge/
├── .github/workflows/        # GitHub Actions CI
├── agent-bridge/             # Local Codex bridge server + docs
│   ├── server.mjs
│   └── README.md
├── public/                   # Static assets
├── src/
│   ├── components/
│   │   ├── importer/         # Import / draft-restore entry
│   │   ├── layout/           # TopBar, LeftPanel, PreviewArea, RightPanel
│   │   ├── tools/            # Text, image, layout, and AI tool panels
│   │   └── ui/               # Reusable UI primitives
│   ├── store/                # Zustand global state (agent flow, autosave, save)
│   ├── types/                # TypeScript definitions
│   ├── utils/                # iframe DOM bridge, file access, draft storage
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── Dockerfile
├── docker-compose.yml
├── index.html
├── LICENSE
├── package.json
├── postcss.config.js
├── README.md
├── tsconfig.json
└── vite.config.ts
```

---

## Browser Support

DeckForge targets modern evergreen browsers:

| Browser | Minimum Version | Notes |
| --- | --- | --- |
| Chrome / Edge | 100+ | Full experience, including saving back to the original file |
| Firefox | 100+ | Editing works; saving falls back to a browser download |
| Safari | 15+ | Editing works; saving falls back to a browser download |

Saving to the original file relies on the File System Access API, which is currently only available in Chromium-based browsers.

---

## Deployment

### Static Hosting

After running `npm run build`, the `dist/` directory contains a fully static site. It can be deployed to any static host such as GitHub Pages, Vercel, Netlify, or Cloudflare Pages.

### Docker

The included `Dockerfile` and `docker-compose.yml` produce a production-ready Nginx image. See the [Quick Start](#quick-start) section for commands.

---

## Roadmap

- [ ] Responsive preview modes for common slide aspect ratios
- [ ] Built-in theme switcher and color palette presets
- [ ] Bulk find-and-replace across all slides
- [ ] Support for multi-file deck folders (CSS/JS/images alongside the HTML)
- [ ] Offline PWA support
- [ ] Plugin API for custom tool panels

---

## Contributing

Contributions are welcome. Please open an issue to discuss large changes before submitting a pull request.

### Reporting Issues

If you find a bug or have a feature request, please open an issue and include:

- A clear title and description.
- Steps to reproduce the problem, if applicable.
- Your browser and operating system versions.
- A minimal example file or screenshot when helpful.

### Submitting Pull Requests

1. Fork the repository and clone your fork.
2. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. Make your changes. Follow the existing code style and keep changes focused.
4. Ensure the project still builds and lints cleanly:
   ```bash
   npm run lint
   npm run build
   ```
5. Commit with a clear message:
   ```bash
   git commit -m "feat: add feature description"
   ```
6. Push your branch and open a pull request against `main`.

### Code Style

- TypeScript is used throughout. Prefer explicit types for public interfaces.
- Tailwind CSS utility classes are used for styling.
- Liquid Glass visual patterns should be consistent with existing components.
- Keep components small and focused on a single responsibility.

### Development Setup

```bash
npm install
npm run dev
```

The development server will start on `http://localhost:5173` by default.

### Questions

Feel free to open a discussion if you have questions that are not covered here.

---

## License

This project is licensed under the [MIT License](./LICENSE).

---

<div align="center">
  <sub>Built with React, Vite, and Tailwind CSS.</sub>
</div>
