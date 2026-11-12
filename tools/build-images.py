#!/usr/bin/env python3
"""Build the responsive WebP images the site serves.

Sources live in content/ (originals, never modified). Output goes to
assets/img/<name>-<width>.webp for every width in WIDTHS that the source can
fill, plus the source's own width when it is smaller than the largest bucket.

Usage (from the repo root):
    python tools/build-images.py            # build missing / stale outputs
    python tools/build-images.py --force    # rebuild everything
    python tools/build-images.py --manifest # print name -> widths, dims

Requires Pillow:  pip install pillow
"""
from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "img"
WIDTHS = (640, 1280, 1920)
PORTRAIT_MAX = 1280  # portrait images never display wider than ~640 CSS px
QUALITY = 80

# output name (relative to assets/img, no extension) -> source (relative to repo root)
SOURCES: dict[str, str] = {
    # Work / productions (from hmayed.co)
    "work/mawlana": "content/hmayed-co/moulana-poster.webp",
    "work/intiqam-rouh": "content/hmayed-co/yt-bxHIugCorCo.webp",
    "work/yakout": "content/hmayed-co/yt-RL2XDOe_daQ.webp",
    "work/champollion": "content/hmayed-co/champollion-poster.webp",
    "work/tajalli": "content/hmayed-co/tajalli-poster.webp",
    "work/two-souls": "content/hmayed-co/two-souls-poster.jpg",
    "work/50-and-a-dream": "content/hmayed-co/yt-TFCGiX5bzBc.webp",
    "work/al-professeur": "content/hmayed-co/yt-wdEn2-5aOZk.webp",
    "work/smaatouha-menni": "content/hmayed-co/yt-02AUSQxd-Ew.webp",
    "work/malek": "content/hmayed-co/yt-eU8IgStjZFs.webp",
    "work/foma-home": "content/hmayed-co/ig-foma.webp",
    "work/toothpick-app": "content/hmayed-co/ig-toothpick.jpg",
    "work/marketworld-app": "content/hmayed-co/ig-marketworld.webp",
    "work/ecommerce-ad": "content/hmayed-co/ig-ecommerce.webp",
    # People / about (from hmayed.co)
    "about/portrait": "content/hmayed-co/about-portrait.webp",
    "about/on-location": "content/hmayed-co/about-location.webp",
    "about/ronin-workshop": "content/hmayed-co/workshop-ronin.webp",
    # Everest story (from hmayed.co)
    "everest/ridge": "content/hmayed-co/everest-ridge.webp",
    "everest/kayak": "content/hmayed-co/nepal-kayak.webp",
    "everest/elephant": "content/hmayed-co/nepal-elephant.webp",
    # Content creation (full-resolution originals from this repo)
    "content-creation/talking-head-1": "content/content-creation/talking-head/CC1.webp",
    "content-creation/talking-head-2": "content/content-creation/talking-head/CC2.webp",
    "content-creation/talking-head-3": "content/content-creation/talking-head/CC3.webp",
    "content-creation/podcast-1": "content/content-creation/podcast/podcast1.jpg",
    "content-creation/podcast-2": "content/content-creation/podcast/podcast2.jpg",
    **{
        f"content-creation/food-{i}": f"content/content-creation/food/food{i}.jpg"
        for i in range(1, 8)
    },
}

# Copied as-is (social share image must stay JPEG for the widest crawler support).
COPIES: dict[str, str] = {
    "og/hmayed-og.jpg": "content/hmayed-co/everest-ridge-square-1200.jpg",
}


def target_widths(src_w: int, src_h: int) -> list[int]:
    cap = PORTRAIT_MAX if src_h > src_w else WIDTHS[-1]
    widths = [w for w in WIDTHS if w < min(src_w, cap)]
    widths.append(min(src_w, cap))
    return sorted(set(widths))


def build(name: str, src: Path, force: bool) -> dict:
    with Image.open(src) as im:
        im = ImageOps.exif_transpose(im)
        if im.mode not in ("RGB", "RGBA"):
            im = im.convert("RGB")
        src_w, src_h = im.size
        outputs = []
        for w in target_widths(src_w, src_h):
            h = round(src_h * w / src_w)
            dest = OUT / f"{name}-{w}.webp"
            outputs.append({"w": w, "h": h, "path": dest.relative_to(ROOT).as_posix()})
            if dest.exists() and not force and dest.stat().st_mtime >= src.stat().st_mtime:
                continue
            dest.parent.mkdir(parents=True, exist_ok=True)
            if w == src_w and src.suffix.lower() == ".webp":
                # Already a web-ready WebP at this size: copy instead of re-encoding.
                shutil.copyfile(src, dest)
            else:
                im.resize((w, h), Image.LANCZOS).save(dest, "WEBP", quality=QUALITY, method=6)
    return {"src": src.relative_to(ROOT).as_posix(), "variants": outputs}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--manifest", action="store_true", help="print JSON manifest")
    args = ap.parse_args()

    manifest = {}
    for name, rel in SOURCES.items():
        src = ROOT / rel
        if not src.exists():
            print(f"missing source: {rel}", file=sys.stderr)
            return 1
        manifest[name] = build(name, src, args.force)

    for dest_rel, src_rel in COPIES.items():
        dest = OUT / dest_rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(ROOT / src_rel, dest)

    if args.manifest:
        print(json.dumps(manifest, indent=2))
    else:
        total = sum(1 for m in manifest.values() for _ in m["variants"])
        print(f"{len(manifest)} images, {total} variants in {OUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
