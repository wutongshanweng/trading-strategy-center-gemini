import { dataEngine } from './src/services/dataEngine.js';

async function run() {
  const result = await dataEngine.getKlinesWithResampling('RB2610', '1d', 100);
  console.log('Returned bars length:', result.data.length);
  process.exit(0);
}
run();
