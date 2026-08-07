#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""重建五年级点读书：OCR 每页 → 每行文字一个点读按钮（跳过中文行）
用法: /usr/bin/python3 rebuild_buttons.py
输出: books/grade5-fall-web/book.js（备份原文件为 book.js.bak）
"""
import json, re, os, sys, glob
from PIL import Image, ImageOps
from rapidocr_onnxruntime import RapidOCR

BASE = "/var/www/ebook/interactive-ebook-creator-vercel/ui/books/grade5-fall-web"
IMG_DIR = os.path.join(BASE, "images")
BOOK_PATH = os.path.join(BASE, "book.js")
LOG = "/root/.hermes/logs/ebook_rebuild.log"

def log(msg):
    line = f"[{__import__('datetime').datetime.now():%H:%M:%S}] {msg}"
    print(line, flush=True)
    with open(LOG, "a") as f:
        f.write(line + "\n")

def cjk_ratio(s):
    cjk = len(re.findall(r'[\u4e00-\u9fff]', s))
    return cjk / max(len(s), 1)

def clean_text(s):
    s = re.sub(r'[\u200b\ufeff]', '', s)
    s = re.sub(r'^[\s\W_]+|[\s\W_]+$', '', s)  # 去首尾标点空格
    s = re.sub(r'\s+', ' ', s)
    return s

def main():
    log("=== 开始重建点读按钮 ===")
    book = json.load(open(BOOK_PATH, encoding="utf-8"))
    engine = RapidOCR()
    pages = book.get("pages", {})
    total_btn = 0
    for pid in sorted(pages.keys(), key=lambda x: int(re.sub(r'\D', '', x))):
        img_path = os.path.join(IMG_DIR, pages[pid]["image"].split("/")[-1])
        if not os.path.exists(img_path):
            log(f"{pid}: 图片缺失 {img_path}")
            pages[pid]["buttons"] = []
            continue
        # 预处理
        img = Image.open(img_path).convert("L")
        img = ImageOps.autocontrast(img)
        w, h = img.size
        img2 = img.resize((w * 2, h * 2), Image.LANCZOS)
        tmp = "/tmp/ebook_ocr_page.png"
        img2.save(tmp)
        # OCR
        result, _ = engine(tmp)
        buttons = []
        for box, text, score in result:
            text = clean_text(text)
            if not text or len(text) < 2:
                continue
            if score < 0.8:
                continue
            if re.search(r'[\u4e00-\u9fff]', text):
                continue  # 任何含中文的行跳过（前言/目录/封底等）
            xs = [p[0] for p in box]; ys = [p[1] for p in box]
            # 归一化（除以2x放大）并转中心点+宽高
            x0, x1 = min(xs) / 2 / w, max(xs) / 2 / w
            y0, y1 = min(ys) / 2 / h, max(ys) / 2 / h
            x = min(max((x0 + x1) / 2, 0.005), 0.995)
            y = min(max((y0 + y1) / 2, 0.005), 0.995)
            bw = min(max(x1 - x0, 0.01), 0.99)
            bh = min(max(y1 - y0, 0.01), 0.99)
            buttons.append({
                "x": round(x, 5), "y": round(y, 5),
                "width": round(bw, 5), "height": round(bh, 5),
                "label": text,
                "override": "/ebook/tts/?t=" + __import__('urllib.parse', fromlist=['quote']).quote(text)
            })
        pages[pid]["buttons"] = buttons
        total_btn += len(buttons)
        log(f"{pid}: {len(buttons)} 个按钮")
    # 备份并写回
    os.rename(BOOK_PATH, BOOK_PATH + ".bak")
    with open(BOOK_PATH, "w", encoding="utf-8") as f:
        json.dump(book, f, ensure_ascii=False)
    log(f"=== 完成，共 {total_btn} 个句子按钮（原 6643 个）===")

if __name__ == "__main__":
    main()
