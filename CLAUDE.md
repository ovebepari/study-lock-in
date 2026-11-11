# CLAUDE.md — Agent Orientation & Developer Guide

Welcome, agent! This document provides all the context, architecture patterns, and conventions needed to work on **Study Lock-In**. Read this before making changes to the codebase.

---

## 📌 Project Overview

**Study Lock-In** is an interactive, syllabus-driven study tracker designed to be hosted statically on **GitHub Pages (`https://<username>.github.io/study-lock-in/`)**.

* **Zero Backend at Runtime**: The app runs 100% client-side in the browser. There is no Python/Node server running in production.
* **Single Source of Truth**: Curricula and baselines live as native YAML files in `_data/syllabi/*.yml`.
* **Offline-First & Local Persistence**: All progress (checkboxes, timestamps, journal entries, comments, custom links) saves immediately to browser `localStorage`.
* **Passcode Protected**: A client-side lock screen prevents casual browsing when hosted publicly. Default passcode: `lockin`.
* **Cross-Machine Git Sync**: Users export their updated progress as YAML, commit it to `_data/syllabi/`, and push to GitHub Pages to sync across devices.

---

## 🏗️ Architecture & Tech Stack

```
Jekyll Data (_data/syllabi/*.yml, _data/activity.yml)
                     │
                     ▼ (Jekyll Build / Liquid)
index.html <script id="syllabi-data" type="application/json">
           <script id="activity-data" type="application/json">
           <script id="site-config" type="application/json">
                     │
                     ▼ (Loaded by app.js on boot)
      In-Memory State  ◄──►  Browser localStorage
                     │
                     ▼ (On Export)
         Exported .yml  ───►  Drop in _data/syllabi/ & git push
```

### Key Files & Directories

| Path | Purpose |
| :--- | :--- |
| `_config.yml` | Jekyll settings (`baseurl: "/study-lock-in"`, default `passcode_hash`). |
| `_data/syllabi/*.yml` | Base curricula (`math-for-ml.yml`, `ai-engineering.yml`, etc.). |
| `_data/activity.yml` | Historical completion log powering the GitHub-style contribution heatmap. |
| `_layouts/default.html` | Base HTML wrapper; loads Google Fonts, `style.css`, and `app.js` using `relative_url`. |
| `index.html` | App mount root; embeds JSON scripts via Liquid and contains the `#lockScreen` modal. |
| `app.js` | Core application logic (state manager, event dispatcher, YAML exporter, lock logic, audio). |
| `style.css` | Anthropic-inspired warm design system (dark/light themes, typography, animations, responsive). |
| `zen-music.mp3` | Lo-fi focus audio track with fading controller. |
| `Gemfile` | Ruby dependencies for local Jekyll serving (`jekyll`, `jekyll-feed`, `webrick`). |
| `scripts/convert_toml_to_yaml.py` | Utility to convert legacy TOML syllabi into Jekyll YAML format. |
| `sync-to-github.sh` | Bash helper to commit and push progress updates to GitHub. |
| `.github/workflows/deploy.yml` | GitHub Actions workflow to build and deploy to GitHub Pages. |

---

## 🛠️ Development & Common Workflows

### 1. Running Locally with Bundler (Jekyll)
```bash
bundle install
bundle exec jekyll serve

# With live reload:
bundle exec jekyll serve --livereload
```
Site will be served at: `http://localhost:4000/study-lock-in/`

### 2. Converting a New TOML Syllabus
```bash
python3 scripts/convert_toml_to_yaml.py path/to/syllabus.toml
```
The script writes the output directly into `_data/syllabi/<name>.yml`.

### 3. Syncing Progress to GitHub Pages
Export syllabus progress (**Export for Git**) into `_data/syllabi/` and the activity log (**Export Activity**) over `_data/activity.yml`, then:
```bash
./sync-to-github.sh
```

---

## 🔐 Passcode & Security System

* **Passcode Hash**: Configured in `_config.yml` under `passcode_hash` (default is SHA-256 for `lockin`).
* **Storage**: When unlocked, `localStorage.setItem('study-lock-in:unlocked', 'true')` is set.
* **Custom Passcode**: Users can change their passcode from the Data Panel, which saves `study-lock-in:custom-passcode-hash` in `localStorage`.
* **Lock Trigger**: Calling `lockApp()` removes the unlocked key and restores the `#lockScreen` overlay.
* **Important Note**: This is a client-side gate designed to keep casual observers out while hosting on public GitHub Pages. It is not cryptographic encryption for high-security secrets.

---

## 💾 LocalStorage & State Schema

All browser storage keys are prefixed to avoid collisions:

| Key | Format | Description |
| :--- | :--- | :--- |
| `study-lock-in:unlocked` | `"true"` or unset | Indicates whether workspace is unlocked. |
| `study-lock-in:active-syllabus` | string (e.g. `"math-for-ml"`) | Currently selected syllabus key. |
| `study-lock-in:state:<syllabusKey>` | JSON string | Local state overrides (checked tasks, timestamps, journal, time logs, comments). |
| `study-lock-in:activity` | JSON array `[{ t, syllabus, topic, action }]` | Local completion log entries added on the current device. |
| `study-lock-in:trophies` | JSON array `["Task name", ...]` | Titles of completed tasks for the gravity trophy pile. |
| `study-lock-in:custom-passcode-hash` | hex string | Custom SHA-256 passcode hash if changed by user. |
| `study-tracker-ui:<syllabusKey>` | JSON string | Pure UI preferences (`activeDay`, `journalDay`, `theme`). |

### State Data Structure in Memory (`state`)
```javascript
{
  meta: { title: "...", subtitle: "..." },
  theme: "dark",
  activeDay: "day-1",
  journalDay: "day-1",
  startDate: "2026-11-05T09:10:10.387Z",
  days: [
    {
      id: "day-1",
      title: "Day 1: ...",
      subtitle: "...",
      label: "LinAlg",
      blocks: [
        {
          id: "day-1-blk-1",
          title: "Watch",
          badge: "morning",
          icon: "📺",
          isBonus: false,
          tasks: [
            {
              id: "day-1-blk-1-task-1",
              text: "...",
              resources: [{ label: "...", url: "..." }]
            }
          ]
        }
      ]
    }
  ],
  checked: { "day-1-blk-1-task-1": true },
  doneAt: { "day-1-blk-1-task-1": "2026-11-05T09:10:10Z" },
  journal: { "day-1": "Notes..." },
  timeLog: { "day-1": 1800 },
  comments: { "day-1-blk-1-task-1": ["comment text"] },
  customResources: { "day-1-blk-1-task-1": [{ label: "Link", url: "https://..." }] }
}
```

---

## ⚠️ Critical Rules for Future Agents

1. **Never Re-introduce a Server Dependency**:
   All operations (`task`, `journal`, `time`, `comment_add`, `res_add`, etc.) must route through `postEvent(event)` and save directly into `localStorage`. Do not add `fetch('/api/...')` endpoints.

2. **Preserve Jekyll GitHub Pages Path Compatibility**:
   GitHub Pages serves project sites under a subpath (e.g. `/study-lock-in/`).
   * In Liquid templates, always use `{{ '/path' | relative_url }}`.
   * In JS audio/asset paths, always prefix with `(siteConfig.baseurl || '')`.

3. **YAML Schema Compatibility**:
   When updating `stateToYaml(state)` or `scripts/convert_toml_to_yaml.py`, maintain exact schema compatibility with `_data/syllabi/*.yml`. Multiline journal text must use block scalars (`|`) and list items must be properly indented.

4. **Activity Heatmap Invariants**:
   * Always combine base historical activity from `getEmbeddedActivity()` with device activity from `getLocalActivity()` via `getActivityLog()`, which de-duplicates entries (by `t|syllabus|topic|action`) that exist in both after an `activity.yml` export is committed.
   * `exportActivity()` writes the merged log as `activity.yml`; keep `t` quoted so Jekyll treats timestamps as strings, not `Time` objects.
   * Date parsing must use local date strings (`toDateStr`) to avoid UTC day-shift bugs.
   * `renderHeatmap()` dynamically detects the active year from data; preserve this so the calendar grid doesn't render empty if the client device clock is in a different year.

5. **Aesthetic & UX Fidelity**:
   Preserve the Anthropic-inspired warm cream palette, typography (`Inter` + `JetBrains Mono`), micro-animations (card hover lift, checkbox bounce, Khan Academy-style particle burst, trophy pile), and Zen focus audio.
