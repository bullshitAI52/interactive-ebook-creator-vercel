
// Tauri Integration Adapter
class TauriAdapter {
    constructor(editor) {
        this.editor = editor;
        this.isTauri = !!window.__TAURI__;

        if (this.isTauri) {
            console.log('Tauri environment detected. Initializing native features...');
            this.init();
        }
    }

    init() {
        // Override saveBook
        this.editor.saveBook = async () => {
            this.editor.saveToJson(); // Update book object
            try {
                const { writeTextFile, BaseDirectory } = window.__TAURI__.fs;
                const content = JSON.stringify(this.editor.book, null, 2);

                // Write to Resource directory (where the app is running / bundled)
                // Note: In development, this writes to src-tauri/target/... or similar.
                // ideally we pick a document dir, but for "Edit in place" feeling:

                await writeTextFile('book.json', content, { baseDir: BaseDirectory.Resource });

                this.editor.showStatus('已保存到本地硬盘 (Tauri)');
            } catch (e) {
                console.error('Tauri save failed:', e);
                this.editor.showError('保存失败: ' + e.message);
                // Fallback
                this.downloadSave();
            }
        };

        // Add a visual indicator
        const nav = document.querySelector('.nav-brand');
        if (nav) nav.innerHTML += ' <span style="font-size:0.6em; background:#e91e63; padding:2px 5px; border-radius:4px; color:white;">Desktop</span>';
    }

    downloadSave() {
        const blob = new Blob([JSON.stringify(this.editor.book, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'book.json';
        a.click();
    }
}

// Initialize Adapter
document.addEventListener('DOMContentLoaded', () => {
    // Wait for editor to be ready
    setTimeout(() => {
        if (window.editor) {
            window.tauriAdapter = new TauriAdapter(window.editor);
        }
    }, 500);
});
