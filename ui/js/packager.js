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
    try {
      // Use the new Universal Player as the template
      const response = await fetch('player.html');
      let html = await response.text();

      // Add deployment metadata
      const meta = `
    <!-- 
    电子书 - 离线部署版
    Generated: ${new Date().toLocaleString()}
    -->`;
      html = html.replace('<head>', `<head>${meta}`);

      // Inject script to handle offline auto-load more robustly if needed
      // But player.html already has logic to check for 'book.json' if no params.
      // We might want to ensure the uploader overlay is hidden by default in this version.
      html = html.replace('/* 隐藏掉编辑器可能残留的元素 */', `/* 部署版默认样式 */
        #uploader-overlay { display: none !important; }
        .hidden { display: none !important; }`);

      return html;
    } catch (error) {
      console.error('Failed to load player.html template', error);
      return this.generateSimpleIndexHtml(); // Fallback
    }
  }

  generateSimpleIndexHtml() {
    // Keeps the legacy fallback just in case
    return `<!DOCTYPE html><html><body><h1>Export Error</h1><p>Could not load player.html template.</p></body></html>`;
  }

  async getPlayerJs() {
    try {
      const response = await fetch('js/player.js');
      return await response.text();
    } catch (error) {
      return '';
    }
  }

  async addAudioFiles(zip) {
    const audioFiles = this.editor.book.audioPool || [];
    const audioBase = this.editor.book.audioBase || 'audio/';

    for (const audioFile of audioFiles) {
      await this.fetchAndAdd(zip, (audioBase.endsWith('/') ? audioBase : audioBase + '/') + audioFile, `audio/${audioFile}`);
    }

    // Also handle button overrides
    const pages = this.editor.book.pages || {};
    for (const pid in pages) {
      const page = pages[pid];
      if (page.buttons) {
        for (const btn of page.buttons) {
          if (btn.override) {
            await this.fetchAndAdd(zip, btn.override, `audio/${btn.override.split('/').pop()}`);
          }
        }
      }
    }
  }

  async addImageFiles(zip) {
    const pages = this.editor.book.pages || {};
    for (const pid in pages) {
      const page = pages[pid];
      if (page.image) {
        await this.fetchAndAdd(zip, page.image, `images/${page.image.split('/').pop()}`);
      }
    }
  }

  // Helper to fetch or get from registry
  async fetchAndAdd(zip, url, zipPath) {
    if (!url) return;

    // Clean URL (remove blob: if legacy, though usually not saved to json)

    try {
      // 1. Try Editor Registry (Memory)
      // The issue is registry keys might differ from url. 
      // Editor saves "images/foo.jpg" as key.

      let blob = null;

      // Check Editor File Registry first (Highest priority - freshest data)
      if (this.editor.fileRegistry && this.editor.fileRegistry.images.has(url)) {
        blob = this.editor.fileRegistry.images.get(url);
      } else if (this.editor.fileRegistry && this.editor.fileRegistry.audio.has(url)) { // Simplified check
        blob = this.editor.fileRegistry.audio.get(url);
      }

      if (!blob) {
        // 2. Try Fetch
        const response = await fetch(url);
        if (response.ok) {
          blob = await response.blob();
        }
      }

      if (blob) {
        zip.file(zipPath, blob);
      }
    } catch (e) {
      console.warn('Failed to add file:', url, e);
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