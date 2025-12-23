class BookEditor {
  constructor() {
    this.book = null;
    this.currentPageId = null;
    this.currentButtonIndex = null;
    this.isAdvancedVisible = false;
    this.lastFileHandle = null;
    this.autoSaveTimer = null;
    this.autoSaveEnabled = false;
    this.lastSaveTime = null;

    this.initElements();
    this.bindEvents();
    this.loadBook();
  }

  initElements() {
    // 标签页
    this.tabs = document.querySelectorAll('.tab');
    this.tabContents = document.querySelectorAll('.tab-content');

    // 页面管理
    this.pageList = document.getElementById('page-list');
    this.addPageBtn = document.getElementById('add-page-btn');
    this.removePageBtn = document.getElementById('remove-page-btn');

    // 页面设置
    this.pageImageInput = document.getElementById('page-image-input');
    this.imagePreview = document.getElementById('image-preview');
    this.previewImg = document.getElementById('preview-img');
    this.audioSequenceInput = document.getElementById('audio-sequence');

    // 图片规格设置（固定A4）
    this.portraitRadio = document.getElementById('portrait-mode');
    this.landscapeRadio = document.getElementById('landscape-mode');

    // 按钮管理
    this.buttonList = document.getElementById('button-list');
    this.addButtonBtn = document.getElementById('add-button-btn');
    this.clearButtonsBtn = document.getElementById('clear-buttons-btn');

    // 高级选项
    this.advancedToggle = document.getElementById('advanced-toggle');
    this.advancedContent = document.getElementById('advanced-content');
    this.overrideAudioInput = document.getElementById('override-audio');
    this.browseAudioBtn = document.getElementById('browse-audio-btn');
    this.buttonPosInput = document.getElementById('button-pos');
    this.buttonXInput = document.getElementById('button-x');
    this.buttonYInput = document.getElementById('button-y');

    // 弹窗元素
    this.buttonEditModal = document.getElementById('button-edit-modal');
    this.editButtonNumber = document.getElementById('edit-button-number');
    this.modalOverrideAudioInput = document.getElementById('modal-override-audio');
    this.modalBrowseAudioBtn = document.getElementById('modal-browse-audio-btn');
    this.modalButtonXInput = document.getElementById('modal-button-x');
    this.modalButtonYInput = document.getElementById('modal-button-y');
    this.modalButtonPosInput = document.getElementById('modal-button-pos');
    this.closeEditModalBtn = document.getElementById('close-edit-modal');
    this.cancelEditModalBtn = document.getElementById('cancel-edit-modal');
    this.saveEditModalBtn = document.getElementById('save-edit-modal');

    // A4虚线框
    this.a4Outline = document.getElementById('a4-outline');
    this.a4Border = this.a4Outline ? this.a4Outline.querySelector('.a4-border') : null;

    // 当前编辑的按钮索引
    this.editingButtonIndex = null;

    // 音频池
    this.audioPoolTextarea = document.getElementById('audio-pool');
    this.audioBaseInput = document.getElementById('audio-base');

    // JSON 编辑
    this.jsonEditor = document.getElementById('json-editor');
    this.loadJsonBtn = document.getElementById('load-json-btn');
    this.saveJsonBtn = document.getElementById('save-json-btn');
    this.importFileBtn = document.getElementById('import-file-btn');
    this.exportFileBtn = document.getElementById('export-file-btn');
    this.backupBtn = document.getElementById('backup-btn');

    // 预览
    this.livePreview = document.getElementById('live-preview');
    this.testPlayBtn = document.getElementById('test-play-btn');
    this.resetPreviewBtn = document.getElementById('reset-preview-btn');

    // 操作按钮
    this.saveBtn = document.getElementById('save-btn');
    this.loadBtn = document.getElementById('load-btn');
    this.exportBtn = document.getElementById('export-btn');

    // 状态
    this.statusMessage = document.getElementById('status-message');
    this.errorMessage = document.getElementById('error-message');

    // 预览播放器
    this.previewPlayer = null;
  }

  bindEvents() {
    // 标签页切换
    this.tabs.forEach(tab => {
      tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
    });

    // 页面管理
    this.addPageBtn.addEventListener('click', () => this.addPage());
    this.removePageBtn.addEventListener('click', () => this.removeCurrentPage());

    // 图片上传
    this.pageImageInput.addEventListener('change', (e) => this.handleImageUpload(e));

    // 图片规格设置（固定A4）
    this.portraitRadio.addEventListener('change', () => this.updateImageSize());
    this.landscapeRadio.addEventListener('change', () => this.updateImageSize());

    // 音频序列
    this.audioSequenceInput.addEventListener('change', () => this.updatePageSequence());

    // 按钮管理
    this.addButtonBtn.addEventListener('click', () => this.addButton());
    this.clearButtonsBtn.addEventListener('click', () => this.clearButtons());

    // 使用事件委托处理动态生成的按钮
    this.buttonList.addEventListener('click', (e) => {
      const target = e.target;
      if (target.classList.contains('edit-btn')) {
        const index = parseInt(target.dataset.index);
        this.openEditModal(index);
      } else if (target.classList.contains('delete-btn')) {
        const index = parseInt(target.dataset.index);
        this.deleteButton(index);
      } else if (target.classList.contains('test-btn')) {
        const index = parseInt(target.dataset.index);
        this.testButton(index);
      } else if (target.classList.contains('move-up-btn')) {
        const index = parseInt(target.dataset.index);
        this.moveButtonUp(index);
      } else if (target.classList.contains('move-down-btn')) {
        const index = parseInt(target.dataset.index);
        this.moveButtonDown(index);
      }
    });

    // 高级选项
    this.advancedToggle.addEventListener('click', () => this.toggleAdvanced());
    this.overrideAudioInput.addEventListener('change', () => this.updateButtonOverride());
    this.browseAudioBtn.addEventListener('click', () => this.browseAudioFile());
    this.buttonPosInput.addEventListener('change', () => this.updateButtonPos());
    this.buttonXInput.addEventListener('change', () => this.updateButtonPosition());
    this.buttonYInput.addEventListener('change', () => this.updateButtonPosition());

    // 弹窗事件
    this.closeEditModalBtn.addEventListener('click', () => this.closeEditModal());
    this.cancelEditModalBtn.addEventListener('click', () => this.closeEditModal());
    this.saveEditModalBtn.addEventListener('click', () => this.saveEditModal());
    this.modalBrowseAudioBtn.addEventListener('click', () => this.browseAudioFileForModal());

    // 点击弹窗外部关闭
    this.buttonEditModal.addEventListener('click', (e) => {
      if (e.target === this.buttonEditModal) {
        this.closeEditModal();
      }
    });

    // 音频池
    this.audioPoolTextarea.addEventListener('change', () => this.updateAudioPool());
    this.audioBaseInput.addEventListener('change', () => this.updateAudioBase());

    // JSON 编辑
    this.loadJsonBtn.addEventListener('click', () => this.loadFromJson());
    this.saveJsonBtn.addEventListener('click', () => this.saveToJson());
    this.importFileBtn.addEventListener('click', () => this.importFromFile());
    this.exportFileBtn.addEventListener('click', () => this.exportToFile());
    this.backupBtn.addEventListener('click', () => this.createBackup());

    // 预览
    this.testPlayBtn.addEventListener('click', () => this.testPlay());
    this.resetPreviewBtn.addEventListener('click', () => this.resetPreview());

    // 操作按钮
    this.saveBtn.addEventListener('click', () => this.saveBook());
    this.loadBtn.addEventListener('click', () => this.loadBook());
    this.exportBtn.addEventListener('click', () => this.exportBook());

    // 自动保存设置
    this.setupAutoSave();

    // 添加快捷键支持
    this.setupKeyboardShortcuts();

    // 实时更新预览
    this.livePreview.addEventListener('click', (e) => this.handlePreviewClick(e));

    // 图片预览区域点击添加按钮
    this.imagePreview.addEventListener('click', (e) => this.handleImagePreviewClick(e));

    // 窗口大小改变时更新A4框
    window.addEventListener('resize', () => {
      this.updateImageSize();
    });

    // 基础编辑里的预览按钮点击
    this.imagePreview.addEventListener('click', (e) => {
      if (e.target.classList.contains('preview-button')) {
        const index = parseInt(e.target.dataset.index);
        this.selectButton(index);
        this.renderPreview(); // 同步高亮
      }
    });
  }

  async loadBook() {
    try {
      this.showStatus('正在加载配置...');

      const response = await fetch('book.json');
      this.book = await response.json();

      // 初始化音频池文本
      this.audioPoolTextarea.value = this.book.audioPool.join('\n');
      this.audioBaseInput.value = this.book.audioBase || 'audio/';

      // 初始化页面列表
      this.renderPageList();

      // 选择第一个页面
      const pageIds = Object.keys(this.book.pages);
      if (pageIds.length > 0) {
        this.selectPage(pageIds[0]);
      }

      this.showStatus('配置加载成功');
      this.clearError();
    } catch (error) {
      this.showError(`加载失败: ${error.message}`);
      console.error('加载失败:', error);

      // 创建默认配置
      this.book = {
        audioBase: 'audio/',
        audioPool: ['001.mp3', '002.mp3', '003.mp3', '004.mp3', '005.mp3'],
        pages: {
          page1: {
            image: 'images/page1.svg',
            sequence: [0, 1, 2],
            buttons: []
          }
        }
      };

      this.renderPageList();
      const pageIds = Object.keys(this.book.pages);
      if (pageIds.length > 0) {
        this.selectPage(pageIds[0]);
      }
    }
  }

  renderPageList() {
    this.pageList.innerHTML = '';
    const pageIds = Object.keys(this.book.pages);

    if (pageIds.length === 0) {
      this.pageList.innerHTML = '<div class="page-item">暂无页面</div>';
      return;
    }

    pageIds.forEach(pageId => {
      const pageItem = document.createElement('div');
      pageItem.className = `page-item ${pageId === this.currentPageId ? 'active' : ''}`;
      pageItem.innerHTML = `
        <div>
          <strong>${pageId}</strong>
          <div style="font-size: 0.8rem; color: #666;">
            ${this.book.pages[pageId].buttons.length} 个按钮
          </div>
        </div>
        <div>
          <button class="btn btn-sm btn-secondary" onclick="editor.editPageName('${pageId}')">重命名</button>
        </div>
      `;

      pageItem.addEventListener('click', (e) => {
        if (!e.target.closest('button')) {
          this.selectPage(pageId);
        }
      });

      this.pageList.appendChild(pageItem);
    });
  }

  selectPage(pageId) {
    this.currentPageId = pageId;
    this.currentButtonIndex = null;
    this.renderPageList();
    this.loadPageData();
    this.renderPreview();
  }

  loadPageData() {
    if (!this.currentPageId || !this.book.pages[this.currentPageId]) {
      return;
    }

    const page = this.book.pages[this.currentPageId];

    // 加载图片预览
    this.previewImg.src = page.image;
    this.previewImg.style.display = page.image ? 'block' : 'none';

    // 加载图片设置
    const imageSettings = page.imageSettings || {
      autoResize: true,
      fitToScreen: true,
      orientation: 'portrait'
    };

    if (imageSettings.orientation === 'portrait') {
      this.portraitRadio.checked = true;
    } else {
      this.landscapeRadio.checked = true;
    }

    // 应用图片设置
    setTimeout(() => this.updateImageSize(), 100);

    // 加载音频序列
    this.audioSequenceInput.value = page.sequence.join(', ');

    // 加载按钮列表
    this.renderButtonList();

    // 重置高级选项
    this.overrideAudioInput.value = '';
    this.buttonPosInput.value = '0';
    this.buttonXInput.value = '0.5';
    this.buttonYInput.value = '0.5';

    // 基础编辑也渲染按钮
    this.renderImagePreviewButtons();
  }

  renderButtonList() {
    this.buttonList.innerHTML = '';

    if (!this.currentPageId) return;

    const page = this.book.pages[this.currentPageId];

    if (page.buttons.length === 0) {
      this.buttonList.innerHTML = '<div style="text-align: center; color: #999; padding: 20px;">暂无按钮</div>';
      return;
    }

    page.buttons.forEach((button, index) => {
      const buttonItem = document.createElement('div');
      buttonItem.className = `button-item ${index === this.currentButtonIndex ? 'active' : ''}`;

      const hasOverride = button.override ? '✓' : '✗';

      buttonItem.innerHTML = `
        <div class="button-header">
          <div class="button-title">按钮 ${index + 1} (位置: ${button.pos})</div>
          <div class="button-details">X: ${button.x.toFixed(2)}, Y: ${button.y.toFixed(2)}</div>
        </div>
        <div style="font-size: 0.85rem; color: #666;">
          位置: ${button.pos} | 覆盖音频: ${hasOverride}
          ${button.override ? `<br>自定义文件: ${button.override}` : '<span style="color: #999; font-style: italic;">（点击编辑设置自定义音频）</span>'}
        </div>
        <div style="margin-top: 8px; display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="btn btn-sm btn-primary edit-btn" data-index="${index}">编辑音频/位置</button>
          <button class="btn btn-sm btn-secondary delete-btn" data-index="${index}">删除</button>
          <button class="btn btn-sm btn-secondary test-btn" data-index="${index}">测试</button>
          <div style="display: flex; gap: 2px;">
            <button class="btn btn-sm btn-secondary move-up-btn" data-index="${index}" ${index === 0 ? 'disabled' : ''}>↑</button>
            <button class="btn btn-sm btn-secondary move-down-btn" data-index="${index}" ${index === page.buttons.length - 1 ? 'disabled' : ''}>↓</button>
          </div>
        </div>
      `;

      buttonItem.addEventListener('click', (e) => {
        if (!e.target.closest('button')) {
          this.selectButton(index);
        }
      });

      this.buttonList.appendChild(buttonItem);
    });
  }

  selectButton(index) {
    this.currentButtonIndex = index;
    this.renderButtonList();
    this.loadButtonData();

    // 确保高级选项输入框可见并更新
    if (this.isAdvancedVisible) {
      this.advancedContent.classList.remove('hidden');
    }
  }

  loadButtonData() {
    if (this.currentButtonIndex === null || !this.currentPageId) {
      return;
    }

    const page = this.book.pages[this.currentPageId];
    const button = page.buttons[this.currentButtonIndex];

    if (!button) return;

    this.overrideAudioInput.value = button.override || '';
    this.buttonPosInput.value = button.pos || 0;
    this.buttonXInput.value = button.x;
    this.buttonYInput.value = button.y;
  }

  updateButtonPos() {
    if (this.currentButtonIndex === null || !this.currentPageId) return;

    const page = this.book.pages[this.currentPageId];
    const button = page.buttons[this.currentButtonIndex];

    if (!button) return;

    button.pos = parseInt(this.buttonPosInput.value) || 0;
    this.renderButtonList();
    this.showStatus('按钮音频索引已更新');

    // 同时也更新预览
    this.renderPreview();
    this.renderImagePreviewButtons();
  }

  addPage() {
    // 确保 book 对象已初始化
    if (!this.book) {
      this.book = {
        audioBase: 'audio/',
        audioPool: ['001.mp3', '002.mp3', '003.mp3', '004.mp3', '005.mp3'],
        pages: {}
      };
    }

    if (!this.book.pages) {
      this.book.pages = {};
    }

    const pageId = `page${Object.keys(this.book.pages).length + 1}`;

    this.book.pages[pageId] = {
      image: '',
      sequence: [0, 1, 2],
      buttons: [],
      imageSettings: {
        autoResize: true,
        fitToScreen: true,
        orientation: 'portrait'
      }
    };

    this.renderPageList();
    this.selectPage(pageId);
    this.showStatus(`页面 ${pageId} 已添加`);
  }

  removeCurrentPage() {
    if (!this.currentPageId) {
      this.showError('请先选择页面');
      return;
    }

    if (Object.keys(this.book.pages).length <= 1) {
      this.showError('至少需要保留一个页面');
      return;
    }

    if (confirm(`确定删除页面 ${this.currentPageId} 吗？`)) {
      delete this.book.pages[this.currentPageId];

      // 选择另一个页面
      const pageIds = Object.keys(this.book.pages);
      if (pageIds.length > 0) {
        this.selectPage(pageIds[0]);
      } else {
        this.currentPageId = null;
        this.loadPageData();
      }

      this.renderPageList();
      this.showStatus(`页面已删除`);
    }
  }

  editPageName(oldName) {
    const newName = prompt('输入新的页面名称:', oldName);
    if (newName && newName !== oldName) {
      if (this.book.pages[newName]) {
        this.showError(`页面 ${newName} 已存在`);
        return;
      }

      this.book.pages[newName] = this.book.pages[oldName];
      delete this.book.pages[oldName];

      if (this.currentPageId === oldName) {
        this.currentPageId = newName;
      }

      this.renderPageList();
      this.showStatus(`页面重命名为 ${newName}`);
    }
  }

  handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file || !this.currentPageId) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      // 在实际应用中，这里应该上传到服务器
      // 现在只使用本地预览
      this.previewImg.src = e.target.result;
      this.previewImg.style.display = 'block';

      // 保存文件名
      this.book.pages[this.currentPageId].image = `images/${file.name}`;
      this.showStatus('图片已更新（仅预览）');
    };
    reader.readAsDataURL(file);
  }

  updatePageSequence() {
    if (!this.currentPageId) return;

    try {
      const sequence = this.audioSequenceInput.value
        .split(',')
        .map(num => parseInt(num.trim()))
        .filter(num => !isNaN(num));

      this.book.pages[this.currentPageId].sequence = sequence;
      this.showStatus('音频序列已更新');
    } catch (error) {
      this.showError('音频序列格式错误');
    }
  }

  updateImageSize() {
    if (!this.currentPageId) return;

    const isPortrait = this.portraitRadio.checked;

    // 固定显示A4虚线框
    if (this.a4Outline) {
      this.a4Outline.style.display = 'block';
    }

    // A4比例：竖版 210×297mm，横版 297×210mm
    const aspectRatio = isPortrait ? 210 / 297 : 297 / 210; // 宽高比

    // 计算预览区域尺寸
    const previewRect = this.imagePreview.getBoundingClientRect();
    const previewWidth = previewRect.width;
    const previewHeight = previewRect.height;

    // 计算A4框尺寸（最大为预览区域的80%）
    const maxWidth = previewWidth * 0.8;
    const maxHeight = previewHeight * 0.8;

    let a4Width, a4Height;
    if (isPortrait) {
      // 竖版：以高度为基准
      a4Height = Math.min(maxHeight, maxWidth / aspectRatio);
      a4Width = a4Height * aspectRatio;
    } else {
      // 横版：以宽度为基准
      a4Width = Math.min(maxWidth, maxHeight * aspectRatio);
      a4Height = a4Width / aspectRatio;
    }

    // 设置A4框尺寸
    if (this.a4Border) {
      this.a4Border.style.width = `${a4Width}px`;
      this.a4Border.style.height = `${a4Height}px`;
    }

    // 图片自动适应A4框
    if (this.previewImg && this.previewImg.src) {
      this.previewImg.style.maxWidth = `${a4Width}px`;
      this.previewImg.style.maxHeight = `${a4Height}px`;
      this.previewImg.style.objectFit = 'contain';
      this.previewImg.style.aspectRatio = aspectRatio;

      // 居中图片
      this.previewImg.style.position = 'absolute';
      this.previewImg.style.top = '50%';
      this.previewImg.style.left = '50%';
      this.previewImg.style.transform = 'translate(-50%, -50%)';
    }

    // 保存设置到页面配置
    if (!this.book.pages[this.currentPageId].imageSettings) {
      this.book.pages[this.currentPageId].imageSettings = {};
    }

    this.book.pages[this.currentPageId].imageSettings = {
      autoResize: true,  // 固定为A4
      fitToScreen: true, // 固定适应A4框
      orientation: isPortrait ? 'portrait' : 'landscape'
    };

    this.showStatus(`A4 ${isPortrait ? '竖版' : '横版'}设置已更新`);
  }

  addButton(x = 0.5, y = 0.5) {
    if (!this.currentPageId) {
      this.showError('请先选择页面');
      return;
    }

    const page = this.book.pages[this.currentPageId];
    const buttonCount = page.buttons.length;

    // 自动计算pos：如果按钮数量小于序列长度，使用按钮索引，否则循环使用
    const sequenceLength = page.sequence ? page.sequence.length : 3;
    const pos = sequenceLength > 0 ? buttonCount % sequenceLength : 0;

    page.buttons.push({
      x: x,
      y: y,
      pos: pos,
      override: ''
    });

    this.renderButtonList();
    this.selectButton(page.buttons.length - 1);

    // 检查按钮重叠
    const newButton = page.buttons[page.buttons.length - 1];
    this.checkButtonOverlap(newButton, page.buttons.length - 1);

    // 自动显示高级选项以便编辑
    if (!this.isAdvancedVisible) {
      this.toggleAdvanced();
    }

    this.showStatus(`按钮 ${page.buttons.length} 已添加。可在高级选项中设置自定义音频路径。`);
    this.renderPreview();
    this.renderImagePreviewButtons();

    // 自动切换到预览标签页，或者留在当前页但能看到按钮
    // this.switchTab('preview');
  }

  clearButtons() {
    if (!this.currentPageId) {
      this.showError('请先选择页面');
      return;
    }

    if (confirm('确定清空所有按钮吗？')) {
      this.book.pages[this.currentPageId].buttons = [];
      this.renderButtonList();
      this.currentButtonIndex = null;
      this.showStatus('按钮已清空');
      this.renderPreview();
      this.renderImagePreviewButtons();
    }
  }

  editButton(index) {
    this.selectButton(index);
    this.showStatus(`编辑按钮 ${index + 1}`);
  }

  deleteButton(index) {
    if (!this.currentPageId) return;

    if (confirm('确定删除这个按钮吗？')) {
      this.book.pages[this.currentPageId].buttons.splice(index, 1);

      if (this.currentButtonIndex === index) {
        this.currentButtonIndex = null;
        this.loadButtonData();
      }

      this.renderButtonList();
      this.showStatus('按钮已删除');
      this.renderPreview();
      this.renderImagePreviewButtons();
    }
  }

  testButton(index) {
    if (!this.currentPageId) return;

    const page = this.book.pages[this.currentPageId];
    const button = page.buttons[index];

    if (!button) return;

    // 使用播放器测试
    if (!this.previewPlayer) {
      this.previewPlayer = new InteractiveBookPlayer('book.json');
    }

    // 模拟播放
    this.previewPlayer.playButton(button);
    this.showStatus('测试播放中...');
  }

  updateButtonOverride() {
    if (this.currentButtonIndex === null || !this.currentPageId) return;

    const page = this.book.pages[this.currentPageId];
    const button = page.buttons[this.currentButtonIndex];

    if (!button) return;

    const newValue = this.overrideAudioInput.value.trim();
    button.override = newValue || null;
    this.renderButtonList();

    if (newValue) {
      this.showStatus(`按钮 ${this.currentButtonIndex + 1} 已设置自定义音频: ${newValue}`);
    } else {
      this.showStatus(`按钮 ${this.currentButtonIndex + 1} 已恢复使用默认序列音频`);
    }
  }

  browseAudioFile() {
    if (this.currentButtonIndex === null || !this.currentPageId) {
      this.showError('请先选择一个按钮');
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.mp3,.mp4,.wav,.ogg,.webm';

    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      // 获取相对于 audio/ 目录的路径
      const fileName = file.name;

      // 更新输入框
      this.overrideAudioInput.value = fileName;

      // 触发更新
      this.updateButtonOverride();

      this.showStatus(`已选择音频文件: ${fileName}`);
    });

    input.click();
  }

  updateButtonPosition() {
    if (this.currentButtonIndex === null || !this.currentPageId) return;

    const page = this.book.pages[this.currentPageId];
    const button = page.buttons[this.currentButtonIndex];

    if (!button) return;

    const x = parseFloat(this.buttonXInput.value);
    const y = parseFloat(this.buttonYInput.value);

    if (isNaN(x) || isNaN(y) || x < 0 || x > 1 || y < 0 || y > 1) {
      this.showError('位置值必须在 0 到 1 之间');
      return;
    }

    button.x = x;
    button.y = y;

    this.renderButtonList();

    // 检查按钮重叠
    this.checkButtonOverlap(button, this.currentButtonIndex);

    this.showStatus('按钮位置已更新');
    this.renderPreview();
  }

  toggleAdvanced() {
    this.isAdvancedVisible = !this.isAdvancedVisible;
    this.advancedContent.classList.toggle('hidden');

    const toggleIcon = this.advancedToggle.querySelector('.icon');
    if (this.isAdvancedVisible) {
      toggleIcon.innerHTML = '<path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6 1.41 1.41z"/>';
      this.advancedToggle.innerHTML = `<svg class="icon" viewBox="0 0 24 24"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6 1.41 1.41z"/></svg>隐藏高级选项`;
    } else {
      toggleIcon.innerHTML = '<path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>';
      this.advancedToggle.innerHTML = `<svg class="icon" viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>显示高级选项`;
    }
  }

  updateAudioPool() {
    const audioPool = this.audioPoolTextarea.value
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    this.book.audioPool = audioPool;
    this.showStatus('音频池已更新');
  }

  updateAudioBase() {
    this.book.audioBase = this.audioBaseInput.value;
    this.showStatus('音频基础路径已更新');
  }

  loadFromJson() {
    try {
      const jsonData = JSON.parse(this.jsonEditor.value);
      this.book = jsonData;

      // 更新表单
      this.audioPoolTextarea.value = this.book.audioPool.join('\n');
      this.audioBaseInput.value = this.book.audioBase || 'audio/';

      this.renderPageList();
      const pageIds = Object.keys(this.book.pages);
      if (pageIds.length > 0) {
        this.selectPage(pageIds[0]);
      }

      this.showStatus('配置已从 JSON 加载');
      this.clearError();
    } catch (error) {
      this.showError(`JSON 解析错误: ${error.message}`);
    }
  }

  saveToJson() {
    try {
      const jsonString = JSON.stringify(this.book, null, 2);
      this.jsonEditor.value = jsonString;
      this.showStatus('配置已保存到 JSON 编辑器');
    } catch (error) {
      this.showError(`JSON 生成错误: ${error.message}`);
    }
  }

  renderPreview() {
    if (!this.currentPageId) return;

    const page = this.book.pages[this.currentPageId];
    this.livePreview.innerHTML = '';

    // 创建预览图片
    const previewImg = document.createElement('img');
    previewImg.className = 'preview-image';
    previewImg.src = page.image;
    previewImg.style.display = page.image ? 'block' : 'none';
    this.livePreview.appendChild(previewImg);

    // 创建按钮预览
    page.buttons.forEach((button, index) => {
      const buttonPreview = document.createElement('div');
      buttonPreview.className = 'preview-button';
      buttonPreview.style.left = `${button.x * 100}%`;
      buttonPreview.style.top = `${button.y * 100}%`;
      buttonPreview.style.width = '40px';
      buttonPreview.style.height = '40px';
      buttonPreview.style.borderRadius = '50%';
      buttonPreview.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
      buttonPreview.style.border = '2px solid rgba(0, 0, 0, 0.8)';
      buttonPreview.style.cursor = 'pointer';
      buttonPreview.style.display = 'flex';
      buttonPreview.style.alignItems = 'center';
      buttonPreview.style.justifyContent = 'center';
      buttonPreview.style.fontWeight = 'bold';
      buttonPreview.style.fontSize = '16px';
      buttonPreview.style.color = '#000';
      buttonPreview.textContent = index + 1;
      buttonPreview.dataset.index = index;

      // 添加拖动功能
      this.makeDraggable(buttonPreview, index);

      this.livePreview.appendChild(buttonPreview);
    });
  }

  makeDraggable(element, buttonIndex, isFromBasic = false) {
    let isDragging = false;
    let startX, startY;
    let startLeft, startTop;

    element.addEventListener('mousedown', startDrag);
    element.addEventListener('touchstart', startDrag);

    function startDrag(e) {
      e.preventDefault();
      isDragging = true;

      const rect = element.parentElement.getBoundingClientRect();

      if (e.type === 'mousedown') {
        startX = e.clientX;
        startY = e.clientY;
      } else {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
      }

      startLeft = parseFloat(element.style.left);
      startTop = parseFloat(element.style.top);

      document.addEventListener('mousemove', drag);
      document.addEventListener('touchmove', drag);
      document.addEventListener('mouseup', stopDrag);
      document.addEventListener('touchend', stopDrag);
    }

    const drag = (e) => {
      if (!isDragging) return;
      e.preventDefault();

      let clientX, clientY;
      if (e.type === 'mousemove') {
        clientX = e.clientX;
        clientY = e.clientY;
      } else {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      }

      const rect = element.parentElement.getBoundingClientRect();
      const deltaX = clientX - startX;
      const deltaY = clientY - startY;

      const newLeft = startLeft + (deltaX / rect.width) * 100;
      const newTop = startTop + (deltaY / rect.height) * 100;

      // 限制在预览区域内
      const clampedLeft = Math.max(0, Math.min(100, newLeft));
      const clampedTop = Math.max(0, Math.min(100, newTop));

      element.style.left = `${clampedLeft}%`;
      element.style.top = `${clampedTop}%`;

      // 更新按钮数据
      if (editor.currentPageId) {
        const page = editor.book.pages[editor.currentPageId];
        if (page.buttons[buttonIndex]) {
          page.buttons[buttonIndex].x = clampedLeft / 100;
          page.buttons[buttonIndex].y = clampedTop / 100;

          // 更新按钮列表显示
          editor.renderButtonList();

          // 更新另一个预览
          if (isFromBasic) {
            editor.renderPreviewSync(buttonIndex, clampedLeft / 100, clampedTop / 100);
          } else {
            editor.renderImagePreviewSync(buttonIndex, clampedLeft / 100, clampedTop / 100);
          }
        }
      }
    };

    const stopDrag = () => {
      isDragging = false;
      document.removeEventListener('mousemove', drag);
      document.removeEventListener('touchmove', drag);
      document.removeEventListener('mouseup', stopDrag);
      document.removeEventListener('touchend', stopDrag);

      if (editor.currentPageId) {
        editor.showStatus('按钮位置已更新');
        // 拖动结束，确保完全同步
        editor.renderPreview();
        editor.renderImagePreviewButtons();
      }
    };
  }

  renderPreviewSync(index, x, y) {
    const buttons = this.livePreview.querySelectorAll('.preview-button');
    buttons.forEach(btn => {
      if (parseInt(btn.dataset.index) === index) {
        btn.style.left = `${x * 100}%`;
        btn.style.top = `${y * 100}%`;
      }
    });
  }

  renderImagePreviewSync(index, x, y) {
    const buttons = this.imagePreview.querySelectorAll('.preview-button');
    buttons.forEach(btn => {
      if (parseInt(btn.dataset.index) === index) {
        btn.style.left = `${x * 100}%`;
        btn.style.top = `${y * 100}%`;
      }
    });
  }

  handlePreviewClick(e) {
    if (e.target.classList.contains('preview-button')) {
      const index = parseInt(e.target.dataset.index);
      this.selectButton(index);
      this.renderImagePreviewButtons(); // 同步高亮
    }
  }

  handleImagePreviewClick(e) {
    // 确保点击的是图片区域，而不是按钮或其他元素
    if (e.target.tagName === 'IMG' || e.target.classList.contains('preview-area')) {
      const rect = this.imagePreview.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      // 确保坐标在 0-1 范围内
      const clampedX = Math.max(0, Math.min(1, x));
      const clampedY = Math.max(0, Math.min(1, y));

      // 在点击位置添加按钮
      this.addButton(clampedX, clampedY);

      // 显示添加位置
      this.showStatus(`在位置 (${clampedX.toFixed(2)}, ${clampedY.toFixed(2)}) 添加了按钮`);
    }
  }

  testPlay() {
    if (this.currentButtonIndex !== null) {
      this.testButton(this.currentButtonIndex);
    } else {
      this.showError('请先选择一个按钮进行测试');
    }
  }

  resetPreview() {
    this.renderPreview();
    this.renderImagePreviewButtons();
    this.showStatus('预览已重置');
  }

  renderImagePreviewButtons() {
    if (!this.currentPageId) return;

    const page = this.book.pages[this.currentPageId];

    // 清除现有的预览按钮（除了图片）
    const existingButtons = this.imagePreview.querySelectorAll('.preview-button');
    existingButtons.forEach(btn => btn.remove());

    // 创建按钮预览
    page.buttons.forEach((button, index) => {
      const buttonPreview = document.createElement('div');
      buttonPreview.className = 'preview-button';
      buttonPreview.style.left = `${button.x * 100}%`;
      buttonPreview.style.top = `${button.y * 100}%`;
      buttonPreview.style.width = '40px';
      buttonPreview.style.height = '40px';
      buttonPreview.style.borderRadius = '50%';
      buttonPreview.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
      buttonPreview.style.border = '2px solid rgba(0, 0, 0, 0.8)';
      buttonPreview.style.cursor = 'pointer';
      buttonPreview.style.display = 'flex';
      buttonPreview.style.alignItems = 'center';
      buttonPreview.style.justifyContent = 'center';
      buttonPreview.style.fontWeight = 'bold';
      buttonPreview.style.fontSize = '16px';
      buttonPreview.style.color = '#000';
      buttonPreview.textContent = index + 1;
      buttonPreview.dataset.index = index;

      if (index === this.currentButtonIndex) {
        buttonPreview.style.backgroundColor = 'rgba(106, 17, 203, 0.3)';
        buttonPreview.style.borderColor = '#ff9800';
        buttonPreview.style.boxShadow = '0 0 10px rgba(255, 152, 0, 0.5)';
      }

      // 添加拖动功能
      this.makeDraggable(buttonPreview, index, true);

      this.imagePreview.appendChild(buttonPreview);
    });
  }

  async saveBook(autoSave = false) {
    try {
      // 尝试使用 File System Access API（现代浏览器）
      if ('showSaveFilePicker' in window) {
        await this.saveWithFileSystemAPI(autoSave);
      } else {
        // 回退到下载方式
        this.downloadBook(autoSave);
      }
    } catch (error) {
      console.warn('保存失败:', error);
      // 如果 File System API 失败，使用下载方式
      this.downloadBook(autoSave);
    }
  }

  async saveWithFileSystemAPI(autoSave = false) {
    let fileHandle;

    try {
      // 如果是自动保存，尝试获取已有文件句柄
      if (autoSave && this.lastFileHandle) {
        fileHandle = this.lastFileHandle;
      } else {
        // 否则让用户选择文件
        fileHandle = await window.showSaveFilePicker({
          suggestedName: 'book.json',
          types: [{
            description: 'JSON 配置文件',
            accept: { 'application/json': ['.json'] }
          }]
        });

        // 保存文件句柄供下次自动保存使用
        this.lastFileHandle = fileHandle;
      }

      // 创建可写流
      const writable = await fileHandle.createWritable();

      // 写入数据
      const jsonString = JSON.stringify(this.book, null, 2);
      await writable.write(jsonString);
      await writable.close();

      if (autoSave) {
        this.showStatus('自动保存成功');
      } else {
        this.showStatus('配置已保存到本地文件');
      }
      this.clearError();

    } catch (error) {
      if (error.name === 'AbortError') {
        // 用户取消了保存
        return;
      }
      throw error;
    }
  }

  downloadBook(autoSave = false) {
    const jsonString = JSON.stringify(this.book, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = autoSave ? `book_autosave_${Date.now()}.json` : 'book.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (autoSave) {
      this.showStatus('自动备份已下载');
    } else {
      this.showStatus('配置已下载为 book.json');
    }
  }


  importFromFile() {
    // 创建文件输入元素
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';

    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const jsonData = JSON.parse(event.target.result);
          this.book = jsonData;

          // 更新表单
          this.audioPoolTextarea.value = this.book.audioPool.join('\n');
          this.audioBaseInput.value = this.book.audioBase || 'audio/';

          // 更新JSON编辑器
          this.jsonEditor.value = JSON.stringify(this.book, null, 2);

          // 更新页面列表
          this.renderPageList();
          const pageIds = Object.keys(this.book.pages);
          if (pageIds.length > 0) {
            this.selectPage(pageIds[0]);
          }

          this.showStatus(`已导入文件: ${file.name}`);
          this.clearError();
        } catch (error) {
          this.showError(`文件导入失败: ${error.message}`);
        }
      };

      reader.readAsText(file);
    });

    input.click();
  }

  exportToFile() {
    const jsonString = JSON.stringify(this.book, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;

    // 使用时间戳生成文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.download = `book-config-${timestamp}.json`;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showStatus('配置已导出为JSON文件');
  }

  createBackup() {
    try {
      // 获取现有备份列表
      const backups = JSON.parse(localStorage.getItem('book_backups') || '[]');

      // 创建新备份
      const backup = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        data: this.book,
        name: `备份 ${new Date().toLocaleString('zh-CN')}`
      };

      // 添加到备份列表（最多保存10个）
      backups.unshift(backup);
      if (backups.length > 10) {
        backups.pop();
      }

      // 保存到localStorage
      localStorage.setItem('book_backups', JSON.stringify(backups));

      // 显示备份管理器
      this.showBackupManager();

      this.showStatus(`备份已创建: ${backup.name}`);
    } catch (error) {
      this.showError(`创建备份失败: ${error.message}`);
    }
  }

  showBackupManager() {
    const backups = JSON.parse(localStorage.getItem('book_backups') || '[]');

    if (backups.length === 0) {
      alert('暂无备份');
      return;
    }

    let backupList = '备份列表（点击恢复）:\n\n';
    backups.forEach((backup, index) => {
      backupList += `${index + 1}. ${backup.name}\n`;
    });

    backupList += '\n输入备份编号恢复（1-' + backups.length + '）:';

    const backupIndex = prompt(backupList);
    if (!backupIndex) return;

    const index = parseInt(backupIndex) - 1;
    if (isNaN(index) || index < 0 || index >= backups.length) {
      alert('无效的备份编号');
      return;
    }

    const backup = backups[index];
    if (confirm(`确定恢复备份 "${backup.name}" 吗？当前配置将会被覆盖。`)) {
      this.book = backup.data;

      // 更新表单
      this.audioPoolTextarea.value = this.book.audioPool.join('\n');
      this.audioBaseInput.value = this.book.audioBase || 'audio/';

      // 更新JSON编辑器
      this.jsonEditor.value = JSON.stringify(this.book, null, 2);

      // 更新页面列表
      this.renderPageList();
      const pageIds = Object.keys(this.book.pages);
      if (pageIds.length > 0) {
        this.selectPage(pageIds[0]);
      }

      this.showStatus(`已恢复备份: ${backup.name}`);
    }
  }

  exportBook() {
    this.downloadBook();
  }

  switchTab(tabName) {
    // 更新标签页
    this.tabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // 更新内容
    this.tabContents.forEach(content => {
      content.classList.toggle('active', content.id === `${tabName}-tab`);
    });

    // 如果是预览标签，更新预览
    if (tabName === 'preview') {
      this.renderPreview();
    }

    // 如果是 JSON 标签，更新 JSON 编辑器
    if (tabName === 'advanced') {
      this.saveToJson();
    }
  }

  showStatus(message) {
    if (this.statusMessage) {
      this.statusMessage.textContent = message;
      this.statusMessage.className = 'status-message';

      // 3秒后清除状态
      setTimeout(() => {
        if (this.statusMessage && this.statusMessage.textContent === message) {
          this.statusMessage.textContent = '就绪';
        }
      }, 3000);
    } else {
      console.log('[Status]', message);
    }
  }

  showError(message) {
    if (this.errorMessage) {
      this.errorMessage.textContent = message;
      this.errorMessage.className = 'status-error';
    }
    console.error(message);
  }

  setupAutoSave() {
    // 监听所有修改事件
    const autoSaveEvents = [
      'addPage', 'removeCurrentPage', 'updatePageSequence',
      'addButton', 'deleteButton', 'updateButtonOverride',
      'updateButtonPosition', 'updateAudioPool', 'updateAudioBase'
    ];

    // 为每个事件添加自动保存触发
    autoSaveEvents.forEach(eventName => {
      const originalMethod = this[eventName];
      if (originalMethod) {
        this[eventName] = (...args) => {
          const result = originalMethod.apply(this, args);
          this.scheduleAutoSave();
          return result;
        };
      }
    });

    // 页面关闭前提示保存
    window.addEventListener('beforeunload', (e) => {
      if (this.hasUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = '有未保存的修改，确定要离开吗？';
      }
    });

    console.log('自动保存已启用');
  }

  scheduleAutoSave() {
    // 清除之前的定时器
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }

    // 设置新的定时器（5秒后自动保存）
    this.autoSaveTimer = setTimeout(() => {
      this.performAutoSave();
    }, 5000);
  }

  async performAutoSave() {
    try {
      // 创建自动备份
      await this.createAutoBackup();

      // 如果用户已经选择了保存位置，自动保存到该文件
      if (this.lastFileHandle) {
        await this.saveBook(true); // true 表示自动保存模式
      }

      this.lastSaveTime = new Date();
    } catch (error) {
      console.warn('自动保存失败:', error);
    }
  }

  async createAutoBackup() {
    try {
      // 获取现有备份列表
      const backups = JSON.parse(localStorage.getItem('book_auto_backups') || '[]');

      // 创建新备份
      const backup = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        data: this.book,
        name: `自动备份 ${new Date().toLocaleString('zh-CN')}`
      };

      // 添加到备份列表（最多保存20个自动备份）
      backups.unshift(backup);
      if (backups.length > 20) {
        backups.pop();
      }

      // 保存到localStorage
      localStorage.setItem('book_auto_backups', JSON.stringify(backups));

      console.log('自动备份已创建:', backup.name);
    } catch (error) {
      console.warn('创建自动备份失败:', error);
    }
  }

  hasUnsavedChanges() {
    // 简单检查：如果从未保存过，或者距离上次保存超过1分钟，认为有未保存修改
    if (!this.lastSaveTime) return true;

    const now = new Date();
    const diff = now - this.lastSaveTime;
    return diff > 60000; // 1分钟
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // 忽略在输入框中的按键
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      // Ctrl/Cmd + S 保存
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        this.saveBook();
        this.showStatus('已保存 (Ctrl+S)');
      }

      // Ctrl/Cmd + L 重新加载
      if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault();
        this.loadBook();
        this.showStatus('重新加载 (Ctrl+L)');
      }

      // Ctrl/Cmd + E 导出
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        this.exportBook();
        this.showStatus('导出配置 (Ctrl+E)');
      }

      // Ctrl/Cmd + B 创建备份
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        this.createBackup();
        this.showStatus('创建备份 (Ctrl+B)');
      }

      // Ctrl/Cmd + P 打包
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        if (window.packager && window.packager.createPackage) {
          window.packager.createPackage();
          this.showStatus('打包部署包 (Ctrl+P)');
        }
      }

      // 删除键删除当前按钮
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (this.currentButtonIndex !== null) {
          e.preventDefault();
          this.deleteButton(this.currentButtonIndex);
        }
      }

      // 方向键移动选中的按钮
      if (this.currentButtonIndex !== null) {
        const step = e.shiftKey ? 0.05 : 0.01; // Shift加速

        switch (e.key) {
          case 'ArrowUp':
            e.preventDefault();
            this.moveButtonByKey(0, -step);
            break;
          case 'ArrowDown':
            e.preventDefault();
            this.moveButtonByKey(0, step);
            break;
          case 'ArrowLeft':
            e.preventDefault();
            this.moveButtonByKey(-step, 0);
            break;
          case 'ArrowRight':
            e.preventDefault();
            this.moveButtonByKey(step, 0);
            break;
        }
      }
    });
  }

  moveButtonByKey(dx, dy) {
    if (this.currentButtonIndex === null || !this.currentPageId) return;

    const page = this.book.pages[this.currentPageId];
    const button = page.buttons[this.currentButtonIndex];

    if (!button) return;

    // 计算新位置
    let newX = button.x + dx;
    let newY = button.y + dy;

    // 限制在 0-1 范围内
    newX = Math.max(0, Math.min(1, newX));
    newY = Math.max(0, Math.min(1, newY));

    // 更新位置
    button.x = newX;
    button.y = newY;

    // 更新输入框
    this.buttonXInput.value = newX;
    this.buttonYInput.value = newY;

    // 检查重叠
    this.checkButtonOverlap(button, this.currentButtonIndex);

    // 更新显示
    this.renderButtonList();
    this.renderPreview();
    this.showStatus(`按钮位置: X=${newX.toFixed(2)}, Y=${newY.toFixed(2)}`);
  }

  moveButtonUp(index) {
    if (!this.currentPageId || index <= 0) return;

    const page = this.book.pages[this.currentPageId];
    if (index >= page.buttons.length) return;

    // 交换相邻按钮的pos值
    const currentButton = page.buttons[index];
    const prevButton = page.buttons[index - 1];

    const tempPos = currentButton.pos;
    currentButton.pos = prevButton.pos;
    prevButton.pos = tempPos;

    this.renderButtonList();
    this.showStatus('按钮顺序已调整（音频对应关系已交换）');
  }

  moveButtonDown(index) {
    if (!this.currentPageId || index < 0 || index >= this.book.pages[this.currentPageId].buttons.length - 1) return;

    const page = this.book.pages[this.currentPageId];

    // 交换相邻按钮的pos值
    const currentButton = page.buttons[index];
    const nextButton = page.buttons[index + 1];

    const tempPos = currentButton.pos;
    currentButton.pos = nextButton.pos;
    nextButton.pos = tempPos;

    this.renderButtonList();
    this.showStatus('按钮顺序已调整（音频对应关系已交换）');
  }

  checkButtonOverlap(newButton, excludeIndex = -1) {
    if (!this.currentPageId) return false;

    const page = this.book.pages[this.currentPageId];
    const threshold = 0.1; // 重叠阈值，相对距离

    for (let i = 0; i < page.buttons.length; i++) {
      if (i === excludeIndex) continue;

      const button = page.buttons[i];
      const dx = Math.abs(newButton.x - button.x);
      const dy = Math.abs(newButton.y - button.y);

      if (dx < threshold && dy < threshold) {
        this.showError(`⚠️ 按钮位置与按钮 ${i + 1} 太接近（距离: ${dx.toFixed(2)}, ${dy.toFixed(2)}）`);
        return true;
      }
    }

    return false;
  }

  clearError() {
    if (this.errorMessage) {
      this.errorMessage.textContent = '';
    }
  }

  // 弹窗相关方法
  openEditModal(buttonIndex) {
    if (!this.currentPageId || buttonIndex === null) return;

    const page = this.book.pages[this.currentPageId];
    const button = page.buttons[buttonIndex];

    if (!button) return;

    this.editingButtonIndex = buttonIndex;

    // 更新弹窗标题
    this.editButtonNumber.textContent = buttonIndex + 1;

    // 填充表单数据
    this.modalOverrideAudioInput.value = button.override || '';
    this.modalButtonXInput.value = button.x;
    this.modalButtonYInput.value = button.y;
    this.modalButtonPosInput.value = button.pos || 0;

    // 显示弹窗
    this.buttonEditModal.style.display = 'flex';
  }

  closeEditModal() {
    this.buttonEditModal.style.display = 'none';
    this.editingButtonIndex = null;
  }

  saveEditModal() {
    if (this.editingButtonIndex === null || !this.currentPageId) return;

    const page = this.book.pages[this.currentPageId];
    const button = page.buttons[this.editingButtonIndex];

    if (!button) return;

    // 获取表单数据
    const overrideAudio = this.modalOverrideAudioInput.value.trim();
    const x = parseFloat(this.modalButtonXInput.value);
    const y = parseFloat(this.modalButtonYInput.value);
    const pos = parseInt(this.modalButtonPosInput.value) || 0;

    // 验证数据
    if (isNaN(x) || isNaN(y) || x < 0 || x > 1 || y < 0 || y > 1) {
      this.showError('位置值必须在 0 到 1 之间');
      return;
    }

    // 更新按钮数据
    button.override = overrideAudio || null;
    button.x = x;
    button.y = y;
    button.pos = pos;

    // 更新高级选项中的输入框（保持同步）
    if (this.currentButtonIndex === this.editingButtonIndex) {
      this.overrideAudioInput.value = overrideAudio;
      this.buttonXInput.value = x;
      this.buttonYInput.value = y;
      this.buttonPosInput.value = pos;
    }

    // 更新显示
    this.renderButtonList();
    this.renderPreview();
    this.renderImagePreviewButtons();

    // 检查重叠
    this.checkButtonOverlap(button, this.editingButtonIndex);

    // 关闭弹窗
    this.closeEditModal();

    this.showStatus(`按钮 ${this.editingButtonIndex + 1} 设置已保存`);
  }

  browseAudioFileForModal() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.mp3,.mp4,.wav,.ogg,.webm';

    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const fileName = file.name;
      this.modalOverrideAudioInput.value = fileName;
      this.showStatus(`已选择音频文件: ${fileName}`);
    });

    input.click();
  }
}

// 初始化编辑器
let editor;
document.addEventListener('DOMContentLoaded', () => {
  editor = new BookEditor();

  // 导出到全局以便按钮点击
  window.editor = editor;
});