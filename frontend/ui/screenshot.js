const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(5000); // wait for load
  await page.screenshot({ path: 'screenshot.png' });
  await browser.close();
})();
