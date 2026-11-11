# 🔒 Study Lock-In

A static, syllabus-driven study tracker designed for **GitHub Pages (`github.io`)**. Runs 100% in the browser with zero backend server dependencies.

- 🔒 **Passcode Protected**: Client-side lock screen prevents casual browsing on public GitHub Pages.
- ⚡ **Offline-First & Instant**: All checkbox clicks, timer sessions, comments, and journal notes persist in browser `localStorage`.
- 💾 **Cross-Machine Git Sync**: Export your progress as clean YAML, commit it to `_data/syllabi/`, and push to update your baseline across all devices.
- 🎨 **Anthropic-inspired Aesthetic**: Clean editorial typography, dark/light themes, zen focus music, and micro-celebrations.

---

## 🚀 Quick Start (GitHub Pages)

### 1. Push to GitHub
1. Create a repository named `study-lock-in` under your GitHub account.
2. Add the remote and push:
   ```bash
   git remote add origin git@github.com:<your-username>/study-lock-in.git
   git push -u origin main
   ```
3. In GitHub repo settings $\to$ **Pages**:
   - Source: **GitHub Actions** (the included `.github/workflows/deploy.yml` will automatically build and publish).
4. Open your live tracker at: `https://<your-username>.github.io/study-lock-in/`

---

## 🔑 Passcode Protection

- **Default Passcode**: `lockin`
- When you first visit the site on any browser, you will be prompted for your passcode.
- Once unlocked, your session is remembered on that browser.
- Click the **🔒 Lock** button in the header anytime to lock your workspace immediately.
- To change your passcode, open the **Export / Import Panel** (arrow down icon) $\to$ **Change Passcode**.

---

## 🔄 How Cross-Machine Sync Works

```
Machine A (Laptop)                 GitHub Repository                 Machine B (Desktop/Tablet)
┌──────────────────────┐          ┌─────────────────────┐          ┌──────────────────────┐
│ Study & check tasks  │          │                     │          │ Open GitHub Pages URL│
│ (saved in localSt.)  │          │  _data/syllabi/     │          │ (loads committed     │
│          │           │          │   └── <name>.yml    │─────────▶│  baseline progress)  │
│          ▼           │  commit  │                     │          └──────────────────────┘
│ Click 'Export for Git│─────────▶│ GitHub Actions      │
│ (.yml)' & drop in dir│  & push  │ auto-deploys        │
└──────────────────────┘          └─────────────────────┘
```

1. **On Machine A**: Study, tick checkboxes, write journal notes, log time. Changes save instantly to `localStorage`.
2. **Before switching machines**:
   - Open the Export panel $\to$ click **"Export for Git (.yml)"**.
   - Move the downloaded `.yml` file into `_data/syllabi/`.
   - Run `./sync-to-github.sh` (or `git add -A && git commit -m "sync" && git push`).
3. **On Machine B**:
   - Open the site. It automatically pulls the newly deployed baseline from GitHub Pages!
   - *(Optional)* If Machine B had older cached state, click **"Reset to Git Baseline"** to sync cleanly.

---

## 💻 Local Preview (No Ruby/Jekyll Required)

You can build and preview the site locally using Python (standard library only):

```bash
# Build static files into _site/
python3 scripts/build_static.py

# Or build and start local web server at http://localhost:4000
python3 scripts/build_static.py --serve --port 4000
```

---

## 📂 Converting New Syllabi (TOML to YAML)

If you have a syllabus in `.toml` format, you can convert it to Jekyll YAML format anytime:

```bash
python3 scripts/convert_toml_to_yaml.py path/to/my-syllabus.toml
```
The converted file will automatically be placed into `_data/syllabi/`.

---

## 📁 Repository Structure

```
study-lock-in/
├── _config.yml               # Jekyll configuration & site metadata
├── _data/
│   ├── syllabi/              # Syllabus baselines (YAML)
│   │   ├── math-for-ml.yml
│   │   ├── ai-engineering.yml
│   │   ├── ai-systems-and-finance.yml
│   │   └── hf-llm.yml
│   └── activity.yml          # Activity log history
├── _layouts/
│   └── default.html          # HTML shell layout
├── index.html                # App root with embedded Liquid JSON data & lock screen
├── style.css                 # Anthropic-inspired dark/light styling
├── app.js                    # Client-side state, events, lock screen, YAML exporter
├── zen-music.mp3             # Focus audio
├── scripts/
│   ├── convert_toml_to_yaml.py  # TOML -> YAML converter
│   └── build_static.py          # Pure Python static site generator & local preview server
├── sync-to-github.sh         # One-click commit & push script
└── .github/workflows/
    └── deploy.yml            # GitHub Actions Pages deployment
```
