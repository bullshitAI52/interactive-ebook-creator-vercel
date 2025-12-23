class BookPackager {
  constructor(editor) {
    this.editor = editor;
    this.initElements();
    this.bindEvents();
  }

  initElements() {
    // 创建打包按钮（如果不存在）
    if (!document.getElementById('package-btn')) {
      const packageBtn = document.createElement('button');
      packageBtn.id = 'package-btn';
      packageBtn.className = 'btn btn-primary';
      packageBtn.innerHTML = `
        <svg class="icon" viewBox="0 0 24 24"><path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/></svg>
        打包部署包
      `;

      // 添加到按钮组
      const btnGroup = document.querySelector('.btn-group');
      if (btnGroup) {
        btnGroup.appendChild(packageBtn);
      }
    }

    this.packageBtn = document.getElementById('package-btn');
  }

  bindEvents() {
    if (this.packageBtn) {
      this.packageBtn.addEventListener('click', () => this.createPackage());
    }
  }

  async createPackage() {
    try {
      this.showStatus('正在创建部署包...');

      // 获取当前配置
      const bookData = this.editor.book;

      // 创建ZIP文件
      const zip = new JSZip();

      // 1. 添加配置文件
      zip.file('book.json', JSON.stringify(bookData, null, 2));

      // 2. 添加HTML文件
      const indexHtml = await this.generateIndexHtml();
      zip.file('index.html', indexHtml);

      // 3. 添加JS文件
      const playerJs = await this.getPlayerJs();
      zip.file('js/player.js', playerJs);

      // 4. 添加音频文件（如果存在）
      await this.addAudioFiles(zip);

      // 5. 添加图片文件（如果存在）
      await this.addImageFiles(zip);

      // 6. 添加README文件
      zip.file('README.txt', this.generateReadme());

      // 生成ZIP文件
      const content = await zip.generateAsync({ type: 'blob' });

      // 下载
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `电子书部署包_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.showStatus('部署包已创建并下载');

    } catch (error) {
      console.error('创建部署包失败:', error);
      this.showError(`创建部署包失败: ${error.message}`);
    }
  }

  async generateIndexHtml() {
    // 读取现有的index.html并优化
    try {
      const response = await fetch('index.html');
      let html = await response.text();

      // 移除编辑按钮（部署版不需要）
      html = html.replace(/<a href="editor\.html".*?<\/a>/s, '');

      // 添加部署标记
      html = html.replace(/<title>.*?<\/title>/, '<title>电子书 - 部署版</title>');

      // 添加部署信息注释
      html = html.replace('</head>', `
  <!-- 
  电子书部署版
  生成时间: ${new Date().toLocaleString('zh-CN')}
  配置版本: ${this.editor.book.audioPool?.length || 0} 个音频文件
  页面数量: ${Object.keys(this.editor.book.pages || {}).length}
  -->
</head>`);

      return html;
    } catch (error) {
      // 如果读取失败，生成一个简化的版本
      return this.generateSimpleIndexHtml();
    }
  }

  generateSimpleIndexHtml() {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>电子书 - 部署版</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, sans-serif; background: #f0f0f0; height: 100vh; }
        .header { background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%); color: white; padding: 20px; text-align: center; }
        .book-view { flex: 1; background: white; margin: 10px; border-radius: 12px; position: relative; }
        .page-image { max-width: 100%; max-height: 100%; object-fit: contain; }
        .button-area { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
        .page-button { position: absolute; width: 40px; height: 40px; border-radius: 50%; background: rgba(255,255,255,0.5); border: 2px solid rgba(0,0,0,0.8); transform: translate(-50%, -50%); cursor: pointer; }
        .controls { padding: 15px; background: white; display: flex; gap: 10px; }
        .btn { flex: 1; padding: 12px; border: none; border-radius: 8px; font-size: 1rem; cursor: pointer; }
        .btn-primary { background: #6a11cb; color: white; }
        .btn-secondary { background: #f0f0f0; color: #333; }
    </style>
</head>
<body>
    <div class="header">
        <h1>电子书</h1>
        <div>点击页面上的按钮播放音频</div>
    </div>
    <div class="main-container">
        <div class="book-view">
            <img id="page-image" class="page-image" alt="当前页面">
            <div class="button-area" id="button-area"></div>
        </div>
        <div class="controls">
            <button id="prev-btn" class="btn btn-secondary">上一页</button>
            <button id="next-btn" class="btn btn-primary">下一页</button>
        </div>
    </div>
    <script src="js/player.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', async () => {
            const player = new InteractiveBookPlayer('book.json');
            await player.load();
            const pageIds = player.getPageIds();
            if (pageIds.length > 0) player.showPage(pageIds[0]);
            
            document.getElementById('prev-btn').addEventListener('click', () => {
                const currentIndex = pageIds.indexOf(player.currentPage);
                if (currentIndex > 0) player.showPage(pageIds[currentIndex - 1]);
            });
            
            document.getElementById('next-btn').addEventListener('click', () => {
                const currentIndex = pageIds.indexOf(player.currentPage);
                if (currentIndex < pageIds.length - 1) player.showPage(pageIds[currentIndex + 1]);
            });
        });
    </script>
</body>
</html>`;
  }

  async getPlayerJs() {
    try {
      const response = await fetch('js/player.js');
      return await response.text();
    } catch (error) {
      // 如果读取失败，返回一个基本版本
      return `class InteractiveBookPlayer {
  constructor(configUrl) { this.configUrl = configUrl; this.book = null; this.currentPage = null; }
  async load() { const r = await fetch(this.configUrl); this.book = await r.json(); return this.book; }
  showPage(pageId) { if (!this.book?.pages[pageId]) return; this.currentPage = pageId; const page = this.book.pages[pageId];
    const img = document.getElementById('page-image'); if (img) img.src = page.image;
    const area = document.getElementById('button-area'); if (area) { area.innerHTML = '';
      page.buttons?.forEach(btn => { const b = document.createElement('div'); b.className = 'page-button';
        b.style.left = btn.x * 100 + '%'; b.style.top = btn.y * 100 + '%';
        b.addEventListener('click', () => this.playButton(btn)); area.appendChild(b); }); } }
  playButton(btn) { if (!this.book || !this.currentPage) return;
    const src = btn.override || (this.book.audioBase + this.book.audioPool[this.book.pages[this.currentPage].sequence[btn.pos]]);
    const audio = new Audio(src); audio.play().catch(() => console.log('播放失败')); }
  getPageIds() { return this.book ? Object.keys(this.book.pages) : []; }
}
window.InteractiveBookPlayer = InteractiveBookPlayer;`;
    }
  }

  async addAudioFiles(zip) {
    try {
      // 获取音频文件列表
      const audioFiles = this.editor.book.audioPool || [];
      const audioBase = this.editor.book.audioBase || 'audio/';

      for (const audioFile of audioFiles) {
        try {
          const response = await fetch(audioBase + audioFile);
          if (response.ok) {
            const blob = await response.blob();
            zip.file(audioBase + audioFile, blob);
          }
        } catch (error) {
          console.warn(`无法添加音频文件 ${audioFile}:`, error);
        }
      }
    } catch (error) {
      console.warn('添加音频文件失败:', error);
    }
  }

  async addImageFiles(zip) {
    try {
      const pages = this.editor.book.pages || {};

      for (const pageId in pages) {
        const page = pages[pageId];
        if (page.image) {
          try {
            const response = await fetch(page.image);
            if (response.ok) {
              const blob = await response.blob();
              // 提取文件名
              const fileName = page.image.split('/').pop();
              zip.file(`images/${fileName}`, blob);

              // 更新配置中的图片路径
              page.image = `images/${fileName}`;
            }
          } catch (error) {
            console.warn(`无法添加图片文件 ${page.image}:`, error);
          }
        }
      }
    } catch (error) {
      console.warn('添加图片文件失败:', error);
    }
  }

  generateReadme() {
    const pages = this.editor.book.pages || {};
    const pageCount = Object.keys(pages).length;
    const totalButtons = Object.values(pages).reduce((sum, page) => sum + (page.buttons?.length || 0), 0);
    const audioCount = this.editor.book.audioPool?.length || 0;

    return `电子书部署包
============

生成时间: ${new Date().toLocaleString('zh-CN')}

配置信息
--------
- 页面数量: ${pageCount}
- 按钮总数: ${totalButtons}
- 音频文件: ${audioCount} 个

文件结构
--------
├── index.html      # 播放器主页面
├── book.json       # 配置文件
├── js/
│   └── player.js   # 播放器核心
├── audio/          # 音频文件目录
└── images/         # 图片文件目录

使用说明
--------
1. 解压此ZIP文件到任意目录
2. 确保所有文件保持相对路径不变
3. 用浏览器打开 index.html 即可使用
4. 支持离线使用，无需网络连接

注意事项
--------
- 如需修改配置，请使用编辑器重新生成
- 确保音频文件格式为浏览器支持的格式（MP3等）
- 图片建议使用WebP或JPEG格式以减小体积

技术支持
--------
如有问题，请检查浏览器控制台错误信息。`;
  }

  showStatus(message) {
    if (this.editor && this.editor.showStatus) {
      this.editor.showStatus(message);
    } else {
      console.log(message);
    }
  }

  showError(message) {
    if (this.editor && this.editor.showError) {
      this.editor.showError(message);
    } else {
      console.error(message);
    }
  }
}

// 初始化打包器
let packager;
document.addEventListener('DOMContentLoaded', () => {
  // 等待编辑器初始化，使用轮询而不是固定延时
  let initAttempts = 0;
  const maxAttempts = 50; // 最多尝试 50 次 (5 秒)

  const tryInit = () => {
    initAttempts++;

    if (window.editor) {
      packager = new BookPackager(window.editor);
      window.packager = packager;
      console.log('Packager initialized successfully');
    } else if (initAttempts < maxAttempts) {
      // 每 100ms 尝试一次
      setTimeout(tryInit, 100);
    } else {
      console.warn('Failed to initialize packager: editor not found after', maxAttempts * 100, 'ms');
    }
  };

  // 立即尝试，或等待 100ms 后开始
  setTimeout(tryInit, 100);
});