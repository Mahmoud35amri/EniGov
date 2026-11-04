// Rend chaque sortie console (terminals.json) en capture d'écran style terminal
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const blocs = JSON.parse(readFileSync('report/terminals.json', 'utf8'));
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const colorer = (l) => {
  const e = esc(l);
  if (/^\$ /.test(l)) return `<span class="cmd">${e}</span>`;
  if (/ERREUR|FAILURE|BUILD FAILURE|✗|^\s*x |Error|failed|Severity: high|RESULTAT : ECHEC|^-\s|  error  /.test(l)) return `<span class="ko">${e}</span>`;
  if (/BUILD SUCCESS|✓|^\s*ok |passed|Skipped: 0$|^\+\s|Failures: 0, Errors: 0/.test(l)) return `<span class="ok">${e}</span>`;
  if (/warning|Skipped: 1|moderate|^@@/.test(l)) return `<span class="warn">${e}</span>`;
  return e;
};

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1180, height: 2400 }, deviceScaleFactor: 2 });
for (const { nom, titre, texte } of blocs) {
  await p.setContent(`<!doctype html><meta charset="utf-8"><style>
    body{margin:0;background:#fff;font-family:'Cascadia Mono',Consolas,monospace}
    .win{margin:10px;border-radius:10px;overflow:hidden;box-shadow:0 4px 18px #0003;background:#0c1220;display:inline-block;min-width:1140px}
    .bar{background:#1e2738;color:#cbd5e1;font:13px 'Segoe UI',sans-serif;padding:8px 12px;display:flex;gap:8px;align-items:center}
    .dot{width:11px;height:11px;border-radius:50%} pre{margin:0;padding:14px 16px;color:#e2e8f0;font-size:12.5px;line-height:1.45;white-space:pre-wrap;word-break:break-all;max-width:1110px}
    .cmd{color:#7dd3fc;font-weight:bold}.ok{color:#4ade80}.ko{color:#f87171}.warn{color:#fbbf24}
  </style><div class="win"><div class="bar"><span class="dot" style="background:#ef4444"></span><span class="dot" style="background:#f59e0b"></span><span class="dot" style="background:#22c55e"></span>&nbsp; ${esc(titre)}</div><pre>${texte.split('\n').map(colorer).join('\n')}</pre></div>`);
  await p.locator('.win').screenshot({ path: `results/screens/${nom}.png` });
}
await b.close();
console.log(`${blocs.length} captures terminal générées`);
