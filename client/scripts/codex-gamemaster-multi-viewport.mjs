import { chromium, devices } from 'playwright';

const OUTPUT_DIR = 'E:/GamebuddiesPlatform/.playwright-mcp';

const viewports = [
  { name: 'iphone-se', viewport: { width: 375, height: 667 } },
  { name: 'ipad-mini', viewport: { width: 768, height: 1024 } },
  { name: 'laptop', viewport: { width: 1366, height: 768 } },
  { name: 'desktop', viewport: { width: 1920, height: 1080 } },
  { name: '4k', viewport: { width: 3840, height: 2160 } }
];

async function createRoom(page) {
  await page.goto('https://gamebuddies.io/schooled', { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Be a Gamemaster', { timeout: 15000 });
  await page.click('text=Be a Gamemaster');
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('input[placeholder="Enter your name"]', { timeout: 20000 });
  await page.fill('input[placeholder="Enter your name"]', 'CodexGM');
  await page.click('button:has-text("Create Room")');
  await page.waitForSelector('.game-settings--responsive', { timeout: 30000 });
  await page.waitForTimeout(1500);
}

(async () => {
  for (const { name, viewport } of viewports) {
    const browser = await chromium.launch();
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    await createRoom(page);
    const path = `${OUTPUT_DIR}/codex-gamemaster-${name}.png`;
    await page.screenshot({ path, fullPage: true });
    console.log(`Saved ${path}`);
    await browser.close();
  }
})();
