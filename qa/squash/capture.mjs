// Captures d'écran de Squash TM pour le compte rendu
import { chromium } from '@playwright/test';
const OUT = 'results/screens/';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1600, height: 1250 }, locale: 'fr-FR' });
await p.goto('http://localhost:8090/squash/login');
await p.fill('input[type=text]', 'admin'); await p.fill('input[type=password]', 'admin');
await p.click('#submit-login-form'); await p.waitForURL(/home-workspace/);

async function expandAll() {
  for (let i = 0; i < 20; i++) {
    const t = p.locator('[data-test-row-toggle] .anticon-plus').first();
    if (!(await t.count())) break;
    await t.click(); await p.waitForTimeout(500);
  }
}
async function node(text) { await p.locator('.force-ltr-for-node-name', { hasText: text }).first().click(); await p.waitForTimeout(2500); }
async function ancre(n) { await p.locator('sqtm-core-capsule-link, a, div, span').filter({ hasText: new RegExp(`^${n}$`) }).last().click(); await p.waitForTimeout(2500); }
async function tabs() { return (await p.$$eval('[role=tab], .ant-tabs-tab, sqtm-core-anchor-link, a[class*=anchor], [class*=menu-item]', els => els.map(e => e.innerText.trim()).filter(Boolean))).join(' | '); }
async function shot(n) { await p.mouse.move(1590, 1240); await p.waitForTimeout(800); await p.screenshot({ path: OUT + n + '.png' }); }

const step = process.argv[2] || 'explore';
await p.goto('http://localhost:8090/squash/requirement-workspace'); await p.waitForTimeout(2500); await expandAll();
await node('EniGov'); await shot('sq-00-projet-exigences');
await node('EF-06'); await shot('sq-01-exigence');
await p.goto('http://localhost:8090/squash/test-case-workspace'); await p.waitForTimeout(2500); await expandAll();
await node('EniGov'); await shot('sq-05-projet-cas-de-test');
await node('TA-02'); await shot('sq-02-cas-de-test');
await ancre('3'); await shot('sq-02b-cas-de-test-etapes');
await p.goto('http://localhost:8090/squash/campaign-workspace'); await p.waitForTimeout(2500); await expandAll();
await node('Itération 2'); await shot('sq-03-iteration2');
await ancre('23'); await shot('sq-03b-iteration2-plan');
await node('Itération 1'); await ancre('13'); await shot('sq-03c-iteration1-plan');
await node('Campagne de recette'); await shot('sq-04-campagne');
await b.close();
