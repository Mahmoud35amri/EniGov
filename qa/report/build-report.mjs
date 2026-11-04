// Génère le compte rendu (HTML puis PDF A4) à partir du référentiel, des résultats et des captures.
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { exigences, casDeTest, anomalies, iterations, dossiers } from '../squash/referentiel.mjs';
import { environnement, cycleEnV } from './diagrams.mjs';

const acceptance = JSON.parse(readFileSync('results/acceptance.json', 'utf8'));
const S = '../results/screens/';
let nFig = 0;
const numFig = {};
const fig = (img, legende, largeur = 100) => (numFig[img] = nFig + 1) && `<figure style="width:${largeur}%"><img src="${S}${img}.png"><figcaption>Figure ${++nFig} – ${legende}</figcaption></figure>`;
const svgFig = (svg, legende) => `<figure>${svg}<figcaption>Figure ${++nFig} – ${legende}</figcaption></figure>`;
const table = (entetes, lignes, cls = '') => `<table class="${cls}"><thead><tr>${entetes.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${lignes.map((l) => `<tr>${l.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
const STATUT = { SUCCESS: ['Succès', 'ok'], FAILURE: ['Échec', 'ko'], BLOCKED: ['Bloqué', 'warn'] };
const badge = (s) => `<span class="badge ${STATUT[s][1]}">${STATUT[s][0]}</span>`;
const CRIT = { CRITICAL: 'Critique', MAJOR: 'Majeure', MINOR: 'Mineure' };
const CAT = { CAT_FUNCTIONAL: 'Fonctionnelle', CAT_SECURITY: 'Sécurité', CAT_PERFORMANCE: 'Performance', CAT_ERGONOMIC: 'Ergonomie', CAT_TECHNICAL: 'Technique' };
const IMP = { VERY_HIGH: 'Très haute', HIGH: 'Haute', MEDIUM: 'Moyenne', LOW: 'Faible' };

// Statut final de chaque cas de test = dernière exécution (itération 2 prioritaire)
const final = {};
for (const it of iterations) for (const [ref, [s, c]] of Object.entries(it.resultats)) final[ref] = { s, c };
const compte = (s) => Object.values(final).filter((r) => r.s === s).length;
const couvrant = (ref) => casDeTest.filter((c) => c.exigences.includes(ref)).map((c) => c.ref);
const nonCouvertes = exigences.filter((e) => couvrant(e.ref).length === 0);
const tauxCouverture = Math.round(((exigences.length - nonCouvertes.length) / exigences.length) * 100);

const reqTable = (prefixe) => table(['Réf.', 'Exigence', 'Description', 'Catégorie', 'Criticité'],
  exigences.filter((e) => e.ref.startsWith(prefixe + '-')).map((e) => [`<b>${e.ref}</b>`, e.nom, e.description, CAT[e.categorie], CRIT[e.criticite]]), 'small');

const etapesTA = (tc) => table(['#', 'Action', 'Résultat attendu', 'Résultat obtenu'],
  acceptance.filter((e) => e.tc === tc).map((e) => [e.numero, e.action, e.attendu, `${badge(e.statut)} ${e.observe}`]), 'small');

const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Compte rendu – Ateliers de test – EniGov</title>
<style>
  @page { size: A4; margin: 18mm 16mm 18mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Calibri, Arial, sans-serif; font-size: 10.5pt; line-height: 1.5; color: #1e293b; margin: 0; }
  h1 { font-size: 19pt; color: #312e81; border-bottom: 3px solid #6366f1; padding-bottom: 4px; margin: 0 0 14px; page-break-before: always; }
  h2 { font-size: 13.5pt; color: #3730a3; margin: 20px 0 8px; page-break-after: avoid; }
  h3 { font-size: 11.5pt; color: #4338ca; margin: 14px 0 6px; page-break-after: avoid; }
  p { margin: 6px 0; text-align: justify; }
  ul, ol { margin: 4px 0 8px; padding-left: 22px; } li { margin: 2px 0; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0 12px; font-size: 9.2pt; page-break-inside: auto; }
  tr { page-break-inside: avoid; }
  th { background: #312e81; color: #fff; text-align: left; padding: 5px 6px; font-weight: 600; }
  td { border-bottom: 1px solid #e2e8f0; padding: 4px 6px; vertical-align: top; }
  tbody tr:nth-child(even) td { background: #f8fafc; }
  table.small { font-size: 8.6pt; }
  td b:first-child { white-space: nowrap; }
  figure { margin: 10px auto 14px; text-align: center; page-break-inside: avoid; }
  figure img { max-width: 100%; border: 1px solid #cbd5e1; border-radius: 4px; }
  figcaption { font-size: 8.8pt; color: #475569; font-style: italic; margin-top: 4px; }
  code { font-family: Consolas, monospace; font-size: 8.8pt; background: #f1f5f9; padding: 0 3px; border-radius: 3px; }
  pre { font-family: Consolas, monospace; font-size: 8.4pt; background: #0f172a; color: #e2e8f0; padding: 10px 12px; border-radius: 6px; white-space: pre-wrap; page-break-inside: avoid; line-height: 1.4; }
  .badge { display: inline-block; padding: 0 7px; border-radius: 9px; font-size: 8pt; font-weight: 700; white-space: nowrap; }
  .ok { background: #dcfce7; color: #166534; } .ko { background: #fee2e2; color: #991b1b; } .warn { background: #fef3c7; color: #92400e; }
  .note { background: #eef2ff; border-left: 4px solid #6366f1; padding: 8px 12px; margin: 10px 0; border-radius: 0 6px 6px 0; }
  .alerte { background: #fef2f2; border-left: 4px solid #dc2626; padding: 8px 12px; margin: 10px 0; border-radius: 0 6px 6px 0; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 10px 0 14px; }
  .kpi { border: 1px solid #c7d2fe; border-radius: 8px; padding: 8px; text-align: center; background: #f8fafc; }
  .kpi b { display: block; font-size: 18pt; color: #312e81; } .kpi span { font-size: 8.5pt; color: #475569; }
  .duo { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; } .duo figure { margin: 6px 0; }
  .garde { height: 255mm; display: flex; flex-direction: column; justify-content: space-between; text-align: center; padding: 10mm 0; }
  .garde h1 { page-break-before: avoid; border: none; font-size: 28pt; color: #312e81; margin: 0; }
  .garde .ecole { font-size: 13pt; font-weight: 600; color: #334155; letter-spacing: .5px; }
  .garde .sous { font-size: 15pt; color: #4338ca; margin-top: 8px; }
  .garde .cadre { border: 2px solid #6366f1; border-radius: 12px; padding: 18px; margin: 0 25mm; }
  .garde table { width: 70%; margin: 0 auto; font-size: 11pt; } .garde td { border: none; padding: 4px; background: none !important; }
  .toc a { color: #1e293b; text-decoration: none; } .toc li { margin: 3px 0; }
  .first { page-break-before: avoid; }
</style></head><body>

<!-- ======================= PAGE DE GARDE ======================= -->
<section class="garde">
  <div><div class="ecole">ÉCOLE NATIONALE D’INGÉNIEURS DE CARTHAGE<br>ENICarthage — Université de Carthage</div></div>
  <div class="cadre">
    <div style="font-size:12pt;color:#64748b;letter-spacing:2px">COMPTE RENDU</div>
    <h1>Ateliers de test logiciel</h1>
    <div class="sous">Recette de la plateforme <b>EniGov</b><br>Plateforme numérique du délégué étudiant</div>
  </div>
  <table>
    <tr><td style="text-align:right;color:#64748b">Réalisé par :</td><td style="text-align:left"><b>Mahmoud Amri</b></td></tr>
    <tr><td style="text-align:right;color:#64748b">Encadrement :</td><td style="text-align:left"><b>Faouzi Jaidi</b></td></tr>
    <tr><td style="text-align:right;color:#64748b">Outil de gestion des tests :</td><td style="text-align:left">Squash TM 15.0.3</td></tr>
    <tr><td style="text-align:right;color:#64748b">Date :</td><td style="text-align:left">4 novembre 2026</td></tr>
  </table>
  <div style="color:#64748b">Année universitaire 2026 – 2027</div>
</section>

<!-- ======================= SOMMAIRE ======================= -->
<h1>Sommaire</h1>
<ol class="toc">
  <li>Introduction et objectifs des ateliers</li>
  <li>Choix du projet : EniGov (objectif 1)</li>
  <li>Installation de l’environnement de test</li>
  <li>Besoins fonctionnels et non fonctionnels (objectif 2)</li>
  <li>Outil de gestion des tests et des exigences : Squash TM (objectif 3)</li>
  <li>Plan de test (objectif 4)</li>
  <li>Exécution du plan de test (objectif 5)
    <ol><li>Tests statiques</li><li>Tests unitaires</li><li>Tests d’intégration</li><li>Tests structurels (couverture)</li><li>Tests système (E2E)</li><li>Tests d’acceptation manuels</li><li>Tests non fonctionnels</li><li>Tests liés aux changements et de maintenance</li><li>Suivi de la campagne dans Squash TM</li></ol></li>
  <li>Bilan : anomalies, métriques et verdict de recette</li>
  <li>Conclusion</li>
  <li>Annexe : rejouer les tests</li>
</ol>

<!-- ======================= 1. INTRODUCTION ======================= -->
<h1>1. Introduction et objectifs des ateliers</h1>
<p>Ce compte rendu présente le travail réalisé dans le cadre des ateliers de test logiciel. Il suit les cinq objectifs fixés :</p>
${table(['Objectif', 'Travail réalisé', 'Chapitre'], [
  ['1. Choisir un projet', 'Plateforme web EniGov (Spring Boot + React + PostgreSQL), clonée et lancée en local', '2, 3'],
  ['2. Présenter les besoins fonctionnels et non fonctionnels', `${exigences.filter((e) => e.ref.startsWith('EF')).length} exigences fonctionnelles et ${exigences.filter((e) => e.ref.startsWith('ENF')).length} non fonctionnelles, avec criticité`, '4'],
  ['3. Utiliser un outil de gestion de test (et des exigences)', 'Squash TM 15.0.3 installé sous Docker : exigences, cas de test, traçabilité, campagne', '5'],
  ['4. Élaborer un plan de test', 'Plan couvrant 4 niveaux (unitaire, intégration, système, acceptation) et 5 types (fonctionnel, non fonctionnel, structurel, lié aux changements, maintenance)', '6'],
  ['5. Exécuter le plan de test', 'Techniques statiques et dynamiques, tests manuels et automatisés ; 8 anomalies détectées dont 1 critique corrigée et re-testée', '7, 8'],
])}
<div class="kpis">
  <div class="kpi"><b>${exigences.length}</b><span>exigences</span></div>
  <div class="kpi"><b>${casDeTest.length}</b><span>cas de test dans Squash TM</span></div>
  <div class="kpi"><b>52 + 7 + 14</b><span>tests JUnit · E2E · étapes manuelles</span></div>
  <div class="kpi"><b>${anomalies.length}</b><span>anomalies détectées</span></div>
</div>

<!-- ======================= 2. PROJET ======================= -->
<h1>2. Choix du projet : EniGov (objectif 1)</h1>
<h2>2.1 Présentation</h2>
<p><b>EniGov</b> est la plateforme numérique de gouvernance étudiante de l’ENICarthage (dépôt : <code>github.com/Mahmoud35amri/EniGov</code>). Le délégué élu y publie des annonces, gère les réclamations des étudiants, organise des sondages, publie des décisions et des événements, partage des documents et échange par messagerie. Les étudiants, inscrits avec une adresse <code>@enicar.ucar.tn</code>, consultent ces informations, déposent des réclamations (privées ou publiques), votent et écrivent au délégué.</p>
<h2>2.2 Pourquoi ce projet ?</h2>
<ul>
  <li><b>Application réelle et complète</b> : backend Java, frontend React, base de données, authentification ; tous les niveaux de test s’y appliquent.</li>
  <li><b>Deux rôles</b> (DÉLÉGUÉ, ÉTUDIANT) avec des règles d’accès : terrain idéal pour les tests de sécurité et d’autorisation.</li>
  <li><b>Règles métier testables</b> : vote unique, ciblage des sondages, verrouillage après 5 échecs, politique de mot de passe (valeurs limites, tables de décision).</li>
  <li><b>Données sensibles</b> : réclamations privées, d’où des exigences de confidentialité à vérifier.</li>
</ul>
<h2>2.3 Architecture technique</h2>
${table(['Couche', 'Technologies'], [
  ['Frontend', 'React 18, Vite 5, React Router 6, Tailwind CSS, Axios, Framer Motion'],
  ['Backend', 'Java 17 (exécuté sur JDK 25), Spring Boot 3.2.2, Spring Security + JWT (jjwt 0.11.5), Spring Data JPA / Hibernate'],
  ['Base de données', 'PostgreSQL (schéma généré par Hibernate : <code>ddl-auto=update</code>)'],
  ['Services externes', 'Cloudinary (fichiers), Brevo (e-mails) — non configurés en local'],
])}
${fig('e2e-ts01-dashboard-delegue', 'Tableau de bord du délégué (application lancée en local)', 78)}

<!-- ======================= 3. INSTALLATION ======================= -->
<h1>3. Installation de l’environnement de test</h1>
<h2>3.1 Outils installés</h2>
${table(['Outil', 'Version', 'Rôle', 'Installation'], [
  ['Git', '—', 'Clonage du dépôt', '<code>git clone https://github.com/Mahmoud35amri/EniGov.git</code>'],
  ['JDK / Maven', 'JDK 25 · Maven 3.9.12', 'Build et tests backend', 'déjà présents'],
  ['Node.js / npm', '22.23 · 12.2', 'Build frontend, Playwright', 'déjà présents ; <code>npm install</code>'],
  ['Docker Desktop', '29.1', 'Conteneurs PostgreSQL, Squash TM, k6', 'déjà présent'],
  ['PostgreSQL', '16 (conteneur)', 'Base de l’application, base de test, base de Squash', '<code>docker run postgres:16 -p 5433:5432</code>'],
  ['<b>Squash TM</b>', '<b>15.0.3</b>', '<b>Gestion des exigences et des tests</b>', '<code>docker run squashtest/squash -p 8090:8080</code>'],
  ['JUnit 5, Mockito, MockMvc', 'Spring Boot Test 3.2', 'Tests unitaires et d’intégration', 'déjà dans le <code>pom.xml</code>'],
  ['JaCoCo', '0.8.14', 'Couverture de code (tests structurels)', 'plugin ajouté au <code>pom.xml</code>'],
  ['PMD / CPD', '7.17', 'Analyse statique Java, détection de duplications', '<code>mvn pmd:pmd pmd:cpd</code>'],
  ['ESLint', '8 + plugins React', 'Analyse statique JavaScript', '<code>npm i -D eslint@8 …</code> + <code>.eslintrc.cjs</code>'],
  ['Playwright', '1.x + Chromium', 'Tests système E2E, aide à l’exécution des tests manuels', '<code>npm i -D @playwright/test</code>'],
  ['k6', 'grafana/k6 (Docker)', 'Test de charge', '<code>docker run grafana/k6</code>'],
])}
${fig('term-env', 'Versions des outils et conteneurs en cours d’exécution')}
${svgFig(environnement, 'Architecture de l’environnement de test')}
<h2>3.2 Problèmes rencontrés et solutions</h2>
${table(['Problème', 'Solution'], [
  ['Le PostgreSQL local (port 5432) n’utilise pas le mot de passe attendu par le projet', 'PostgreSQL 16 dédié dans Docker, exposé sur le port 5433'],
  ['Le backend refuse de démarrer : variables <code>CLOUDINARY_*</code> obligatoires mais absentes de la documentation', 'Valeurs factices dans <code>backend/.env</code> (anomalie de documentation <b>ANO-08</b>)'],
  ['Le port 8080 est occupé par un service Oracle (TNSLSNR)', 'Squash TM exposé sur le port 8090'],
  ['Squash TM 15 ne démarre pas sans base externe (H2 n’est plus embarquée)', 'Base <code>squashtm</code> créée dans le conteneur PostgreSQL ; variables <code>SQTM_DB_*</code>'],
  ['L’API REST de Squash refuse l’authentification Basic par défaut', 'Propriété <code>squash.rest-api.disallow-basic-authentication=false</code> (variable d’environnement)'],
  ['Mockito / Byte Buddy ne supporte pas officiellement le JDK 25', 'Option <code>-Dnet.bytebuddy.experimental=true</code> dans le <code>pom.xml</code> (voir test de maintenance TM-01)'],
])}

<!-- ======================= 4. BESOINS ======================= -->
<h1>4. Besoins fonctionnels et non fonctionnels (objectif 2)</h1>
<p>Les besoins ont été extraits de la documentation du projet (README) et vérifiés par la lecture du code. Chaque exigence porte une référence unique, reprise dans Squash TM pour assurer la traçabilité vers les cas de test. La criticité oriente l’effort de test (approche basée sur les risques).</p>
<h2>4.1 Acteurs</h2>
${table(['Acteur', 'Description'], [
  ['Délégué', 'Compte unique pré-créé ; administre la plateforme (publication, traitement des réclamations, statistiques).'],
  ['Étudiant', 'Inscrit avec un e-mail @enicar.ucar.tn vérifié ; consulte, dépose des réclamations, vote, écrit au délégué.'],
])}
<h2>4.2 Exigences fonctionnelles</h2>
${reqTable('EF')}
<h2>4.3 Exigences non fonctionnelles</h2>
${reqTable('ENF')}

<!-- ======================= 5. SQUASH TM ======================= -->
<h1>5. Outil de gestion des tests et des exigences : Squash TM (objectif 3)</h1>
<h2>5.1 Choix de l’outil</h2>
<p><b>Squash TM</b> est un outil libre de gestion des tests qui gère dans un même référentiel les <b>exigences</b>, les <b>cas de test</b> et les <b>campagnes d’exécution</b>, avec la traçabilité entre eux. Il répond donc à la consigne : simplifier la gestion des tests tout en gérant les exigences du logiciel. Il est en français, gratuit en version Community et s’installe sous Docker.</p>
<h2>5.2 Organisation du projet EniGov dans Squash TM</h2>
<ul>
  <li><b>Exigences</b> : ${exigences.length} exigences réparties en deux dossiers (fonctionnelles / non fonctionnelles), avec catégorie, criticité et statut « Approuvée ».</li>
  <li><b>Cas de test</b> : ${casDeTest.length} cas répartis en six dossiers : ${dossiers.map((d) => `« ${d} »`).join(', ')}. Chaque cas a une nature, un type, une importance, des pas de test (action → résultat attendu) et un lien vers les exigences qu’il vérifie.</li>
  <li><b>Campagne</b> « Campagne de recette EniGov v1.0 » avec deux itérations : build initial v1.0.0, puis build corrigé v1.0.1.</li>
</ul>
<p>Pour éviter une saisie manuelle de plus de 30 cas de test, le référentiel a été écrit une seule fois (<code>qa/squash/referentiel.mjs</code>), puis injecté dans Squash TM par son <b>API REST</b> (script <code>qa/squash/seed.mjs</code>). Le même fichier sert à générer les tableaux de ce compte rendu, ce qui garantit leur cohérence.</p>
${fig('term-squash-seed', 'Alimentation de Squash TM par l’API REST', 80)}
${fig('sq-00-projet-exigences', 'Espace « Exigences » : arborescence et tableau de bord du projet (couverture, statut, criticité)')}
${fig('sq-01-exigence', 'Exigence EF-06 : criticité, catégorie, indicateurs de couverture et cas de test qui la vérifient')}
${fig('sq-02b-cas-de-test-etapes', 'Espace « Cas de test » : arborescence par niveau de test et pas de test du cas TA-02')}
<h2>5.3 Matrice de traçabilité exigences → cas de test</h2>
${table(['Exigence', 'Criticité', 'Cas de test qui la vérifient'], exigences.map((e) => [`<b>${e.ref}</b> ${e.nom}`, CRIT[e.criticite], couvrant(e.ref).join(', ') || '<span class="badge warn">non couverte</span>']), 'small')}
<p><b>Couverture des exigences : ${exigences.length - nonCouvertes.length}/${exigences.length} (${tauxCouverture} %).</b> Les exigences non couvertes (${nonCouvertes.map((e) => e.ref).join(', ')}) ont été exclues volontairement : EF-04 et EF-15 dépendent de services externes (envoi d’e-mails Brevo, stockage Cloudinary) non configurés en local, et EF-12 est de criticité mineure. Ce choix est expliqué dans le plan de test (§ 6.1).</p>

<!-- ======================= 6. PLAN DE TEST ======================= -->
<h1>6. Plan de test (objectif 4)</h1>
<p>Ce plan s’inspire de la structure de la norme IEEE 829 / ISO 29119-3.</p>
<h2>6.1 Objet et périmètre</h2>
${table(['Dans le périmètre', 'Hors périmètre (justification)'], [[
  '<ul><li>Authentification, inscription, verrouillage, rôles</li><li>Réclamations, votes, traitement, notifications</li><li>Sondages, annonces, événements, messagerie</li><li>Sécurité de l’API, performance, responsive, maintenabilité, dépendances, persistance</li></ul>',
  '<ul><li>EF-04 Mot de passe oublié : l’envoi réel d’e-mail (Brevo) n’est pas configuré</li><li>EF-15 Documents : l’upload passe par Cloudinary, non configuré</li><li>EF-12 Décisions : criticité mineure, reportée</li><li>Déploiement cloud (Render / Vercel)</li></ul>',
]])}
<h2>6.2 Stratégie : approche basée sur les risques</h2>
${table(['Risque produit', 'Probabilité', 'Impact', 'Priorité', 'Tests prévus'], [
  ['Fuite de réclamations privées', 'Moyenne', 'Critique', '<span class="badge ko">P1</span>', 'Revue de code, TI-05, TR-01'],
  ['Accès non autorisé aux fonctions du délégué', 'Moyenne', 'Critique', '<span class="badge ko">P1</span>', 'TI-04, TS-06, TU-04'],
  ['Fraude au vote (double vote)', 'Moyenne', 'Majeur', '<span class="badge ko">P1</span>', 'TU-01, TI-07, TS-05'],
  ['Comptes piratés (force brute)', 'Faible', 'Critique', '<span class="badge warn">P2</span>', 'TI-03, TI-09'],
  ['Perte de données', 'Faible', 'Critique', '<span class="badge warn">P2</span>', 'Revue de code, TA-06'],
  ['Lenteur sous charge', 'Faible', 'Majeur', '<span class="badge warn">P2</span>', 'TNF-01'],
  ['Mauvais affichage sur mobile', 'Moyenne', 'Moyen', '<span class="badge warn">P2</span>', 'TS-07, TA-05'],
  ['Dépendances vulnérables', 'Élevée', 'Majeur', '<span class="badge warn">P2</span>', 'TNF-02'],
])}
<h2>6.3 Niveaux et types de test</h2>
${svgFig(cycleEnV, 'Correspondance entre les phases de développement et les niveaux de test (cycle en V)')}
${table(['Niveau \\ Type', 'Fonctionnel', 'Non fonctionnel', 'Structurel (boîte blanche)', 'Lié aux changements', 'Maintenance'], [
  ['<b>Unitaire</b>', 'TU-01, TU-02, TU-03', 'TU-04 (sécurité)', 'TNF-04 (JaCoCo)', 'TR-01 (re-test TU-04)', '—'],
  ['<b>Intégration</b>', 'TI-01, 02, 06, 07, 08', 'TI-03, TI-04, TI-09 (sécurité)', 'TNF-04 (JaCoCo)', 'TR-01 (re-test TI-05), TR-02', 'TM-01 (JDK 25)'],
  ['<b>Système</b>', 'TS-01 … TS-06', 'TS-07 (responsive), TNF-01 (charge), TNF-02 (dépendances)', '—', 'TR-02 (régression E2E)', 'TM-01 (PostgreSQL 16 / Docker)'],
  ['<b>Acceptation</b>', 'TA-01 … TA-04', 'TA-05 (utilisabilité)', '—', '—', 'TA-06 (persistance au redémarrage)'],
], 'small')}
<h2>6.4 Techniques de test</h2>
${table(['Famille', 'Technique', 'Application dans le projet'], [
  ['<b>Statique</b> (sans exécuter le code)', 'Revue de code manuelle', 'Lecture des contrôleurs et services : 3 anomalies trouvées avant tout test dynamique (ANO-01, 03, 04)'],
  ['', 'Analyse statique outillée', 'PMD et CPD (Java), ESLint (JavaScript)'],
  ['', 'Analyse de composition logicielle', '<code>npm audit</code> sur les dépendances du frontend'],
  ['', 'Revue de la documentation', 'README / guide de déploiement confrontés à l’installation réelle (ANO-08)'],
  ['<b>Dynamique boîte noire</b>', 'Partitions d’équivalence', 'Mots de passe valides / invalides, jetons JWT (TU-04, TI-01)'],
  ['', 'Analyse des valeurs limites', 'Mot de passe 7/8 et 40/41 caractères ; 1 et 2 options ; index −1 et 3 ; 4e et 5e échec de connexion'],
  ['', 'Table de décision', 'Visibilité d’un sondage selon la filière et la promotion (TU-02, 9 règles)'],
  ['', 'Transitions d’états', 'Vote pour / contre / annulé ; statut de réclamation ; verrouillage du compte'],
  ['', 'Cas d’utilisation', 'Scénarios E2E et d’acceptation multi-acteurs'],
  ['<b>Dynamique boîte blanche</b>', 'Couverture des instructions et des branches', 'JaCoCo sur l’ensemble des tests JUnit (TNF-04)'],
  ['<b>Basée sur l’expérience</b>', 'Test exploratoire guidé par la revue', 'TA-06 : vérifier la persistance des événements après redémarrage'],
], 'small')}
<h2>6.5 Tests manuels et automatisés</h2>
${table(['Mode', 'Cas de test', 'Outils'], [
  ['Automatisé', casDeTest.filter((c) => c.mode === 'Automatisé').map((c) => c.ref).join(', '), 'JUnit 5, Mockito, MockMvc, Playwright, k6, PMD, ESLint, npm audit, JaCoCo'],
  ['Manuel', casDeTest.filter((c) => c.mode === 'Manuel').map((c) => c.ref).join(', '), 'Navigateur, fiches de test Squash TM, terminal (curl)'],
])}
<h2>6.6 Environnement et données de test</h2>
<ul>
  <li>Tests d’intégration : base dédiée <code>enigov_test</code>, recréée à chaque exécution (<code>ddl-auto=create-drop</code>, profil Spring <code>test</code>). Seul l’envoi d’e-mails est simulé (<code>@MockBean EmailService</code>).</li>
  <li>Tests système et d’acceptation : base <code>enigov</code> ; deux étudiants fictifs (Amira Ben Salah, Youssef Trabelsi) créés par l’API et validés en base au début de chaque exécution (<code>global-setup.js</code>) ; compte délégué pré-créé.</li>
  <li>Navigateur : Chromium (bureau 1440 × 900 et émulation Pixel 7).</li>
</ul>
<h2>6.7 Critères d’entrée, de sortie et de suspension</h2>
${table(['Critère', 'Définition'], [
  ['Entrée', 'Application compilée et démarrée ; base de test accessible ; exigences approuvées dans Squash TM'],
  ['Sortie', '100 % des cas planifiés exécutés ; aucune anomalie critique ouverte ; couverture des exigences ≥ 85 % ; couverture des instructions backend ≥ 40 %'],
  ['Suspension', 'Environnement indisponible ou anomalie bloquante empêchant plus de 30 % des tests'],
  ['Reprise', 'Correctif livré ; re-test de confirmation puis non-régression'],
])}
<h2>6.8 Gestion des anomalies</h2>
<p>Cycle de vie : <b>Détectée → Confirmée → Corrigée → Re-testée → Fermée</b> (ou <b>Ouverte</b> si le correctif est planifié plus tard). Gravité : <b>Critique</b> (sécurité ou perte de données, bloque la mise en production), <b>Majeure</b> (fonction dégradée), <b>Mineure</b> (gêne, qualité). Chaque anomalie est référencée (ANO-xx) dans le commentaire de l’exécution Squash TM correspondante.</p>
<h2>6.9 Planning et livrables</h2>
${table(['Phase', 'Livrables'], [
  ['1. Installation et lancement', 'Environnement Docker, application démarrée'],
  ['2. Analyse des besoins', 'Exigences EF / ENF dans Squash TM'],
  ['3. Conception des tests', 'Cas de test, matrice de traçabilité, plan de test'],
  ['4. Itération 1 (build v1.0.0)', 'Exécution des tests unitaires et d’intégration, anomalies'],
  ['5. Correctifs', 'Correction de ANO-01 et ANO-02'],
  ['6. Itération 2 (build v1.0.1)', 'Re-test, non-régression, tests système, acceptation, non fonctionnels, maintenance'],
  ['7. Clôture', 'Bilan, compte rendu'],
])}

<!-- ======================= 7. EXÉCUTION ======================= -->
<h1>7. Exécution du plan de test (objectif 5)</h1>
<h2>7.1 Tests statiques</h2>
<h3>7.1.1 Revue de code manuelle</h3>
<p>Avant toute exécution, les contrôleurs et services du backend ont été relus en les confrontant aux exigences. Trois défauts ont été identifiés, puis confirmés par des tests dynamiques :</p>
<pre>// ComplaintController.java — aucune vérification du propriétaire (EF-06)  → ANO-01
@GetMapping("/{id}")
public ResponseEntity&lt;ComplaintResponse&gt; getComplaint(@PathVariable String id, Principal principal) {
    return ResponseEntity.ok(complaintService.getById(id, principal.getName()));   // tout étudiant authentifié
}

// DatabaseSeeder.java — exécuté à CHAQUE démarrage (ENF-09)                 → ANO-04
public void run(String... args) {
    eventRepository.deleteAll();     // supprime aussi les événements créés par le délégué
    seedEvents();
}

// AuthController.java — le compteur n'est remis à 0 qu'après une connexion réussie (EF-03) → ANO-03
int attempts = user.getFailedLoginAttempts() + 1;   // 6, 7, ... après expiration du verrou
if (attempts &gt;= MAX_FAILED_ATTEMPTS) { /* reverrouille 15 min dès le 1er échec */ }</pre>
<h3>7.1.2 Analyse statique du backend (PMD / CPD)</h3>
${fig('term-pmd', 'Résultat de PMD 7.17 et CPD sur le backend')}
<p>Aucune violation de priorité 1 ou 2. Les points notables : trois blocs <code>catch</code> vides (des erreurs d’envoi d’e-mail sont silencieusement ignorées), <code>UserDetailsImpl</code> redéfinit <code>equals()</code> sans <code>hashCode()</code>, des imports inutilisés et 8 blocs dupliqués de 10 à 17 lignes.</p>
<h3>7.1.3 Analyse statique du frontend (ESLint)</h3>
${fig('term-eslint', 'Extrait du rapport ESLint (59 problèmes : 55 erreurs, 4 avertissements)')}
<p>Répartition : 34 variables ou imports inutilisés, 19 caractères non échappés dans le JSX, 2 dépendances manquantes dans des <code>useEffect</code> (risque de données obsolètes à l’écran), 2 attributs inconnus. Ces défauts relèvent de la dette technique (<b>ANO-07</b>).</p>
<h3>7.1.4 Analyse des dépendances (npm audit)</h3>
${fig('term-audit', 'Audit des dépendances du frontend')}
<p>29 vulnérabilités connues : 15 hautes, 11 modérées, 3 faibles. Elles touchent notamment <code>axios</code> (SSRF, contournement d’authentification) et <code>react-router</code> (redirection ouverte). L’exigence ENF-08 n’est pas satisfaite (<b>ANO-06</b>).</p>

<h2>7.2 Tests unitaires (JUnit 5 + Mockito)</h2>
<p>Les services sont testés isolément ; leurs dépendances (repositories, notifications) sont simulées avec Mockito. Exemple : la table de décision de la visibilité d’un sondage, implémentée par un test paramétré :</p>
<pre>@ParameterizedTest
@CsvSource(nullValues = "-", value = {
    // targetAll, filiereCible, promoCible, filiereEtu, promoEtu, attendu
    "false, INFO, DEUXIEME_ANNEE, INFO, DEUXIEME_ANNEE, true",
    "false, INFO, DEUXIEME_ANNEE, INFO, PREMIERE_ANNEE, false",
    "false, INFO, DEUXIEME_ANNEE, GSIL, DEUXIEME_ANNEE, false",  /* ... 9 règles */ })
void visibilite(boolean targetAll, Filiere fCible, Promotion pCible, Filiere fEtu, Promotion pEtu, boolean attendu) {
    Poll poll = new Poll();  poll.setTargetAll(targetAll);  /* ... */
    assertEquals(attendu, poll.isVisibleTo(fEtu, pEtu));
}</pre>
${table(['Cas', 'Classe de test', 'Tests', 'Technique', 'Itération 1', 'Itération 2'], casDeTest.filter((c) => c.ref.startsWith('TU')).map((c) => [`<b>${c.ref}</b>`, c.script.split('/').pop(), c.etapes[0][1].split(' ')[0], c.technique, badge(iterations[0].resultats[c.ref][0]), iterations[1].resultats[c.ref] ? badge(iterations[1].resultats[c.ref][0]) : '—']), 'small')}
<p>Le test <code>JwtUtilsTest.jetonSigneAvecAutreCle</code> a échoué lors de la première exécution : un jeton signé avec une autre clé provoque une <code>SignatureException</code> non interceptée au lieu d’un rejet propre (<b>ANO-02</b>). L’impact reste limité car le filtre HTTP intercepte l’exception (le test d’intégration TI-04 confirme une réponse 401/403), mais le contrat de la méthode n’est pas respecté.</p>

<h2>7.3 Tests d’intégration (Spring Boot + MockMvc + PostgreSQL)</h2>
<p>Le contexte Spring complet (sécurité, contrôleurs, services, JPA) est démarré sur une vraie base PostgreSQL de test. Les requêtes HTTP sont simulées avec MockMvc. Exemple : le test qui a révélé la fuite de confidentialité :</p>
<pre>@Test @DisplayName("ANO-01 : un autre étudiant ne doit pas lire une réclamation privée par son identifiant")
void priveeInaccessibleParId() throws Exception {
    Session a = nouvelEtudiant("a");   Session b = nouvelEtudiant("b");
    String id = creerReclamation(a, "Privée par id", false);
    mvc.perform(get("/api/complaints/" + id).header("Authorization", b.bearer())).andExpect(status().isForbidden());
    mvc.perform(get("/api/complaints/" + id).header("Authorization", a.bearer())).andExpect(status().isOk());
}</pre>
${table(['Cas', 'Objet', 'Itération 1', 'Itération 2', 'Commentaire'], casDeTest.filter((c) => c.ref.startsWith('TI')).map((c) => [`<b>${c.ref}</b>`, c.nom, badge(iterations[0].resultats[c.ref][0]), iterations[1].resultats[c.ref] ? badge(iterations[1].resultats[c.ref][0]) : '—', (iterations[1].resultats[c.ref] ?? iterations[0].resultats[c.ref])[1]]), 'small')}
${fig('term-mvn-run1', 'Itération 1 : 52 tests, 3 en échec (ANO-01, ANO-02, ANO-03)')}

<h2>7.4 Tests structurels (couverture de code avec JaCoCo)</h2>
<p>Le plugin JaCoCo instrumente le bytecode pendant <code>mvn test</code> et mesure les instructions et les branches exécutées par les tests unitaires et d’intégration.</p>
${fig('rep-jacoco-index', 'Couverture globale du backend : 49 % des instructions, 34 % des branches', 85)}
${fig('rep-jacoco-service', 'Couverture par service : les services ciblés (PollService, ComplaintService) dépassent 50 %', 85)}
<p><b>Analyse :</b> l’objectif de 40 % des instructions est atteint (49 %). La couverture est concentrée sur les modules à risque P1 (réclamations 77 %, sondages 60 %, sécurité 91 %). Les services de messagerie, d’annonces et d’événements sont surtout exercés par les tests E2E, que JaCoCo ne mesure pas dans cette configuration. La vue détaillée montre aussi des branches non exécutées : <code>getAllComplaints</code> n’est appelée par aucun test JUnit, ce qui indique les prochains tests à écrire.</p>
${fig('rep-jacoco-source', 'Vue source JaCoCo : lignes couvertes (vert), non couvertes (rouge), branches partielles (jaune)')}

<h2>7.5 Tests système (E2E avec Playwright)</h2>
<p>Les scénarios sont joués dans un vrai navigateur (Chromium) sur l’application complète : frontend, backend et base de données. Ils enchaînent plusieurs acteurs (le délégué publie, l’étudiant consulte).</p>
${fig('term-playwright', 'Exécution de la suite E2E : 6 réussis, 1 échec (TS-07)')}
${fig('rep-playwright', 'Rapport HTML Playwright', 85)}
<div class="duo">${fig('e2e-ts03-annonce-delegue', 'TS-03 : le délégué publie une annonce')}${fig('e2e-ts03-annonce-etudiant', 'TS-03 : l’étudiante la voit, sans bouton de création')}</div>
<div class="duo">${fig('e2e-ts04-reclamation-creee', 'TS-04 : réclamation créée, statut « En attente »')}${fig('e2e-ts04-delegue-repond', 'TS-04 : le délégué passe le statut à « Résolue » et répond')}</div>
<div class="duo">${fig('e2e-ts04-etudiant-resolue', 'TS-04 : l’étudiante voit le statut « Résolue » et la réponse')}${fig('e2e-ts05-vote-etudiant', 'TS-05 : vote d’un étudiant, résultat 100 %')}</div>
<div class="duo">${fig('e2e-ts02-login-refuse', 'TS-02 : mauvais mot de passe, 4 tentatives restantes')}${fig('e2e-ts06-acces-etudiant', 'TS-06 : un étudiant qui ouvre /students est redirigé vers l’accueil')}</div>
<div class="duo" style="grid-template-columns:1fr 1fr 1.4fr;align-items:start">${fig('e2e-ts07-mobile-login', 'TS-07 : connexion sur Pixel 7')}${fig('e2e-ts07-mobile-accueil', 'TS-07 : accueil sur Pixel 7')}<div class="alerte" style="margin-top:20px"><b>TS-07 en échec – ANO-05.</b> Sur smartphone, la barre latérale reste affichée en permanence et occupe près de la moitié de l’écran ; le contenu déborde de <b>107 px</b> horizontalement (titres et cartes coupés). ENF-05 n’est pas satisfaite.</div></div>

<h2>7.6 Tests d’acceptation manuels</h2>
<p>Les fiches de test TA-01 à TA-06 ont été rédigées dans Squash TM (pas de test : action → résultat attendu), puis exécutées pas à pas dans le navigateur du point de vue de l’utilisateur. Chaque étape a été capturée comme preuve ; le script <code>qa/acceptance/run-acceptance.mjs</code> a servi à enregistrer ces preuves. Les résultats ont ensuite été saisis dans l’exécution Squash TM correspondante.</p>
<h3>TA-01 — Inscription d’un nouvel étudiant (EF-01, EF-02)</h3>
${etapesTA('TA-01')}
<div class="duo">${fig('ta01-1-domaine-refuse', 'Étape 1 : adresse @gmail.com refusée')}${fig('ta01-2-mdp-faible', 'Étape 2 : mot de passe faible, bouton désactivé')}</div>
<div class="duo">${fig('ta01-3-inscription-ok', 'Étape 3 : inscription acceptée, vérification demandée')}${fig('ta01-4-email-non-verifie', 'Étape 4 : connexion refusée tant que l’e-mail n’est pas vérifié')}</div>
<h3>TA-02 — Réclamation publique et vote (EF-05, EF-07)</h3>
${etapesTA('TA-02')}
<div class="duo">${fig('ta02-2-vote-pour', 'Vote « pour » : score = 1 (pouce vert)')}${fig('ta02-3-vote-annule', 'Second clic : vote annulé, score = 0')}</div>
<h3>TA-03 — Message au délégué et notification (EF-13, EF-16)</h3>
${etapesTA('TA-03')}
<div class="duo">${fig('ta03-1-contacts', 'L’étudiant ne peut contacter que le délégué')}${fig('ta03-3a-notification', 'Le délégué reçoit une notification « Nouveau message »')}</div>
<h3>TA-04 — Calendrier des événements (EF-14)</h3>
${etapesTA('TA-04')}
${fig('ta04-2-evenement-etudiant', 'L’étudiante voit l’événement créé par le délégué', 80)}
<h3>TA-05 — Thème clair / sombre (ENF-05)</h3>
${etapesTA('TA-05')}
${fig('ta05-2-theme-conserve', 'Thème sombre conservé après rechargement', 80)}
<h3>TA-06 — Persistance des événements après redémarrage (ENF-09)</h3>
<p>Test exploratoire guidé par la revue de code (§ 7.1.1) : on crée un événement, on redémarre le backend et on vérifie qu’il existe toujours.</p>
${fig('term-ano04', 'TA-06 en échec : l’événement créé disparaît au redémarrage (ANO-04)')}

<h2>7.7 Tests non fonctionnels</h2>
<h3>Performance et fiabilité : test de charge k6 (TNF-01)</h3>
<p>Profil de charge : montée à 20 utilisateurs virtuels en 10 s, palier de 40 s, descente en 10 s. Chaque utilisateur consulte cinq ressources (annonces, événements, sondages, réclamations, statistiques), puis marque une pause d’une seconde. Seuils : p(95) &lt; 500 ms (ENF-03) et taux d’échec &lt; 1 % (ENF-04).</p>
${fig('term-k6', 'Résultat k6 : les deux seuils sont respectés')}
<p><b>Résultat :</b> 4 631 requêtes (56 req/s) ; temps de réponse moyen 18,8 ms, p(95) = 35,7 ms, maximum 247 ms. Une seule requête a échoué (0,02 %), sur un délai réseau entre le conteneur k6 et l’hôte (<i>i/o timeout</i>), et non sur une erreur applicative. ENF-03 et ENF-04 sont satisfaites avec une large marge.</p>
<h3>Sécurité</h3>
<ul>
  <li>Matrice d’autorisations (TI-04, TS-06) : sans jeton, avec un jeton falsifié ou avec le rôle étudiant, les ressources du délégué sont refusées (401/403, jamais 500). <span class="badge ok">Conforme</span></li>
  <li>Verrouillage après 5 échecs (TI-03) <span class="badge ok">Conforme</span> ; reverrouillage abusif après expiration (TI-09) <span class="badge ko">ANO-03</span></li>
  <li>Confidentialité des réclamations privées (TI-05) <span class="badge ko">ANO-01</span>, corrigée puis re-testée <span class="badge ok">Conforme</span></li>
  <li>Dépendances vulnérables (TNF-02) <span class="badge ko">ANO-06</span></li>
</ul>
<h3>Ergonomie, compatibilité et maintenabilité</h3>
<ul>
  <li>Responsive (TS-07) : <span class="badge ko">ANO-05</span> ; thème clair/sombre mémorisé (TA-05) <span class="badge ok">Conforme</span></li>
  <li>Maintenabilité (TNF-03, TNF-04) : couverture 49 % <span class="badge ok">Conforme</span> ; analyse statique <span class="badge ko">ANO-07</span></li>
</ul>

<h2>7.8 Tests liés aux changements et tests de maintenance</h2>
<h3>Correctifs appliqués</h3>
<p>Les deux anomalies corrigeables sans changement de conception ont été corrigées : <b>ANO-01</b> (contrôle du propriétaire dans <code>ComplaintService.getById</code>) et <b>ANO-02</b> (interception de <code>SecurityException</code> dans <code>JwtUtils</code>).</p>
${fig('term-diff', 'Modifications apportées au code (git diff)')}
<h3>Re-test de confirmation (TR-01) et non-régression (TR-02)</h3>
<p>Le <b>re-test</b> ré-exécute les cas qui avaient échoué (TU-04, TI-05) pour confirmer la correction. La <b>non-régression</b> ré-exécute toute la suite automatisée (52 tests JUnit et 7 tests E2E) pour vérifier que les modifications n’ont rien cassé. TI-09 (ANO-03, non corrigée) est désactivé avec <code>@Disabled</code> et une justification, puis marqué « Bloqué » dans Squash TM.</p>
${fig('term-mvn-run2', 'Itération 2 : 52 tests, 51 réussis, 1 ignoré (ANO-03), BUILD SUCCESS')}
<p>La vue source JaCoCo (figure ${numFig['rep-jacoco-source']}) montre que le nouveau code du correctif ANO-01 est entièrement exécuté par les tests (branches en vert).</p>
<h3>Tests de maintenance (TM-01)</h3>
<p>Le projet cible Java 17 et une base PostgreSQL locale. Il a été porté vers un nouvel environnement : <b>JDK 25</b> et <b>PostgreSQL 16 sous Docker</b>. La compilation et l’ensemble des tests passent. Un seul ajustement a été nécessaire : Mockito/Byte Buddy 1.14 ne reconnaît pas officiellement le JDK 25, d’où l’option <code>-Dnet.bytebuddy.experimental=true</code> ajoutée au <code>pom.xml</code>. Une mise à jour de Spring Boot (≥ 3.5) supprimerait ce contournement.</p>

<h2>7.9 Suivi de la campagne dans Squash TM</h2>
${fig('sq-03c-iteration1-plan', 'Itération 1 (build v1.0.0) : plan d’exécution et statuts')}
${fig('sq-03b-iteration2-plan', 'Itération 2 (build v1.0.1) : plan d’exécution et statuts')}
<div class="duo">${fig('sq-03-iteration2', 'Tableau de bord de l’itération 2')}${fig('sq-04-campagne', 'Tableau de bord de la campagne')}</div>

<!-- ======================= 8. BILAN ======================= -->
<h1>8. Bilan : anomalies, métriques et verdict de recette</h1>
<h2>8.1 Anomalies détectées</h2>
${table(['Réf.', 'Gravité', 'Description', 'Détectée par', 'Exigence', 'Statut'], anomalies.map((a) => [`<b>${a.ref}</b>`, `<span class="badge ${a.gravite === 'Critique' ? 'ko' : a.gravite === 'Majeure' ? 'warn' : ''}">${a.gravite}</span>`, a.titre, a.detection, a.exigence, a.statut.startsWith('Corrigée') ? `<span class="badge ok">${a.statut}</span>` : a.statut]), 'small')}
<h2>8.2 Métriques</h2>
<div class="kpis">
  <div class="kpi"><b>${tauxCouverture} %</b><span>exigences couvertes (${exigences.length - nonCouvertes.length}/${exigences.length})</span></div>
  <div class="kpi"><b>${compte('SUCCESS')}/${casDeTest.length}</b><span>cas de test réussis (statut final)</span></div>
  <div class="kpi"><b>49 %</b><span>instructions backend couvertes</span></div>
  <div class="kpi"><b>35,7 ms</b><span>p(95) sous 20 utilisateurs</span></div>
</div>
${table(['Indicateur', 'Valeur'], [
  ['Cas de test (statut final)', `${compte('SUCCESS')} succès · ${compte('FAILURE')} échecs · ${compte('BLOCKED')} bloqué`],
  ['Exécutions enregistrées dans Squash TM', `${Object.keys(iterations[0].resultats).length + Object.keys(iterations[1].resultats).length} (2 itérations)`],
  ['Tests JUnit', '52 (itération 1 : 49 réussis, 3 échecs ; itération 2 : 51 réussis, 1 ignoré)'],
  ['Tests E2E Playwright', '7 (6 réussis, 1 échec)'],
  ['Étapes manuelles d’acceptation', `${acceptance.length} conformes sur ${acceptance.length} (TA-01 à TA-05) + TA-06 en échec`],
  ['Anomalies', `${anomalies.length} (1 critique, ${anomalies.filter((a) => a.gravite === 'Majeure').length} majeures, ${anomalies.filter((a) => a.gravite === 'Mineure').length} mineures) ; 2 corrigées`],
  ['Efficacité des techniques statiques', '5 anomalies sur 8 trouvées sans exécuter le code (revue de code, PMD/ESLint, npm audit, documentation)'],
])}
<h2>8.3 Évaluation des critères de sortie</h2>
${table(['Critère', 'Résultat', 'Verdict'], [
  ['100 % des cas planifiés exécutés', `${casDeTest.length - compte('BLOCKED')} exécutés + 1 bloqué (anomalie connue)`, '<span class="badge ok">Atteint</span>'],
  ['Aucune anomalie critique ouverte', 'ANO-01 corrigée et re-testée', '<span class="badge ok">Atteint</span>'],
  ['Couverture des exigences ≥ 85 %', `${tauxCouverture} %`, '<span class="badge ok">Atteint</span>'],
  ['Couverture des instructions ≥ 40 %', '49 %', '<span class="badge ok">Atteint</span>'],
])}
<div class="note"><b>Verdict : recette prononcée AVEC RÉSERVES.</b> Les critères de sortie sont atteints, mais quatre anomalies majeures restent ouvertes (ANO-03 à ANO-06). Elles doivent être corrigées avant une mise en production.</div>
<h2>8.4 Recommandations</h2>
${table(['Anomalie', 'Correctif proposé'], [
  ['ANO-03', 'Dans <code>AuthController</code>, remettre <code>failedLoginAttempts</code> à 0 lorsque <code>lockoutUntil</code> est dépassé, avant de compter le nouvel échec'],
  ['ANO-04', 'N’insérer le calendrier initial que si la table est vide : <code>if (eventRepository.count() == 0) seedEvents();</code>'],
  ['ANO-05', 'Barre latérale repliable (menu « burger ») sous le point de rupture <code>md</code> de Tailwind'],
  ['ANO-06', '<code>npm audit fix</code>, puis mise à jour d’axios et de react-router ; ajouter l’audit à l’intégration continue'],
  ['ANO-07', 'Corriger les erreurs ESLint et PMD ; bloquer la fusion si le lint échoue'],
  ['ANO-08', 'Documenter <code>CLOUDINARY_*</code> dans le README et <code>backend/.env.example</code>'],
  ['Général', 'Exécuter <code>mvn test</code> et Playwright à chaque pull request (GitHub Actions) pour automatiser la non-régression'],
], 'small')}

<!-- ======================= 9. CONCLUSION ======================= -->
<h1>9. Conclusion</h1>
<p>Ces ateliers ont permis de mener une démarche de test complète sur une application réelle : de l’expression des besoins jusqu’au verdict de recette. <b>Squash TM</b> a centralisé les exigences, les cas de test et les campagnes. La matrice de traçabilité montre quelles exigences sont vérifiées, et par quels tests.</p>
<p>La combinaison des techniques s’est avérée efficace. La <b>revue de code</b> (statique) a trouvé les défauts les plus graves avant même l’exécution, et les <b>tests dynamiques</b> les ont confirmés et ont mesuré leur impact. Les tests <b>automatisés</b> (JUnit, Playwright, k6) rendent la non-régression peu coûteuse. Les tests <b>manuels</b> restent indispensables pour juger l’expérience utilisateur et explorer des comportements inattendus, comme la perte des événements au redémarrage. Enfin, le cycle <b>correction → re-test → non-régression</b> a été appliqué à l’anomalie critique de confidentialité, désormais corrigée.</p>

<!-- ======================= ANNEXE ======================= -->
<h1>10. Annexe : rejouer les tests</h1>
<pre># 1. Infrastructure (Docker)
docker run -d --name enigov-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=enigov -p 5433:5432 postgres:16
docker exec enigov-postgres psql -U postgres -c "CREATE DATABASE enigov_test;" -c "CREATE DATABASE squashtm;"
docker network create qa-net &amp;&amp; docker network connect qa-net enigov-postgres
docker run -d --name squash-tm --network qa-net -p 8090:8080 -e SQTM_DB_TYPE=postgresql -e SQTM_DB_HOST=enigov-postgres \\
  -e SQTM_DB_NAME=squashtm -e SQTM_DB_USERNAME=postgres -e SQTM_DB_PASSWORD=postgres \\
  -e SQUASH_RESTAPI_DISALLOWBASICAUTHENTICATION=false squashtest/squash      # admin / admin

# 2. Application
cd backend  &amp;&amp; mvn spring-boot:run          # http://localhost:8081  (backend/.env)
cd frontend &amp;&amp; npm install &amp;&amp; npm run dev    # http://localhost:5173

# 3. Tests
cd backend &amp;&amp; mvn test                       # unitaires + intégration + rapport JaCoCo (target/site/jacoco)
cd backend &amp;&amp; mvn pmd:pmd pmd:cpd            # analyse statique Java
cd frontend &amp;&amp; npx eslint . --ext js,jsx     # analyse statique JavaScript
npm audit --workspace=frontend               # dépendances vulnérables
cd qa &amp;&amp; npm install &amp;&amp; npx playwright install chromium
cd qa &amp;&amp; npx playwright test -c e2e/playwright.config.js        # tests système E2E
cd qa &amp;&amp; node acceptance/run-acceptance.mjs                     # aide à l'exécution des tests d'acceptation
docker run --rm -v ./qa/perf:/scripts grafana/k6 run /scripts/charge-api.js   # charge
cd qa &amp;&amp; node squash/seed.mjs                                   # alimentation de Squash TM</pre>
${table(['Fichier', 'Contenu'], [
  ['<code>backend/src/test/java/com/unigov/unit/</code>', 'Tests unitaires (TU-01 à TU-04)'],
  ['<code>backend/src/test/java/com/unigov/integration/</code>', 'Tests d’intégration (TI-01 à TI-09)'],
  ['<code>backend/src/test/resources/application-test.properties</code>', 'Profil de test (base enigov_test)'],
  ['<code>qa/e2e/</code>', 'Tests système Playwright (TS-01 à TS-07)'],
  ['<code>qa/acceptance/run-acceptance.mjs</code>', 'Enregistrement des preuves des tests d’acceptation'],
  ['<code>qa/perf/charge-api.js</code>', 'Scénario de charge k6'],
  ['<code>qa/squash/</code>', 'Référentiel de test et script d’alimentation de Squash TM'],
  ['<code>qa/results/</code>', 'Résultats bruts, rapports HTML et captures d’écran'],
])}
</body></html>`;

writeFileSync('report/compte-rendu.html', html);
const b = await chromium.launch();
const p = await b.newPage();
await p.goto(new URL('compte-rendu.html', import.meta.url).href, { waitUntil: 'networkidle' });
const pdf = 'report/Compte_Rendu_Tests_EniGov_Mahmoud_Amri.pdf';
await p.pdf({
  path: pdf, format: 'A4', printBackground: true, preferCSSPageSize: true,
  displayHeaderFooter: true, headerTemplate: '<span></span>',
  footerTemplate: '<div style="font-size:8px;color:#64748b;width:100%;padding:0 16mm;display:flex;justify-content:space-between;font-family:Segoe UI"><span>Compte rendu – Ateliers de test – EniGov – Mahmoud Amri</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>',
});
await b.close();
copyFileSync(pdf, 'C:/Users/ASUS/desktop/Compte_Rendu_Tests_EniGov_Mahmoud_Amri.pdf');
console.log(`PDF généré : ${pdf} (${nFig} figures) — copié sur le Bureau`);
