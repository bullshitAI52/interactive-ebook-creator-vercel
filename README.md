# 🎯 互动点读电子书制作器 (Interactive E-book Creator)

这是一个**所见即所得**的互动点读电子书制作工具。无论您是普通家长还是专业内容创作者，都可以轻松制作出可以在任意设备上运行的点读教材。

**目前处于双模混合架构：**
1.  **🌐 网页版 (Web Mode)**: 纯静态网页，无需安装，即开即用（适合快速体验）。
2.  **🖥️ 桌面版 (Desktop Mode)**: 专业的本地软件体验，支持直接保存文件，无需手动下载（适合重度创作）。

---

## ✨ 核心亮点

*   **⚡️ 极速预览**：上传图片和音频，**立即**就能在网页里点读测试。
*   **🖱️ 简单易用**：拖拽按钮 -> 绑定声音，三步搞定。
*   **💾 本地存储**：(桌面版) 像 Word 一样 Ctrl+S 直接保存，拒绝繁琐的文件上传。
*   **🤖 自动朗读**：支持自动播放当前页序列，磨耳朵神器。
*   **📱 多端通用**：一键打包为 `.zip`，上传到服务器或发给朋友，手机/iPad 均可完美播放。

---

## 🚀 快速开始

本项目现在采用 Tauri 架构，分为前端 UI 和 Rust 后端。

### 方式一：桌面版 (推荐，创作体验最佳)
需要先安装 [Node.js](https://nodejs.org/) 和 [Rust](https://www.rust-lang.org/) 环境。

1.  **启动开发环境**:
    ```bash
    npm install
    npm run tauri dev
    ```
    这将启动一个原生应用窗口。在这里，点击 **"保存"** 会直接修改硬盘上的 `ui/book.json`，无需下载。

2.  **打包发布 App**:
    ```bash
    npm run tauri build
    ```
    这将生成 macOS (.app/.dmg) 或 Windows (.exe) 的安装包。

### 方式二：网页版 (传统模式)
如果你不想安装环境，只想用浏览器：

1.  **启动静态服务**:
    ```bash
    # 进入 ui 目录
    cd ui
    python3 -m http.server 8080
    ```
2.  **访问地址**:
    *   **编辑器**: [http://localhost:8080/editor.html](http://localhost:8080/editor.html)
    *   **播放器**: [http://localhost:8080/player.html](http://localhost:8080/player.html)

    > *注意：网页版模式下，不仅需要手动把下载的 `book.json` 覆盖回去，还需要手动把图片音频复制到 `ui/images` 和 `ui/audio` 目录。*

---

## 🛠️ 详细功能指南

### 1. 编辑器 (Editor)
位于 `ui/editor.html` (网页版) 或 App 主界面。

*   **添加/删除页**：左侧边栏管理所有页面。
*   **媒体管理**：
    *   **图片**：支持 JPG/PNG，自动适配 A4 比例（横/竖）。
    *   **音频**：支持点读按钮（点击发声）和页面背景序列（自动发声）。
*   **打包导出**：
    *   **"一键打包发布 (ZIP)"**：将 `book.json` + `images/` + `audio/` 打包成一个标准 ZIP 文件。
    *   此 ZIP 文件可以直接拖入 **播放器** 中播放。

### 2. 播放器 (Player)
位于 `ui/player.html`。这是一个纯净的播放容器。

*   **加载内容**：
    *   **拖拽**：把导出的 `.zip` 文件直接拖进窗口。
    *   **URL参数**：`player.html?book=lesson1.zip` (适合分享链接)。
    *   **自动加载**：依然支持读取同级目录下的 `book.json` (传统部署)。
*   **快捷键**：
    *   `Space`: 暂停/播放
    *   `← / →`: 翻页
    *   `F`: 全屏
    *   `T`: 切换夜间模式

---

## 📂 项目结构说明

新的目录结构如下：

```
/
├── src-tauri/          # 🦀 Rust 后端代码 (处理文件读写、窗口管理)
│   ├── tauri.conf.json # Tauri 配置文件
│   └── ...
├── ui/                 # 🌐 前端网页资源 (HTML/JS/CSS)
│   ├── editor.html     # 编辑器入口
│   ├── player.html     # 播放器入口
│   ├── book.json       # 项目数据文件
│   ├── images/         # 图片资源
│   ├── audio/          # 音频资源
│   └── js/             # 前端逻辑
└── package.json        # 项目依赖管理
```

---

## ❓ 常见问题

**Q: 为什么桌面版保存时没有下载提示？**
A: 这是桌面版的特性！它已经直接保存文件到 `ui/book.json` 了，你可以立即在播放器里看到效果。

**Q: 我制作的 ZIP 包可以在手机上用吗？**
A: 可以！你需要把 `ui/player.html` 部署到服务器，然后把 ZIP 包传上去，通过 `player.html?book=你的包.zip` 访问。

**Q: 旧版本的项目怎么迁移？**
A: 把所有的图片放到 `ui/images`，音频放到 `ui/audio`，把 `book.json` 覆盖到 `ui/book.json` 即可。