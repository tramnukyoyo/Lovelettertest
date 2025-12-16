import { chromium } from 'playwright';

const viewports = [
  { width: 375, height: 667, label: 'iPhone SE' },
  { width: 1280, height: 720, label: 'Laptop MDPI' },
  { width: 1920, height: 1080, label: 'Desktop FHD' },
  { width: 2560, height: 1440, label: 'QHD' }
];

const urlHome = 'https://gamebuddies.io/schooled';
const urlGM = 'https://gamebuddies.io/schooled/gamemaster';

function serializeRect(rect) {
  if (!rect) return null;
  const { x, y, width, height, top, bottom, left, right } = rect;
  return { x, y, width, height, top, bottom, left, right };
}

async function analyze(url, page) {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  return await page.evaluate(() => {
    const summary = {
      cards: document.querySelectorAll('.card').length,
      headings: Array.from(document.querySelectorAll('h1, h2, h3, h4')).map(h => h.textContent?.trim()).filter(Boolean).slice(0, 6),
    };

    const quickPlayCard = Array.from(document.querySelectorAll('.card')).find(card => card.textContent?.includes('Quick Play'));
    const settingsCard = Array.from(document.querySelectorAll('.card')).find(card => card.textContent?.includes('Game Settings'));

    const getRect = el => {
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right };
    };

    const actionButtons = Array.from(document.querySelectorAll('button'))
      .filter((btn) => btn.textContent && btn.textContent.match(/quick play|start game|reset/i))
      .map(btn => ({ text: btn.textContent.trim(), rect: getRect(btn) }));

    return {
      summary,
      quickPlayCard: getRect(quickPlayCard || undefined),
      settingsCard: getRect(settingsCard || undefined),
      roomCodeRect: getRect(document.querySelector('.room-code-display')),
      actionButtons,
      body: { width: document.body.clientWidth, height: document.body.scrollHeight },
      viewport: { width: window.innerWidth, height: window.innerHeight }
    };
  });
}

const run = async () => {
  const browser = await chromium.launch();

  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();

    const home = await analyze(urlHome, page);
    const gm = await analyze(urlGM, page);

    console.log(JSON.stringify({ viewport, home, gm }, null, 2));

    await context.close();
  }

  await browser.close();
};

run();
