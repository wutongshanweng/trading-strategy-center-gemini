const fs = require('fs');
let code = fs.readFileSync('src/services/sevenProductsEngine.ts', 'utf8');

const targetStr = `      // Compute correct anchor time for each contract based on expiry
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

      for (let i = barCount - 1; i >= 0; i--) {`;

const replaceStr = `      // Compute correct anchor time for each contract based on expiry
      let contractAnchorMs = now.getTime();
      let contractBarCount = barCount;
      const contractMatch = contract.match(/^([A-Z]+)(\\d{4})$/);
      if (contractMatch) {
        const yy = parseInt(contractMatch[2].slice(0, 2), 10);
        const mm = parseInt(contractMatch[2].slice(2, 4), 10);
        const cYear = 2000 + yy;
        
        let cDate = new Date(Date.UTC(cYear, mm - 1, 15, 7, 0, 0)); // 15:00 BJT = 07:00 UTC
        if (cDate.getTime() < now.getTime()) {
           contractAnchorMs = cDate.getTime();
           // Expired contracts should always get the full historical bar count
           if (frequency === 'D1') contractBarCount = 242;
           else if (frequency === 'H1') contractBarCount = 480;
           else if (frequency === 'M30') contractBarCount = 480;
           else if (frequency === 'H4') contractBarCount = 120;
           else if (frequency === 'W1') contractBarCount = 52;
        }
      }

      for (let i = contractBarCount - 1; i >= 0; i--) {`;

if (!code.includes(targetStr)) {
  console.log("String not found");
  process.exit(1);
}
code = code.replace(targetStr, replaceStr);
fs.writeFileSync('src/services/sevenProductsEngine.ts', code);
console.log("Patched 2");
