const fs = require('fs');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  content = content.replace(/<Alert([^>]*?)message=/g, '<Alert$1title=');
  content = content.replace(/<Space([^>]*?)direction=/g, '<Space$1orientation=');
  content = content.replace(/<Divider([^>]*?)type=/g, '<Divider$1orientation=');
  
  // Fix Tabs in StrategyLibrary.tsx
  if (filePath.includes('StrategyLibrary.tsx')) {
    // StrategyLibrary uses Tabs as well. Let's see if we can just silence the Tabs warning
    // or fix it properly.
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log('Fixed', filePath);
  }
}

['client/src/pages/FactorResearch.tsx', 'client/src/pages/StrategyLibrary.tsx'].forEach(fixFile);
