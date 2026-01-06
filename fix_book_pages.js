const fs = require('fs');
const path = require('path');

const bookPath = path.join(__dirname, 'ui/book.json');
const book = JSON.parse(fs.readFileSync(bookPath, 'utf8'));

// New pages to add
const newPages = {
    "page1": {
        "image": "images/1-1.webp",
        "sequence": [],
        "buttons": [],
        "imageSettings": { "orientation": "portrait" }
    },
    "page2": {
        "image": "images/1-2.webp",
        "sequence": [],
        "buttons": [],
        "imageSettings": { "orientation": "portrait" }
    },
    "page3": {
        "image": "images/1-3.webp",
        "sequence": [],
        "buttons": [],
        "imageSettings": { "orientation": "portrait" }
    },
    "page4": {
        "image": "images/1-4.webp",
        "sequence": [],
        "buttons": [],
        "imageSettings": { "orientation": "portrait" }
    }
};

// Rebuild pages object to ensure order
const orderedPages = {};

// 1. Add new pages first
Object.assign(orderedPages, newPages);

// 2. Add existing pages (preserving numeric sort order of keys might be good, but alphanumeric page5 comes after page4 so it's fine)
// However, Object.keys might not be sorted. Let's sort them to be safe.
// Existing keys are like "page5", "page10"...
const existingKeys = Object.keys(book.pages).sort((a, b) => {
    const numA = parseInt(a.replace('page', ''));
    const numB = parseInt(b.replace('page', ''));
    return numA - numB;
});

for (const key of existingKeys) {
    orderedPages[key] = book.pages[key];
}

book.pages = orderedPages;

fs.writeFileSync(bookPath, JSON.stringify(book, null, 2));
console.log('Updated book.json with pages 1-4 and reordered content.');
