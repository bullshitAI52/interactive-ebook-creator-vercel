#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""edge-tts 点读发音服务（免费，无需 key）
GET /?t=<text> → 返回 mp3（磁盘缓存）
端口 8790，仅本机；nginx: /ebook/tts/ → 127.0.0.1:8790/
"""
import asyncio, hashlib, json, os, urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import edge_tts

CACHE_DIR = "/var/www/ebook/tts_cache"
VOICE = "en-US-AriaNeural"
os.makedirs(CACHE_DIR, exist_ok=True)

def synth(text):
    key = hashlib.md5(text.encode()).hexdigest()
    path = os.path.join(CACHE_DIR, key + ".mp3")
    if os.path.exists(path):
        return path
    asyncio.run(edge_tts.Communicate(text, VOICE).save(path))
    return path

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            q = urllib.parse.urlparse(self.path)
            params = urllib.parse.parse_qs(q.query)
            text = (params.get("t") or [""])[0][:300].strip()
            if not text:
                self.send_error(400, "missing t")
                return
            path = synth(text)
            size = os.path.getsize(path)
            self.send_response(200)
            self.send_header("Content-Type", "audio/mpeg")
            self.send_header("Content-Length", str(size))
            self.send_header("Cache-Control", "public, max-age=604800")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            with open(path, "rb") as f:
                self.wfile.write(f.read())
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())

    def log_message(self, *a):
        pass

if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", 8790), Handler).serve_forever()
