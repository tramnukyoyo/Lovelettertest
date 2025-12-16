import { chromium } from 'playwright';

const OUTPUT_DIR = process.env.PLAYWRIGHT_OUTPUT || 'E:/GamebuddiesPlatform/.playwright-mcp';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  await page.goto('https://gamebuddies.io/schooled', { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Be a Gamemaster', { timeout: 15000 });
  await page.click('text=Be a Gamemaster');

  await page.waitForLoadState('networkidle');
  await page.waitForSelector('input[placeholder="Enter your name"]', { timeout: 20000 });
  await page.fill('input[placeholder="Enter your name"]', 'CodexGM');

  await page.waitForSelector('button:has-text("Create Room")', { timeout: 30000 });
  await page.click('button:has-text("Create Room")');

  // Wait for settings screen to fully load
  await page.waitForSelector('.game-settings--responsive', { timeout: 30000 });
  await delay(3000);

  const screenshotPath = `${OUTPUT_DIR.replace(/\\/g, '/')}/codex-gamemaster-session.png`;
  await page.screenshot({ path: screenshotPath, fullPage: true });

  await browser.close();
  console.log(`Saved screenshot to ${screenshotPath}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
