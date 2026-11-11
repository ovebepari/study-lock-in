#!/usr/bin/env python3
"""
Convert TOML syllabus files into YAML files for Jekyll (_data/syllabi/*.yml).
Usage:
    python3 scripts/convert_toml_to_yaml.py
    python3 scripts/convert_toml_to_yaml.py path/to/syllabus.toml
"""

import sys
from pathlib import Path
try:
    import tomllib
except ImportError:
    import tomli as tomllib
import yaml

class IndentedDumper(yaml.SafeDumper):
    pass

def str_presenter(dumper, data):
    if '\n' in data:
        return dumper.represent_scalar('tag:yaml.org,2002:str', data, style='|')
    return dumper.represent_scalar('tag:yaml.org,2002:str', data)

IndentedDumper.add_representer(str, str_presenter)

def convert_file(toml_path: Path, dst_dir: Path):
    name = toml_path.name
    if name.startswith("syllabus-"):
        yaml_name = name.replace("syllabus-", "").replace(".toml", ".yml")
    else:
        yaml_name = name.replace(".toml", ".yml")
    
    with open(toml_path, "rb") as f:
        data = tomllib.load(f)
    
    dst_dir.mkdir(parents=True, exist_ok=True)
    out_path = dst_dir / yaml_name
    with open(out_path, "w", encoding="utf-8") as f:
        yaml.dump(data, f, Dumper=IndentedDumper, sort_keys=False, allow_unicode=True, default_flow_style=False)
    print(f"✓ Converted {toml_path.name} -> {out_path}")

def main():
    root = Path(__file__).resolve().parent.parent
    syllabi_dst = root / "_data" / "syllabi"
    
    if len(sys.argv) > 1:
        for arg in sys.argv[1:]:
            p = Path(arg)
            if p.is_file():
                convert_file(p, syllabi_dst)
    else:
        # Search parent folders or current folder for toml files
        search_dirs = [
            root / "syllabus",
            root.parent / "project-explore" / "study-tracker-webapp-boilerplate" / "syllabus"
        ]
        found = False
        for sdir in search_dirs:
            if sdir.exists():
                for toml_path in sdir.glob("*.toml"):
                    convert_file(toml_path, syllabi_dst)
                    found = True
        if not found:
            print("No .toml files found to convert.")

if __name__ == "__main__":
    main()
