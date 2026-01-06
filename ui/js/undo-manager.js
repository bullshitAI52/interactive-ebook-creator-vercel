/**
 * 撤销/重做管理器
 * 用于管理电子书配置的历史记录
 */
class UndoManager {
    constructor(maxHistory = 20) {
        this.maxHistory = maxHistory;
        this.history = [];
        this.currentIndex = -1;
        this.isUndoing = false;
    }

    /**
     * 保存当前状态
     * @param {Object} state - 要保存的状态对象
     * @param {string} description - 操作描述
     */
    saveState(state, description = '') {
        // 如果正在执行撤销/重做操作，不保存状态
        if (this.isUndoing) {
            return;
        }

        // 深拷贝状态以避免引用问题
        const stateCopy = JSON.parse(JSON.stringify(state));

        // 如果当前不在历史记录的末尾，删除当前位置之后的所有记录
        if (this.currentIndex < this.history.length - 1) {
            this.history.splice(this.currentIndex + 1);
        }

        // 添加新状态
        this.history.push({
            state: stateCopy,
            description: description,
            timestamp: Date.now()
        });

        // 限制历史记录数量
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        } else {
            this.currentIndex++;
        }

        console.log(`[UndoManager] Saved state: ${description} (${this.currentIndex + 1}/${this.history.length})`);
    }

    /**
     * 撤销到上一个状态
     * @returns {Object|null} 上一个状态，如果没有则返回 null
     */
    undo() {
        if (!this.canUndo()) {
            console.warn('[UndoManager] Cannot undo: no previous state');
            return null;
        }

        this.isUndoing = true;
        this.currentIndex--;
        const previousState = this.history[this.currentIndex];
        
        console.log(`[UndoManager] Undo to: ${previousState.description} (${this.currentIndex + 1}/${this.history.length})`);
        
        this.isUndoing = false;
        return JSON.parse(JSON.stringify(previousState.state));
    }

    /**
     * 重做到下一个状态
     * @returns {Object|null} 下一个状态，如果没有则返回 null
     */
    redo() {
        if (!this.canRedo()) {
            console.warn('[UndoManager] Cannot redo: no next state');
            return null;
        }

        this.isUndoing = true;
        this.currentIndex++;
        const nextState = this.history[this.currentIndex];
        
        console.log(`[UndoManager] Redo to: ${nextState.description} (${this.currentIndex + 1}/${this.history.length})`);
        
        this.isUndoing = false;
        return JSON.parse(JSON.stringify(nextState.state));
    }

    /**
     * 检查是否可以撤销
     * @returns {boolean}
     */
    canUndo() {
        return this.currentIndex > 0;
    }

    /**
     * 检查是否可以重做
     * @returns {boolean}
     */
    canRedo() {
        return this.currentIndex < this.history.length - 1;
    }

    /**
     * 获取历史记录列表
     * @returns {Array} 历史记录列表
     */
    getHistory() {
        return this.history.map((item, index) => ({
            description: item.description,
            timestamp: item.timestamp,
            isCurrent: index === this.currentIndex
        }));
    }

    /**
     * 清空历史记录
     */
    clear() {
        this.history = [];
        this.currentIndex = -1;
        console.log('[UndoManager] History cleared');
    }

    /**
     * 获取当前状态的描述
     * @returns {string}
     */
    getCurrentDescription() {
        if (this.currentIndex >= 0 && this.currentIndex < this.history.length) {
            return this.history[this.currentIndex].description;
        }
        return '';
    }

    /**
     * 跳转到指定的历史记录
     * @param {number} index - 历史记录索引
     * @returns {Object|null} 指定的状态，如果索引无效则返回 null
     */
    goToState(index) {
        if (index < 0 || index >= this.history.length) {
            console.warn('[UndoManager] Invalid state index:', index);
            return null;
        }

        this.isUndoing = true;
        this.currentIndex = index;
        const state = this.history[index];
        
        console.log(`[UndoManager] Jump to: ${state.description} (${index + 1}/${this.history.length})`);
        
        this.isUndoing = false;
        return JSON.parse(JSON.stringify(state.state));
    }

    /**
     * 获取统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        return {
            totalStates: this.history.length,
            currentIndex: this.currentIndex,
            canUndo: this.canUndo(),
            canRedo: this.canRedo(),
            maxHistory: this.maxHistory
        };
    }
}

// 导出供全局使用
window.UndoManager = UndoManager;
