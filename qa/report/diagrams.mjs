// Schémas SVG du compte rendu (environnement de test, cycle en V)

const box = (x, y, w, h, titre, sous = '', fill = '#eef2ff', stroke = '#4f46e5') => `
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${fill}" stroke="${stroke}" stroke-width="1.4"/>
  <text x="${x + w / 2}" y="${y + (sous ? h / 2 - 3 : h / 2 + 4)}" text-anchor="middle" font-size="12.5" font-weight="600" fill="#1e293b">${titre}</text>
  ${sous ? `<text x="${x + w / 2}" y="${y + h / 2 + 13}" text-anchor="middle" font-size="10.5" fill="#475569">${sous}</text>` : ''}`;
const fleche = (x1, y1, x2, y2, label = '', dash = false) => `
  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#64748b" stroke-width="1.4" marker-end="url(#fl)" ${dash ? 'stroke-dasharray="5 4"' : ''}/>
  ${label ? `<text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 - 5}" text-anchor="middle" font-size="10" fill="#475569">${label}</text>` : ''}`;
const defs = `<defs><marker id="fl" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#64748b"/></marker></defs>`;

export const environnement = `
<svg viewBox="0 0 780 335" width="100%" font-family="Segoe UI, Arial, sans-serif" role="img" aria-label="Environnement de test">
  ${defs}
  <text x="95" y="18" text-anchor="middle" font-size="11" font-weight="700" fill="#6366f1">OUTILS DE TEST</text>
  <text x="390" y="18" text-anchor="middle" font-size="11" font-weight="700" fill="#6366f1">SYSTÈME SOUS TEST</text>
  <rect x="545" y="26" width="225" height="295" rx="10" fill="#f0f9ff" stroke="#0284c7" stroke-dasharray="6 4"/>
  <text x="657" y="44" text-anchor="middle" font-size="11" font-weight="700" fill="#0284c7">DOCKER DESKTOP</text>
  ${box(10, 32, 170, 46, 'Playwright 1.x', 'E2E + acceptance (Chromium)', '#fef3c7', '#d97706')}
  ${box(10, 100, 170, 46, 'JUnit 5 · Mockito · MockMvc', 'unitaires + intégration', '#fef3c7', '#d97706')}
  ${box(10, 168, 170, 46, 'PMD · CPD · ESLint', 'npm audit · JaCoCo', '#fef3c7', '#d97706')}
  ${box(10, 236, 170, 46, 'seed.mjs (Node)', 'alimente Squash TM', '#fef3c7', '#d97706')}
  ${box(300, 40, 180, 50, 'Frontend React 18 / Vite', 'http://localhost:5173')}
  ${box(300, 150, 180, 50, 'Backend Spring Boot 3.2', 'http://localhost:8081/api')}
  ${box(560, 56, 195, 50, 'Squash TM 15.0.3', 'http://localhost:8090/squash', '#dcfce7', '#16a34a')}
  ${box(560, 150, 195, 62, 'PostgreSQL 16', 'bases : enigov · enigov_test · squashtm', '#e0f2fe', '#0284c7')}
  ${box(560, 240, 195, 46, 'k6 (grafana/k6)', 'test de charge 20 VU', '#fef3c7', '#d97706')}
  ${fleche(180, 55, 298, 62, 'pilote le navigateur')}
  ${fleche(390, 90, 390, 148, 'REST + JWT')}
  ${fleche(180, 123, 298, 170, 'contexte Spring')}
  ${fleche(480, 178, 558, 180, 'JPA')}
  ${fleche(657, 106, 657, 148, 'JDBC')}
  <path d="M180 259 H250 V312 H528 V81 H556" fill="none" stroke="#64748b" stroke-width="1.4" stroke-dasharray="5 4" marker-end="url(#fl)"/>
  <text x="390" y="306" text-anchor="middle" font-size="10" fill="#475569">API REST (alimentation du référentiel)</text>
  ${fleche(558, 262, 482, 192, 'HTTP')}
  ${fleche(180, 191, 298, 196, 'analyse le code', true)}
</svg>`;

export const cycleEnV = `
<svg viewBox="0 0 780 300" width="100%" font-family="Segoe UI, Arial, sans-serif" role="img" aria-label="Cycle en V">
  ${defs}
  ${box(20, 20, 200, 44, 'Besoins (EF / ENF)', 'chapitre 2', '#eef2ff')}
  ${box(80, 90, 200, 44, 'Spécifications', 'cas d’utilisation, règles', '#eef2ff')}
  ${box(140, 160, 200, 44, 'Conception', 'API REST, modèle JPA', '#eef2ff')}
  ${box(290, 236, 200, 44, 'Codage', 'Spring Boot · React', '#f1f5f9', '#64748b')}
  ${box(560, 20, 200, 44, 'Tests d’acceptation', 'TA-01 … TA-06', '#dcfce7', '#16a34a')}
  ${box(500, 90, 200, 44, 'Tests système', 'TS-01 … TS-07, TNF', '#dcfce7', '#16a34a')}
  ${box(440, 160, 200, 44, 'Tests d’intégration', 'TI-01 … TI-09', '#dcfce7', '#16a34a')}
  ${fleche(120, 64, 160, 88)}${fleche(180, 134, 220, 158)}${fleche(240, 204, 300, 234)}
  ${fleche(480, 234, 530, 206)}${fleche(560, 158, 590, 136)}${fleche(620, 88, 650, 66)}
  <text x="600" y="262" font-size="12" font-weight="600" fill="#16a34a">Tests unitaires TU-01 … TU-04</text>
  <line x1="490" y1="258" x2="596" y2="258" stroke="#16a34a" stroke-width="1.2" stroke-dasharray="4 3"/>
  ${[42, 112, 182].map((y, i) => `<line x1="${[220, 280, 340][i]}" y1="${y}" x2="${[558, 498, 438][i]}" y2="${y}" stroke="#94a3b8" stroke-dasharray="4 4"/>`).join('')}
  <text x="390" y="37" text-anchor="middle" font-size="10" fill="#64748b">valide</text>
  <text x="390" y="107" text-anchor="middle" font-size="10" fill="#64748b">vérifie</text>
  <text x="390" y="177" text-anchor="middle" font-size="10" fill="#64748b">vérifie</text>
</svg>`;
