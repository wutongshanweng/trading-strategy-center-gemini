import { SevenProductsDataEngine } from './src/services/sevenProductsEngine.js';

async function test() {
  try {
    const engine不易 = new SevenProductsDataEngine();
    console.log('Running auto-sync cycle with 2701 dominant contracts...');
    const res = await engine不易.runAutoSyncCycle(true);
    console.log('Sync Result:', res);
  } catch(e: any) {
    console.error('Error:', e.message);
  }
  process.exit(0);
}
test();
