# -*- coding: utf-8 -*-
"""
App 圖示產生工具
用法（在專案根目錄執行）：
    pip install pillow
    python tools/make_icons.py

- 如果 icons/icon-1024.png 存在：以它為原圖，縮出各尺寸。
- 如果不存在：先畫一張佔位圖示，再縮出各尺寸。

原圖規格：1024×1024 PNG、不要透明背景、重要內容放在中央 80% 範圍內
（Android 會把圖示裁成圓形或圓角）。
"""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
ICON_DIR = ROOT / "icons"
SOURCE = ICON_DIR / "icon-1024.png"
BG = (230, 236, 239)      # 紙色，用來填補透明處
INK = (27, 42, 56)        # 墨色
JADE = (159, 199, 180)    # 選取色

# 輸出尺寸：iOS 主畫面 180、Android／manifest 192 與 512
SIZES = {"icon-180.png": 180, "icon-192.png": 192, "icon-512.png": 512}


def draw_placeholder(size=1024):
    """佔位圖示：3×3 宮格，中央一格上色"""
    img = Image.new("RGB", (size, size), BG)
    d = ImageDraw.Draw(img)
    m = int(size * 0.2)            # 留白，保持在安全區內
    cell = (size - 2 * m) / 3
    d.rectangle([m + cell, m + cell, m + 2 * cell, m + 2 * cell], fill=JADE)
    w = max(4, size // 40)
    for k in range(4):
        p = int(m + k * cell)
        d.line([(p, m), (p, size - m)], fill=INK, width=w)
        d.line([(m, p), (size - m, p)], fill=INK, width=w)
    return img


def main():
    ICON_DIR.mkdir(exist_ok=True)
    if SOURCE.exists():
        src = Image.open(SOURCE)
        if src.mode in ("RGBA", "LA", "P"):
            src = src.convert("RGBA")
            base = Image.new("RGB", src.size, BG)
            base.paste(src, mask=src.split()[-1])
            src = base
        else:
            src = src.convert("RGB")
        if src.size[0] != src.size[1]:
            print("警告：原圖不是正方形，會被壓扁，建議改成 1024×1024")
        print("使用原圖：", SOURCE.name)
    else:
        src = draw_placeholder()
        src.save(SOURCE)
        print("找不到 icon-1024.png，已產生佔位圖示")

    for name, s in SIZES.items():
        src.resize((s, s), Image.LANCZOS).save(ICON_DIR / name, optimize=True)
        print("輸出", name)
    print("完成。記得到 service-worker.js 改版本號再上傳。")


if __name__ == "__main__":
    main()
