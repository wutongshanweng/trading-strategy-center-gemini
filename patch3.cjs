const fs = require('fs');
let code = fs.readFileSync('src/services/dataEngine.ts', 'utf8');

const targetStr = `    // Compute trading decision & quantitative analysis
    const decision = TradingDecisionEngine.analyze(upperSymbol, period, finalBars);`;

const replaceStr = `    // ---- Inject Real-time Quote from Sina API (Dynamic, not saved) ----
    if (!endDate && finalBars.length > 0) {
      try {
        const { realtimeQuoteService } = require('./realtimeQuoteService.js');
        const quote = await realtimeQuoteService.getRealtimeQuote(upperSymbol);
        if (quote && quote.lastPrice > 0) {
          const lastBar = finalBars[finalBars.length - 1];
          lastBar.close = quote.lastPrice;
          lastBar.high = Math.max(lastBar.high, quote.lastPrice);
          lastBar.low = Math.min(lastBar.low, quote.lastPrice);
          if (quote.volume > 0) {
            lastBar.volume = quote.volume;
          }
          if (quote.openInterest > 0) {
            lastBar.open_interest = quote.openInterest;
          }
        }
      } catch (e) {
        console.warn('[DataEngine] Failed to inject real-time quote for', upperSymbol, e.message);
      }
    }
    // -------------------------------------------------------------------

    // Compute trading decision & quantitative analysis
    const decision = TradingDecisionEngine.analyze(upperSymbol, period, finalBars);`;

if (!code.includes(targetStr)) {
  console.log("String not found");
  process.exit(1);
}
code = code.replace(targetStr, replaceStr);
fs.writeFileSync('src/services/dataEngine.ts', code);
console.log("Patched 3");
