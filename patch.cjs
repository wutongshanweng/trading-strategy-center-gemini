const fs = require('fs');
let code = fs.readFileSync('src/services/sevenProductsEngine.ts', 'utf8');

const targetStr = `    // 使用目标年份的年底或当前时间倒推，生成精准的历史年份对应 K 线 (当前与跨年主力合约不超过当前时间)
    const now = new Date();
    const currentYear = now.getFullYear();
    const anchorTime = year < currentYear ? new Date(\`\${year}-12-31T15:00:00Z\`) : now;
    const sourceBundleId = \`bundle-\${meta.product}-\${year}-\${frequency}-\${Date.now()}\`;

    for (const contract of contracts) {
      let curPrice = meta.basePrice;
      const barsToInsert: any[] = [];

      for (let i = barCount - 1; i >= 0; i--) {
        const barStartTime = new Date(anchorTime.getTime() - i * stepMs);`;

const replaceStr = `    // 使用目标年份的年底或当前时间倒推，生成精准的历史年份对应 K 线 (当前与跨年主力合约不超过当前时间)
    const now = new Date();
    const sourceBundleId = \`bundle-\${meta.product}-\${year}-\${frequency}-\${Date.now()}\`;

    for (const contract of contracts) {
      let curPrice = meta.basePrice;
      const barsToInsert: any[] = [];
      
      // Compute correct anchor time for each contract based on expiry
      let contractAnchorMs = now.getTime();
      const contractMatch = contract.match(/^([A-Z]+)(\\d{4})$/);
      if (contractMatch) {
        const yy = parseInt(contractMatch[2].slice(0, 2), 10);
        const mm = parseInt(contractMatch[2].slice(2, 4), 10);
        const cYear = 2000 + yy;
        
        let cDate = new Date(Date.UTC(cYear, mm - 1, 15, 7, 0, 0)); // 15:00 BJT = 07:00 UTC
        if (cDate.getTime() < now.getTime()) {
           contractAnchorMs = cDate.getTime();
        }
      }

      for (let i = barCount - 1; i >= 0; i--) {
        const barStartTime = new Date(contractAnchorMs - i * stepMs);`;

if (!code.includes(targetStr)) {
  console.log("String not found");
  process.exit(1);
}
code = code.replace(targetStr, replaceStr);
fs.writeFileSync('src/services/sevenProductsEngine.ts', code);
console.log("Patched");
