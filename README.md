# 互动点读电子书制作工具 (Interactive E-book Creator)

把课本/绘本图片变成"点一下就发音"的互动电子书。支持两种制作方式：
**全自动**（OCR 识别生成按钮）和 **手动/校对**（编辑器里拖拽调整）。

**在线示例**：https://www.shuanghai.shop/ebook/ （书库 → 人教版五年级英语上册）

---

## 两种制作方式，任选

### 方式 A：全自动（推荐，服务器上一键生成）

无需手动点按钮，用 OCR 自动识别每句英文并生成发音按钮。

```bash
# 1. 把课本页面图片放到一个目录（如 pages/，按页码命名 page-01.png ...）

# 2. 运行自动生成脚本（OCR 识别句子 + 生成按钮数据）
python3 /root/.hermes/scripts/rebuild_buttons.py \
    --pages pages/ \
    --output ui/books/<书名>/book-v2.js

# 3. 结果 = 按钮数据 + 页面图片，部署到网页目录即可
```

- 按钮 = **每句英文一行一个**（透明热区，不遮课本文字）
- 发音 = **edge-tts 在线合成**（无需准备任何音频文件）
- 中文行/目录页自动跳过，不生成按钮

### 方式 B：编辑器手动制作 / 校对（精确控制）

适合：单页任务、或校对自动生成的结果。

1. 打开 `ui/editor.html`（直接浏览器打开）
2. **导入页面**：左侧"批量导入页面"，选课本图片（可多选）
3. **添加按钮**：顶部输入数量 → "批量添加"（自动网格排列）
   或 **导入JSON**（打开自动生成的结果来校对）
4. **调整**：拖动按钮到正确位置；误操作可用撤销
5. **导入音频**（可选）：选音频文件夹，`1.mp3` 自动匹配第 1 个按钮
6. **导出**：导出JSON / 打包 ZIP

---

## 播放与阅读

### 网页版（推荐）
部署后直接访问书库页面，选书即可读：
- 书库：`ui/library.html`（手机/电脑自适应）
- 播放器：`ui/player.html?book=books/<书名>/book-v2.js`

### 本地版
双击 `ui/index.html` → "打开书" → 选 `.zip` 或项目文件夹。

### 阅读操作
| 操作 | 鼠标/触摸 | 键盘 |
| :--- | :--- | :--- |
| 下一页 | 点击右侧 / 左滑 | `→` |
| 上一页 | 点击左侧 / 右滑 | `←` |
| 点读 | 点击句子按钮（透明热区） | - |
| 全屏 | - | `F` |
| 退出 | - | `ESC` |

---

## 发音服务（edge-tts）

按钮发音默认走本机 TTS 服务（免费、无需 API key、标准美音）：

```bash
# 服务脚本
/root/.hermes/scripts/tts_server.py        # 监听 127.0.0.1:8790
# systemd 托管
systemctl status tts-server
# 直接调用
curl "http://127.0.0.1:8790/?t=Hello%20world"   # 返回 mp3
```

- 音频按文本缓存到磁盘，重复句子秒出
- nginx 路由：`/ebook/tts/?t=...`（同源，无跨域问题）

---

## 书的数据格式

```
ui/books/<书名>/
├── book-v2.js      # 按钮数据（页面+按钮坐标+发音文本），浏览器直接加载
└── images/
    └── page-01.webp ...   # 页面图片（按页加载，手机快）

按钮字段：{ x, y, width, height, label, override }
  - x/y/w/h：按钮在页面上的归一化坐标（0-1）
  - label：OCR 识别的句子文本
  - override：发音地址（默认 /ebook/tts/?t=句子文本）
```

旧格式：`.zip` 包（`book.json` + `images/` + `audio/`）仍受支持，播放器可直读。

---

## 部署

项目是纯前端静态应用，部署到任何静态服务器即可：

```bash
# 本机（示例：nginx 指向项目目录）
cp -r ui /var/www/ebook/

# 或推送到 GitHub 后用 Vercel / GitHub Pages / Cloudflare Pages 托管
```

**注意**：使用 edge-tts 发音（方式 A）时，`/ebook/tts/` 需要指向运行中的
tts-server 服务（见上）；离线场景可改为按钮指向本地音频文件。

---

## 目录结构

```
ui/
├── library.html      # 书库（默认入口）
├── player.html       # 播放器
├── editor.html       # 编辑器（手动/校对）
├── books.json        # 书库配置（登记书名）
├── books/            # 书数据目录
│   └── <书名>/       # book-v2.js + images/
└── audio/            # 音频（旧格式用）
```

## 工具脚本

| 脚本 | 作用 |
|------|------|
| `tools/rebuild_buttons.py` | OCR 自动生成句级按钮（方式 A 核心） |
| `tools/tts_server.py` | edge-tts 发音服务（副本，部署用） |

祝使用愉快！
