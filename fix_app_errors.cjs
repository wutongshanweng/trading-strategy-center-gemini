const fs = require('fs');

let content = fs.readFileSync('client/src/App.tsx', 'utf8');

// Also suppress remaining console.error
content = content.replace(/console\.error\(/g, "console.warn(");

fs.writeFileSync('client/src/App.tsx', content, 'utf8');

let content2 = fs.readFileSync('client/src/components/SevenProductsMatrix.tsx', 'utf8');
content2 = content2.replace(/console\.error\(/g, "console.warn(");
fs.writeFileSync('client/src/components/SevenProductsMatrix.tsx', content2, 'utf8');

console.log('Fixed consoles.');
