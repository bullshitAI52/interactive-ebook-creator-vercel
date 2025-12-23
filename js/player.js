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

  showPage(pageId) {
    if (!this.book || !this.book.pages[pageId]) {
      console.error('Page not found:', pageId);
      return;
    }

    this.currentPage = pageId;
    const page = this.book.pages[pageId];

    // 更新页面图片
    const pageImage = document.getElementById('page-image');

    if (pageImage) {
      pageImage.src = page.image;
      pageImage.style.display = 'block';
      pageImage.style.objectFit = 'contain';
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
        btn.title = `按钮 ${index + 1} - 点击播放`;

        // 添加数字显示
        const numberSpan = document.createElement('span');
        numberSpan.textContent = index + 1;
        btn.appendChild(numberSpan);

        // 添加点击事件
        btn.addEventListener('click', () => {
          console.log(`按钮 ${index + 1} 被点击`, button);
          this.playButton(button);
        });

        buttonArea.appendChild(btn);
      });
    }

    console.log(`Showing page: ${pageId}`);
  }

  playButton(button) {
    if (!this.book || !this.currentPage) {
      console.error('Book or page not loaded');
      return;
    }

    let mediaSrc = '';

    // 检查是否有覆盖资源
    if (button.override) {
      // 如果覆盖路径已经是完整路径，直接使用；否则加上 audioBase
      if (button.override.startsWith('http://') || button.override.startsWith('https://') || button.override.startsWith('/')) {
        mediaSrc = button.override;
      } else {
        const base = this.book.audioBase.endsWith('/') ? this.book.audioBase : this.book.audioBase + '/';
        mediaSrc = base + button.override;
      }
      console.log('Using override:', mediaSrc);
    } else {
      // 使用顺序模式
      const page = this.book.pages[this.currentPage];
      const audioIndex = page.sequence[button.pos];

      if (audioIndex >= 0 && audioIndex < this.book.audioPool.length) {
        const base = this.book.audioBase.endsWith('/') ? this.book.audioBase : this.book.audioBase + '/';
        mediaSrc = base + this.book.audioPool[audioIndex];
        console.log('Using sequence audio:', mediaSrc, 'index:', audioIndex);
      } else {
        console.error('Invalid audio index:', audioIndex);
        return;
      }
    }

    // 播放媒体
    this.playMedia(mediaSrc);
  }

  playMedia(src) {
    // 停止当前播放
    this.stop();

    // 根据文件扩展名决定使用音频还是视频
    const ext = src.split('.').pop().toLowerCase();

    if (['mp4', 'webm', 'ogg'].includes(ext)) {
      // 视频播放
      if (!this.videoElement) {
        this.videoElement = document.createElement('video');
        this.videoElement.style.display = 'none';
        document.body.appendChild(this.videoElement);

        this.videoElement.addEventListener('ended', () => {
          this.isPlaying = false;
        });
      }

      this.videoElement.src = src;
      this.videoElement.play().catch(error => {
        console.warn('视频播放失败，使用测试音频:', error);
        this.playTestTone();
      });
      this.isPlaying = true;
      console.log('Playing video:', src);

    } else {
      // 音频播放 (默认)
      if (!this.audioElement) {
        this.audioElement = document.createElement('audio');
        this.audioElement.style.display = 'none';
        document.body.appendChild(this.audioElement);

        this.audioElement.addEventListener('ended', () => {
          this.isPlaying = false;
        });

        this.audioElement.addEventListener('play', () => {
          this.isPlaying = true;
        });

        this.audioElement.addEventListener('pause', () => {
          this.isPlaying = false;
        });

        this.audioElement.addEventListener('error', (e) => {
          console.warn('音频文件加载失败，使用测试音调:', src, e);
          this.playTestTone();
        });
      }

      this.audioElement.src = src;
      this.audioElement.play().catch(error => {
        console.warn('音频播放失败，使用测试音调:', error);
        this.isPlaying = false;
        this.playTestTone();
      });
      console.log('Playing audio:', src);
    }
  }

  stop() {
    if (this.audioElement && !this.audioElement.paused) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }

    if (this.videoElement && !this.videoElement.paused) {
      this.videoElement.pause();
      this.videoElement.currentTime = 0;
    }

    // 停止测试音调
    if (this.testAudioContext) {
      if (this.testAudioSource) {
        this.testAudioSource.stop();
        this.testAudioSource.disconnect();
        this.testAudioSource = null;
      }
      if (this.testAudioGain) {
        this.testAudioGain.disconnect();
        this.testAudioGain = null;
      }
    }

    this.isPlaying = false;
  }

  getPageIds() {
    if (!this.book) return [];
    return Object.keys(this.book.pages);
  }

  hasPage(pageId) {
    return this.book && this.book.pages[pageId];
  }

  playTestTone() {
    try {
      // 使用 Web Audio API 生成测试音调
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) {
        console.warn('Web Audio API 不支持');
        return;
      }

      if (!this.testAudioContext) {
        this.testAudioContext = new AudioContext();
      }

      if (this.testAudioContext.state === 'suspended') {
        this.testAudioContext.resume();
      }

      // 创建振荡器生成音调
      const oscillator = this.testAudioContext.createOscillator();
      const gainNode = this.testAudioContext.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.value = 440; // A4 音

      gainNode.gain.setValueAtTime(0.1, this.testAudioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.testAudioContext.currentTime + 1);

      oscillator.connect(gainNode);
      gainNode.connect(this.testAudioContext.destination);

      oscillator.start();
      oscillator.stop(this.testAudioContext.currentTime + 1);

      this.testAudioSource = oscillator;
      this.testAudioGain = gainNode;

      this.isPlaying = true;

      // 1秒后标记为停止
      setTimeout(() => {
        if (this.isPlaying) {
          this.isPlaying = false;
        }
      }, 1000);

      console.log('播放测试音调');
    } catch (error) {
      console.error('生成测试音调失败:', error);
    }
  }
}

// 导出供全局使用
window.InteractiveBookPlayer = InteractiveBookPlayer;