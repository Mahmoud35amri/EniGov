// Captures des rapports HTML générés (JaCoCo, Playwright)
import { chromium } from '@playwright/test';
const root = 'file:///C:/Users/ASUS/desktop/EniGov/';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1400, height: 820 } });
await p.goto(root + 'backend/target/site/jacoco/index.html');
await p.screenshot({ path: 'results/screens/rep-jacoco-index.png', fullPage: true });
await p.goto(root + 'backend/target/site/jacoco/com.unigov.service/index.html');
await p.screenshot({ path: 'results/screens/rep-jacoco-service.png', fullPage: true });
await p.goto(root + 'backend/target/site/jacoco/com.unigov.service/ComplaintService.java.html');
await p.locator('text=boolean autorise').first().scrollIntoViewIfNeeded();
await p.evaluate(() => window.scrollBy(0, -220));
await p.screenshot({ path: 'results/screens/rep-jacoco-source.png' });
await p.goto(root + 'qa/results/playwright-report/index.html');
await p.waitForTimeout(1500);
await p.screenshot({ path: 'results/screens/rep-playwright.png', fullPage: true });
await b.close();
