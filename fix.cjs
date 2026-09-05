const fs = require('fs');
let code = fs.readFileSync('src/api/routes/data.ts', 'utf8');
code = code.replace(/console\.log\("BASE BARS LENGTH:", \(await dataEngine\.getKlinesWithResampling\(symbol, period, limit, endDate\)\)\.data\.length\); /g, '');
fs.writeFileSync('src/api/routes/data.ts', code);
console.log('Fixed');
