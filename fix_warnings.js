const fs = require('fs');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Fix Alert message -> title
  content = content.replace(/<Alert([^>]*?)message=/g, '<Alert$1title=');

  // Fix Space direction -> orientation
  content = content.replace(/<Space([^>]*?)direction=/g, '<Space$1orientation=');

  // Fix Divider type -> orientation
  content = content.replace(/<Divider([^>]*?)type=/g, '<Divider$1orientation=');

  // Fix Tabs.TabPane -> items
  // Since rewriting Tabs to items is complex, let's see if we can do a simpler Regex or AST transform.
  // Actually, we can write a simple regex parser if it's well-formatted.
  
  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log('Fixed', filePath);
  }
}

['client/src/pages/FactorResearch.tsx', 'client/src/pages/StrategyLibrary.tsx'].forEach(fixFile);
