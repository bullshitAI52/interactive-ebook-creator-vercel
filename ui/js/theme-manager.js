/**
 * 主题管理器
 * 用于管理明暗主题切换
 */
class ThemeManager {
    constructor() {
        this.currentTheme = this.loadTheme();
        this.applyTheme(this.currentTheme);
    }

    /**
     * 从 localStorage 加载主题设置
     * @returns {string} 主题名称 ('light' 或 'dark')
     */
    loadTheme() {
        const savedTheme = localStorage.getItem('ebook-theme');
        if (savedTheme) {
            return savedTheme;
        }

        // 检测系统主题偏好
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }

        return 'light';
    }

    /**
     * 保存主题设置到 localStorage
     * @param {string} theme - 主题名称
     */
    saveTheme(theme) {
        localStorage.setItem('ebook-theme', theme);
    }

    /**
     * 应用主题
     * @param {string} theme - 主题名称 ('light' 或 'dark')
     */
    applyTheme(theme) {
        const body = document.body;

        if (theme === 'dark') {
            body.classList.add('dark-theme');
        } else {
            body.classList.remove('dark-theme');
        }

        this.currentTheme = theme;
        this.saveTheme(theme);

        // 触发自定义事件
        window.dispatchEvent(new CustomEvent('themeChanged', {
            detail: { theme: theme }
        }));

        console.log(`[ThemeManager] Theme applied: ${theme}`);
    }

    /**
     * 切换主题
     */
    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
        return newTheme;
    }

    /**
     * 获取当前主题
     * @returns {string} 当前主题名称
     */
    getCurrentTheme() {
        return this.currentTheme;
    }

    /**
     * 监听系统主题变化
     */
    watchSystemTheme() {
        if (window.matchMedia) {
            const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');

            darkModeQuery.addEventListener('change', (e) => {
                // 只在用户没有手动设置主题时自动切换
                if (!localStorage.getItem('ebook-theme-manual')) {
                    const newTheme = e.matches ? 'dark' : 'light';
                    this.applyTheme(newTheme);
                }
            });
        }
    }

    /**
     * 标记为手动设置主题
     */
    markManualTheme() {
        localStorage.setItem('ebook-theme-manual', 'true');
    }
}

// 导出供全局使用
window.ThemeManager = ThemeManager;
