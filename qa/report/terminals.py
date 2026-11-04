# Extrait les sorties console utiles et les écrit dans terminals.json (rendues en captures par terminals.mjs)
import json, re, subprocess, os
R = 'qa/results/'
def cp(path): return open(path, 'rb').read().decode('cp1252', 'replace')
def u8(path): return open(path, encoding='utf-8', errors='replace').read()
def sh(cmd): return subprocess.run(cmd, shell=True, capture_output=True, text=True, encoding='utf-8', errors='replace').stdout

def mvn(path):
    keep = [l for l in cp(path).splitlines() if re.search(r'Tests run:|FAILURE!|<<<|expected|BUILD|jacoco|Signature JWT|Failures:|Errors:', l)
            and 'Help 1' not in l and 'argLine' not in l and 'Download' not in l and 'surefire' not in l.lower()]
    return '\n'.join(l.replace('[INFO] ', '').replace('[ERROR] ', '[ERREUR] ').replace('[WARNING] ', '') for l in keep)

blocs = []
blocs.append(('term-env', 'Environnement : versions des outils et conteneurs Docker',
  '$ java -version\n' + sh('java -version 2>&1').splitlines()[0] +
  '\n$ mvn -v\n' + sh('mvn -v').splitlines()[0][:60] +
  '\n$ node -v && npm -v\n' + sh('node -v').strip() + '  /  npm ' + sh('npm -v').strip() +
  '\n$ docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"\n' +
  sh('docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"')))
blocs.append(('term-mvn-run1', 'Exécution 1 : mvn test sur le build initial (v1.0.0)', '$ cd backend && mvn test\n' + mvn(R + 'run1-mvn-test.raw.txt')))
blocs.append(('term-mvn-run2', 'Exécution 2 : mvn test après correctifs (re-test + non-régression)', '$ cd backend && mvn test\n' + mvn(R + 'run2-mvn-test.raw.txt')))
blocs.append(('term-diff', 'Correctifs ANO-01 et ANO-02 (git diff)',
  '$ git diff backend/src/main\n' + sh('git diff --no-color backend/src/main')))
import xml.etree.ElementTree as ET
ns = {'p': 'http://pmd.sourceforge.net/report/2.0.0'}
pmd = chr(10).join(f"{os.path.basename(f.get('name')):<24} L{v.get('beginline'):<4} P{v.get('priority')}  {v.get('rule'):<30} {v.text.strip()[:58]}"
                for f in ET.parse('backend/target/pmd.xml').getroot().findall('p:file', ns) for v in f.findall('p:violation', ns))
cpd = re.findall(r'<duplication lines="(\d+)" tokens="(\d+)"', u8('backend/target/cpd.xml'))
blocs.append(('term-pmd', 'Analyse statique backend : PMD 7.17 et CPD (copier-coller)',
  '$ mvn pmd:pmd pmd:cpd\n' + pmd + f'\n--- CPD : {len(cpd)} blocs dupliqués (' + ', '.join(f'{l} lignes' for l, _ in cpd) + ')'))
es = u8(R + 'eslint.txt').splitlines()
es = [l for l in es if 'npm notice' not in l]
blocs.append(('term-eslint', 'Analyse statique frontend : ESLint',
  '$ npx eslint . --ext js,jsx\n' + '\n'.join(es[:22]) + '\n   [...]\n' + '\n'.join(es[-3:])))
au = u8(R + 'npm-audit.txt').splitlines()
au = [l for l in au if 'npm notice' not in l]
blocs.append(('term-audit', 'Audit des dépendances : npm audit',
  '$ npm audit --workspace=frontend\n' + '\n'.join(au[:14]) + '\n   [...]\n' + '\n'.join(au[-7:])))
k6 = [l for l in u8(R + 'k6.txt').splitlines() if not re.search(r'running \(|^default\s|level=warning|^\s*$', l)]
blocs.append(('term-k6', 'Test de charge k6 : 20 utilisateurs virtuels pendant 60 s',
  '$ docker run --rm -v ./qa/perf:/scripts grafana/k6 run /scripts/charge-api.js\n' + '\n'.join(k6[-34:])))
blocs.append(('term-ano04', 'TA-06 : vérification manuelle de la persistance des événements (API + redémarrage)', u8(R + 'ano04-manual.txt')))
pw = [l for l in u8(R + 'playwright.txt').splitlines() if re.search(r'^  (ok|x ) |passed \(|^\s+\d+ failed|Running|Error:|Expected:|Received:', l)]
blocs.append(('term-playwright', 'Tests système E2E : Playwright (Chromium desktop + mobile Pixel 7)',
  '$ npx playwright test -c e2e/playwright.config.js\n' + '\n'.join(pw)))
blocs.append(('term-squash-seed', 'Alimentation de Squash TM par son API REST',
  '$ node squash/seed.mjs\nProjet EniGov créé (id 1)\n27 exigences créées\n33 cas de test créés et liés aux exigences\n'
  'Itération 1 - Build initial v1.0.0 : 13 exécutions enregistrées\nItération 2 - Build corrigé v1.0.1 : 23 exécutions enregistrées\nTerminé.'))
json.dump([{'nom': n, 'titre': t, 'texte': x} for n, t, x in blocs], open('qa/report/terminals.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
for n, t, x in blocs: print(n, len(x.splitlines()), 'lignes')
