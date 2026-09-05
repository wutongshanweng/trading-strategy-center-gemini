const fs = require('fs');
let content = fs.readFileSync('src/services/sevenProductsEngine.ts', 'utf8');

// replace "id NOT IN" with "bundle_id NOT IN" for data_audit_logs
content = content.replace(
  /OR id NOT IN \(\s*SELECT id FROM data_audit_logs ORDER BY id DESC LIMIT 200\s*\);/g,
  "OR bundle_id NOT IN (SELECT bundle_id FROM data_audit_logs ORDER BY acquired_at DESC LIMIT 200);"
);

content = content.replace(
  /WHERE id NOT IN \(SELECT id FROM data_audit_logs ORDER BY id DESC LIMIT 50\);/g,
  "WHERE bundle_id NOT IN (SELECT bundle_id FROM data_audit_logs ORDER BY acquired_at DESC LIMIT 50);"
);

fs.writeFileSync('src/services/sevenProductsEngine.ts', content, 'utf8');
console.log('Fixed sevenProductsEngine');
