class InteractiveBookPlayer {
  constructor(configUrl) {
    this.configUrl = configUrl;
    this.book = null;
    this.currentPage = null;
    this.audioElement = null;
    this.videoElement = null;
    this.isPlaying = false;
    this.testAudioContext = null;
    this.testAudioSource = null;
    this.testAudioGain = null;
    this.currentPlayingButton = null; // 当前正在播放的按钮DOM

    // 音频缓存和预加载
    this.audioCache = new Map(); // 缓存已加载的音频URL
    this.preloadQueue = [];      // 预加载队列
    this.isPreloading = false;   // 是否正在预加载

    // 性能监控
    this.loadTimes = [];         // 记录加载时间用于性能分析
  }

  async load() {
    try {
      console.log('Attempting to fetch config from:', this.configUrl);
      const response = await fetch(this.configUrl);

      if (!response.ok) {
        throw new Error(`无法获取配置文件 (${response.status} ${response.statusText})。请确保文件存在且在 Web 服务器中运行。`);
      }

      this.book = await response.json();
      console.log('Book loaded successfully:', this.book);
      return this.book;
    } catch (error) {
      let errorMessage = error.message;
      if (window.location.protocol === 'file:') {
        errorMessage = "检测到由于浏览器安全限制，无法在 file:// 模式下加载配置。请使用 http-server 或类似工具开启本地服务器运行。";
      }
      console.error('Failed to load book:', errorMessage, error);
      throw new Error(errorMessage);
    }
  }

  // Helper to get start index for global numbering
  getGlobalStartIndex(targetPageId) {
    if (!this.book || !this.book.pages) return 0;
    const pageIds = Object.keys(this.book.pages);
    let count = 0;
    for (const pId of pageIds) {
      if (pId === targetPageId) break;
      const p = this.book.pages[pId];
      count += (p.buttons || []).length;
    }
    return count;
  }

  showPage(pageId) {
    if (!this.book || !this.book.pages[pageId]) {
      console.error('Page not found:', pageId);
      return;
    }

    this.stop(); // 切换页面时停止播放

    this.currentPage = pageId;
    const page = this.book.pages[pageId];

    // 计算当前页面的全局起始序号
    const globalStart = this.getGlobalStartIndex(pageId);

    // 更新页面图片
    const pageImage = document.getElementById('page-image');

    // 更新 wrapper 宽高比
    const wrapper = document.getElementById('page-content-wrapper');
    if (wrapper) {
      const orientation = page.imageSettings?.orientation || 'portrait';
      if (orientation === 'landscape') {
        wrapper.classList.add('landscape');
      } else {
        wrapper.classList.remove('landscape');
      }
    }

    if (pageImage) {
      pageImage.src = page.image;
      pageImage.style.display = 'block';
      pageImage.style.objectFit = 'contain';

      // 更新A4框可视状态（可选，根据编辑器的设定或默认不显示）
      const a4Outline = document.getElementById('a4-outline');
      if (a4Outline) {
        // 这里可以决定是否显示参考线
        // a4Outline.style.display = 'block'; 
      }
    }

    // 清空按钮区域
    const buttonArea = document.getElementById('button-area');
    if (buttonArea) {
      buttonArea.innerHTML = '';

      // 创建按钮
      page.buttons.forEach((button, index) => {
        const btn = document.createElement('div');
        btn.className = 'page-button';
        btn.style.left = `${button.x * 100}%`;
        btn.style.top = `${button.y * 100}%`;
        btn.dataset.index = index;

        // Global Index for Title/Reference
        const globalIndex = globalStart + index + 1;
        btn.title = `按钮 ${globalIndex} - 点击播放`;

        // 添加数字显示 (CSS 已隐藏，但结构保留)
        const numberSpan = document.createElement('span');
        numberSpan.textContent = globalIndex; // use global index
        btn.appendChild(numberSpan);

        // 添加点击事件
        btn.addEventListener('click', () => {
          console.log(`按钮 ${globalIndex} 被点击`, button);
          this.playButton(button, btn, index); // Pass local index
        });

        buttonArea.appendChild(btn);
      });
    }

    console.log(`Showing page: ${pageId}`);
  }

  // 播放单个按钮 logic
  // btnElement 可选，用于高亮
  playButton(button, btnElement = null) {
    if (!this.book || !this.currentPage) {
      console.error('Book or page not loaded');
      return;
    }

    // 检查是否点击的是同一个已经在播放的按钮
    if (this.currentPlayingButton === btnElement && this.isPlaying) {
      this.stop();
      return;
    }

    // 更新高亮状态
    if (this.currentPlayingButton) {
      this.currentPlayingButton.classList.remove('playing');
    }
    if (btnElement) {
      this.currentPlayingButton = btnElement;
      this.currentPlayingButton.classList.add('playing');
    }

    let mediaSrc = '';

    // 检查是否有覆盖资源
    if (button.override) {
      if (button.override.startsWith('http://') || button.override.startsWith('https://') || button.override.startsWith('/')) {
        mediaSrc = button.override;
      } else {
        const base = this.book.audioBase.endsWith('/') ? this.book.audioBase : this.book.audioBase + '/';
        mediaSrc = base + button.override;
      }
    } else {
      // 使用顺序模式
      const page = this.book.pages[this.currentPage];
      const audioIndex = page.sequence[button.pos];

      if (audioIndex >= 0 && audioIndex < this.book.audioPool.length) {
        const base = this.book.audioBase.endsWith('/') ? this.book.audioBase : this.book.audioBase + '/';
        mediaSrc = base + this.book.audioPool[audioIndex];
      } else {
        console.error('Invalid audio index:', audioIndex);
        // 播放失败也要移除高亮
        if (this.currentPlayingButton) {
          setTimeout(() => this.currentPlayingButton.classList.remove('playing'), 200);
          this.currentPlayingButton = null;
        }
        return;
      }
    }

    // 播放媒体
    return this.playMedia(mediaSrc);
  }

  // 播放音频并返回 Promise
  playMedia(src) {
    return new Promise((resolve, reject) => {
      // 停止当前播放
      this.stop();

      // 标记 active 状态由调用者(playButton)处理，这里只负责播放逻辑完结回调

      const onEnd = () => {
        if (this.currentPlayingButton) {
          this.currentPlayingButton.classList.remove('playing');
          this.currentPlayingButton = null;
        }
        this.isPlaying = false;
        resolve();
      };

      const onError = (e) => {
        console.warn('播放出错', e);
        if (this.currentPlayingButton) {
          this.currentPlayingButton.classList.remove('playing');
          this.currentPlayingButton = null;
        }
        this.isPlaying = false;
        resolve(); // 出错也视为完成，以免阻塞序列
      };

      // 如果有缓存，使用缓存的URL
      const cachedSrc = this.audioCache.get(src) || src;

      // 根据文件扩展名决定使用音频还是视频
      const ext = src.split('.').pop().toLowerCase();

      if (['mp4', 'webm', 'ogg'].includes(ext)) {
        // 视频播放
        if (!this.videoElement) {
          this.videoElement = document.createElement('video');
          this.videoElement.style.display = 'none';
          document.body.appendChild(this.videoElement);
        }

        // 清除旧监听
        this.videoElement.onended = null;
        this.videoElement.onerror = null;

        this.videoElement.onended = onEnd;
        this.videoElement.onerror = onError;

        this.videoElement.src = cachedSrc;
        this.videoElement.play().catch(onError);
        this.isPlaying = true;

      } else {
        // 音频播放 (默认)
        if (!this.audioElement) {
          this.audioElement = document.createElement('audio');
          this.audioElement.style.display = 'none';
          document.body.appendChild(this.audioElement);
        }

        this.audioElement.onended = null;
        this.audioElement.onerror = null;

        this.audioElement.onended = onEnd;
        this.audioElement.onerror = onError;

        this.audioElement.src = cachedSrc;
        this.audioElement.play().catch(onError);
        this.isPlaying = true;
      }
    });
  }

  stop() {
    if (this.audioElement && !this.audioElement.paused) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
      if (this.audioElement.onended) this.audioElement.onended(); // 触发手动停止回调? 不，通常手动stop不触发end
    }

    if (this.videoElement && !this.videoElement.paused) {
      this.videoElement.pause();
      this.videoElement.currentTime = 0;
    }

    // 如果正在播放，清除高亮
    if (this.currentPlayingButton) {
      this.currentPlayingButton.classList.remove('active');
      this.currentPlayingButton = null;
    }

    this.isPlaying = false;
  }

  getPageIds() {
    if (!this.book) return [];
    return Object.keys(this.book.pages);
  }

  // 自动播放当前页所有内容
  async playPageSequence(onComplete) {
    if (!this.currentPage || !this.book.pages[this.currentPage]) return;

    const page = this.book.pages[this.currentPage];
    const buttonArea = document.getElementById('button-area');
    const buttons = Array.from(buttonArea.children); // DOM buttons

    // 按 DOM 顺序播放 (即 buttons 数组顺序)
    for (let i = 0; i < page.buttons.length; i++) {
      if (!this.isPlaying && i > 0) {
        // 如果中途被停止（isPlaying false），则中断序列
        // 但由于 await playMedia 会设 isPlaying 为 true，我们需要一个标志位来检测“强制停止”
        // 这里简化处理：check if we are still on the same page
      }

      // 检查页面是否切换
      if (this.currentPage !== Object.keys(this.book.pages).find(k => this.book.pages[k] === page)) {
        return;
      }

      const btnData = page.buttons[i];
      const btnEl = buttons[i];

      // 播放每一个
      await this.playButton(btnData, btnEl);

      // 间隔一小段时间
      await new Promise(r => setTimeout(r, 500));
    }

    if (onComplete) onComplete();
  }

  hasPage(pageId) {
    return this.book && this.book.pages[pageId];
  }

  // ... (保留缓存相关方法)
  async preloadPageAudio(pageId) {
    // 同之前的实现，略微调整
    if (!this.book || !this.book.pages[pageId]) return;
    const page = this.book.pages[pageId];
    const audioUrls = new Set();
    page.buttons.forEach(button => {
      let mediaSrc = '';
      if (button.override) {
        if (button.override.startsWith('http') || button.override.startsWith('/')) {
          mediaSrc = button.override;
        } else {
          const base = this.book.audioBase.endsWith('/') ? this.book.audioBase : this.book.audioBase + '/';
          mediaSrc = base + button.override;
        }
      } else {
        const audioIndex = page.sequence[button.pos];
        if (audioIndex >= 0 && audioIndex < this.book.audioPool.length) {
          const base = this.book.audioBase.endsWith('/') ? this.book.audioBase : this.book.audioBase + '/';
          mediaSrc = base + this.book.audioPool[audioIndex];
        }
      }
      if (mediaSrc && !this.audioCache.has(mediaSrc)) audioUrls.add(mediaSrc);
    });
    for (const url of audioUrls) await this.cacheAudio(url);
  }

  async cacheAudio(url) {
    if (this.audioCache.has(url)) return;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to load`);
      const blob = await response.blob();
      this.audioCache.set(url, URL.createObjectURL(blob));
    } catch (error) {
      console.warn(`[Preload] Failed to cache ${url}`);
    }
  }

  preloadAdjacentPages(currentIndex, pageIds) {
    if (this.isPreloading) return;
    this.isPreloading = true;
    const toPreload = [];
    if (currentIndex + 1 < pageIds.length) toPreload.push(pageIds[currentIndex + 1]);
    if (currentIndex - 1 >= 0) toPreload.push(pageIds[currentIndex - 1]);
    Promise.all(toPreload.map(pid => this.preloadPageAudio(pid)))
      .then(() => this.isPreloading = false)
      .catch(() => this.isPreloading = false);
  }
}

// 导出供全局使用
window.InteractiveBookPlayer = InteractiveBookPlayer;