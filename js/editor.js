class BookEditor {
  constructor() {
    this.book = null;
    this.currentPageId = null;
    this.currentButtonIndex = null;
    this.isAdvancedVisible = false;
    this.autoSaveTimer = null;
    this.statusTimer = null;

    // 媒体文件缓存（用于本地预览）
    this.blobRegistry = {
      images: new Map(),
      audio: new Map()
    };

    // 原始文件对象缓存（用于打包导出）
    this.fileRegistry = {
      images: new Map(), // filename -> File object
      audio: new Map()   // filename -> File object
    };

    // 初始化元素
    this.initElements();
    this.bindEvents();

    // 加载数据
    this.loadBook();

    // 自动保存与快捷键
    this.setupAutoSave();
    this.setupKeyboardShortcuts();
  }

  initElements() {
    // 导航
    this.navTabs = document.querySelectorAll('.nav-tab');

    // 视图容器
    this.mainView = document.getElementById('main-view');
    this.advancedView = document.getElementById('advanced-view');

    // 左侧边栏
    this.pageList = document.getElementById('page-list');
    this.pageCountBadge = document.getElementById('page-count-badge');
    this.addPageBtn = document.getElementById('add-page-btn');
    this.removePageBtn = document.getElementById('remove-page-btn');

    // 工具栏
    this.currentPageTitle = document.getElementById('current-page-title');
    this.portraitRadio = document.getElementById('portrait-mode');
    this.landscapeRadio = document.getElementById('landscape-mode');
    this.addButtonBtn = document.getElementById('add-button-btn');

    // 画布区域
    this.imagePreview = document.getElementById('image-preview'); // 就是 .a4-canvas
    this.previewImg = document.getElementById('preview-img');
    this.pageImageInput = document.getElementById('page-image-input');

    // 序列设置
    this.audioSequenceInput = document.getElementById('audio-sequence');

    // 底部面板
    this.buttonListContainer = document.getElementById('button-list');
    this.importFileBtn = document.getElementById('import-file-btn');
    this.exportFileBtn = document.getElementById('export-file-btn');
    this.exportZipBtn = document.getElementById('export-zip-btn'); // New: Zip button
    this.backupBtn = document.getElementById('backup-btn');
    this.clearButtonsBtn = document.getElementById('clear-buttons-btn');

    // 状态通知
    this.statusToast = document.getElementById('status-toast');

    // 弹窗
    this.buttonEditModal = document.getElementById('button-edit-modal');
    this.editButtonNumber = document.getElementById('edit-button-number');
    this.modalButtonPos = document.getElementById('modal-button-pos');
    this.modalOverrideAudio = document.getElementById('modal-override-audio');
    this.modalBrowseBtn = document.getElementById('modal-browse-audio-btn');
    this.modalButtonX = document.getElementById('modal-button-x');
    this.modalButtonY = document.getElementById('modal-button-y');
    this.closeEditModalBtn = document.getElementById('close-edit-modal');
    this.cancelEditModalBtn = document.getElementById('cancel-edit-modal');
    this.saveEditModalBtn = document.getElementById('save-edit-modal');

    // JSON & 高级
    this.jsonEditor = document.getElementById('json-editor');
    this.loadJsonBtn = document.getElementById('load-json-btn');
    this.saveJsonBtn = document.getElementById('save-json-btn');
    this.audioPoolTextarea = document.getElementById('audio-pool');
    this.audioBaseInput = document.getElementById('audio-base');
    this.saveBtn = document.getElementById('save-btn');
  }

  bindEvents() {
    // 顶部 Tab 切换
    this.navTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        this.navTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const tabName = tab.dataset.tab;
        if (tabName === 'basic') {
          this.mainView.style.display = 'flex';
          this.advancedView.style.display = 'none';
        } else if (tabName === 'advanced') {
          this.mainView.style.display = 'none';
          this.advancedView.style.display = 'block';
          this.saveToJson();
        } else if (tabName === 'smart') {
          this.showStatus('定时智能功能正在开发中...', 'info');
          this.navTabs.forEach(t => t.classList.remove('active'));
          document.querySelector('[data-tab="basic"]').classList.add('active');
        }
      });
    });

    // 页面操作
    this.addPageBtn.addEventListener('click', () => this.addPage());
    this.removePageBtn.addEventListener('click', () => this.removeCurrentPage());

    // 方向切换
    this.portraitRadio.addEventListener('change', () => this.updateOrientation());
    this.landscapeRadio.addEventListener('change', () => this.updateOrientation());

    // 图片上传
    this.pageImageInput.addEventListener('change', (e) => this.handleImageUpload(e));

    // 添加按钮
    this.addButtonBtn.addEventListener('click', () => this.addButtonWithDrag());

    // 序列更新
    this.audioSequenceInput.addEventListener('change', () => this.updatePageSequence());

    // 底部按钮操作
    this.importFileBtn.addEventListener('click', () => this.importFromFile());
    this.exportFileBtn.addEventListener('click', () => this.exportBook());
    if (this.exportZipBtn) {
      this.exportZipBtn.addEventListener('click', () => this.exportToZip());
    }
    this.backupBtn.addEventListener('click', () => this.createBackup());
    this.clearButtonsBtn.addEventListener('click', () => this.clearButtons());

    // 弹窗事件
    this.closeEditModalBtn.addEventListener('click', () => this.closeModal());
    this.cancelEditModalBtn.addEventListener('click', () => this.closeModal());
    this.saveEditModalBtn.addEventListener('click', () => this.saveButtonChanges());
    this.modalBrowseBtn.addEventListener('click', () => this.browseAudioForModal());

    // JSON 操作
    this.loadJsonBtn.addEventListener('click', () => this.loadFromJson());
    this.saveJsonBtn.addEventListener('click', () => this.saveToJson());
    if (this.saveBtn) {
      this.saveBtn.addEventListener('click', () => {
        this.saveBook();
        this.showStatus('配置已保存 (book.json下载)');
      });
    }

    // 画布中的按钮交互（委托）
    this.imagePreview.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('canvas-button')) {
        this.handleButtonDragStart(e);
      } else if (e.target.closest('.canvas-button')) {
        this.handleButtonDragStart({
          ...e,
          target: e.target.closest('.canvas-button')
        });
      }
    });

    this.imagePreview.addEventListener('dblclick', (e) => {
      const btn = e.target.closest('.canvas-button');
      if (btn) {
        const index = parseInt(btn.dataset.index);
        this.openEditModal(index);
      }
    });

    // 列表项点击委托
    this.buttonListContainer.addEventListener('click', (e) => {
      const item = e.target.closest('.list-button-item');
      if (item) {
        const index = parseInt(item.dataset.index);
        // 按钮事件
        if (e.target.classList.contains('list-delete')) {
          this.deleteButton(index);
        } else if (e.target.classList.contains('list-edit')) {
          this.openEditModal(index);
        } else if (e.target.classList.contains('list-play')) {
          this.testButtonAudio(index);
        } else if (e.target.classList.contains('list-up')) {
          this.moveButton(index, -1);
        } else if (e.target.classList.contains('list-down')) {
          this.moveButton(index, 1);
        } else {
          // 选中
          this.currentButtonIndex = index;
          this.renderCanvasButtons();
          this.renderListButtons();
        }
      }
    });
  }

  // --- Core & UI Features ---
  showStatus(msg, type = 'success') {
    if (this.statusToast) {
      this.statusToast.textContent = msg;
      this.statusToast.style.opacity = '1';
      this.statusToast.style.backgroundColor = type === 'error' ? '#ff4444' : '#333';

      if (this.statusTimer) clearTimeout(this.statusTimer);
      this.statusTimer = setTimeout(() => {
        this.statusToast.style.opacity = '0';
      }, 3000);
    }
    console.log(`[${type.toUpperCase()}] ${msg}`);
  }

  showError(msg) {
    this.showStatus(msg, 'error');
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        this.saveBook();
        this.showStatus('已触发快捷键保存');
      }
    });
  }

  setupAutoSave() {
    // 简单的本地存储自动保存
    this.autoSaveTimer = setInterval(() => {
      if (this.book) {
        localStorage.setItem('ebook_autosave', JSON.stringify(this.book));
      }
    }, 30000); // 30s

    // 检查并在加载时询问恢复
    const saved = localStorage.getItem('ebook_autosave');
    if (saved) {
      console.log('Found autosaved data');
      // 可以在 loadBook 中处理
    }
  }

  // --- Logic ---
  async loadBook() {
    try {
      const response = await fetch('book.json');
      this.book = await response.json();

      // 兼容性处理
      if (!this.book.pages) this.book.pages = {};
      if (!this.book.audioPool) this.book.audioPool = [];

      // 恢复检测
      const localData = localStorage.getItem('ebook_autosave');
      if (localData) {
        try {
          const parsed = JSON.parse(localData);
          console.log('Local autosave available.');
          // 这里可以加逻辑让用户选择是否恢复，暂时默认不覆盖fetch的版本
        } catch (e) { }
      }

      this.renderPageList();
      this.audioPoolTextarea.value = (this.book.audioPool || []).join('\n');

      const pageIds = Object.keys(this.book.pages);
      if (pageIds.length > 0) {
        this.selectPage(pageIds[0]);
      } else {
        // Empty state is handled in renderPageList
        this.renderPageDisplay(null);
      }

    } catch (error) {
      console.error('Failed to load book.json', error);
      this.book = { pages: {}, audioPool: [], audioBase: 'audio/' };
      this.renderPageList();
    }
  }

  renderPageList() {
    this.pageList.innerHTML = '';
    const pageIds = Object.keys(this.book.pages);
    this.pageCountBadge.textContent = `${pageIds.length}页`;

    if (pageIds.length === 0) {
      // Empty State In Sidebar
      const emptyEl = document.createElement('div');
      emptyEl.innerHTML = `
            <div style="padding:20px; text-align:center; color:#666; font-size:0.9em;">
                点击上方 ➕ 号<br>创建第一页
            </div>
        `;
      this.pageList.appendChild(emptyEl);

      // Empty State In Main View
      if (this.imagePreview) {
        this.imagePreview.style.display = 'none';
      }
    } else {
      if (this.imagePreview) this.imagePreview.style.display = 'block';
    }

    pageIds.forEach(pageId => {
      const page = this.book.pages[pageId];
      const el = document.createElement('div');
      el.className = `page-list-item ${pageId === this.currentPageId ? 'active' : ''}`;
      el.innerHTML = `
            <div class="page-info">
                <div class="page-info-title">${pageId}</div>
                <div class="page-info-meta">${(page.buttons || []).length} 按钮</div>
            </div>
            ${pageId === this.currentPageId ? '<svg class="icon" style="color:var(--primary-color)"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>' : ''}
        `;
      el.onclick = () => this.selectPage(pageId);
      this.pageList.appendChild(el);
    });
  }

  selectPage(pageId) {
    this.currentPageId = pageId;
    this.currentButtonIndex = null;
    this.renderPageList();

    const page = this.book.pages[pageId];
    this.currentPageTitle.textContent = pageId;

    const orientation = page.imageSettings?.orientation || 'portrait';
    if (orientation === 'landscape') {
      this.landscapeRadio.checked = true;
    } else {
      this.portraitRadio.checked = true;
    }
    this.updateOrientationView(orientation);

    this.renderPageDisplay(page);

    this.audioSequenceInput.value = (page.sequence || []).join(', ');

    this.renderCanvasButtons();
    this.renderListButtons();
  }

  renderPageDisplay(page) {
    if (!page) {
      this.previewImg.style.display = 'none';
      return;
    }
    // 更新图片：先检查 Blob 缓存，再用原始路径
    const imageName = page.image;
    if (this.blobRegistry.images.has(imageName)) {
      this.previewImg.src = this.blobRegistry.images.get(imageName);
    } else {
      this.previewImg.src = imageName || '';
    }
    this.previewImg.style.display = imageName || this.previewImg.src ? 'block' : 'none';
  }

  updateOrientation() {
    if (!this.currentPageId) return;
    const orientation = this.portraitRadio.checked ? 'portrait' : 'landscape';
    if (!this.book.pages[this.currentPageId].imageSettings) {
      this.book.pages[this.currentPageId].imageSettings = {};
    }
    this.book.pages[this.currentPageId].imageSettings.orientation = orientation;
    this.updateOrientationView(orientation);
    this.showStatus('页面方向已更新');
  }

  updateOrientationView(orientation) {
    if (!this.imagePreview) return;
    this.imagePreview.classList.remove('portrait', 'landscape');
    this.imagePreview.classList.add(orientation);
  }

  handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file || !this.currentPageId) return;

    const blobUrl = URL.createObjectURL(file);
    // 使用文件名作为 key (注意路径前缀问题)
    const storeName = `images/${file.name}`;

    this.blobRegistry.images.set(storeName, blobUrl);
    this.fileRegistry.images.set(storeName, file); // Store actual file for zipping

    this.previewImg.src = blobUrl;
    this.previewImg.style.display = 'block';

    // 保存相对路径到 JSON
    this.book.pages[this.currentPageId].image = storeName;
    this.showStatus('图片已更新 (本地预览模式)');
  }

  updatePageSequence() {
    if (!this.currentPageId) return;
    const val = this.audioSequenceInput.value;
    const seq = val.split(/[,，]/).map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    this.book.pages[this.currentPageId].sequence = seq;
    this.showStatus('音频序列已更新');
  }

  renderCanvasButtons() {
    if (!this.imagePreview) return;

    const existingBtns = this.imagePreview.querySelectorAll('.canvas-button');
    existingBtns.forEach(b => b.remove());

    const page = this.book.pages[this.currentPageId];
    if (!page || !page.buttons) return;

    page.buttons.forEach((btn, index) => {
      const el = document.createElement('div');
      el.className = `canvas-button ${index === this.currentButtonIndex ? 'active' : ''}`;
      el.style.left = `${btn.x * 100}%`;
      el.style.top = `${btn.y * 100}%`;
      el.style.transform = 'translate(-50%, -50%)';
      el.dataset.index = index;
      el.textContent = index + 1;

      let tooltip = `Index: ${index}\nPos: ${btn.pos}`;
      if (btn.override) tooltip += `\nAudio: ${btn.override}`;
      el.title = tooltip;

      el.oncontextmenu = (e) => {
        e.preventDefault();
        if (confirm('删除此按钮？')) {
          this.deleteButton(index);
        }
      };

      this.imagePreview.appendChild(el);
    });
  }

  renderListButtons() {
    this.buttonListContainer.innerHTML = '';
    const page = this.book.pages[this.currentPageId];
    if (!page || !page.buttons || page.buttons.length === 0) {
      this.buttonListContainer.innerHTML = '<div style="color:#999; text-align:center;">暂无按钮</div>';
      return;
    }

    page.buttons.forEach((btn, index) => {
      const el = document.createElement('div');
      el.className = `list-button-item ${index === this.currentButtonIndex ? 'active' : ''}`;
      el.dataset.index = index;

      let audioLabel = `Pos: ${btn.pos}`;
      if (btn.override) {
        audioLabel = `<span style="color:var(--primary-color)">Audio: ${btn.override}</span>`;
      }

      el.innerHTML = `
             <div style="flex:1;">
                <strong>#${index + 1}</strong>
                <span style="color:#666; font-size:0.85em; margin-left:8px;">${audioLabel}</span>
             </div>
             <div style="display:flex; gap:4px;">
                <button class="btn btn-sm btn-secondary list-play" title="播放测试">Play</button>
                <button class="btn btn-sm btn-secondary list-edit" title="编辑">Edit</button>
                <button class="btn btn-sm btn-secondary list-up" title="上移">↑</button>
                <button class="btn btn-sm btn-secondary list-down" title="下移">↓</button>
                <button class="btn btn-sm btn-secondary list-delete" style="color:red;" title="删除">Del</button>
             </div>
          `;
      this.buttonListContainer.appendChild(el);
    });
  }

  moveButton(index, direction) {
    const page = this.book.pages[this.currentPageId];
    const newIndex = index + direction;

    if (newIndex >= 0 && newIndex < page.buttons.length) {
      const temp = page.buttons[index];
      page.buttons[index] = page.buttons[newIndex];
      page.buttons[newIndex] = temp;

      this.currentButtonIndex = newIndex;
      this.renderCanvasButtons();
      this.renderListButtons();
      this.showStatus('按钮顺序已调整');
    }
  }

  testButtonAudio(index) {
    if (!this.currentPageId) return;
    const page = this.book.pages[this.currentPageId];
    const btn = page.buttons[index];

    let audioSrc = '';
    let isBlob = false;
    const audioBase = this.book.audioBase || 'audio/';
    const base = audioBase.endsWith('/') ? audioBase : audioBase + '/';

    if (btn.override) {
      // 优先检查 Blob 缓存
      if (this.blobRegistry.audio.has(btn.override)) {
        audioSrc = this.blobRegistry.audio.get(btn.override);
        isBlob = true;
      } else {
        if (btn.override.match(/^https?:\/\//) || btn.override.startsWith('/')) {
          audioSrc = btn.override;
        } else {
          audioSrc = base + btn.override;
        }
      }
    } else {
      // Sequence logic
      const audioIndex = page.sequence[btn.pos];
      if (this.book.audioPool && this.book.audioPool[audioIndex]) {
        const filename = this.book.audioPool[audioIndex];
        if (this.blobRegistry.audio.has(filename)) {
          audioSrc = this.blobRegistry.audio.get(filename);
          isBlob = true;
        } else {
          audioSrc = base + filename;
        }
      }
    }

    if (audioSrc) {
      const audio = new Audio(audioSrc);
      audio.play().catch(e => {
        this.showError(`播放失败: ${e.message}`);
      });
      this.showStatus(isBlob ? `Playing local: ${btn.override || 'sequence'}` : `Try playing: ${audioSrc}`);
    } else {
      this.showError('未找到对应的音频文件');
    }
  }

  addButtonWithDrag() {
    if (!this.currentPageId) return;
    const page = this.book.pages[this.currentPageId];
    let nextPos = 0;
    nextPos = page.buttons.length;

    page.buttons.push({
      x: 0.5,
      y: 0.5,
      pos: nextPos
    });

    this.currentButtonIndex = page.buttons.length - 1;
    this.renderCanvasButtons();
    this.renderListButtons();
    this.renderPageList();
    this.showStatus('按钮已添加，请拖拽到目标位置');
  }

  handleButtonDragStart(e) {
    e.preventDefault();
    // 确保获取的是按钮元素
    const btnEl = e.target.closest('.canvas-button');
    if (!btnEl) return;

    const index = parseInt(btnEl.dataset.index);

    this.currentButtonIndex = index;

    // 注意：这里重新渲染会导致 btnEl 引用断裂（被移除并重新创建）
    // 所以我们暂时只高亮不重绘，或者在拖拽结束后重绘
    // 但 currentButtonIndex 改变需要 visual 反馈
    // 简单起见：手动添加 active 类，不调用 renderCanvasButtons
    const allBtns = this.imagePreview.querySelectorAll('.canvas-button');
    allBtns.forEach(b => b.classList.remove('active'));
    btnEl.classList.add('active');
    this.renderListButtons(); // List 可更新

    const rect = this.imagePreview.getBoundingClientRect();
    const startClientX = e.clientX;
    const startClientY = e.clientY;

    // 获取当前按钮的初始百分比位置
    const page = this.book.pages[this.currentPageId];
    if (!page || !page.buttons[index]) return;

    const initialBtnX = page.buttons[index].x;
    const initialBtnY = page.buttons[index].y;

    const onMouseMove = (moveEvent) => {
      const deltaX = (moveEvent.clientX - startClientX) / rect.width;
      const deltaY = (moveEvent.clientY - startClientY) / rect.height;

      let newX = initialBtnX + deltaX;
      let newY = initialBtnY + deltaY;

      newX = Math.max(0, Math.min(1, newX));
      newY = Math.max(0, Math.min(1, newY));

      btnEl.style.left = `${newX * 100}%`;
      btnEl.style.top = `${newY * 100}%`;

      // 实时更新数据
      page.buttons[index].x = newX;
      page.buttons[index].y = newY;
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      // 拖拽结束，统一刷新一次以确保状态一致
      this.renderCanvasButtons();
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  // --- Modal Logic ---
  openEditModal(index) {
    if (!this.currentPageId) return;
    const btn = this.book.pages[this.currentPageId].buttons[index];
    if (!btn) return;

    this.currentButtonIndex = index;
    this.editButtonNumber.textContent = index + 1;
    this.modalButtonPos.value = btn.pos;
    this.modalOverrideAudio.value = btn.override || '';
    this.modalButtonX.value = btn.x.toFixed(3);
    this.modalButtonY.value = btn.y.toFixed(3);

    this.buttonEditModal.classList.add('active');
  }

  closeModal() {
    this.buttonEditModal.classList.remove('active');
  }

  saveButtonChanges() {
    if (this.currentButtonIndex === null) return;
    const page = this.book.pages[this.currentPageId];
    const btn = page.buttons[this.currentButtonIndex];

    btn.pos = parseInt(this.modalButtonPos.value) || 0;
    btn.override = this.modalOverrideAudio.value;
    btn.x = parseFloat(this.modalButtonX.value);
    btn.y = parseFloat(this.modalButtonY.value);

    this.closeModal();
    this.renderCanvasButtons();
    this.renderListButtons();
    this.showStatus('按钮属性已更新');
  }

  browseAudioForModal() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    input.onchange = (e) => {
      if (e.target.files[0]) {
        const file = e.target.files[0];
        this.modalOverrideAudio.value = file.name;

        // Store actual file for zipping
        this.fileRegistry.audio.set(file.name, file);
        // Cache Blob for playback
        this.blobRegistry.audio.set(file.name, URL.createObjectURL(file));
        this.showStatus('音频已选择 (本地预览模式)');
      }
    };
    input.click();
  }

  clearButtons() {
    if (!this.currentPageId) return;
    if (confirm('确定清空所有按钮？')) {
      this.book.pages[this.currentPageId].buttons = [];
      this.currentButtonIndex = null;
      this.renderCanvasButtons();
      this.renderListButtons();
      this.renderPageList();
      this.showStatus('所有按钮已删除');
    }
  }

  // --- Page Operations ---
  addPage() {
    const id = `page${Object.keys(this.book.pages).length + 1}`;
    this.book.pages[id] = {
      image: '',
      sequence: [0, 1, 2],
      buttons: []
    };
    this.renderPageList();
    this.selectPage(id);
    this.showStatus(`新页面 ${id} 已创建`);
  }

  removeCurrentPage() {
    if (!this.currentPageId) return;
    if (!confirm(`确定删除 ${this.currentPageId}?`)) return;

    delete this.book.pages[this.currentPageId];
    this.currentPageId = null;

    const keys = Object.keys(this.book.pages);
    if (keys.length > 0) {
      this.selectPage(keys[0]);
    } else {
      this.renderPageList();
      this.currentPageTitle.textContent = '(无页面)';
      // Empty State shown in renderPageList logic
    }
    this.showStatus('页面已删除');
  }

  deleteButton(index) {
    if (!confirm('确定删除按钮？')) return;
    this.book.pages[this.currentPageId].buttons.splice(index, 1);
    this.currentButtonIndex = null;
    this.renderCanvasButtons();
    this.renderListButtons();
    this.renderPageList();
    this.showStatus('按钮已删除');
  }

  // --- IO & Utils ---
  loadFromJson() {
    try {
      const data = JSON.parse(this.jsonEditor.value);
      this.book = data;
      this.renderPageList();
      if (Object.keys(this.book.pages).length) {
        this.selectPage(Object.keys(this.book.pages)[0]);
      }
      this.showStatus('配置加载成功');
    } catch (e) {
      alert('JSON 格式错误');
    }
  }

  saveToJson() {
    if (this.audioPoolTextarea) {
      this.book.audioPool = this.audioPoolTextarea.value.split('\n').filter(s => s.trim());
    }
    if (this.jsonEditor) {
      this.jsonEditor.value = JSON.stringify(this.book, null, 2);
    }
  }

  async saveBook() {
    this.saveToJson();
    const blob = new Blob([JSON.stringify(this.book, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'book.json';
    a.click();
  }

  exportBook() {
    this.saveBook();
  }

  // [New] Export All-in-One ZIP
  async exportToZip() {
    if (typeof JSZip === 'undefined') {
      alert('JSZip 库未加载，请检查网络或刷新页面');
      return;
    }

    const zip = new JSZip();

    // 1. Add book.json (Sync)
    this.saveToJson();
    zip.file("book.json", JSON.stringify(this.book, null, 2));

    // 2. Add folders
    const imgFolder = zip.folder("images");
    const audioFolder = zip.folder("audio");

    let addedCount = 0;

    // 3. Add Images
    // Iterate through used images in book.json
    Object.values(this.book.pages).forEach(page => {
      if (page.image && typeof page.image === 'string') {
        // Expected format: "images/filename.jpg"
        // Only add if explicitly in fileRegistry (uploaded in this session)
        if (this.fileRegistry.images.has(page.image)) {
          const file = this.fileRegistry.images.get(page.image);
          imgFolder.file(file.name, file);
          addedCount++;
        }
      }
    });

    // 4. Add Audio
    // Iterate pages for button overrides
    Object.values(this.book.pages).forEach(page => {
      (page.buttons || []).forEach(btn => {
        if (btn.override && this.fileRegistry.audio.has(btn.override)) {
          const file = this.fileRegistry.audio.get(btn.override);
          audioFolder.file(file.name, file);
          addedCount++;
        }
      });
    });
    // Iterate audio pool (if any)
    (this.book.audioPool || []).forEach(filename => {
      if (this.fileRegistry.audio.has(filename)) {
        const file = this.fileRegistry.audio.get(filename);
        audioFolder.file(file.name, file);
        addedCount++;
      }
    });

    // 5. Generate Info.txt
    zip.file("使用说明.txt", "请解压本压缩包内容到您的项目文件夹中，覆盖对应的 book.json, images 和 audio 文件夹。\n\n" +
      "文件统计：\n" +
      `- 配置文件: book.json\n` +
      `- 媒体文件: ${addedCount} 个 (仅包含本次会话新上传的文件)\n\n` +
      "注意：如果您引用了之前已存在的文件，它们不会包含在此压缩包中，请确保它们未被删除。");

    // 6. Generate Drop
    this.showStatus('正在打包资源...', 'info');
    try {
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      a.href = url;
      a.download = `project_assets_${timestamp}.zip`;
      a.click();
      this.showStatus('资源包已下载，请解压使用！');
    } catch (e) {
      this.showError('打包失败: ' + e.message);
    }
  }

  createBackup() {
    const blob = new Blob([JSON.stringify(this.book, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
    a.click();
    this.showStatus('备份文件已下载');
  }

  importFromFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = JSON.parse(evt.target.result);
          this.book = data;
          this.renderPageList();
          if (Object.keys(this.book.pages).length) {
            this.selectPage(Object.keys(this.book.pages)[0]);
          }
          this.showStatus('导入成功');
        } catch (err) {
          this.showError('JSON解析失败');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }
}