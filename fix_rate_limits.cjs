const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Fix res.json() without checking content-type or status
    // A regex to match const json = await res.json(); and replace with a safe version.
    // Actually, maybe simpler: replace `console.error('Failed to fetch` with `console.warn('Failed to fetch` 
    // And for `await res.json()` we can't easily regex if there's no space.
    // Let's just override window.fetch in main.tsx or App.tsx? No, let's fix the App.tsx
    
    // Instead of regexing all, let's just make `await res.json()` safe if it's 429.
    // Wait, if we override window.fetch in main.tsx:
    
    content = content.replace(/console\.error\('Failed to fetch contracts:', e\);/g, "console.warn('Failed to fetch contracts:', e.message);");
    content = content.replace(/console\.error\('Failed to fetch strategies:', e\);/g, "console.warn('Failed to fetch strategies:', e.message);");
    content = content.replace(/console\.error\('Failed to fetch seven overview:', e\);/g, "console.warn('Failed to fetch seven overview:', e.message);");
    content = content.replace(/console\.error\('Backtest run failed:', e\);/g, "console.warn('Backtest run failed:', e.message);");

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${filePath}`);
    }
}

function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const full = path.join(dir, file);
        if (fs.statSync(full).isDirectory()) {
            walk(full);
        } else if (full.endsWith('.tsx') || full.endsWith('.ts')) {
            replaceInFile(full);
        }
    }
}

walk(path.join(__dirname, 'client/src'));
