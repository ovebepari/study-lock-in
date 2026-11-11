#!/usr/bin/env python3
"""
Static build generator for Study Lock-In.
Builds the site into _site/ directory for local preview without needing Ruby or Jekyll.
Usage:
    python3 scripts/build_static.py
    python3 scripts/build_static.py --serve --port 4000
"""

import os
import sys
import json
import yaml
import shutil
import argparse
from pathlib import Path
from http.server import HTTPServer, SimpleHTTPRequestHandler

ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / "_data"
SITE_DIR = ROOT_DIR / "_site"

def load_data():
    syllabi = {}
    syllabi_dir = DATA_DIR / "syllabi"
    if syllabi_dir.exists():
        for yml in syllabi_dir.glob("*.yml"):
            key = yml.stem
            with open(yml, "r", encoding="utf-8") as f:
                syllabi[key] = yaml.safe_load(f)
    
    activity = []
    act_file = DATA_DIR / "activity.yml"
    if act_file.exists():
        with open(act_file, "r", encoding="utf-8") as f:
            activity = yaml.safe_load(f) or []

    config = {}
    cfg_file = ROOT_DIR / "_config.yml"
    if cfg_file.exists():
        with open(cfg_file, "r", encoding="utf-8") as f:
            config = yaml.safe_load(f) or {}

    return syllabi, activity, config

def build():
    syllabi, activity, config = load_data()
    SITE_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Read layout and index.html
    layout_file = ROOT_DIR / "_layouts" / "default.html"
    index_file = ROOT_DIR / "index.html"

    with open(layout_file, "r", encoding="utf-8") as f:
        layout_html = f.read()

    with open(index_file, "r", encoding="utf-8") as f:
        index_raw = f.read()

    # Strip YAML frontmatter from index.html
    if index_raw.startswith("---"):
        parts = index_raw.split("---", 2)
        content_html = parts[2].strip() if len(parts) >= 3 else index_raw
    else:
        content_html = index_raw

    # Replace Jekyll Liquid placeholders
    syllabi_json = json.dumps(syllabi, ensure_ascii=False)
    activity_json = json.dumps(activity, ensure_ascii=False)
    config_json = json.dumps({
        "baseurl": config.get("baseurl", ""),
        "passcodeHash": config.get("passcode_hash", "ef537ff85794828b8460be01daab559098fb6eb696fc9df92ea8ab5c1c0e3579")
    })

    content_html = content_html.replace("{{ site.data.syllabi | jsonify }}", syllabi_json)
    content_html = content_html.replace("{{ site.data.activity | jsonify }}", activity_json)
    content_html = content_html.replace('{\n  "baseurl": "{{ site.baseurl }}",\n  "passcodeHash": "{{ site.passcode_hash }}"\n}', config_json)
    content_html = content_html.replace('{"baseurl": "{{ site.baseurl }}", "passcodeHash": "{{ site.passcode_hash }}"}', config_json)

    # Inject into layout
    final_html = layout_html.replace("{{ content }}", content_html)
    final_html = final_html.replace("{{ page.title | default: site.title }}", config.get("title", "Study Lock-In"))
    final_html = final_html.replace("{{ site.description }}", config.get("description", ""))
    final_html = final_html.replace("{{ '/style.css' | relative_url }}", "style.css")
    final_html = final_html.replace("{{ '/app.js' | relative_url }}", "app.js")

    with open(SITE_DIR / "index.html", "w", encoding="utf-8") as f:
        f.write(final_html)

    # 2. Copy static assets
    for fname in ["style.css", "app.js", "zen-music.mp3"]:
        src = ROOT_DIR / fname
        if src.exists():
            shutil.copy2(src, SITE_DIR / fname)

    print(f"✓ Successfully built static site into {SITE_DIR}/")
    print(f"  • Syllabi loaded: {list(syllabi.keys())}")
    print(f"  • Activity entries: {len(activity)}")

def serve(port=4000):
    build()
    os.chdir(SITE_DIR)
    print(f"\n🚀 Serving local preview at http://localhost:{port}")
    print("   Press Ctrl+C to stop.\n")
    server = HTTPServer(("0.0.0.0", port), SimpleHTTPRequestHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped server.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--serve", action="store_true", help="Start local preview server")
    parser.add_argument("--port", type=int, default=4000, help="Port to serve on")
    args = parser.parse_args()

    if args.serve:
        serve(args.port)
    else:
        build()
