const fs = require('fs');
const path = require('path');

const bookPath = path.join(__dirname, 'ui/book.json');
const imagesDir = path.join(__dirname, 'ui/images');
const audioDir = path.join(__dirname, 'ui/audio'); // Check audio too if needed

const book = JSON.parse(fs.readFileSync(bookPath, 'utf8'));
const pages = book.pages;

// Map to track renames to avoid duplicates
let imgCounter = 1;

// Helper to sanitize
function sanitize(name) {
    // Only alphanumeric and dot
    // But better to just rename to seq
    const ext = path.extname(name);
    return `img_${String(imgCounter++).padStart(3, '0')}${ext}`;
}

const fileMap = {}; // old -> new relative path

// Process Images
console.log("Renaming images...");
if (fs.existsSync(imagesDir)) {
    const files = fs.readdirSync(imagesDir);
    // Sort logic to keep order if possible? 
    // Actually we iterate book.json pages to determine rename map

    for (const pageId in pages) {
        const page = pages[pageId];
        if (page.image && page.image.includes('四年')) { // Target messy names
            // "images/四年2.webp"
            const oldPath = page.image;
            const oldFilename = path.basename(oldPath);
            const oldAbsPath = path.join(imagesDir, oldFilename);

            if (fs.existsSync(oldAbsPath)) {
                if (!fileMap[oldPath]) {
                    const newFilename = sanitize(oldFilename);
                    const newPath = `images/${newFilename}`;
                    const newAbsPath = path.join(imagesDir, newFilename);

                    fs.renameSync(oldAbsPath, newAbsPath);
                    fileMap[oldPath] = newPath;
                    console.log(`Renamed: ${oldFilename} -> ${newFilename}`);
                }
                page.image = fileMap[oldPath];
            } else {
                console.log(`Missing image: ${oldAbsPath}`);
            }
        }
    }
}

// Write book.json
fs.writeFileSync(bookPath, JSON.stringify(book, null, 2));
console.log("Updated book.json");
